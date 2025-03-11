// Agent状态枚举
export enum AgentState {
  INITIALIZING = 'INITIALIZING',
  RUNNING = 'RUNNING',
  WAITING = 'WAITING',
  STOPPED = 'STOPPED',
  PARTIAL_REDUCING = 'PARTIAL_REDUCING',
  EMERGENCY_EXIT = 'EMERGENCY_EXIT'
}

// 状态转换事件枚举
export enum AgentEvent {
  START = 'START',
  STOP = 'STOP',
  FUNDS_LOW = 'FUNDS_LOW',
  FUNDS_SUFFICIENT = 'FUNDS_SUFFICIENT',
  RISK_MEDIUM = 'RISK_MEDIUM',
  RISK_HIGH = 'RISK_HIGH',
  RISK_RESOLVED = 'RISK_RESOLVED',
  USER_EMERGENCY = 'USER_EMERGENCY'
}

// Agent配置接口
export interface AgentConfig {
  name: string;
  walletAddress: string;
  riskLevel: 'low' | 'medium' | 'high';
  maxPositions: number;
  minSolBalance: number;
  emergencyThreshold: number;
}

// 资金状态接口
export interface FundsStatus {
  totalValueSol: number;
  availableSol: number;
  positions: {
    poolAddress: string;
    valueUsd: number;
    valueSol: number;
  }[];
  lastUpdate?: number;
}

// 风险评估接口
export interface RiskAssessment {
  healthScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  triggers: {
    type: string;
    value: number;
    threshold: number;
  }[];
}

// 交易结果接口
export interface TransactionResult {
  success: boolean;
  txHash?: string;
  error?: string;
  blockTime?: number;
}

// Agent状态接口
export interface AgentStatus {
  state: AgentState;
  config: AgentConfig;
  funds: FundsStatus;
  lastUpdate: number;
  lastError?: string;
} 