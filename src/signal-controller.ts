/**
 * 信号控制器
 */
import { Request, Response } from 'express';
import { 
  Signal, 
  SignalQueryOptions, 
  SignalSubscriptionOptions,
  SignalAnalysisResult
} from '../types';
import { SignalGenerator } from '../models/signal-generator';
import { StrategyManager } from '../models/strategy-manager';
import { logger } from '../utils/logger';
import { config } from '../config';

/**
 * 信号控制器类
 */
export class SignalController {
  private signalGenerator: SignalGenerator;
  private strategyManager: StrategyManager;
  private signalGenerationInterval: NodeJS.Timeout | null = null;
  private strategyUpdateInterval: NodeJS.Timeout | null = null;
  private subscribers: Map<string, { 
    options: SignalSubscriptionOptions, 
    callback: (signals: Signal[]) => void 
  }> = new Map();
  
  /**
   * 信号生成后的回调函数
   */
  public onSignalsGenerated: ((signals: Signal[]) => void) | null = null;

  /**
   * 构造函数
   */
  constructor() {
    this.signalGenerator = new SignalGenerator();
    this.strategyManager = new StrategyManager();
    logger.info('SignalController initialized');
  }

  /**
   * 启动信号服务
   */
  async start(): Promise<void> {
    try {
      logger.info('启动信号服务');
      
      // 初始化策略
      await this.strategyManager.initialize();
      
      // 生成初始信号
      await this.signalGenerator.generateSignals();
      
      // 设置定时任务
      this.setupIntervals();
      
      logger.info('信号服务启动成功');
    } catch (error) {
      logger.error('信号服务启动失败', { error });
      throw error;
    }
  }

  /**
   * 停止信号服务
   */
  stop(): void {
    logger.info('停止信号服务');
    
    // 清除定时任务
    if (this.signalGenerationInterval) {
      clearInterval(this.signalGenerationInterval);
      this.signalGenerationInterval = null;
    }
    
    if (this.strategyUpdateInterval) {
      clearInterval(this.strategyUpdateInterval);
      this.strategyUpdateInterval = null;
    }
    
    logger.info('信号服务已停止');
  }

  /**
   * 设置定时任务
   */
  private setupIntervals(): void {
    // 信号生成定时任务
    this.signalGenerationInterval = setInterval(async () => {
      try {
        logger.info('执行定时信号生成');
        
        // 清理过期信号
        this.signalGenerator.cleanExpiredSignals();
        
        // 生成新信号
        const signals = await this.signalGenerator.generateSignals();
        
        // 通知订阅者
        this.notifySubscribers(signals);
        
        // 调用信号生成回调
        if (this.onSignalsGenerated && signals.length > 0) {
          this.onSignalsGenerated(signals);
        }
        
        logger.info('定时信号生成完成');
      } catch (error) {
        logger.error('定时信号生成失败', { error });
      }
    }, config.signalGenerationInterval);
    
    // 策略更新定时任务
    this.strategyUpdateInterval = setInterval(async () => {
      try {
        logger.info('执行定时策略更新');
        await this.strategyManager.updateStrategies();
        logger.info('定时策略更新完成');
      } catch (error) {
        logger.error('定时策略更新失败', { error });
      }
    }, config.strategyUpdateInterval);
  }

  /**
   * 通知订阅者
   * @param signals 信号列表
   */
  private notifySubscribers(signals: Signal[]): void {
    if (signals.length === 0 || this.subscribers.size === 0) {
      return;
    }
    
    logger.info(`通知 ${this.subscribers.size} 个订阅者`);
    
    for (const [subscriberId, { options, callback }] of this.subscribers.entries()) {
      try {
        // 过滤信号
        const filteredSignals = this.filterSignals(signals, options);
        
        if (filteredSignals.length > 0) {
          // 调用回调函数
          callback(filteredSignals);
          logger.debug(`通知订阅者 ${subscriberId} 成功，发送 ${filteredSignals.length} 个信号`);
        }
      } catch (error) {
        logger.error(`通知订阅者 ${subscriberId} 失败`, { error });
      }
    }
  }

  /**
   * 过滤信号
   * @param signals 信号列表
   * @param options 过滤选项
   * @returns 过滤后的信号列表
   */
  private filterSignals(signals: Signal[], options: SignalSubscriptionOptions): Signal[] {
    return signals.filter(signal => {
      // 按池子地址过滤
      if (options.poolAddresses && options.poolAddresses.length > 0) {
        if (!options.poolAddresses.includes(signal.poolAddress)) {
          return false;
        }
      }
      
      // 按信号类型过滤
      if (options.signalTypes && options.signalTypes.length > 0) {
        if (!options.signalTypes.includes(signal.type)) {
          return false;
        }
      }
      
      // 按信号强度过滤
      if (options.minStrength !== undefined) {
        if (signal.strength < options.minStrength) {
          return false;
        }
      }
      
      // 按时间范围过滤
      if (options.timeframes && options.timeframes.length > 0) {
        if (!options.timeframes.includes(signal.timeframe)) {
          return false;
        }
      }
      
      // 按可靠性过滤
      if (options.minReliability !== undefined) {
        if (signal.reliability < options.minReliability) {
          return false;
        }
      }
      
      return true;
    });
  }

  /**
   * 订阅信号
   * @param options 订阅选项
   * @param callback 回调函数
   * @returns 订阅ID
   */
  subscribeSignals(
    options: SignalSubscriptionOptions, 
    callback: (signals: Signal[]) => void
  ): string {
    const subscriberId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.subscribers.set(subscriberId, { options, callback });
    logger.info(`新增信号订阅: ${subscriberId}`);
    
    return subscriberId;
  }

  /**
   * 取消订阅
   * @param subscriberId 订阅ID
   * @returns 是否取消成功
   */
  unsubscribeSignals(subscriberId: string): boolean {
    const success = this.subscribers.delete(subscriberId);
    
    if (success) {
      logger.info(`取消信号订阅: ${subscriberId}`);
    } else {
      logger.warn(`取消信号订阅失败: 找不到订阅 ${subscriberId}`);
    }
    
    return success;
  }

  /**
   * 获取信号
   * @param req 请求对象
   * @param res 响应对象
   */
  getSignals = async (req: Request, res: Response): Promise<void> => {
    try {
      const options: SignalQueryOptions = req.query as any;
      
      // 获取所有信号
      const allSignals = this.signalGenerator.getAllSignals();
      
      // 过滤信号
      const filteredSignals = this.filterSignals(allSignals, options);
      
      // 应用分页
      const offset = options.offset || 0;
      const limit = options.limit || filteredSignals.length;
      const paginatedSignals = filteredSignals.slice(offset, offset + limit);
      
      // 构建响应
      const result: SignalAnalysisResult = {
        signals: paginatedSignals,
        metadata: {
          totalCount: allSignals.length,
          filteredCount: filteredSignals.length,
          generatedAt: this.signalGenerator.getLastGenerationTime(),
        },
      };
      
      res.json(result);
    } catch (error) {
      logger.error('获取信号失败', { error });
      res.status(500).json({ error: '获取信号失败', message: (error as Error).message });
    }
  };

  /**
   * 获取信号详情
   * @param req 请求对象
   * @param res 响应对象
   */
  getSignalById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      // 获取信号
      const signal = this.signalGenerator.getSignal(id);
      
      if (!signal) {
        res.status(404).json({ error: '找不到信号', message: `信号 ${id} 不存在` });
        return;
      }
      
      res.json(signal);
    } catch (error) {
      logger.error('获取信号详情失败', { error });
      res.status(500).json({ error: '获取信号详情失败', message: (error as Error).message });
    }
  };

  /**
   * 获取策略
   * @param req 请求对象
   * @param res 响应对象
   */
  getStrategies = async (req: Request, res: Response): Promise<void> => {
    try {
      const options = req.query as any;
      
      // 查询策略
      const strategies = this.strategyManager.queryStrategies(options);
      
      res.json({
        strategies,
        metadata: {
          totalCount: this.strategyManager.getAllStrategies().length,
          filteredCount: strategies.length,
          updatedAt: this.strategyManager.getLastUpdateTime(),
        },
      });
    } catch (error) {
      logger.error('获取策略失败', { error });
      res.status(500).json({ error: '获取策略失败', message: (error as Error).message });
    }
  };

  /**
   * 获取策略详情
   * @param req 请求对象
   * @param res 响应对象
   */
  getStrategyById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      // 获取策略
      const strategy = this.strategyManager.getStrategy(id);
      
      if (!strategy) {
        res.status(404).json({ error: '找不到策略', message: `策略 ${id} 不存在` });
        return;
      }
      
      res.json(strategy);
    } catch (error) {
      logger.error('获取策略详情失败', { error });
      res.status(500).json({ error: '获取策略详情失败', message: (error as Error).message });
    }
  };

  /**
   * 创建策略
   * @param req 请求对象
   * @param res 响应对象
   */
  createStrategy = async (req: Request, res: Response): Promise<void> => {
    try {
      const strategyData = req.body;
      
      // 创建策略
      const strategy = this.strategyManager.createStrategy(strategyData);
      
      res.status(201).json(strategy);
    } catch (error) {
      logger.error('创建策略失败', { error });
      res.status(500).json({ error: '创建策略失败', message: (error as Error).message });
    }
  };

  /**
   * 更新策略
   * @param req 请求对象
   * @param res 响应对象
   */
  updateStrategy = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // 更新策略
      const strategy = this.strategyManager.updateStrategy(id, updates);
      
      if (!strategy) {
        res.status(404).json({ error: '找不到策略', message: `策略 ${id} 不存在` });
        return;
      }
      
      res.json(strategy);
    } catch (error) {
      logger.error('更新策略失败', { error });
      res.status(500).json({ error: '更新策略失败', message: (error as Error).message });
    }
  };

  /**
   * 删除策略
   * @param req 请求对象
   * @param res 响应对象
   */
  deleteStrategy = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      // 删除策略
      const success = this.strategyManager.deleteStrategy(id);
      
      if (!success) {
        res.status(404).json({ error: '找不到策略', message: `策略 ${id} 不存在` });
        return;
      }
      
      res.status(204).end();
    } catch (error) {
      logger.error('删除策略失败', { error });
      res.status(500).json({ error: '删除策略失败', message: (error as Error).message });
    }
  };

  /**
   * 评估策略性能
   * @param req 请求对象
   * @param res 响应对象
   */
  evaluateStrategyPerformance = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { poolAddress } = req.body;
      
      if (!poolAddress) {
        res.status(400).json({ error: '参数错误', message: '缺少池子地址' });
        return;
      }
      
      // 评估策略性能
      const performance = await this.strategyManager.evaluateStrategyPerformance(id, poolAddress);
      
      res.json({ performance });
    } catch (error) {
      logger.error('评估策略性能失败', { error });
      res.status(500).json({ error: '评估策略性能失败', message: (error as Error).message });
    }
  };

  /**
   * 优化策略参数
   * @param req 请求对象
   * @param res 响应对象
   */
  optimizeStrategyParameters = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { poolAddress } = req.body;
      
      if (!poolAddress) {
        res.status(400).json({ error: '参数错误', message: '缺少池子地址' });
        return;
      }
      
      // 优化策略参数
      const parameters = await this.strategyManager.optimizeStrategyParameters(id, poolAddress);
      
      res.json({ parameters });
    } catch (error) {
      logger.error('优化策略参数失败', { error });
      res.status(500).json({ error: '优化策略参数失败', message: (error as Error).message });
    }
  };

  /**
   * 手动生成信号
   * @param req 请求对象
   * @param res 响应对象
   */
  generateSignals = async (req: Request, res: Response): Promise<void> => {
    try {
      // 生成信号
      const signals = await this.signalGenerator.generateSignals();
      
      // 调用信号生成回调
      if (this.onSignalsGenerated && signals.length > 0) {
        this.onSignalsGenerated(signals);
      }
      
      res.json({
        success: true,
        count: signals.length,
        timestamp: Date.now(),
      });
    } catch (error) {
      logger.error('手动生成信号失败', { error });
      res.status(500).json({ error: '手动生成信号失败', message: (error as Error).message });
    }
  };
}

export default SignalController; 