import { Connection, PublicKey } from '@solana/web3.js';
import { EventEmitter } from 'events';
import { PoolData } from '../core/data/types/PoolData';
import { TokenInfo, TimeSeriesData } from '../core/data/data-types';
import { config } from '../config';

export class MeteoraService extends EventEmitter {
  private readonly connection: Connection;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly requestQueue: Promise<any>[] = [];
  private readonly maxConcurrentRequests = 5;
  private retryCount: number = 3;
  private retryDelay: number = 1000;

  constructor() {
    super();
    this.connection = new Connection(config.meteora.rpcUrl);
    this.baseUrl = config.meteora.baseUrl;
    this.apiKey = config.meteora.apiKey;
  }

  private transformTokenInfo(data: any): TokenInfo {
    return {
      mint: data.mint,
      reserve: data.reserve,
      amount: data.amount,
      symbol: data.symbol,
      decimals: data.decimals,
      price: data.price
    };
  }

  private transformTimeSeriesData(data: any): TimeSeriesData {
    return {
      min_30: data.min_30 || 0,
      hour_1: data.hour_1 || 0,
      hour_2: data.hour_2 || 0,
      hour_4: data.hour_4 || 0,
      hour_12: data.hour_12 || 0,
      hour_24: data.hour_24 || 0
    };
  }

  private transformPoolData(data: any): PoolData {
    return {
      id: data.address,
      address: data.address,
      name: data.address.slice(0, 8),
      tokens: {
        tokenX: this.transformTokenInfo(data.tokenX),
        tokenY: this.transformTokenInfo(data.tokenY)
      },
      fees: {
        base: data.fees.base.toString(),
        max: data.fees.max.toString(),
        protocol: data.fees.protocol.toString(),
        today: 0,
        last24h: 0
      },
      volume: {
        last24h: 0,
        cumulative: '0'
      },
      liquidity: {
        total: data.liquidity.total
      },
      rewards: {
        mintX: data.rewards.mintX,
        mintY: data.rewards.mintY,
        farmApr: 0,
        farmApy: 0
      },
      yields: {
        apr: 0,
        fees24hTvl: 0
      },
      parameters: {
        binStep: data.parameters.binStep,
        currentPrice: data.parameters.currentPrice.toString(),
        hide: false,
        isBlacklisted: false
      },
      bins: (data.bins || []).map((bin: any) => ({
        binId: bin.binId.toString(),
        price: bin.price.toString(),
        totalLiquidity: bin.totalLiquidity.toString()
      })),
      tags: [],
      lastUpdate: new Date().toISOString()
    };
  }

  async getPoolDetail(address: string): Promise<PoolData> {
    try {
      // 创建DLMM实例
      const DLMM = await import('@meteora-ag/dlmm');
      const dlmmPool = await DLMM.default.create(this.connection, new PublicKey(address));

      // 获取活跃bin和价格
      const activeBin = await dlmmPool.getActiveBin();
      const currentPrice = dlmmPool.fromPricePerLamport(Number(activeBin.price));

      // 获取费用信息
      const feeInfo = await dlmmPool.getFeeInfo();

      // 获取bin数组
      const binArrays = await dlmmPool.getBinArrays();

      // 获取所有bin数据
      const allBins = binArrays.flatMap(array => 
        array.bins.map(bin => ({
          binId: bin.binId,
          price: dlmmPool.fromPricePerLamport(Number(bin.pricePerLamport)),
          liquidityX: Number(bin.liquidityX),
          liquidityY: Number(bin.liquidityY),
          totalLiquidity: Number(bin.liquidityX) + Number(bin.liquidityY)
        }))
      );

      // 计算总流动性
      const totalLiquidity = allBins.reduce((total, bin) => total + bin.totalLiquidity, 0);

      // 构造PoolData对象
      const poolData: PoolData = {
        id: address,
        address: address,
        name: `Pool ${address.slice(0, 8)}...`,
        tokens: {
          tokenX: {
            mint: '',
            reserve: '',
            amount: 0,
            symbol: '',
            decimals: 0,
            price: 0
          },
          tokenY: {
            mint: '',
            reserve: '',
            amount: 0,
            symbol: '',
            decimals: 0,
            price: 0
          }
        },
        fees: {
          base: feeInfo.baseFee.toString(),
          max: feeInfo.maxFee.toString(),
          protocol: feeInfo.protocolFee.toString(),
          today: 0,
          last24h: 0
        },
        volume: {
          last24h: 0,
          cumulative: '0'
        },
        liquidity: {
          total: totalLiquidity.toString()
        },
        rewards: {
          mintX: '',
          mintY: '',
          farmApr: 0,
          farmApy: 0
        },
        yields: {
          apr: 0,
          fees24hTvl: 0
        },
        parameters: {
          binStep: binArrays[0]?.binStep || 0,
          currentPrice: currentPrice.toString(),
          hide: false,
          isBlacklisted: false
        },
        bins: allBins.map(bin => ({
          binId: bin.binId.toString(),
          price: bin.price.toString(),
          totalLiquidity: bin.totalLiquidity.toString()
        })),
        tags: [],
        lastUpdate: new Date().toISOString()
      };

      return poolData;
    } catch (error) {
      console.error('Error fetching pool detail:', error);
      throw error;
    }
  }

  async getAllPools(): Promise<PoolData[]> {
    // 从API获取所有池子列表
    const response = await fetch('https://dlmm-api.meteora.ag/pair/all');
    const data = await response.json() as any[];
    return data.map(this.transformPoolData.bind(this));
  }

  private async makeRequest<T>(endpoint: string): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`
    };

    let retries = 0;
    while (retries < config.pools.maxRetries) {
      try {
        const response = await fetch(url, { headers });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data as T;
      } catch (error) {
        retries++;
        if (retries === config.pools.maxRetries) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, config.pools.retryDelay));
      }
    }
    throw new Error('Max retries reached');
  }
} 