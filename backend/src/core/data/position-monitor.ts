import { PublicKey } from '@solana/web3.js';
import { PoolData } from './data-types';
import { PoolService } from './pool-service';
import { EventEmitter } from 'events';
import { Cache } from '../../utils/cache';

interface Position {
  poolAddress: string;
  agentAddress: string;
  lastUpdate: Date;
  data: PoolData;
}

export class PositionMonitor extends EventEmitter {
  private readonly poolService: PoolService;
  private readonly cache: Cache;
  private readonly updateInterval: number = 300000; // 5分钟
  private monitorInterval: NodeJS.Timeout | null = null;
  private positions: Map<string, Position> = new Map();

  constructor(poolService: PoolService) {
    super();
    this.poolService = poolService;
    this.cache = Cache.getInstance();
  }

  async getAgentPositions(agentAddress: string): Promise<Position[]> {
    try {
      // 从缓存获取
      const cacheKey = `agent_positions_${agentAddress}`;
      const cachedPositions = this.cache.get<Position[]>(cacheKey);
      if (cachedPositions) {
        return cachedPositions;
      }

      // TODO: 从数据库获取 Agent 的持仓池子地址
      const poolAddresses: string[] = [];

      // 获取池子详细数据
      const positions = await Promise.all(
        poolAddresses.map(async (address) => {
          const poolData = await this.poolService.getPoolDetail(address);
          return {
            poolAddress: address,
            agentAddress,
            lastUpdate: new Date(),
            data: poolData
          };
        })
      );

      // 更新缓存
      this.cache.set(cacheKey, positions, this.updateInterval);

      return positions;
    } catch (error) {
      console.error('Error getting agent positions:', error);
      throw error;
    }
  }

  async monitorPositionPools(agentAddress: string): Promise<void> {
    try {
      const positions = await this.getAgentPositions(agentAddress);
      
      // 更新监控的持仓
      positions.forEach(position => {
        this.positions.set(position.poolAddress, position);
      });

      // 开始监控
      this.startMonitoring();
    } catch (error) {
      console.error('Error monitoring position pools:', error);
      throw error;
    }
  }

  private startMonitoring(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }

    this.monitorInterval = setInterval(async () => {
      try {
        await this.updatePositions();
      } catch (error) {
        console.error('Error updating positions:', error);
        this.emit('monitorError', error);
      }
    }, this.updateInterval);
  }

  private async updatePositions(): Promise<void> {
    for (const [poolAddress, position] of this.positions.entries()) {
      try {
        const newPoolData = await this.poolService.getPoolDetail(poolAddress);
        
        // 检测数据变化
        const changes = this.detectChanges(position.data, newPoolData);
        if (changes.length > 0) {
          // 更新持仓数据
          position.data = newPoolData;
          position.lastUpdate = new Date();
          
          // 发出变化通知
          this.emit('positionUpdate', {
            poolAddress,
            agentAddress: position.agentAddress,
            changes,
            timestamp: new Date()
          });
        }
      } catch (error) {
        console.error(`Error updating position for pool ${poolAddress}:`, error);
      }
    }
  }

  private detectChanges(oldData: PoolData, newData: PoolData): string[] {
    const changes: string[] = [];

    if (oldData.liquidity.total !== newData.liquidity.total) {
      changes.push('liquidity');
    }
    if (oldData.fees.last24h !== newData.fees.last24h) {
      changes.push('fees');
    }
    if (oldData.yields.apr !== newData.yields.apr) {
      changes.push('yields');
    }

    return changes;
  }

  stopMonitoring(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }

  // 订阅持仓更新
  subscribeToUpdates(callback: (data: {
    poolAddress: string;
    agentAddress: string;
    changes: string[];
    timestamp: Date;
  }) => void): () => void {
    this.on('positionUpdate', callback);
    return () => this.off('positionUpdate', callback);
  }

  // 订阅监控错误
  subscribeToErrors(callback: (error: Error) => void): () => void {
    this.on('monitorError', callback);
    return () => this.off('monitorError', callback);
  }
} 