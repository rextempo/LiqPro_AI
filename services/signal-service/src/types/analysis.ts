/**
 * Bin data interface
 */
export interface BinData {
  binId: number;
  liquidity: number;
  share: number;
}

/**
 * Optimal bin range interface
 */
export interface OptimalBinRange {
  start: number;
  end: number;
  confidence: number;
}

/**
 * Pool data interface
 */
export interface PoolData {
  address: string;
  tokenX: string;
  tokenY: string;
  totalLiquidity: number;
  volume24h: number;
  fees24h: number;
  apr: number;
  tvl: number;
  binStep: number;
  activeId: number;
}

/**
 * Trend analysis result
 */
export interface TrendAnalysis {
  shortTerm: number;
  mediumTerm: number;
  longTerm: number;
  momentum: number;
  volatility: number;
  breakoutProbability: number;
  supportLevels: number[];
  resistanceLevels: number[];
  priceImpact: number;
}

/**
 * Liquidity analysis result
 */
export interface LiquidityAnalysis {
  totalLiquidity: number;
  concentration: number;
  depth: number;
  stability: number;
  binDistribution: BinData[];
  imbalanceRisk: number;
  whaleActivity: number;
  optimalBinRanges: OptimalBinRange[];
}

/**
 * Volume analysis result
 */
export interface VolumeAnalysis {
  dailyVolume: number;
  weeklyTrend: number;
  volatility: number;
  patterns: {
    type: string;
    strength: number;
    timeframe: string;
  }[];
  anomalies: {
    type: string;
    severity: string;
    timestamp: number;
  }[];
  predictedTrend: number;
  marketImpact: number;
}

/**
 * Risk metrics
 */
export interface RiskMetrics {
  volatilityRisk: number;
  liquidityRisk: number;
  counterpartyRisk: number;
  systemicRisk: number;
  impermanentLossRisk: number;
  regulatoryRisk: number;
  overallRisk: number;
  alerts?: {
    type: string;
    severity: string;
    message: string;
  }[];
}

/**
 * Signal factor type
 */
export type SignalFactorType = 'TREND' | 'LIQUIDITY' | 'VOLUME' | 'RISK';

/**
 * Signal factor direction
 */
export type SignalFactorDirection = 'BULLISH' | 'BEARISH' | 'POSITIVE' | 'NEGATIVE' | 'INCREASING' | 'DECREASING' | 'HIGH' | 'LOW' | 'NEUTRAL';

/**
 * Signal factor
 */
export interface SignalFactor {
  type: SignalFactorType;
  direction: SignalFactorDirection;
  strength: number;
  confidence: number;
}

/**
 * Market analysis result
 */
export interface MarketAnalysis {
  poolAddress: string;
  tokenPair: string;
  timestamp: number;
  trend: TrendAnalysis;
  liquidity: LiquidityAnalysis;
  volume: VolumeAnalysis;
  risk: RiskMetrics;
  signalFactors: SignalFactor[];
  meteoraData?: any;
  jupiterData?: any;
} 