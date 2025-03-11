import { Logger } from '../../utils/logger';
import { CruiseModule } from './CruiseModule';
import { ScheduledTaskManager } from './ScheduledTaskManager';
import { PositionOptimizer } from './PositionOptimizer';
import { AgentStateMachine } from '../AgentStateMachine';
import { TransactionExecutor } from '../TransactionExecutor';
import { FundsManager } from '../FundsManager';
import { RiskController } from '../RiskController';
import { config } from '../../config';
import { CruiseMetrics } from './CruiseMetrics';
import { PoolRecommendation, AgentConfig, AgentState, TransactionRequest, TransactionResult, FundsStatus } from '../../types';

// Define the SignalService interface
interface SignalService {
  getSignal: () => Promise<any>;
  getT1Pools: () => Promise<PoolRecommendation[]>;
}

// Define the AgentStateManager interface that extends AgentStateMachine
interface AgentStateManager extends AgentStateMachine {
  getActiveAgents(): Promise<Array<{id: string, config: AgentConfig}>>;
  getAgentState(agentId: string): Promise<{state: AgentState, config: AgentConfig}>;
}

// Define the TransactionManager interface
interface TransactionManager {
  executeTransaction(request: TransactionRequest): Promise<TransactionResult>;
}

// Define the FundsStateManager interface
interface FundsStateManager {
  getFundsStatus(agentId: string, walletAddress: string): Promise<FundsStatus>;
  checkTransactionLimit(agentId: string, amount: number, transactionType: string): Promise<boolean>;
  updateFundsStatus(agentId: string, walletAddress: string, newStatus: Partial<FundsStatus>): Promise<FundsStatus>;
  calculateReturns(agentId: string): Promise<{
    totalReturns: number;
    dailyReturns: number;
    weeklyReturns: number;
    monthlyReturns: number;
  }>;
  recordTransaction(agentId: string, amount: number, type: string): void;
  getWalletBalance(walletAddress: string): Promise<number>;
  checkFundsSafety(agentId: string): Promise<boolean>;
  getAgentFunds(agentId: string): Promise<FundsStatus>;
}

/**
 * CruiseService - 自动巡航服务
 * 
 * 单例模式实现的服务，负责管理CruiseModule实例
 * 提供对外的API接口，用于启动、停止巡航服务以及执行特定代理的健康检查和优化
 */
export class CruiseService {
  private static instance: CruiseService | null = null;
  private cruiseModule: CruiseModule | null = null;
  private logger: Logger;
  private isRunning = false;
  private metrics: CruiseMetrics;
  
  // 依赖的服务
  private agentStateMachine: AgentStateManager;
  private transactionExecutor: TransactionManager;
  private fundsManager: FundsStateManager;
  private riskController: RiskController;
  
  /**
   * 私有构造函数，防止直接实例化
   */
  private constructor(
    logger: Logger,
    agentStateMachine: AgentStateManager,
    transactionExecutor: TransactionManager,
    fundsManager: FundsStateManager,
    riskController: RiskController
  ) {
    this.logger = logger.child({ module: 'CruiseService' });
    this.agentStateMachine = agentStateMachine;
    this.transactionExecutor = transactionExecutor;
    this.fundsManager = fundsManager;
    this.riskController = riskController;
    
    // 初始化指标收集器
    this.metrics = new CruiseMetrics(logger);
    
    this.logger.info('CruiseService initialized');
  }
  
  /**
   * 获取单例实例
   */
  public static getInstance(
    logger: Logger,
    agentStateMachine: AgentStateManager,
    transactionExecutor: TransactionManager,
    fundsManager: FundsStateManager,
    riskController: RiskController
  ): CruiseService {
    if (!CruiseService.instance) {
      CruiseService.instance = new CruiseService(
        logger,
        agentStateMachine,
        transactionExecutor,
        fundsManager,
        riskController
      );
    }
    return CruiseService.instance;
  }
  
  /**
   * 启动巡航服务
   */
  public async start(): Promise<boolean> {
    try {
      if (this.isRunning) {
        this.logger.info('CruiseService is already running');
        return true;
      }
      
      this.logger.info('Starting CruiseService...');
      
      // 创建任务管理器
      const taskManager = new ScheduledTaskManager(this.logger);
      
      // 创建仓位优化器
      const getPoolRecommendations = async (poolAddress: string) => {
        // 这里应该调用信号服务获取池子推荐
        // 目前简化处理，返回默认值
        return {
          healthScore: 4.0,
          action: 'maintain',
          priceChange24h: 0.01,
          volumeChange: 0.05,
          liquidityChange: 0.02
        };
      };
      
      const positionOptimizer = new PositionOptimizer(
        this.logger,
        getPoolRecommendations
      );
      
      // Create signal service
      const signalService: SignalService = {
        getSignal: async () => {
          // Implement signal service logic
          return {
            action: 'maintain',
            healthScore: 4.0,
            adjustmentPercentage: 0.0,
            targetBins: []
          };
        },
        getT1Pools: async () => {
          // Implement T1 pools logic
          return [];
        }
      };
      
      // 创建巡航模块
      this.cruiseModule = new CruiseModule(
        this.logger,
        this.agentStateMachine,
        this.transactionExecutor,
        this.fundsManager,
        this.riskController,
        signalService,
        positionOptimizer,
        taskManager,
        this.metrics
      );
      
      // 启动巡航模块
      await this.cruiseModule.start();
      
      // 注册所有活跃代理
      const activeAgents = await this.agentStateMachine.getActiveAgents();
      for (const agent of activeAgents) {
        await this.cruiseModule.registerAgent(agent.id, agent.config);
        
        // 为指标收集器注册代理
        this.metrics.registerAgent(agent.id);
      }
      
      // 启动指标报告
      this.metrics.startMetricsReporting();
      
      // 更新任务指标
      this.updateTaskMetrics(taskManager);
      
      // 设置定期更新任务指标
      setInterval(() => {
        this.updateTaskMetrics(taskManager);
      }, 30000); // 每30秒更新一次
      
      this.isRunning = true;
      this.logger.info('CruiseService started successfully');
      return true;
      
    } catch (error) {
      this.logger.error(`Failed to start CruiseService: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
  
  /**
   * 停止巡航服务
   */
  public async stop(): Promise<boolean> {
    try {
      if (!this.isRunning || !this.cruiseModule) {
        this.logger.info('CruiseService is not running');
        return true;
      }
      
      this.logger.info('Stopping CruiseService...');
      
      // 停止指标报告
      this.metrics.stopMetricsReporting();
      
      // 停止巡航模块
      await this.cruiseModule.stop();
      this.cruiseModule = null;
      this.isRunning = false;
      
      this.logger.info('CruiseService stopped successfully');
      return true;
      
    } catch (error) {
      this.logger.error(`Failed to stop CruiseService: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
  
  /**
   * 获取服务健康状态
   */
  public getHealth(): { isRunning: boolean; agentCount?: number; metrics?: any } {
    const health = {
      isRunning: this.isRunning
    };
    
    if (this.isRunning && this.cruiseModule) {
      return {
        ...health,
        agentCount: this.cruiseModule.getRegisteredAgentCount(),
        metrics: this.metrics.getMetricsSummary()
      };
    }
    
    return health;
  }
  
  /**
   * 执行特定代理的健康检查
   */
  public async performAgentHealthCheck(agentId: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.isRunning || !this.cruiseModule) {
        return {
          success: false,
          message: 'CruiseService is not running'
        };
      }
      
      this.logger.info(`Performing manual health check for agent ${agentId}`);
      
      // 记录开始时间
      const startTime = Date.now();
      
      // 执行健康检查
      const result = await this.cruiseModule.performHealthCheck(agentId);
      
      // 计算持续时间
      const duration = Date.now() - startTime;
      
      // 记录健康检查指标
      this.metrics.recordHealthCheck(agentId, result, duration);
      
      if (result) {
        return {
          success: true,
          message: `Health check completed for agent ${agentId}`
        };
      } else {
        return {
          success: false,
          message: `Failed to perform health check for agent ${agentId}`
        };
      }
      
    } catch (error) {
      this.logger.error(`Error in manual health check for agent ${agentId}: ${error instanceof Error ? error.message : String(error)}`);
      
      // 记录失败的健康检查
      this.metrics.recordHealthCheck(agentId, false, 0);
      
      return {
        success: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  
  /**
   * 执行特定代理的仓位优化
   */
  public async optimizeAgentPositions(agentId: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.isRunning || !this.cruiseModule) {
        return {
          success: false,
          message: 'CruiseService is not running'
        };
      }
      
      this.logger.info(`Performing manual position optimization for agent ${agentId}`);
      
      // 记录开始时间
      const startTime = Date.now();
      
      // 获取代理资金状态（用于记录指标）
      const funds = await this.fundsManager.getAgentFunds(agentId);
      
      // 执行优化
      const result = await this.cruiseModule.optimizePositions(agentId);
      
      // 计算持续时间
      const duration = Date.now() - startTime;
      
      // 记录优化指标
      this.metrics.recordOptimization(
        agentId,
        result,
        duration,
        0, // 实际操作数量未知，可以从优化结果中获取
        0, // 成功操作数量未知，可以从优化结果中获取
        0, // 健康度改善未知，可以从优化结果中获取
        funds.positions.length,
        funds.totalValueSol
      );
      
      if (result) {
        return {
          success: true,
          message: `Position optimization completed for agent ${agentId}`
        };
      } else {
        return {
          success: false,
          message: `Failed to optimize positions for agent ${agentId}`
        };
      }
      
    } catch (error) {
      this.logger.error(`Error in manual position optimization for agent ${agentId}: ${error instanceof Error ? error.message : String(error)}`);
      
      // 记录失败的优化
      this.metrics.recordOptimization(agentId, false, 0);
      
      return {
        success: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  
  /**
   * 获取指标
   */
  public getMetrics(): any {
    return this.metrics.getMetricsSummary();
  }
  
  /**
   * 获取代理指标
   */
  public getAgentMetrics(agentId: string): any {
    return this.metrics.getAgentMetrics(agentId);
  }
  
  /**
   * 更新任务指标
   */
  private updateTaskMetrics(taskManager: ScheduledTaskManager): void {
    try {
      const totalTasks = taskManager.getTaskCount();
      const activeTasks = taskManager.getEnabledTaskCount();
      
      this.metrics.updateTaskMetrics(totalTasks, activeTasks);
    } catch (error) {
      this.logger.error(`Failed to update task metrics: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
} 