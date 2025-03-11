import { AgentState, AgentEvent, AgentConfig, AgentStatus, FundsStatus, RiskAssessment } from '../types';

export class AgentStateMachine {
  private state: AgentState;
  private config: AgentConfig;
  private funds: FundsStatus;
  private lastUpdate: number;
  private lastError?: string;

  constructor(config: AgentConfig) {
    this.state = AgentState.INITIALIZING;
    this.config = config;
    this.funds = {
      totalValueSol: 0,
      availableSol: 0,
      positions: []
    };
    this.lastUpdate = Date.now();
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

  // 处理事件
  public handleEvent(event: AgentEvent): boolean {
    const prevState = this.state;
    
    switch (event) {
      case AgentEvent.START:
        if (this.state === AgentState.INITIALIZING || this.state === AgentState.STOPPED) {
          this.state = AgentState.RUNNING;
        }
        break;

      case AgentEvent.STOP:
        this.state = AgentState.STOPPED;
        break;

      case AgentEvent.FUNDS_LOW:
        if (this.state === AgentState.RUNNING) {
          this.state = AgentState.WAITING;
        }
        break;

      case AgentEvent.FUNDS_SUFFICIENT:
        if (this.state === AgentState.WAITING) {
          this.state = AgentState.RUNNING;
        }
        break;

      case AgentEvent.RISK_MEDIUM:
        if (this.state === AgentState.RUNNING) {
          this.state = AgentState.PARTIAL_REDUCING;
        }
        break;

      case AgentEvent.RISK_HIGH:
      case AgentEvent.USER_EMERGENCY:
        this.state = AgentState.EMERGENCY_EXIT;
        break;

      case AgentEvent.RISK_RESOLVED:
        if (this.state === AgentState.PARTIAL_REDUCING) {
          this.state = AgentState.RUNNING;
        }
        break;

      default:
        return false;
    }

    this.lastUpdate = Date.now();
    return this.state !== prevState;
  }

  // 更新资金状态
  public updateFunds(funds: FundsStatus): void {
    this.funds = funds;
    this.lastUpdate = Date.now();

    // 检查资金是否充足
    if (funds.availableSol < this.config.minSolBalance) {
      this.handleEvent(AgentEvent.FUNDS_LOW);
    } else if (this.state === AgentState.WAITING) {
      this.handleEvent(AgentEvent.FUNDS_SUFFICIENT);
    }
  }

  // 处理风险评估
  public handleRiskAssessment(assessment: RiskAssessment): void {
    if (assessment.healthScore <= this.config.emergencyThreshold) {
      this.handleEvent(AgentEvent.RISK_HIGH);
    } else if (assessment.healthScore <= 2.5 && assessment.healthScore > this.config.emergencyThreshold) {
      this.handleEvent(AgentEvent.RISK_MEDIUM);
    } else if (this.state === AgentState.PARTIAL_REDUCING) {
      this.handleEvent(AgentEvent.RISK_RESOLVED);
    }
  }

  // 设置错误状态
  public setError(error: string): void {
    this.lastError = error;
    this.lastUpdate = Date.now();
  }

  // 清除错误状态
  public clearError(): void {
    this.lastError = undefined;
    this.lastUpdate = Date.now();
  }
} 