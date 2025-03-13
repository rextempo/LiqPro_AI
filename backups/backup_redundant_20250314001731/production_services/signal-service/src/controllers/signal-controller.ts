import { v4 as uuidv4 } from 'uuid';
import { logger } from '../logger';
import { Signal, Strategy } from '../types';
import { generateSignalsFromPoolData } from '../services/signalService';
import { publishSignal } from '../rabbitmq';

/**
 * 信号控制器类
 * 负责管理信号生成和策略执行
 */
export class SignalController {
  private signals: Map<string, Signal> = new Map();
  private strategies: Map<string, Strategy> = new Map();
  private intervalIds: NodeJS.Timeout[] = [];

  constructor() {
    logger.info('信号控制器初始化');
  }

  /**
   * 启动信号控制器
   */
  public async start(): Promise<void> {
    try {
      logger.info('信号控制器启动中...');
      
      // 设置定期清理过期信号的间隔
      const cleanupInterval = setInterval(() => this.cleanupExpiredSignals(), 3600000); // 每小时清理一次
      this.intervalIds.push(cleanupInterval);
      
      logger.info('信号控制器已启动');
    } catch (error) {
      logger.error('信号控制器启动失败:', error);
      throw error;
    }
  }

  /**
   * 停止信号控制器
   */
  public stop(): void {
    logger.info('正在停止信号控制器...');
    
    // 清除所有间隔
    this.intervalIds.forEach(intervalId => clearInterval(intervalId));
    this.intervalIds = [];
    
    logger.info('信号控制器已停止');
  }

  /**
   * 处理池数据并生成信号
   */
  public async processPoolData(poolData: any): Promise<void> {
    try {
      logger.info(`处理池数据: ${JSON.stringify(poolData).substring(0, 100)}...`);
      
      // 生成信号
      const signals = await generateSignalsFromPoolData(poolData);
      
      // 存储和发布信号
      for (const signal of signals) {
        const signalId = uuidv4();
        const timestamp = new Date().toISOString();
        
        const newSignal: Signal = {
          id: signalId,
          timestamp,
          ...signal
        };
        
        // 存储信号
        this.signals.set(signalId, newSignal);
        
        // 发布信号到队列
        await publishSignal(newSignal);
        
        logger.info(`信号已生成并发布: ${signalId}`);
      }
    } catch (error) {
      logger.error('处理池数据失败:', error);
    }
  }

  /**
   * 获取所有信号
   */
  public getAllSignals(): Signal[] {
    return Array.from(this.signals.values());
  }

  /**
   * 获取特定信号
   */
  public getSignal(id: string): Signal | undefined {
    return this.signals.get(id);
  }

  /**
   * 清理过期信号
   */
  private cleanupExpiredSignals(): void {
    const now = new Date();
    let cleanupCount = 0;
    
    this.signals.forEach((signal, id) => {
      const signalDate = new Date(signal.timestamp);
      const ageInHours = (now.getTime() - signalDate.getTime()) / (1000 * 60 * 60);
      
      // 删除超过24小时的信号
      if (ageInHours > 24) {
        this.signals.delete(id);
        cleanupCount++;
      }
    });
    
    if (cleanupCount > 0) {
      logger.info(`已清理 ${cleanupCount} 个过期信号`);
    }
  }
} 