/**
 * Types for the scoring service
 */

/**
 * Health score components
 */
export interface HealthScoreComponents {
  priceRiskScore: number;
  liquidityRiskScore: number;
  tradingRiskScore: number;
  whaleRiskScore: number;
  imbalanceRiskScore: number;
}

/**
 * Risk level enum
 */
export enum RiskLevel {
  EXTREMELY_LOW = 'extremely low risk',
  LOW = 'low risk',
  MEDIUM = 'medium risk',
  HIGH = 'high risk',
  EXTREMELY_HIGH = 'extremely high risk',
}

/**
 * Health score result
 */
export interface HealthScoreResult {
  poolAddress: string;
  timestamp: number;
  overallScore: number;
  components: HealthScoreComponents;
  riskLevel: RiskLevel;
  previousScore?: number;
  scoreChange?: number;
  scoreHistory?: {
    timestamp: number;
    score: number;
  }[];
}

/**
 * Risk assessment result
 */
export interface RiskAssessmentResult {
  poolAddress: string;
  timestamp: number;
  priceRisk: {
    level: RiskLevel;
    volatility: number;
    recentChange: number;
  };
  liquidityRisk: {
    level: RiskLevel;
    tvlChangePercent: number;
    depth: number;
  };
  tradingRisk: {
    level: RiskLevel;
    volumeChangePercent: number;
    slippageEstimate: number;
  };
  whaleRisk: {
    level: RiskLevel;
    largeHoldersPercent: number;
    recentWithdrawals: number;
  };
  imbalanceRisk: {
    level: RiskLevel;
    tokenRatioImbalance: number;
  };
}

/**
 * Action recommendation type
 */
export enum ActionType {
  NO_ACTION = 'no_action',
  MONITOR = 'monitor',
  REBALANCE = 'rebalance',
  PARTIAL_EXIT = 'partial_exit',
  FULL_EXIT = 'full_exit',
}

/**
 * Decision recommendation result
 */
export interface DecisionRecommendation {
  poolAddress: string;
  timestamp: number;
  recommendedAction: ActionType;
  urgency: 'low' | 'medium' | 'high';
  reasoning: string;
  suggestedAllocation?: {
    tokenX: number;
    tokenY: number;
  };
  warningMessages?: string[];
}

/**
 * Scoring service configuration
 */
export interface ScoringServiceConfig {
  dataServiceUrl: string;
  signalServiceUrl: string;
  scoringInterval: number;
  historyRetentionPeriod: number;
  riskThresholds: {
    extremelyLowRisk: number;
    lowRisk: number;
    mediumRisk: number;
    highRisk: number;
  };
  actionThresholds: {
    monitor: number;
    rebalance: number;
    partialExit: number;
    fullExit: number;
  };
} 