/**
 * 策略管理器
 */
import { v4 as uuidv4 } from 'uuid';
import { Strategy, StrategyType, StrategyQueryOptions } from '../types';
import { logger } from '../utils/logger';
import { HttpClient } from '../utils/http-client';
import { config } from '../config';

/**
 * 策略管理器类
 */
export class StrategyManager {
  private dataServiceClient: HttpClient;
  private strategies: Map<string, Strategy> = new Map();
  private lastUpdateTime: number = 0;

  /**
   * 构造函数
   */
  constructor() {
    this.dataServiceClient = new HttpClient(config.dataServiceUrl, {
      timeout: 30000, // 30秒
      retryCount: 3,
    });
    logger.info('StrategyManager initialized');
  }

  /**
   * 初始化策略
   */
  async initialize(): Promise<void> {
    try {
      logger.info('开始初始化策略');
      
      // 从数据服务获取策略数据
      const strategies = await this.fetchStrategiesFromDataService();
      logger.info(`获取到 ${strategies.length} 个策略`);
      
      // 清空当前策略
      this.strategies.clear();
      
      // 添加策略
      for (const strategy of strategies) {
        this.strategies.set(strategy.id, strategy);
      }
      
      this.lastUpdateTime = Date.now();
      logger.info('策略初始化完成');
    } catch (error) {
      logger.error('策略初始化失败', { error });
      throw error;
    }
  }

  /**
   * 更新策略
   */
  async updateStrategies(): Promise<void> {
    try {
      logger.info('开始更新策略');
      
      // 从数据服务获取策略数据
      const strategies = await this.fetchStrategiesFromDataService();
      logger.info(`获取到 ${strategies.length} 个策略`);
      
      // 更新策略
      let addedCount = 0;
      let updatedCount = 0;
      
      for (const strategy of strategies) {
        const existingStrategy = this.strategies.get(strategy.id);
        
        if (!existingStrategy) {
          // 新策略
          this.strategies.set(strategy.id, strategy);
          addedCount++;
        } else if (existingStrategy.updatedAt < strategy.updatedAt) {
          // 更新策略
          this.strategies.set(strategy.id, strategy);
          updatedCount++;
        }
      }
      
      this.lastUpdateTime = Date.now();
      logger.info(`策略更新完成，新增 ${addedCount} 个，更新 ${updatedCount} 个`);
    } catch (error) {
      logger.error('策略更新失败', { error });
      throw error;
    }
  }

  /**
   * 获取策略
   * @param id 策略ID
   * @returns 策略对象
   */
  getStrategy(id: string): Strategy | undefined {
    return this.strategies.get(id);
  }

  /**
   * 获取所有策略
   * @returns 策略列表
   */
  getAllStrategies(): Strategy[] {
    return Array.from(this.strategies.values());
  }

  /**
   * 查询策略
   * @param options 查询选项
   * @returns 策略列表
   */
  queryStrategies(options: StrategyQueryOptions): Strategy[] {
    let result = this.getAllStrategies();
    
    // 按池子地址过滤
    if (options.poolAddresses && options.poolAddresses.length > 0) {
      result = result.filter(strategy => 
        strategy.poolAddresses.some(address => 
          options.poolAddresses?.includes(address)
        )
      );
    }
    
    // 按策略类型过滤
    if (options.strategyTypes && options.strategyTypes.length > 0) {
      result = result.filter(strategy => 
        options.strategyTypes?.includes(strategy.type)
      );
    }
    
    // 按激活状态过滤
    if (options.isActive !== undefined) {
      result = result.filter(strategy => 
        strategy.isActive === options.isActive
      );
    }
    
    // 应用分页
    if (options.offset !== undefined || options.limit !== undefined) {
      const offset = options.offset || 0;
      const limit = options.limit || result.length;
      result = result.slice(offset, offset + limit);
    }
    
    return result;
  }

  /**
   * 创建策略
   * @param strategy 策略对象（不包含ID、创建时间和更新时间）
   * @returns 创建的策略
   */
  createStrategy(strategy: Omit<Strategy, 'id' | 'createdAt' | 'updatedAt'>): Strategy {
    const now = Date.now();
    const newStrategy: Strategy = {
      ...strategy,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };
    
    this.strategies.set(newStrategy.id, newStrategy);
    logger.info(`创建策略: ${newStrategy.id} - ${newStrategy.name}`);
    
    return newStrategy;
  }

  /**
   * 更新策略
   * @param id 策略ID
   * @param updates 更新内容
   * @returns 更新后的策略
   */
  updateStrategy(
    id: string, 
    updates: Partial<Omit<Strategy, 'id' | 'createdAt' | 'updatedAt'>>
  ): Strategy | undefined {
    const strategy = this.strategies.get(id);
    
    if (!strategy) {
      logger.warn(`更新策略失败: 找不到策略 ${id}`);
      return undefined;
    }
    
    const updatedStrategy: Strategy = {
      ...strategy,
      ...updates,
      updatedAt: Date.now(),
    };
    
    this.strategies.set(id, updatedStrategy);
    logger.info(`更新策略: ${id} - ${updatedStrategy.name}`);
    
    return updatedStrategy;
  }

  /**
   * 删除策略
   * @param id 策略ID
   * @returns 是否删除成功
   */
  deleteStrategy(id: string): boolean {
    const success = this.strategies.delete(id);
    
    if (success) {
      logger.info(`删除策略: ${id}`);
    } else {
      logger.warn(`删除策略失败: 找不到策略 ${id}`);
    }
    
    return success;
  }

  /**
   * 激活策略
   * @param id 策略ID
   * @returns 更新后的策略
   */
  activateStrategy(id: string): Strategy | undefined {
    return this.updateStrategy(id, { isActive: true });
  }

  /**
   * 停用策略
   * @param id 策略ID
   * @returns 更新后的策略
   */
  deactivateStrategy(id: string): Strategy | undefined {
    return this.updateStrategy(id, { isActive: false });
  }

  /**
   * 获取池子的策略
   * @param poolAddress 池子地址
   * @returns 策略列表
   */
  getPoolStrategies(poolAddress: string): Strategy[] {
    return this.getAllStrategies().filter(strategy => 
      strategy.poolAddresses.includes(poolAddress)
    );
  }

  /**
   * 获取最后更新时间
   * @returns 最后更新时间
   */
  getLastUpdateTime(): number {
    return this.lastUpdateTime;
  }

  /**
   * 从数据服务获取策略数据
   * @returns 策略列表
   */
  private async fetchStrategiesFromDataService(): Promise<Strategy[]> {
    try {
      const response = await this.dataServiceClient.get('/api/strategies');
      return response.strategies || [];
    } catch (error) {
      logger.error('获取策略数据失败', { error });
      throw error;
    }
  }

  /**
   * 评估策略性能
   * @param strategyId 策略ID
   * @param poolAddress 池子地址
   * @returns 性能评估结果
   */
  async evaluateStrategyPerformance(strategyId: string, poolAddress: string): Promise<any> {
    try {
      const strategy = this.strategies.get(strategyId);
      
      if (!strategy) {
        throw new Error(`找不到策略 ${strategyId}`);
      }
      
      if (!strategy.poolAddresses.includes(poolAddress)) {
        throw new Error(`策略 ${strategyId} 不适用于池子 ${poolAddress}`);
      }
      
      // 从数据服务获取性能评估数据
      const response = await this.dataServiceClient.post('/api/strategies/evaluate', {
        strategyId,
        poolAddress,
        parameters: strategy.parameters,
      });
      
      return response.performance || {};
    } catch (error) {
      logger.error('评估策略性能失败', { error, strategyId, poolAddress });
      throw error;
    }
  }

  /**
   * 优化策略参数
   * @param strategyId 策略ID
   * @param poolAddress 池子地址
   * @returns 优化后的参数
   */
  async optimizeStrategyParameters(strategyId: string, poolAddress: string): Promise<any> {
    try {
      const strategy = this.strategies.get(strategyId);
      
      if (!strategy) {
        throw new Error(`找不到策略 ${strategyId}`);
      }
      
      if (!strategy.poolAddresses.includes(poolAddress)) {
        throw new Error(`策略 ${strategyId} 不适用于池子 ${poolAddress}`);
      }
      
      // 从数据服务获取参数优化数据
      const response = await this.dataServiceClient.post('/api/strategies/optimize', {
        strategyId,
        poolAddress,
        currentParameters: strategy.parameters,
      });
      
      const optimizedParameters = response.parameters || {};
      
      // 更新策略参数
      this.updateStrategy(strategyId, {
        parameters: optimizedParameters,
      });
      
      return optimizedParameters;
    } catch (error) {
      logger.error('优化策略参数失败', { error, strategyId, poolAddress });
      throw error;
    }
  }
}

export default StrategyManager; 