/**
 * Agent状态枚举
 */
export enum AgentState {
  INITIALIZING = 'initializing',
  WAITING = 'waiting',
  RUNNING = 'running',
  STOPPED = 'stopped',
  PARTIAL_REDUCING = 'partial_reducing',
  EMERGENCY_EXIT = 'emergency_exit'
}

/**
 * Agent事件枚举
 */
export enum AgentEvent {
  START = 'start',
  STOP = 'stop',
  PAUSE = 'pause',
  RESUME = 'resume',
  FUNDS_LOW = 'funds_low',
  FUNDS_SUFFICIENT = 'funds_sufficient',
  RISK_MEDIUM = 'risk_medium',
  RISK_HIGH = 'risk_high',
  RISK_RESOLVED = 'risk_resolved',
  USER_EMERGENCY = 'user_emergency',
  HEALTH_CHECK = 'health_check',
  POSITION_CHANGE = 'position_change'
}

/**
 * 资金状态接口
 */
export interface FundsStatus {
  totalValueUsd: number;
  totalValueSol: number;
  availableSol: number;
  positions: Array<{
    poolAddress: string;
    valueUsd: number;
    valueSol: number;
  }>;
  lastUpdate?: number;
}

/**
 * 风险评估接口
 */
export interface RiskAssessment {
  agentId: string;
  timestamp: number;
  healthScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  warnings: string[];
  recommendations: string[];
  triggers?: Array<{
    type: string;
    value: number;
    threshold: number;
  }>;
}

/**
 * Agent配置接口
 */
export interface AgentConfig {
  name: string;
  walletAddress: string;
  maxPositions: number;
  minSolBalance: number;
  targetHealthScore: number;
  riskTolerance: 'low' | 'medium' | 'high';
  healthCheckIntervalMinutes: number;
  marketChangeCheckIntervalMinutes: number;
  optimizationIntervalHours: number;
  emergencyThresholds: {
    minHealthScore: number;
    maxDrawdown: number;
  };
}

/**
 * 交易类型枚举
 */
export enum TransactionType {
  ADD_LIQUIDITY = 'add_liquidity',
  REMOVE_LIQUIDITY = 'remove_liquidity',
  SWAP = 'swap',
  SWAP_TO_SOL = 'swap_to_sol',
  CLAIM_FEES = 'claim_fees',
  WITHDRAW = 'withdraw',
  DEPOSIT = 'deposit'
}

/**
 * 交易优先级枚举
 */
export enum TransactionPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * 交易请求接口
 */
export interface TransactionRequest {
  id?: string;
  agentId: string;
  type: TransactionType | string;
  priority?: TransactionPriority;
  data: any;
  status?: string;
  createdAt?: number;
  updatedAt?: number;
  retries?: number;
  maxRetries?: number;
}

/**
 * 交易结果接口
 */
export interface TransactionResult {
  success: boolean;
  txHash?: string;
  error?: string;
  blockTime?: number;
  fee?: number;
}

/**
 * 健康检查结果接口
 */
export interface HealthCheckResult {
  status: 'ok' | 'warning' | 'error';
  message?: string;
  details?: Record<string, any>;
  timestamp: number;
}

/**
 * 服务配置接口
 */
export interface ServiceConfig {
  port: number;
  logLevel: string;
  healthCheckInterval: number;
  rpcEndpoint: string;
  scoringServiceUrl: string;
  databaseUrl: string;
  redisUrl?: string;
  jwtSecret: string;
  environment: 'development' | 'staging' | 'production';
}

/**
 * 池子推荐接口
 */
export interface PoolRecommendation {
  poolAddress: string;
  healthScore: number;
  action: 'add' | 'reduce' | 'maintain' | 'rebalance';
  adjustmentPercentage?: number;
  targetBins?: Array<{
    binId: number;
    percentage: number;
  }>;
  priceChange24h?: number;
  volumeChange?: number;
  liquidityChange?: number;
}

/**
 * 优化计划接口
 */
export interface OptimizationPlan {
  agentId: string;
  totalValueSol: number;
  actions: Array<{
    type: 'add' | 'remove' | 'adjust';
    poolAddress: string;
    amountSol?: number;
    targetBins?: Array<{
      binId: number;
      percentage: number;
    }>;
    currentAmountSol?: number;
    targetAmountSol?: number;
  }>;
  expectedHealthImprovement: number;
}

// Agent状态接口
export interface AgentStatus {
  state: AgentState;
  config: AgentConfig;
  funds: FundsStatus;
  lastUpdate: number;
  lastError?: string;
} 