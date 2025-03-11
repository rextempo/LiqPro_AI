import { AgentState, AgentEvent, AgentConfig, AgentStatus, FundsStatus, RiskAssessment } from '../types';
import { Logger } from '../utils/logger';

// 状态持久化接口
interface StatePersistence {
  saveState(agentId: string, state: AgentStatus): Promise<void>;
  loadState(agentId: string): Promise<AgentStatus | null>;
}

// 内存状态持久化实现
class MemoryStatePersistence implements StatePersistence {
  private states: Map<string, AgentStatus> = new Map();

  async saveState(agentId: string, state: AgentStatus): Promise<void> {
    this.states.set(agentId, state);
  }

  async loadState(agentId: string): Promise<AgentStatus | null> {
    return this.states.get(agentId) || null;
  }
}

export class AgentStateMachine {
  private state: AgentState;
  private config: AgentConfig;
  private funds: FundsStatus;
  private lastUpdate: number;
  private lastError?: string;
  private persistence: StatePersistence;
  private logger: Logger;
  private stateChangeListeners: ((status: AgentStatus) => void)[] = [];
  private stateHistory: { state: AgentState; timestamp: number }[] = [];
  private riskHistory: { assessment: RiskAssessment; timestamp: number }[] = [];
  private mediumRiskStartTime?: number;
  private highRiskStartTime?: number;
  private stateStartTime: number;
  private recoveryAttempts: number = 0;
  private readonly MAX_RECOVERY_ATTEMPTS = 3;
  private readonly STATE_TIMEOUT_MS = 30 * 60 * 1000; // 30分钟状态超时

  constructor(config: AgentConfig, logger: Logger, persistence?: StatePersistence) {
    this.state = AgentState.INITIALIZING;
    this.config = config;
    this.funds = {
      totalValueUsd: 0,
      totalValueSol: 0,
      availableSol: 0,
      positions: []
    };
    this.lastUpdate = Date.now();
    this.stateStartTime = Date.now();
    this.persistence = persistence || new MemoryStatePersistence();
    this.logger = logger;
    
    // 记录初始状态
    this.recordStateChange(this.state);
  }

  // 验证状态转换是否合法
  private isValidTransition(currentState: AgentState, event: AgentEvent): boolean {
    const validTransitions = {
      [AgentState.INITIALIZING]: [AgentEvent.START],
      [AgentState.RUNNING]: [AgentEvent.STOP, AgentEvent.FUNDS_LOW, AgentEvent.RISK_MEDIUM, AgentEvent.RISK_HIGH, AgentEvent.USER_EMERGENCY],
      [AgentState.WAITING]: [AgentEvent.FUNDS_SUFFICIENT, AgentEvent.STOP, AgentEvent.USER_EMERGENCY],
      [AgentState.PARTIAL_REDUCING]: [AgentEvent.RISK_RESOLVED, AgentEvent.RISK_HIGH, AgentEvent.USER_EMERGENCY, AgentEvent.STOP],
      [AgentState.EMERGENCY_EXIT]: [AgentEvent.STOP],
      [AgentState.STOPPED]: [AgentEvent.START]
    };

    return validTransitions[currentState]?.includes(event) || false;
  }

  // 检查状态超时
  private checkStateTimeout(): void {
    const now = Date.now();
    const stateDuration = now - this.stateStartTime;

    if (stateDuration > this.STATE_TIMEOUT_MS) {
      // 状态持续时间过长，尝试恢复
      this.logger.warn(`State ${this.state} timeout after ${stateDuration}ms for agent ${this.config.name}`);
      this.attemptStateRecovery();
    }
  }

  // 尝试状态恢复
  private attemptStateRecovery(): void {
    if (this.recoveryAttempts >= this.MAX_RECOVERY_ATTEMPTS) {
      this.logger.error(`Max recovery attempts reached for agent ${this.config.name}, forcing emergency exit`);
      this.handleEvent(AgentEvent.USER_EMERGENCY);
      return;
    }

    this.recoveryAttempts++;
    this.logger.info(`Attempting state recovery for agent ${this.config.name}, attempt ${this.recoveryAttempts}`);

    switch (this.state) {
      case AgentState.PARTIAL_REDUCING:
        // 如果部分减仓状态超时，检查当前风险评估
        const lastRiskAssessment = this.riskHistory[this.riskHistory.length - 1];
        if (lastRiskAssessment && lastRiskAssessment.assessment.healthScore > 2.5) {
          this.handleEvent(AgentEvent.RISK_RESOLVED);
        } else {
          this.handleEvent(AgentEvent.RISK_HIGH);
        }
        break;

      case AgentState.WAITING:
        // 如果等待状态超时，重新检查资金状况
        if (this.funds.availableSol >= this.config.minSolBalance) {
          this.handleEvent(AgentEvent.FUNDS_SUFFICIENT);
        }
        break;

      case AgentState.EMERGENCY_EXIT:
        // 紧急退出状态超时，强制停止
        this.handleEvent(AgentEvent.STOP);
        break;

      default:
        // 其他状态超时，记录错误并保持当前状态
        this.logger.warn(`No recovery action defined for state ${this.state}`);
        break;
    }
  }

  // 初始化状态机
  public async initialize(): Promise<void> {
    try {
      // 尝试加载持久化状态
      const savedState = await this.persistence.loadState(this.config.walletAddress);
      
      if (savedState) {
        this.state = savedState.state;
        this.funds = savedState.funds;
        this.lastUpdate = savedState.lastUpdate;
        this.lastError = savedState.lastError;
        
        this.logger.info(`Loaded state for agent ${this.config.name}: ${this.state}`);
      } else {
        this.logger.info(`No saved state found for agent ${this.config.name}, starting with INITIALIZING state`);
      }
    } catch (error: any) {
      this.logger.error(`Failed to initialize state machine for agent ${this.config.name}: ${error.message}`);
      this.setError(`Initialization failed: ${error.message}`);
    }
  }

  // 获取当前状态
  public getStatus(): AgentStatus {
    return {
      state: this.state,
      config: this.config,
      funds: this.funds,
      lastUpdate: this.lastUpdate,
      lastError: this.lastError
    };
  }

  // 更新处理事件方法
  public handleEvent(event: AgentEvent): boolean {
    const prevState = this.state;
    
    // 验证状态转换
    if (!this.isValidTransition(this.state, event)) {
      this.logger.warn(`Invalid state transition: ${this.state} -> ${event} for agent ${this.config.name}`);
      return false;
    }
    
    this.logger.info(`Processing event ${event} for agent ${this.config.name} in state ${this.state}`);
    
    switch (event) {
      case AgentEvent.START:
        if (this.state === AgentState.INITIALIZING || this.state === AgentState.STOPPED) {
          this.state = AgentState.RUNNING;
          this.recoveryAttempts = 0; // 重置恢复尝试次数
        }
        break;

      case AgentEvent.STOP:
        this.state = AgentState.STOPPED;
        this.recoveryAttempts = 0;
        break;

      case AgentEvent.FUNDS_LOW:
        if (this.state === AgentState.RUNNING) {
          this.state = AgentState.WAITING;
        }
        break;

      case AgentEvent.FUNDS_SUFFICIENT:
        if (this.state === AgentState.WAITING) {
          this.state = AgentState.RUNNING;
          this.recoveryAttempts = 0;
        }
        break;

      case AgentEvent.RISK_MEDIUM:
        if (this.state === AgentState.RUNNING) {
          this.state = AgentState.PARTIAL_REDUCING;
          this.mediumRiskStartTime = Date.now();
        }
        break;

      case AgentEvent.RISK_HIGH:
      case AgentEvent.USER_EMERGENCY:
        this.state = AgentState.EMERGENCY_EXIT;
        this.highRiskStartTime = Date.now();
        break;

      case AgentEvent.RISK_RESOLVED:
        if (this.state === AgentState.PARTIAL_REDUCING) {
          this.state = AgentState.RUNNING;
          this.mediumRiskStartTime = undefined;
          this.recoveryAttempts = 0;
        }
        break;

      default:
        return false;
    }

    const stateChanged = this.state !== prevState;
    
    if (stateChanged) {
      this.logger.info(`State changed from ${prevState} to ${this.state} for agent ${this.config.name}`);
      this.stateStartTime = Date.now(); // 更新状态开始时间
      this.recordStateChange(this.state);
      this.persistState();
      this.notifyStateChangeListeners();
    }
    
    this.lastUpdate = Date.now();
    return stateChanged;
  }

  // 更新资金状态
  public updateFunds(funds: FundsStatus): void {
    this.funds = funds;
    this.lastUpdate = Date.now();

    this.logger.info(`Updated funds for agent ${this.config.name}: ${funds.availableSol} SOL available, ${funds.totalValueSol} SOL total`);

    // 检查资金是否充足
    if (funds.availableSol < this.config.minSolBalance) {
      this.logger.warn(`Funds low for agent ${this.config.name}: ${funds.availableSol} SOL < ${this.config.minSolBalance} SOL`);
      this.handleEvent(AgentEvent.FUNDS_LOW);
    } else if (this.state === AgentState.WAITING) {
      this.logger.info(`Funds sufficient for agent ${this.config.name}: ${funds.availableSol} SOL >= ${this.config.minSolBalance} SOL`);
      this.handleEvent(AgentEvent.FUNDS_SUFFICIENT);
    }
    
    this.persistState();
  }

  // 处理风险评估
  public handleRiskAssessment(assessment: RiskAssessment): void {
    this.logger.info(`Risk assessment for agent ${this.config.name}: score ${assessment.healthScore}, level ${assessment.riskLevel}`);
    
    // 记录风险评估
    this.riskHistory.push({
      assessment,
      timestamp: Date.now()
    });
    
    // 保持历史记录在合理范围内
    if (this.riskHistory.length > 100) {
      this.riskHistory.shift();
    }
    
    // 检查持续时间
    const now = Date.now();
    const tenMinutes = 10 * 60 * 1000;
    const fiveMinutes = 5 * 60 * 1000;
    
    if (assessment.healthScore <= this.config.emergencyThresholds.minHealthScore) {
      // 高风险
      if (!this.highRiskStartTime) {
        this.highRiskStartTime = now;
      }
      
      // 如果高风险持续5分钟以上，触发紧急退出
      if (now - this.highRiskStartTime >= fiveMinutes) {
        this.logger.warn(`High risk persisted for 5+ minutes for agent ${this.config.name}, triggering emergency exit`);
        this.handleEvent(AgentEvent.RISK_HIGH);
      }
    } else {
      this.highRiskStartTime = undefined;
      
      if (assessment.healthScore <= 2.5 && assessment.healthScore > this.config.emergencyThresholds.minHealthScore) {
        // 中等风险
        if (!this.mediumRiskStartTime) {
          this.mediumRiskStartTime = now;
        }
        
        // 如果中等风险持续10分钟以上，触发部分减仓
        if (now - this.mediumRiskStartTime >= tenMinutes) {
          this.logger.warn(`Medium risk persisted for 10+ minutes for agent ${this.config.name}, triggering partial reduction`);
          this.handleEvent(AgentEvent.RISK_MEDIUM);
        }
      } else if (this.state === AgentState.PARTIAL_REDUCING) {
        // 风险已解决
        this.logger.info(`Risk resolved for agent ${this.config.name}, health score: ${assessment.healthScore}`);
        this.handleEvent(AgentEvent.RISK_RESOLVED);
        this.mediumRiskStartTime = undefined;
      } else {
        this.mediumRiskStartTime = undefined;
      }
    }
  }

  // 设置错误状态
  public setError(error: string): void {
    this.lastError = error;
    this.lastUpdate = Date.now();
    this.logger.error(`Error in agent ${this.config.name}: ${error}`);
    this.persistState();
  }

  // 清除错误状态
  public clearError(): void {
    this.lastError = undefined;
    this.lastUpdate = Date.now();
    this.logger.info(`Cleared error state for agent ${this.config.name}`);
    this.persistState();
  }
  
  // 添加状态变更监听器
  public addStateChangeListener(listener: (status: AgentStatus) => void): void {
    this.stateChangeListeners.push(listener);
  }
  
  // 移除状态变更监听器
  public removeStateChangeListener(listener: (status: AgentStatus) => void): void {
    const index = this.stateChangeListeners.indexOf(listener);
    if (index !== -1) {
      this.stateChangeListeners.splice(index, 1);
    }
  }
  
  // 获取状态历史
  public getStateHistory(): { state: AgentState; timestamp: number }[] {
    return [...this.stateHistory];
  }
  
  // 获取风险历史
  public getRiskHistory(): { assessment: RiskAssessment; timestamp: number }[] {
    return [...this.riskHistory];
  }
  
  // 持久化当前状态
  private async persistState(): Promise<void> {
    try {
      await this.persistence.saveState(this.config.walletAddress, this.getStatus());
    } catch (error: any) {
      this.logger.error(`Failed to persist state for agent ${this.config.name}: ${error.message}`);
    }
  }
  
  // 记录状态变更
  private recordStateChange(state: AgentState): void {
    this.stateHistory.push({
      state,
      timestamp: Date.now()
    });
    
    // 保持历史记录在合理范围内
    if (this.stateHistory.length > 100) {
      this.stateHistory.shift();
    }
  }
  
  // 通知状态变更监听器
  private notifyStateChangeListeners(): void {
    const status = this.getStatus();
    for (const listener of this.stateChangeListeners) {
      try {
        listener(status);
      } catch (error: any) {
        this.logger.error(`Error in state change listener: ${error.message}`);
      }
    }
  }

  // 定期检查状态
  public periodicCheck(): void {
    this.checkStateTimeout();
    
    // 检查风险评估历史
    const recentRiskAssessments = this.riskHistory
      .filter(h => Date.now() - h.timestamp < 15 * 60 * 1000); // 最近15分钟
    
    if (recentRiskAssessments.length > 0) {
      const avgHealthScore = recentRiskAssessments.reduce((sum, h) => sum + h.assessment.healthScore, 0) / recentRiskAssessments.length;
      
      // 如果平均健康分数显著改善，考虑解除风险状态
      if (this.state === AgentState.PARTIAL_REDUCING && avgHealthScore > 3.0) {
        this.logger.info(`Average health score improved to ${avgHealthScore}, considering risk resolved`);
        this.handleEvent(AgentEvent.RISK_RESOLVED);
      }
    }
  }

  // 获取当前状态持续时间（毫秒）
  public getCurrentStateDuration(): number {
    return Date.now() - this.stateStartTime;
  }

  // 获取恢复尝试次数
  public getRecoveryAttempts(): number {
    return this.recoveryAttempts;
  }

  // 重置恢复尝试计数
  public resetRecoveryAttempts(): void {
    this.recoveryAttempts = 0;
    this.logger.info(`Reset recovery attempts for agent ${this.config.name}`);
  }
}