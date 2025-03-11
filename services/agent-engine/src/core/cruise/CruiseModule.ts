import { Logger } from '../../utils/logger';
import { AgentConfig } from '../../types';
import { PositionOptimizer } from './PositionOptimizer';
import { ScheduledTaskManager } from './ScheduledTaskManager';

// These interfaces would normally be imported from their respective modules
// For now, we'll define placeholder interfaces to fix the linter errors
interface AgentStateMachine {
  getActiveAgents(): Promise<Array<{id: string, config: AgentConfig}>>;
  getAgentState(agentId: string): Promise<any>;
}

interface TransactionExecutor {
  executeTransaction(transaction: any): Promise<boolean>;
}

interface FundsManager {
  getAgentFunds(agentId: string): Promise<any>;
}

interface RiskController {
  assessRisk(agentId: string): Promise<any>;
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
  private positionOptimizer: PositionOptimizer;
  private taskManager: ScheduledTaskManager;
  
  private registeredAgents: Map<string, AgentConfig> = new Map();
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
    positionOptimizer: PositionOptimizer,
    taskManager: ScheduledTaskManager
  ) {
    this.logger = logger.child({ module: 'CruiseModule' });
    this.agentStateMachine = agentStateMachine;
    this.transactionExecutor = transactionExecutor;
    this.fundsManager = fundsManager;
    this.riskController = riskController;
    this.positionOptimizer = positionOptimizer;
    this.taskManager = taskManager;
    
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
    
    // 启动任务管理器
    await this.taskManager.start();
    
    this.isRunning = true;
    this.logger.info('CruiseModule started successfully');
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
    
    // 停止任务管理器
    await this.taskManager.stop();
    
    // 清空注册的代理
    this.registeredAgents.clear();
    
    this.isRunning = false;
    this.logger.info('CruiseModule stopped successfully');
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
      
      // 保存代理配置
      this.registeredAgents.set(agentId, config);
      
      // 设置代理的任务
      await this.setupAgentTasks(agentId, config);
      
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
      this.taskManager.cancelTasksByTag(`agent:${agentId}`);
      
      // 移除代理配置
      this.registeredAgents.delete(agentId);
      
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
      const agentState = await this.agentStateMachine.getAgentState(agentId);
      
      if (!agentState || agentState.status !== 'active') {
        this.logger.info(`Agent ${agentId} is not active, skipping health check`);
        return false;
      }
      
      // 获取代理资金状态
      const funds = await this.fundsManager.getAgentFunds(agentId);
      
      // 获取风险评估
      const riskAssessment = await this.riskController.assessRisk(agentId);
      
      // 识别不健康的仓位
      const unhealthyPositions = await this.positionOptimizer.identifyUnhealthyPositions(
        funds.positions,
        riskAssessment
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
      if (!config) {
        this.logger.warn(`Config not found for agent ${agentId}`);
        return false;
      }
      
      this.logger.info(`Optimizing positions for agent ${agentId}`);
      
      // 获取代理资金状态
      const funds = await this.fundsManager.getAgentFunds(agentId);
      
      // 计算最优仓位
      const optimizationPlan = await this.positionOptimizer.calculateOptimalPositions(
        agentId,
        funds,
        config
      );
      
      if (!optimizationPlan || optimizationPlan.actions.length === 0) {
        this.logger.info(`No optimization actions needed for agent ${agentId}`);
        return true;
      }
      
      this.logger.info(`Executing ${optimizationPlan.actions.length} optimization actions for agent ${agentId}`);
      
      // 执行优化操作
      // 这里简化处理，实际应该根据action类型构建不同的交易
      let successCount = 0;
      
      for (const action of optimizationPlan.actions) {
        // 构建交易请求
        const transaction = {
          agentId,
          type: action.type,
          poolAddress: action.poolAddress,
          amountSol: action.amountSol || action.targetAmountSol || 0
        };
        
        // 执行交易
        const success = await this.transactionExecutor.executeTransaction(transaction);
        
        if (success) {
          successCount++;
        }
      }
      
      this.logger.info(`Completed ${successCount}/${optimizationPlan.actions.length} optimization actions for agent ${agentId}`);
      
      return successCount > 0;
      
    } catch (error) {
      this.logger.error(`Position optimization failed for agent ${agentId}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
  
  /**
   * 检查代理仓位是否有显著变化
   */
  public async checkForSignificantChanges(agentId: string): Promise<boolean> {
    try {
      if (!this.isRunning) {
        return false;
      }
      
      if (!this.registeredAgents.has(agentId)) {
        return false;
      }
      
      // 获取代理资金状态
      const funds = await this.fundsManager.getAgentFunds(agentId);
      
      // 检查是否有显著变化
      const significantChanges = await this.positionOptimizer.checkForSignificantChanges(
        agentId,
        funds.positions
      );
      
      if (significantChanges && significantChanges.length > 0) {
        this.logger.info(`Detected significant changes in ${significantChanges.length} positions for agent ${agentId}`);
        
        // 触发优化
        await this.optimizePositions(agentId);
        return true;
      }
      
      return false;
      
    } catch (error) {
      this.logger.error(`Failed to check for significant changes for agent ${agentId}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
  
  /**
   * 设置代理的任务
   */
  private async setupAgentTasks(agentId: string, config: AgentConfig): Promise<void> {
    try {
      const agentTag = `agent:${agentId}`;
      
      // 设置健康检查任务
      const healthCheckInterval = config.healthCheckIntervalMinutes || 30; // 默认30分钟
      this.taskManager.scheduleRecurringTask(
        `health-check-${agentId}`,
        async () => {
          await this.performHealthCheck(agentId);
        },
        healthCheckInterval * 60 * 1000, // 转换为毫秒
        [agentTag, 'health-check']
      );
      
      // 设置市场变化检测任务
      const marketChangeInterval = config.marketChangeCheckIntervalMinutes || 15; // 默认15分钟
      this.taskManager.scheduleRecurringTask(
        `market-change-${agentId}`,
        async () => {
          await this.checkForSignificantChanges(agentId);
        },
        marketChangeInterval * 60 * 1000, // 转换为毫秒
        [agentTag, 'market-change']
      );
      
      this.logger.info(`Tasks set up for agent ${agentId} - Health check: ${healthCheckInterval}min, Market change: ${marketChangeInterval}min`);
      
    } catch (error) {
      this.logger.error(`Failed to set up tasks for agent ${agentId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
} 