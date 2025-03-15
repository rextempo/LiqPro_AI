import { PublicKey } from '@solana/web3.js';
import { PoolData, TokenInfo, MarketMetrics } from './data-types';
import { DataUtils } from './data-utils';

export class DataTransformers {
  static toPoolData(rawData: any): PoolData {
    if (!DataUtils.isValidPoolData(rawData)) {
      throw new Error('Invalid pool data format');
    }

    return {
      id: rawData.id,
      address: new PublicKey(rawData.address),
      name: rawData.name,
      tokenA: this.toTokenInfo(rawData.tokenA),
      tokenB: this.toTokenInfo(rawData.tokenB),
      liquidity: parseFloat(rawData.liquidity),
      volume24h: parseFloat(rawData.volume24h),
      fees24h: parseFloat(rawData.fees24h),
      apr: parseFloat(rawData.apr),
      lastUpdate: new Date(rawData.lastUpdate)
    };
  }

  static toTokenInfo(rawData: any): TokenInfo {
    if (!DataUtils.isValidTokenInfo(rawData)) {
      throw new Error('Invalid token info format');
    }

    return {
      address: new PublicKey(rawData.address),
      symbol: rawData.symbol,
      decimals: parseInt(rawData.decimals),
      price: parseFloat(rawData.price),
      volume24h: parseFloat(rawData.volume24h)
    };
  }

  static toMarketMetrics(rawData: any): MarketMetrics {
    if (!DataUtils.isValidMarketMetrics(rawData)) {
      throw new Error('Invalid market metrics format');
    }

    return {
      poolId: rawData.poolId,
      timestamp: new Date(rawData.timestamp),
      price: parseFloat(rawData.price),
      volume: parseFloat(rawData.volume),
      liquidity: parseFloat(rawData.liquidity),
      fees: parseFloat(rawData.fees)
    };
  }

  static toPoolDetail(rawData: any): PoolDetail {
    const poolData = this.toPoolData(rawData);
    
    return {
      ...poolData,
      metrics: {
        priceChange24h: parseFloat(rawData.priceChange24h),
        volumeChange24h: parseFloat(rawData.volumeChange24h),
        liquidityChange24h: parseFloat(rawData.liquidityChange24h),
        feesChange24h: parseFloat(rawData.feesChange24h)
      },
      stats: {
        totalVolume: parseFloat(rawData.totalVolume),
        totalFees: parseFloat(rawData.totalFees),
        totalLiquidity: parseFloat(rawData.totalLiquidity),
        totalTransactions: parseInt(rawData.totalTransactions)
      },
      risk: {
        impermanentLoss: parseFloat(rawData.impermanentLoss),
        priceVolatility: parseFloat(rawData.priceVolatility),
        liquidityRisk: parseFloat(rawData.liquidityRisk)
      }
    };
  }

  static fromPoolData(poolData: PoolData): any {
    return {
      id: poolData.id,
      address: poolData.address.toString(),
      name: poolData.name,
      tokenA: this.fromTokenInfo(poolData.tokenA),
      tokenB: this.fromTokenInfo(poolData.tokenB),
      liquidity: poolData.liquidity,
      volume24h: poolData.volume24h,
      fees24h: poolData.fees24h,
      apr: poolData.apr,
      lastUpdate: poolData.lastUpdate.toISOString()
    };
  }

  static fromTokenInfo(tokenInfo: TokenInfo): any {
    return {
      address: tokenInfo.address.toString(),
      symbol: tokenInfo.symbol,
      decimals: tokenInfo.decimals,
      price: tokenInfo.price,
      volume24h: tokenInfo.volume24h
    };
  }

  static fromMarketMetrics(metrics: MarketMetrics): any {
    return {
      poolId: metrics.poolId,
      timestamp: metrics.timestamp.toISOString(),
      price: metrics.price,
      volume: metrics.volume,
      liquidity: metrics.liquidity,
      fees: metrics.fees
    };
  }
}

// 扩展的池子详情接口
export interface PoolDetail extends PoolData {
  metrics: {
    priceChange24h: number;
    volumeChange24h: number;
    liquidityChange24h: number;
    feesChange24h: number;
  };
  stats: {
    totalVolume: number;
    totalFees: number;
    totalLiquidity: number;
    totalTransactions: number;
  };
  risk: {
    impermanentLoss: number;
    priceVolatility: number;
    liquidityRisk: number;
  };
} 