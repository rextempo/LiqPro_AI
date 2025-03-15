import { Connection, PublicKey } from '@solana/web3.js';
import type { PoolService } from '../../../services/pool.service';
import { Logger } from '../../../utils/logger';
import { WhaleActivityEvent } from '../types/WhaleActivity';
import { PoolData, Bin } from '../types/PoolData';

export class WhaleActivityMonitor {
  private poolSnapshots: Map<string, PoolData>;
  private connection: Connection;
  private logger: Logger;
  private poolService: PoolService;
  private watchedPools: Set<string>;
  private listeners: Map<string, number>;

  constructor(
    connection: Connection,
    poolService: PoolService,
    logger: Logger
  ) {
    this.connection = connection;
    this.poolService = poolService;
    this.logger = logger;
    this.poolSnapshots = new Map();
    this.watchedPools = new Set();
    this.listeners = new Map();
  }

  // 启动监控服务
  public async start() {
    // 开始定期轮询
    setInterval(() => this.pollPools(), 5 * 60 * 1000); // 每5分钟
    
    // 初始化事件监听
    await this.setupEventListeners();
  }

  // 停止监控服务
  public async stop() {
    // 清理所有监听器
    for (const [poolAddress, listenerId] of this.listeners) {
      this.connection.removeAccountChangeListener(listenerId);
      this.listeners.delete(poolAddress);
    }
  }

  // 添加要监控的池子
  public async addPoolToWatch(poolAddress: string) {
    if (this.watchedPools.has(poolAddress)) return;
    
    this.watchedPools.add(poolAddress);
    await this.setupPoolListener(poolAddress);
    await this.checkForWhaleActivity(poolAddress);
  }

  // 移除监控的池子
  public removePoolFromWatch(poolAddress: string) {
    this.watchedPools.delete(poolAddress);
    const listenerId = this.listeners.get(poolAddress);
    if (listenerId) {
      this.connection.removeAccountChangeListener(listenerId);
      this.listeners.delete(poolAddress);
    }
  }

  // 私有方法实现
  private async pollPools() {
    for (const poolAddress of this.watchedPools) {
      await this.checkForWhaleActivity(poolAddress);
    }
  }

  private async setupEventListeners() {
    for (const poolAddress of this.watchedPools) {
      await this.setupPoolListener(poolAddress);
    }
  }

  private async setupPoolListener(poolAddress: string) {
    const pubkey = new PublicKey(poolAddress);
    const listenerId = this.connection.onAccountChange(
      pubkey,
      async () => {
        await this.checkForWhaleActivity(poolAddress);
      },
      'confirmed'
    );
    this.listeners.set(poolAddress, listenerId);
  }

  private async checkForWhaleActivity(poolAddress: string) {
    try {
      const newData = await this.poolService.getPoolDetail(poolAddress);
      const oldData = this.poolSnapshots.get(poolAddress);
      
      if (!oldData) {
        this.poolSnapshots.set(poolAddress, newData);
        return;
      }
      
      const totalChange = this.analyzeTotalLiquidityChange(oldData, newData);
      
      if (totalChange.totalChangePercent >= 0.05) {
        const topChanges = this.analyzeTopBinChanges(oldData, newData);
        const concentrationBefore = this.calculateConcentration(oldData);
        const concentrationAfter = this.calculateConcentration(newData);
        
        const activity: WhaleActivityEvent = {
          id: `${poolAddress}_${Date.now()}`,
          poolAddress,
          poolName: newData.name || `Pool_${poolAddress.slice(0, 8)}`,
          timestamp: Date.now(),
          ...totalChange,
          topChanges,
          concentrationBefore,
          concentrationAfter,
          currentPrice: newData.parameters.currentPrice.toString(),
          riskLevel: this.assessRiskLevel(totalChange.totalChangePercent, topChanges),
          detectionMethod: 'polling',
          detectionTime: Date.now()
        };
        
        await this.notifyWhaleActivity(activity);
      }
      
      this.poolSnapshots.set(poolAddress, newData);
    } catch (error) {
      this.logger.error(`Error checking whale activity for ${poolAddress}:`, error);
    }
  }

  private analyzeTopBinChanges(oldData: PoolData, newData: PoolData) {
    // 1. 准备bin映射
    const oldBins = new Map<string, Bin>();
    oldData.bins.forEach((bin: Bin) => {
      oldBins.set(bin.binId, bin);
    });
    
    // 2. 计算每个bin的变化
    const changes: Array<{
      binId: string;
      pricePoint: string;
      binRange: { lower: number; upper: number };
      amount: number;
      percent: number;
      type: 'add' | 'remove';
    }> = [];
    
    newData.bins.forEach((newBin: Bin) => {
      const oldBin = oldBins.get(newBin.binId);
      const newLiquidity = parseFloat(newBin.totalLiquidity || '0');
      
      // 计算变化
      let changeAmount = 0;
      let changeType: 'add' | 'remove' = 'add';
      
      if (oldBin) {
        const oldLiquidity = parseFloat(oldBin.totalLiquidity || '0');
        changeAmount = Math.abs(newLiquidity - oldLiquidity);
        changeType = newLiquidity > oldLiquidity ? 'add' : 'remove';
      } else {
        // 新增的bin
        changeAmount = newLiquidity;
        changeType = 'add';
      }
      
      // 只记录有变化的bin
      if (changeAmount > 0) {
        changes.push({
          binId: newBin.binId,
          pricePoint: newBin.price,
          binRange: {
            lower: parseFloat(newBin.price) * 0.95,
            upper: parseFloat(newBin.price) * 1.05
          },
          amount: changeAmount,
          percent: changeAmount / parseFloat(oldData.liquidity.total || '1'),
          type: changeType
        });
      }
    });
    
    // 检查旧数据中的bin是否在新数据中被移除
    oldData.bins.forEach((oldBin: Bin) => {
      const exists = newData.bins.some((bin: Bin) => bin.binId === oldBin.binId);
      if (!exists) {
        // bin被完全移除
        changes.push({
          binId: oldBin.binId,
          pricePoint: oldBin.price,
          binRange: {
            lower: parseFloat(oldBin.price) * 0.95,
            upper: parseFloat(oldBin.price) * 1.05
          },
          amount: parseFloat(oldBin.totalLiquidity || '0'),
          percent: parseFloat(oldBin.totalLiquidity || '0') / parseFloat(oldData.liquidity.total || '1'),
          type: 'remove'
        });
      }
    });
    
    // 3. 按变化量排序并取前3个最大变化
    changes.sort((a, b) => b.amount - a.amount);
    
    return changes.slice(0, 3).map(change => ({
      binRange: change.binRange,
      amount: change.amount.toString(),
      percent: change.percent,
      pricePoint: change.pricePoint,
      type: change.type
    }));
  }

  private analyzeTotalLiquidityChange(oldData: PoolData, newData: PoolData) {
    const oldTotal = parseFloat(oldData.liquidity.total || '0');
    const newTotal = parseFloat(newData.liquidity.total || '0');
    const changeAmount = Math.abs(newTotal - oldTotal);
    
    return {
      totalLiquidityBefore: oldTotal.toString(),
      totalLiquidityAfter: newTotal.toString(),
      totalChangeAmount: changeAmount.toString(),
      totalChangePercent: changeAmount / oldTotal
    };
  }

  private calculateConcentration(data: PoolData): number {
    const totalLiquidity = parseFloat(data.liquidity.total || '0');
    if (totalLiquidity === 0) return 0;
    
    const sortedBins = [...data.bins].sort((a, b) => 
      parseFloat(b.totalLiquidity || '0') - parseFloat(a.totalLiquidity || '0')
    );
    
    const top10BinsLiquidity = sortedBins
      .slice(0, 10)
      .reduce((sum, bin) => sum + parseFloat(bin.totalLiquidity || '0'), 0);
    
    return top10BinsLiquidity / totalLiquidity;
  }

  private assessRiskLevel(totalChangePercent: number, topChanges: Array<{percent: number}>): 'low' | 'medium' | 'high' {
    if (totalChangePercent >= 0.15 || (topChanges[0] && topChanges[0].percent >= 0.1)) {
      return 'high';
    } else if (totalChangePercent >= 0.08 || (topChanges[0] && topChanges[0].percent >= 0.05)) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  private async notifyWhaleActivity(activity: WhaleActivityEvent) {
    this.logger.info('Whale Activity Detected:', activity);
    // TODO: 实现通知机制（如WebSocket、webhook等）
  }
} 