import { PublicKey } from '@solana/web3.js';
import { IDataService } from './data-service';
import { IDataRepository } from './data-repository';
import { PoolData, TokenInfo, MarketMetrics, DataQueryOptions, DataUpdateEvent } from './data-types';
import { EventEmitter } from 'events';

export class DataManager extends EventEmitter implements IDataService {
  private repository: IDataRepository;
  private updateInterval: NodeJS.Timeout | null = null;

  constructor(repository: IDataRepository) {
    super();
    this.repository = repository;
  }

  // 池子数据相关实现
  async getPoolData(poolId: string): Promise<PoolData> {
    const data = await this.repository.getPoolData(poolId);
    if (!data) {
      throw new Error(`Pool data not found for ID: ${poolId}`);
    }
    return data;
  }

  async getPoolsByToken(tokenAddress: string): Promise<PoolData[]> {
    const pools = await this.repository.getAllPoolData();
    return pools.filter(pool => 
      pool.tokenA.address.equals(new PublicKey(tokenAddress)) ||
      pool.tokenB.address.equals(new PublicKey(tokenAddress))
    );
  }

  async getAllPools(): Promise<PoolData[]> {
    return this.repository.getAllPoolData();
  }

  // 代币数据相关实现
  async getTokenInfo(tokenAddress: string): Promise<TokenInfo> {
    const data = await this.repository.getTokenData(tokenAddress);
    if (!data) {
      throw new Error(`Token data not found for address: ${tokenAddress}`);
    }
    return data;
  }

  async getTokenPrice(tokenAddress: string): Promise<number> {
    const tokenInfo = await this.getTokenInfo(tokenAddress);
    return tokenInfo.price;
  }

  // 市场指标相关实现
  async getMarketMetrics(poolId: string, options?: DataQueryOptions): Promise<MarketMetrics[]> {
    return this.repository.getMarketMetrics(poolId, options);
  }

  async getLatestMetrics(poolId: string): Promise<MarketMetrics> {
    const metrics = await this.repository.getMarketMetrics(poolId, { limit: 1 });
    if (!metrics.length) {
      throw new Error(`No metrics found for pool: ${poolId}`);
    }
    return metrics[0];
  }

  // 数据更新相关实现
  subscribeToUpdates(callback: (event: DataUpdateEvent) => void): () => void {
    this.on('dataUpdate', callback);
    return () => this.off('dataUpdate', callback);
  }

  async refreshPoolData(poolId: string): Promise<void> {
    // TODO: 实现从外部API获取最新池子数据
    const poolData = await this.getPoolData(poolId);
    await this.repository.savePoolData(poolData);
    this.emit('dataUpdate', {
      type: 'POOL_UPDATE',
      data: poolData,
      timestamp: new Date()
    });
  }

  async refreshTokenData(tokenAddress: string): Promise<void> {
    // TODO: 实现从外部API获取最新代币数据
    const tokenData = await this.getTokenInfo(tokenAddress);
    await this.repository.saveTokenData(tokenData);
    this.emit('dataUpdate', {
      type: 'TOKEN_UPDATE',
      data: tokenData,
      timestamp: new Date()
    });
  }

  // 数据验证相关实现
  async validatePoolData(data: PoolData): Promise<boolean> {
    // TODO: 实现池子数据验证逻辑
    return true;
  }

  async validateTokenData(data: TokenInfo): Promise<boolean> {
    // TODO: 实现代币数据验证逻辑
    return true;
  }

  async validateMetricsData(data: MarketMetrics): Promise<boolean> {
    // TODO: 实现市场指标数据验证逻辑
    return true;
  }

  // 启动数据更新服务
  startUpdateService(interval: number = 60000): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    this.updateInterval = setInterval(async () => {
      const pools = await this.getAllPools();
      for (const pool of pools) {
        await this.refreshPoolData(pool.id);
      }
    }, interval);
  }

  // 停止数据更新服务
  stopUpdateService(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
} 