import { Logger } from '../../utils/logger';
import { 
  AgentConfig, 
  AgentState, 
  PoolRecommendation, 
  FundsStatus, 
  RiskAssessment,
  TransactionType
} from '../../types';
import { PositionOptimizer } from '../../core/cruise/PositionOptimizer';
import { ScheduledTaskManager } from '../../core/cruise/ScheduledTaskManager';
import { CruiseMetrics } from '../../core/cruise/CruiseMetrics';

// 巡航配置接口
interface CruiseConfig {
  maxPositions: number;
  minHealthScore: number;
  optimizationThreshold: number;
  marketChangeThreshold: number;
  healthCheckIntervalMinutes: number;
  optimizationIntervalHours: number;
  marketCheckIntervalMinutes: number;
}

// 默认巡航配置
const DEFAULT_CRUISE_CONFIG: CruiseConfig = {
  maxPositions: 5,
  minHealthScore: 3.0,
  optimizationThreshold: 0.1, // 10%偏差触发优化
  marketChangeThreshold: 0.05, // 5%市场变化触发检查
  healthCheckIntervalMinutes: 5,
  optimizationIntervalHours: 4,
  marketCheckIntervalMinutes: 15
};

// These interfaces would normally be imported from their respective modules
// For now, we'll define placeholder interfaces to fix the linter errors
interface AgentStateMachine {
  getActiveAgents(): Promise<Array<{id: string, config: AgentConfig}>>;
  getAgentState(agentId: string): Promise<{state: AgentState, config: AgentConfig}>;
}

interface TransactionExecutor {
  executeTransaction(transaction: {
    type: TransactionType;
    agentId: string;
    data: Record<string, unknown>;
  }): Promise<{success: boolean; error?: string}>;
}

interface FundsManager {
  getAgentFunds(agentId: string): Promise<FundsStatus>;
}

interface RiskController {
  assessRisk(agentId: string): Promise<RiskAssessment>;
}

interface SignalService {
  getT1Pools(): Promise<PoolRecommendation[]>;
}

/**
 * CruiseModule - 自动巡航模块
 * 
 * 负责管理代理的自动健康检查和仓位优化
 * 通过定时任务管理器调度各种任务
 */
export class CruiseModule {
  private logger: Logger;
  private agentStateMachine: AgentStateMachine;
  private transactionExecutor: TransactionExecutor;
  private fundsManager: FundsManager;
  private riskController: RiskController;
  private signalService: SignalService;
  private positionOptimizer: PositionOptimizer;
  private taskManager: ScheduledTaskManager;
  private metrics: CruiseMetrics;
  
  private registeredAgents: Map<string, AgentConfig> = new Map();
  private agentCruiseConfigs: Map<string, CruiseConfig> = new Map();
  private isRunning = false;
  
  /**
   * 构造函数
   */
  constructor(
    logger: Logger,
    agentStateMachine: AgentStateMachine,
    transactionExecutor: TransactionExecutor,
    fundsManager: FundsManager,
    riskController: RiskController,
    signalService: SignalService,
    positionOptimizer: PositionOptimizer,
    taskManager: ScheduledTaskManager,
    metrics: CruiseMetrics
  ) {
    this.logger = logger.child({ module: 'CruiseModule' });
    this.agentStateMachine = agentStateMachine;
    this.transactionExecutor = transactionExecutor;
    this.fundsManager = fundsManager;
    this.riskController = riskController;
    this.signalService = signalService;
    this.positionOptimizer = positionOptimizer;
    this.taskManager = taskManager;
    this.metrics = metrics;
    
    this.logger.info('CruiseModule initialized');
  }
  
  /**
   * 启动巡航模块
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.info('CruiseModule is already running');
      return;
    }
    
    this.logger.info('Starting CruiseModule...');
    
    try {
      // 启动任务管理器
      await this.taskManager.start();
      
      // 恢复所有活跃代理的任务
      const activeAgents = await this.agentStateMachine.getActiveAgents();
      for (const agent of activeAgents) {
        await this.registerAgent(agent.id, agent.config);
      }
      
      this.isRunning = true;
      this.logger.info(`CruiseModule started successfully with ${activeAgents.length} active agents`);
      
    } catch (error) {
      this.logger.error(`Failed to start CruiseModule: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  /**
   * 停止巡航模块
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      this.logger.info('CruiseModule is not running');
      return;
    }
    
    this.logger.info('Stopping CruiseModule...');
    
    try {
      // 停止所有任务
      await this.taskManager.stop();
      
      // 清空注册的代理
      this.registeredAgents.clear();
      this.agentCruiseConfigs.clear();
      
      this.isRunning = false;
      this.logger.info('CruiseModule stopped successfully');
      
    } catch (error) {
      this.logger.error(`Failed to stop CruiseModule: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  /**
   * 注册代理
   */
  public async registerAgent(agentId: string, config: AgentConfig): Promise<boolean> {
    try {
      if (!this.isRunning) {
        this.logger.warn(`Cannot register agent ${agentId} - CruiseModule is not running`);
        return false;
      }
      
      if (this.registeredAgents.has(agentId)) {
        this.logger.info(`Agent ${agentId} is already registered`);
        return true;
      }
      
      this.logger.info(`Registering agent ${agentId} for automated management`);
      
      // 创建巡航配置
      const cruiseConfig = {
        ...DEFAULT_CRUISE_CONFIG,
        maxPositions: config.maxPositions || DEFAULT_CRUISE_CONFIG.maxPositions,
        healthCheckIntervalMinutes: config.healthCheckIntervalMinutes || DEFAULT_CRUISE_CONFIG.healthCheckIntervalMinutes,
        optimizationIntervalHours: config.optimizationIntervalHours || DEFAULT_CRUISE_CONFIG.optimizationIntervalHours
      };
      
      // 保存配置
      this.registeredAgents.set(agentId, config);
      this.agentCruiseConfigs.set(agentId, cruiseConfig);
      
      // 设置代理的任务
      await this.setupAgentTasks(agentId, config, cruiseConfig);
      
      // 执行初始健康检查
      await this.performHealthCheck(agentId);
      
      this.logger.info(`Agent ${agentId} registered successfully`);
      return true;
      
    } catch (error) {
      this.logger.error(`Failed to register agent ${agentId}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
  
  /**
   * 注销代理
   */
  public async unregisterAgent(agentId: string): Promise<boolean> {
    try {
      if (!this.isRunning) {
        this.logger.warn(`Cannot unregister agent ${agentId} - CruiseModule is not running`);
        return false;
      }
      
      if (!this.registeredAgents.has(agentId)) {
        this.logger.info(`Agent ${agentId} is not registered`);
        return true;
      }
      
      this.logger.info(`Unregistering agent ${agentId}`);
      
      // 取消代理的所有任务
      this.taskManager.disableTasksByTag(`agent:${agentId}`);
      
      // 移除配置
      this.registeredAgents.delete(agentId);
      this.agentCruiseConfigs.delete(agentId);
      
      this.logger.info(`Agent ${agentId} unregistered successfully`);
      return true;
      
    } catch (error) {
      this.logger.error(`Failed to unregister agent ${agentId}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
  
  /**
   * 获取注册的代理数量
   */
  public getRegisteredAgentCount(): number {
    return this.registeredAgents.size;
  }
  
  /**
   * 执行代理健康检查
   */
  public async performHealthCheck(agentId: string): Promise<boolean> {
    try {
      if (!this.isRunning) {
        this.logger.warn(`Cannot perform health check - CruiseModule is not running`);
        return false;
      }
      
      if (!this.registeredAgents.has(agentId)) {
        this.logger.warn(`Agent ${agentId} is not registered for health checks`);
        return false;
      }
      
      this.logger.info(`Performing health check for agent ${agentId}`);
      
      // 获取代理状态
      const { state, config } = await this.agentStateMachine.getAgentState(agentId);
      
      if (state !== AgentState.RUNNING) {
        this.logger.info(`Agent ${agentId} is not running (state: ${state}), skipping health check`);
        return false;
      }
      
      // 获取代理资金状态
      const funds = await this.fundsManager.getAgentFunds(agentId);
      
      // 获取风险评估
      const riskAssessment = await this.riskController.assessRisk(agentId);
      
      // 获取风险评估
      const riskAssessmentResult: RiskAssessment = {
        agentId,
        timestamp: Date.now(),
        healthScore: riskAssessment.healthScore,
        riskLevel: riskAssessment.riskLevel,
        warnings: riskAssessment.warnings,
        recommendations: [],
        triggers: []
      };
      
      // 更新指标
      this.recordHealthCheckMetrics(agentId, {
        healthScore: riskAssessmentResult.healthScore,
        riskLevel: riskAssessmentResult.riskLevel,
        positionCount: funds.positions.length,
        totalValueSol: funds.totalValueSol,
        availableSol: funds.availableSol
      });
      
      // 检查是否需要补充仓位
      if (funds.positions.length < config.maxPositions && funds.availableSol >= config.minSolBalance) {
        await this.fillPositions(agentId);
      }
      
      // 识别不健康的仓位
      const unhealthyPositions = await this.positionOptimizer.identifyUnhealthyPositions(
        funds.positions,
        riskAssessmentResult
      );
      
      if (unhealthyPositions.length > 0) {
        this.logger.info(`Found ${unhealthyPositions.length} unhealthy positions for agent ${agentId}`);
        
        // 触发优化
        await this.optimizePositions(agentId);
      } else {
        this.logger.info(`All positions are healthy for agent ${agentId}`);
      }
      
      return true;
      
    } catch (error) {
      this.logger.error(`Health check failed for agent ${agentId}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
  
  /**
   * 补充仓位
   */
  private async fillPositions(agentId: string): Promise<boolean> {
    try {
      const config = this.registeredAgents.get(agentId);
      const cruiseConfig = this.agentCruiseConfigs.get(agentId);
      
      if (!config || !cruiseConfig) {
        throw new Error('Agent configuration not found');
      }
      
      // 获取当前资金状态
      const funds = await this.fundsManager.getAgentFunds(agentId);
      
      // 计算可以添加的仓位数量
      const availableSlots = cruiseConfig.maxPositions - funds.positions.length;
      
      if (availableSlots <= 0) {
        this.logger.info(`No available slots for new positions for agent ${agentId}`);
        return true;
      }
      
      // 获取T1池子推荐
      const t1Pools = await this.signalService.getT1Pools();
      
      // 过滤掉已有的池子
      const existingPoolAddresses = new Set(funds.positions.map(p => p.poolAddress));
      const availablePools = t1Pools.filter(p => !existingPoolAddresses.has(p.poolAddress));
      
      if (availablePools.length === 0) {
        this.logger.info(`No available T1 pools for agent ${agentId}`);
        return true;
      }
      
      // 按健康分数排序
      const sortedPools = availablePools.sort((a, b) => b.healthScore - a.healthScore);
      
      // 计算每个新仓位的资金量
      const fundsPerPosition = funds.availableSol / (availableSlots + 1); // 保留一部分作为缓冲
      
      // 添加新仓位
      let successCount = 0;
      for (let i = 0; i < Math.min(availableSlots, sortedPools.length); i++) {
        const pool = sortedPools[i];
        
        try {
          const result = await this.transactionExecutor.executeTransaction({
            type: TransactionType.ADD_LIQUIDITY,
            agentId,
            data: {
              poolAddress: pool.poolAddress,
              amountSol: fundsPerPosition,
              targetBins: pool.targetBins
            }
          });
          
          if (result.success) {
            successCount++;
            this.logger.info(`Successfully added position in pool ${pool.poolAddress} for agent ${agentId}`);
          } else {
            this.logger.warn(`Failed to add position in pool ${pool.poolAddress} for agent ${agentId}: ${result.error}`);
          }
        } catch (error) {
          this.logger.error(`Error adding position in pool ${pool.poolAddress}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      
      this.recordPositionFillMetrics(agentId, {
        attempted: Math.min(availableSlots, sortedPools.length),
        succeeded: successCount
      });
      
      return successCount > 0;
      
    } catch (error) {
      this.logger.error(`Failed to fill positions for agent ${agentId}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
  
  /**
   * 优化代理仓位
   */
  public async optimizePositions(agentId: string): Promise<boolean> {
    try {
      if (!this.isRunning) {
        this.logger.warn(`Cannot optimize positions - CruiseModule is not running`);
        return false;
      }
      
      if (!this.registeredAgents.has(agentId)) {
        this.logger.warn(`Agent ${agentId} is not registered for optimization`);
        return false;
      }
      
      const config = this.registeredAgents.get(agentId);
      const cruiseConfig = this.agentCruiseConfigs.get(agentId);
      
      if (!config || !cruiseConfig) {
        throw new Error('Agent configuration not found');
      }
      
      this.logger.info(`Optimizing positions for agent ${agentId}`);
      
      // 获取当前资金状态和风险评估
      const funds = await this.fundsManager.getAgentFunds(agentId);
      const riskAssessment = await this.riskController.assessRisk(agentId);
      
      // 获取优化建议
      const optimizationPlan = await this.positionOptimizer.calculateOptimalPositions(
        agentId,
        {
          ...funds,
          totalValueUsd: funds.totalValueSol * 20 // 使用一个估算的SOL价格
        },
        config
      );
      
      if (!optimizationPlan || optimizationPlan.actions.length === 0) {
        this.logger.info(`No optimization needed for agent ${agentId}`);
        return true;
      }
      
      this.logger.info(`Executing ${optimizationPlan.actions.length} optimization actions for agent ${agentId}`);
      
      // 执行优化操作
      let successCount = 0;
      for (const action of optimizationPlan.actions) {
        try {
          const transactionType = action.type === 'add' ? TransactionType.ADD_LIQUIDITY :
                                action.type === 'remove' ? TransactionType.REMOVE_LIQUIDITY :
                                TransactionType.ADD_LIQUIDITY; // 默认为添加流动性

          const result = await this.transactionExecutor.executeTransaction({
            type: transactionType,
            agentId,
            data: {
              poolAddress: action.poolAddress,
              amountSol: action.amountSol,
              targetAmountSol: action.targetAmountSol,
              targetBins: action.targetBins
            }
          });
          
          if (result.success) {
            successCount++;
            this.logger.info(`Successfully executed ${action.type} action for pool ${action.poolAddress}`);
          } else {
            this.logger.warn(`Failed to execute ${action.type} action for pool ${action.poolAddress}: ${result.error}`);
          }
        } catch (error) {
          this.logger.error(`Error executing ${action.type} action for pool ${action.poolAddress}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      
      this.recordOptimizationMetrics(agentId, {
        plannedActions: optimizationPlan.actions.length,
        successfulActions: successCount,
        expectedImprovement: optimizationPlan.expectedHealthImprovement
      });
      
      return successCount === optimizationPlan.actions.length;
      
    } catch (error) {
      this.logger.error(`Failed to optimize positions for agent ${agentId}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
  
  /**
   * 检查市场重大变化
   */
  public async checkForSignificantChanges(agentId: string): Promise<boolean> {
    try {
      if (!this.isRunning) {
        this.logger.warn(`Cannot check for market changes - CruiseModule is not running`);
        return false;
      }
      
      if (!this.registeredAgents.has(agentId)) {
        this.logger.warn(`Agent ${agentId} is not registered for market monitoring`);
        return false;
      }
      
      const cruiseConfig = this.agentCruiseConfigs.get(agentId);
      if (!cruiseConfig) {
        throw new Error('Cruise configuration not found');
      }
      
      this.logger.info(`Checking for significant market changes affecting agent ${agentId}`);
      
      // 获取当前资金状态
      const funds = await this.fundsManager.getAgentFunds(agentId);
      
      // 获取最新的T1池子列表
      const t1Pools = await this.signalService.getT1Pools();
      
      // 检查当前仓位是否仍然在T1列表中
      const t1PoolAddresses = new Set(t1Pools.map(p => p.poolAddress));
      const droppedPositions = funds.positions.filter(p => !t1PoolAddresses.has(p.poolAddress));
      
      if (droppedPositions.length > 0) {
        this.logger.warn(`Found ${droppedPositions.length} positions no longer in T1 list for agent ${agentId}`);
        
        // 触发优化以调整这些仓位
        await this.optimizePositions(agentId);
      }
      
      // 检查是否有更好的新池子可用
      const currentPoolAddresses = new Set(funds.positions.map(p => p.poolAddress));
      const newT1Pools = t1Pools.filter(p => !currentPoolAddresses.has(p.poolAddress));
      
      if (newT1Pools.length > 0) {
        const bestNewPool = newT1Pools[0];
        const worstCurrentPosition = funds.positions
          .sort((a, b) => a.valueSol - b.valueSol)[0];
        
        if (bestNewPool.healthScore > cruiseConfig.minHealthScore &&
            funds.positions.length < cruiseConfig.maxPositions) {
          // 添加新的仓位
          await this.fillPositions(agentId);
        }
      }
      
      return true;
      
    } catch (error) {
      this.logger.error(`Failed to check for market changes for agent ${agentId}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
  
  /**
   * 记录健康检查指标
   */
  private recordHealthCheckMetrics(
    agentId: string,
    data: {
      healthScore: number;
      riskLevel: 'low' | 'medium' | 'high' | 'critical';
      positionCount: number;
      totalValueSol: number;
      availableSol: number;
    }
  ): void {
    this.metrics.recordHealthCheck(
      agentId,
      true, // success
      0, // duration
      0, // unhealthyPositions
      data.healthScore
    );
  }
  
  /**
   * 记录仓位填充指标
   */
  private recordPositionFillMetrics(
    agentId: string,
    data: {
      attempted: number;
      succeeded: number;
    }
  ): void {
    this.metrics.recordOptimization(
      agentId,
      data.succeeded > 0, // success
      0, // duration
      data.attempted, // actionsExecuted
      data.succeeded // actionsSucceeded
    );
  }
  
  /**
   * 记录优化指标
   */
  private recordOptimizationMetrics(
    agentId: string,
    data: {
      plannedActions: number;
      successfulActions: number;
      expectedImprovement: number;
    }
  ): void {
    this.metrics.recordOptimization(
      agentId,
      data.successfulActions === data.plannedActions, // success
      0, // duration
      data.plannedActions, // actionsExecuted
      data.successfulActions, // actionsSucceeded
      data.expectedImprovement // healthImprovement
    );
  }
  
  /**
   * 设置代理的定时任务
   */
  private async setupAgentTasks(
    agentId: string,
    config: AgentConfig,
    cruiseConfig: CruiseConfig
  ): Promise<void> {
    const tag = `agent:${agentId}`;
    
    // 设置健康检查任务
    this.taskManager.scheduleRecurringTask(
      `${tag}:health_check`,
      async () => {
        await this.performHealthCheck(agentId);
        return;
      },
      cruiseConfig.healthCheckIntervalMinutes * 60 * 1000,
      0, // startDelayMs
      [tag]
    );
    
    // 设置优化任务
    this.taskManager.scheduleRecurringTask(
      `${tag}:optimization`,
      async () => {
        await this.optimizePositions(agentId);
        return;
      },
      cruiseConfig.optimizationIntervalHours * 60 * 60 * 1000,
      0, // startDelayMs
      [tag]
    );
    
    // 设置市场变化检查任务
    this.taskManager.scheduleRecurringTask(
      `${tag}:market_check`,
      async () => {
        await this.checkForSignificantChanges(agentId);
        return;
      },
      cruiseConfig.marketCheckIntervalMinutes * 60 * 1000,
      0, // startDelayMs
      [tag]
    );
    
    this.logger.info(`Scheduled all tasks for agent ${agentId}`);
  }
} 