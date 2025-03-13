import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../logger';
import { 
  Signal, 
  SignalQueryOptions, 
  SignalSubscriptionOptions,
  Strategy
} from '../types';
import { generateSignalsFromPoolData } from '../services/signalService';

/**
 * 信号控制器类
 */
export class SignalController {
  private signals: Map<string, Signal> = new Map();
  private strategies: Map<string, Strategy> = new Map();
  private signalGenerationInterval: NodeJS.Timeout | null = null;
  private subscribers: Map<string, { 
    options: SignalSubscriptionOptions, 
    callback: (signals: Signal[]) => void 
  }> = new Map();
  
  /**
   * 构造函数
   */
  constructor() {
    logger.info('SignalController 初始化');
  }

  /**
   * 启动信号服务
   */
  async start(): Promise<void> {
    try {
      logger.info('启动信号服务');
      
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
    
    logger.info('信号服务已停止');
  }

  /**
   * 设置定时任务
   */
  private setupIntervals(): void {
    // 信号生成定时任务
    const interval = parseInt(process.env.SIGNAL_GENERATION_INTERVAL || '300000', 10);
    this.signalGenerationInterval = setInterval(async () => {
      try {
        logger.info('执行定时信号清理');
        
        // 清理过期信号
        this.cleanExpiredSignals();
        
        logger.info('定时信号清理完成');
      } catch (error) {
        logger.error('定时信号清理失败', { error });
      }
    }, interval);
  }

  /**
   * 清理过期信号
   */
  private cleanExpiredSignals(): void {
    const now = Date.now();
    let expiredCount = 0;

    for (const [id, signal] of this.signals.entries()) {
      if (signal.expirationTimestamp < now) {
        this.signals.delete(id);
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      logger.info(`清理了 ${expiredCount} 个过期信号`);
    }
  }

  /**
   * 获取信号
   */
  getSignals = async (req: Request, res: Response): Promise<void> => {
    try {
      const options: SignalQueryOptions = req.query as any;
      
      // 获取所有信号
      const allSignals = Array.from(this.signals.values());
      
      // 过滤信号
      const filteredSignals = this.filterSignals(allSignals, options);
      
      // 分页
      const limit = options.limit || 20;
      const offset = options.offset || 0;
      const paginatedSignals = filteredSignals.slice(offset, offset + limit);
      
      res.status(200).json({
        success: true,
        data: paginatedSignals,
        total: filteredSignals.length,
        limit,
        offset
      });
    } catch (error) {
      logger.error('获取信号失败', { error });
      res.status(500).json({
        success: false,
        error: '获取信号失败'
      });
    }
  };

  /**
   * 获取信号详情
   */
  getSignalById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      // 获取信号
      const signal = this.signals.get(id);
      
      if (!signal) {
        res.status(404).json({
          success: false,
          error: '信号不存在'
        });
        return;
      }
      
      res.status(200).json({
        success: true,
        data: signal
      });
    } catch (error) {
      logger.error('获取信号详情失败', { error });
      res.status(500).json({
        success: false,
        error: '获取信号详情失败'
      });
    }
  };

  /**
   * 手动生成信号
   */
  generateSignals = async (req: Request, res: Response): Promise<void> => {
    try {
      const { poolData } = req.body;
      
      if (!poolData || !poolData.address) {
        res.status(400).json({
          success: false,
          error: '缺少池子数据'
        });
        return;
      }
      
      // 生成信号
      const signals = generateSignalsFromPoolData(poolData);
      
      // 保存信号
      for (const signal of signals) {
        this.signals.set(signal.id, signal);
      }
      
      res.status(200).json({
        success: true,
        data: signals,
        message: `成功生成 ${signals.length} 个信号`
      });
    } catch (error) {
      logger.error('生成信号失败', { error });
      res.status(500).json({
        success: false,
        error: '生成信号失败'
      });
    }
  };

  /**
   * 获取策略列表
   */
  getStrategies = async (req: Request, res: Response): Promise<void> => {
    try {
      const strategies = Array.from(this.strategies.values());
      
      res.status(200).json({
        success: true,
        data: strategies
      });
    } catch (error) {
      logger.error('获取策略列表失败', { error });
      res.status(500).json({
        success: false,
        error: '获取策略列表失败'
      });
    }
  };

  /**
   * 获取策略详情
   */
  getStrategyById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      // 获取策略
      const strategy = this.strategies.get(id);
      
      if (!strategy) {
        res.status(404).json({
          success: false,
          error: '策略不存在'
        });
        return;
      }
      
      res.status(200).json({
        success: true,
        data: strategy
      });
    } catch (error) {
      logger.error('获取策略详情失败', { error });
      res.status(500).json({
        success: false,
        error: '获取策略详情失败'
      });
    }
  };

  /**
   * 创建策略
   */
  createStrategy = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, description, poolAddresses, parameters } = req.body;
      
      if (!name || !description || !poolAddresses || !parameters) {
        res.status(400).json({
          success: false,
          error: '缺少必要参数'
        });
        return;
      }
      
      // 创建策略
      const strategy: Strategy = {
        id: uuidv4(),
        name,
        description,
        poolAddresses,
        parameters,
        active: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      // 保存策略
      this.strategies.set(strategy.id, strategy);
      
      res.status(201).json({
        success: true,
        data: strategy,
        message: '策略创建成功'
      });
    } catch (error) {
      logger.error('创建策略失败', { error });
      res.status(500).json({
        success: false,
        error: '创建策略失败'
      });
    }
  };

  /**
   * 更新策略
   */
  updateStrategy = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { name, description, poolAddresses, parameters, active } = req.body;
      
      // 获取策略
      const strategy = this.strategies.get(id);
      
      if (!strategy) {
        res.status(404).json({
          success: false,
          error: '策略不存在'
        });
        return;
      }
      
      // 更新策略
      const updatedStrategy: Strategy = {
        ...strategy,
        name: name || strategy.name,
        description: description || strategy.description,
        poolAddresses: poolAddresses || strategy.poolAddresses,
        parameters: parameters || strategy.parameters,
        active: active !== undefined ? active : strategy.active,
        updatedAt: Date.now()
      };
      
      // 保存策略
      this.strategies.set(id, updatedStrategy);
      
      res.status(200).json({
        success: true,
        data: updatedStrategy,
        message: '策略更新成功'
      });
    } catch (error) {
      logger.error('更新策略失败', { error });
      res.status(500).json({
        success: false,
        error: '更新策略失败'
      });
    }
  };

  /**
   * 删除策略
   */
  deleteStrategy = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      // 获取策略
      const strategy = this.strategies.get(id);
      
      if (!strategy) {
        res.status(404).json({
          success: false,
          error: '策略不存在'
        });
        return;
      }
      
      // 删除策略
      this.strategies.delete(id);
      
      res.status(200).json({
        success: true,
        message: '策略删除成功'
      });
    } catch (error) {
      logger.error('删除策略失败', { error });
      res.status(500).json({
        success: false,
        error: '删除策略失败'
      });
    }
  };

  /**
   * 评估策略性能
   */
  evaluateStrategyPerformance = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      // 获取策略
      const strategy = this.strategies.get(id);
      
      if (!strategy) {
        res.status(404).json({
          success: false,
          error: '策略不存在'
        });
        return;
      }
      
      // 模拟评估策略性能
      const performance = {
        roi: Math.random() * 0.5, // 0-50% 的 ROI
        sharpeRatio: 1 + Math.random() * 2, // 1-3 的夏普比率
        maxDrawdown: Math.random() * 0.2, // 0-20% 的最大回撤
        winRate: 0.5 + Math.random() * 0.3 // 50-80% 的胜率
      };
      
      // 更新策略性能
      const updatedStrategy: Strategy = {
        ...strategy,
        performance,
        updatedAt: Date.now()
      };
      
      // 保存策略
      this.strategies.set(id, updatedStrategy);
      
      res.status(200).json({
        success: true,
        data: {
          strategyId: id,
          performance
        },
        message: '策略性能评估成功'
      });
    } catch (error) {
      logger.error('评估策略性能失败', { error });
      res.status(500).json({
        success: false,
        error: '评估策略性能失败'
      });
    }
  };

  /**
   * 优化策略参数
   */
  optimizeStrategyParameters = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      // 获取策略
      const strategy = this.strategies.get(id);
      
      if (!strategy) {
        res.status(404).json({
          success: false,
          error: '策略不存在'
        });
        return;
      }
      
      // 模拟优化策略参数
      const optimizedParameters = { ...strategy.parameters };
      
      // 随机调整一些参数
      for (const key in optimizedParameters) {
        if (typeof optimizedParameters[key] === 'number') {
          optimizedParameters[key] *= 0.9 + Math.random() * 0.2; // 调整 ±10%
        }
      }
      
      // 更新策略
      const updatedStrategy: Strategy = {
        ...strategy,
        parameters: optimizedParameters,
        updatedAt: Date.now()
      };
      
      // 保存策略
      this.strategies.set(id, updatedStrategy);
      
      res.status(200).json({
        success: true,
        data: {
          strategyId: id,
          originalParameters: strategy.parameters,
          optimizedParameters
        },
        message: '策略参数优化成功'
      });
    } catch (error) {
      logger.error('优化策略参数失败', { error });
      res.status(500).json({
        success: false,
        error: '优化策略参数失败'
      });
    }
  };

  /**
   * 过滤信号
   */
  private filterSignals(signals: Signal[], options: SignalQueryOptions): Signal[] {
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
      
      // 按时间戳过滤
      if (options.fromTimestamp !== undefined) {
        if (signal.timestamp < options.fromTimestamp) {
          return false;
        }
      }
      
      if (options.toTimestamp !== undefined) {
        if (signal.timestamp > options.toTimestamp) {
          return false;
        }
      }
      
      return true;
    });
  }
} 