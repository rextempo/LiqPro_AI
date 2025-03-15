import { PoolData, TokenInfo, TimeSeriesData } from './data-types';
import { MeteoraService } from '../../services/meteora';
import { DataUtils } from './data-utils';
import { EventEmitter } from 'events';
import { config } from '../../config';

export class PoolService extends EventEmitter {
  private readonly meteoraService: MeteoraService;
  private readonly minTVL: number;
  private readonly minVolume: number;
  private updateInterval: NodeJS.Timeout | null = null;

  constructor(meteoraService: MeteoraService) {
    if (!meteoraService) {
      throw new Error('MeteoraService is required');
    }
    super();
    this.meteoraService = meteoraService;
    this.minTVL = config.pools.minTVL;
    this.minVolume = config.pools.minVolume;
  }

  async getTop100Pools(): Promise<PoolData[]> {
    try {
      const allPools = await this.meteoraService.getAllPools();
      
      // 筛选符合条件的池子
      const filteredPools = allPools.filter(pool => {
        const tvl = parseFloat(pool.liquidity.total);
        const volume24h = pool.volume.last24h;
        return tvl >= this.minTVL && volume24h >= this.minVolume;
      });

      // 按成交量降序排序
      const sortedPools = filteredPools.sort((a, b) => b.volume.last24h - a.volume.last24h);

      // 返回前100个池子
      return sortedPools.slice(0, 100);
    } catch (error) {
      console.error('Error getting top 100 pools:', error);
      throw error;
    }
  }

  async getPoolDetail(address: string): Promise<PoolData> {
    try {
      return await this.meteoraService.getPoolDetail(address);
    } catch (error) {
      console.error('Error getting pool detail:', error);
      throw error;
    }
  }

  startUpdateService(interval: number = config.pools.updateInterval): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(async () => {
      try {
        const topPools = await this.getTop100Pools();
        this.emit('poolsUpdate', {
          pools: topPools,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Error updating pools:', error);
        this.emit('updateError', error);
      }
    }, interval);
  }

  stopUpdateService(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  // 订阅池子更新
  subscribeToUpdates(callback: (data: { pools: PoolData[], timestamp: Date }) => void): () => void {
    this.on('poolsUpdate', callback);
    return () => this.off('poolsUpdate', callback);
  }

  // 订阅错误事件
  subscribeToErrors(callback: (error: Error) => void): () => void {
    this.on('updateError', callback);
    return () => this.off('updateError', callback);
  }
} 