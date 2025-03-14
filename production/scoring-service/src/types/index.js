/**
 * 评分服务配置接口
 */
const ScoringServiceConfig = {
  dataServiceUrl: '',
  signalServiceUrl: '',
  scoringInterval: 300000, // 5分钟
  historyRetentionPeriod: 86400000, // 24小时
  riskThresholds: {
    extremelyLowRisk: 4.5,
    lowRisk: 3.5,
    mediumRisk: 2.5,
    highRisk: 1.5,
  },
  actionThresholds: {
    monitor: 3.5,
    rebalance: 3.0,
    partialExit: 2.5,
    fullExit: 1.5,
  },
};

/**
 * 风险等级枚举
 */
const RiskLevel = {
  EXTREMELY_LOW: 'EXTREMELY_LOW',
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  EXTREMELY_HIGH: 'EXTREMELY_HIGH'
};

/**
 * 行动类型枚举
 */
const ActionType = {
  NO_ACTION: 'NO_ACTION',
  MONITOR: 'MONITOR',
  REBALANCE: 'REBALANCE',
  PARTIAL_EXIT: 'PARTIAL_EXIT',
  FULL_EXIT: 'FULL_EXIT'
};

/**
 * 健康评分结果接口
 */
const HealthScoreResult = {
  poolAddress: '',
  timestamp: 0,
  overallScore: 0,
  components: {
    priceRiskScore: 0,
    liquidityRiskScore: 0,
    tradingRiskScore: 0,
    whaleRiskScore: 0,
    imbalanceRiskScore: 0,
  },
  riskLevel: '',
  previousScore: undefined,
  scoreChange: undefined,
};

/**
 * 风险评估结果接口
 */
const RiskAssessmentResult = {
  poolAddress: '',
  timestamp: 0,
  priceRisk: {
    level: '',
    volatility: 0,
    recentChange: 0,
  },
  liquidityRisk: {
    level: '',
    tvlChangePercent: 0,
    depth: 0,
  },
  tradingRisk: {
    level: '',
    volumeChangePercent: 0,
    slippageEstimate: 0,
  },
  whaleRisk: {
    level: '',
    largeHoldersPercent: 0,
    recentWithdrawals: 0,
  },
  imbalanceRisk: {
    level: '',
    tokenRatioImbalance: 0,
  },
};

/**
 * 决策推荐接口
 */
const DecisionRecommendation = {
  poolAddress: '',
  timestamp: 0,
  recommendedAction: '',
  urgency: '',
  reasoning: '',
  suggestedAllocation: undefined,
  warningMessages: undefined,
};

module.exports = {
  ScoringServiceConfig,
  RiskLevel,
  ActionType,
  HealthScoreResult,
  RiskAssessmentResult,
  DecisionRecommendation
}; 