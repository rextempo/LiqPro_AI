import { RiskAssessment } from '../types';
import { AgentStateMachine } from './AgentStateMachine';
import { TransactionExecutor } from './TransactionExecutor';
import { FundsManager } from './FundsManager';
import { Logger } from '../utils/logger';
import { TransactionType, TransactionPriority } from '../types/transaction';

/**
 * 风险控制器接口
 */
export interface RiskController {
  /**
   * 评估风险
   */
  assessRisk(agentId: string): Promise<RiskAssessment>;
  
  /**
   * 处理风险
   */
  handleRisk(agentId: string, assessment: RiskAssessment): Promise<void>;
  
  /**
   * 执行紧急退出
   */
  executeEmergencyExit(agentId: string, reason: string): Promise<boolean>;
  
  /**
   * 执行部分减仓
   */
  executePartialReduction(agentId: string, percentage: number): Promise<boolean>;
}

/**
 * 风险控制器实现
 */
export class AgentRiskController implements RiskController {
  private logger: Logger;
  private stateMachines: Map<string, AgentStateMachine>;
  private transactionExecutor: TransactionExecutor;
  private fundsManager: FundsManager;
  
  // 风险阈值配置
  private riskThresholds = {
    emergencyThreshold: 1.5, // 健康评分低于1.5触发紧急退出
    mediumRiskThreshold: 2.5, // 健康评分低于2.5触发部分减仓
    partialReductionPercentage: 0.3, // 部分减仓比例30%
    monitoringInterval: 5 * 60 * 1000 // 5分钟监控一次
  };
  
  // 风险监控定时器
  private monitoringTimers: Map<string, NodeJS.Timeout>;

  constructor(
    logger: Logger,
    transactionExecutor: TransactionExecutor,
    fundsManager: FundsManager
  ) {
    this.logger = logger;
    this.stateMachines = new Map<string, AgentStateMachine>();
    this.transactionExecutor = transactionExecutor;
    this.fundsManager = fundsManager;
    this.monitoringTimers = new Map<string, NodeJS.Timeout>();
  }

  /**
   * 注册Agent状态机
   */
  public registerAgent(agentId: string, stateMachine: AgentStateMachine): void {
    this.stateMachines.set(agentId, stateMachine);
    this.startMonitoring(agentId);
    this.logger.info(`Agent ${agentId} registered with risk controller`);
  }

  /**
   * 注销Agent
   */
  public unregisterAgent(agentId: string): void {
    this.stopMonitoring(agentId);
    this.stateMachines.delete(agentId);
    this.logger.info(`Agent ${agentId} unregistered from risk controller`);
  }

  /**
   * 开始风险监控
   */
  private startMonitoring(agentId: string): void {
    // 停止现有的监控
    this.stopMonitoring(agentId);
    
    // 创建新的监控定时器
    const timer = setInterval(async () => {
      try {
        const assessment = await this.assessRisk(agentId);
        await this.handleRisk(agentId, assessment);
      } catch (error: any) {
        this.logger.error(`Error in risk monitoring for agent ${agentId}: ${error.message}`);
      }
    }, this.riskThresholds.monitoringInterval);
    
    this.monitoringTimers.set(agentId, timer);
    this.logger.info(`Started risk monitoring for agent ${agentId}`);
  }

  /**
   * 停止风险监控
   */
  private stopMonitoring(agentId: string): void {
    const timer = this.monitoringTimers.get(agentId);
    
    if (timer) {
      clearInterval(timer);
      this.monitoringTimers.delete(agentId);
      this.logger.info(`Stopped risk monitoring for agent ${agentId}`);
    }
  }

  /**
   * 评估风险
   */
  public async assessRisk(agentId: string): Promise<RiskAssessment> {
    this.logger.info(`Assessing risk for agent ${agentId}`);
    
    try {
      // 获取Agent状态机
      const stateMachine = this.stateMachines.get(agentId);
      
      if (!stateMachine) {
        throw new Error(`Agent ${agentId} not registered with risk controller`);
      }
      
      // 获取资金状态
      const fundsStatus = await this.fundsManager.getFundsStatus(
        agentId,
        stateMachine.getStatus().config.walletAddress
      );
      
      // 这里应该实现实际的风险评估逻辑
      // 可以从信号服务获取风险评估数据
      
      // 模拟风险评估
      // 计算健康评分（示例：基于可用SOL和总价值的比例）
      const availableRatio = fundsStatus.availableSol / fundsStatus.totalValueSol;
      let healthScore = 5.0; // 满分5.0
      
      // 如果可用SOL比例过低，降低健康评分
      if (availableRatio < 0.1) {
        healthScore -= (0.1 - availableRatio) * 20; // 每少0.05，扣1分
      }
      
      // 如果仓位过于集中，降低健康评分
      if (fundsStatus.positions.length === 1) {
        healthScore -= 1.0; // 单一仓位扣1分
      }
      
      // 确定风险级别
      let riskLevel: 'low' | 'medium' | 'high';
      
      if (healthScore <= this.riskThresholds.emergencyThreshold) {
        riskLevel = 'high';
      } else if (healthScore <= this.riskThresholds.mediumRiskThreshold) {
        riskLevel = 'medium';
      } else {
        riskLevel = 'low';
      }
      
      // 创建风险评估结果
      const assessment: RiskAssessment = {
        healthScore,
        riskLevel,
        triggers: [
          {
            type: 'available_sol_ratio',
            value: availableRatio,
            threshold: 0.1
          },
          {
            type: 'position_concentration',
            value: fundsStatus.positions.length,
            threshold: 2
          }
        ]
      };
      
      this.logger.info(`Risk assessment for agent ${agentId}: health score ${healthScore}, risk level ${riskLevel}`);
      
      return assessment;
    } catch (error: any) {
      this.logger.error(`Failed to assess risk for agent ${agentId}: ${error.message}`);
      
      // 返回默认的高风险评估
      return {
        healthScore: 0,
        riskLevel: 'high',
        triggers: [
          {
            type: 'assessment_error',
            value: 0,
            threshold: 1
          }
        ]
      };
    }
  }

  /**
   * 处理风险
   */
  public async handleRisk(agentId: string, assessment: RiskAssessment): Promise<void> {
    this.logger.info(`Handling risk for agent ${agentId} with health score ${assessment.healthScore}`);
    
    try {
      // 获取Agent状态机
      const stateMachine = this.stateMachines.get(agentId);
      
      if (!stateMachine) {
        throw new Error(`Agent ${agentId} not registered with risk controller`);
      }
      
      // 更新状态机的风险评估
      stateMachine.handleRiskAssessment(assessment);
      
      // 根据风险级别采取行动
      if (assessment.riskLevel === 'high') {
        await this.executeEmergencyExit(agentId, `Health score ${assessment.healthScore} below emergency threshold ${this.riskThresholds.emergencyThreshold}`);
      } else if (assessment.riskLevel === 'medium') {
        await this.executePartialReduction(agentId, this.riskThresholds.partialReductionPercentage);
      }
    } catch (error: any) {
      this.logger.error(`Failed to handle risk for agent ${agentId}: ${error.message}`);
    }
  }

  /**
   * 执行紧急退出
   */
  public async executeEmergencyExit(agentId: string, reason: string): Promise<boolean> {
    this.logger.warn(`Executing emergency exit for agent ${agentId}: ${reason}`);
    
    try {
      // 获取Agent状态机
      const stateMachine = this.stateMachines.get(agentId);
      
      if (!stateMachine) {
        throw new Error(`Agent ${agentId} not registered with risk controller`);
      }
      
      // 获取资金状态
      const fundsStatus = await this.fundsManager.getFundsStatus(
        agentId,
        stateMachine.getStatus().config.walletAddress
      );
      
      // 创建紧急退出交易
      const poolAddresses = fundsStatus.positions.map(p => p.poolAddress);
      
      if (poolAddresses.length === 0) {
        this.logger.info(`No positions to exit for agent ${agentId}`);
        return true;
      }
      
      // 创建交易请求
      const request = this.transactionExecutor.createRequest(
        TransactionType.EMERGENCY_EXIT,
        {
          poolAddresses,
          walletAddress: stateMachine.getStatus().config.walletAddress
        },
        agentId,
        {
          priority: TransactionPriority.CRITICAL,
          maxRetries: 5
        }
      );
      
      // 执行交易
      const result = await this.transactionExecutor.execute(request);
      
      if (result.success) {
        this.logger.info(`Emergency exit successful for agent ${agentId}`);
        return true;
      } else {
        this.logger.error(`Emergency exit failed for agent ${agentId}: ${result.error}`);
        return false;
      }
    } catch (error: any) {
      this.logger.error(`Failed to execute emergency exit for agent ${agentId}: ${error.message}`);
      return false;
    }
  }

  /**
   * 执行部分减仓
   */
  public async executePartialReduction(agentId: string, percentage: number): Promise<boolean> {
    this.logger.info(`Executing partial reduction (${percentage * 100}%) for agent ${agentId}`);
    
    try {
      // 获取Agent状态机
      const stateMachine = this.stateMachines.get(agentId);
      
      if (!stateMachine) {
        throw new Error(`Agent ${agentId} not registered with risk controller`);
      }
      
      // 获取资金状态
      const fundsStatus = await this.fundsManager.getFundsStatus(
        agentId,
        stateMachine.getStatus().config.walletAddress
      );
      
      // 如果没有仓位，则无需减仓
      if (fundsStatus.positions.length === 0) {
        this.logger.info(`No positions to reduce for agent ${agentId}`);
        return true;
      }
      
      // 对每个仓位执行部分减仓
      let allSuccess = true;
      
      for (const position of fundsStatus.positions) {
        // 计算减仓金额
        const reductionAmount = position.valueSol * percentage;
        
        // 创建交易请求
        const request = this.transactionExecutor.createRequest(
          TransactionType.REMOVE_LIQUIDITY,
          {
            poolAddress: position.poolAddress,
            amount: reductionAmount,
            walletAddress: stateMachine.getStatus().config.walletAddress
          },
          agentId,
          {
            priority: TransactionPriority.HIGH,
            maxRetries: 3
          }
        );
        
        // 执行交易
        const result = await this.transactionExecutor.execute(request);
        
        if (!result.success) {
          this.logger.error(`Partial reduction failed for position ${position.poolAddress}: ${result.error}`);
          allSuccess = false;
        }
      }
      
      return allSuccess;
    } catch (error: any) {
      this.logger.error(`Failed to execute partial reduction for agent ${agentId}: ${error.message}`);
      return false;
    }
  }
} 