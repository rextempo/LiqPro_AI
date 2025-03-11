/**
 * Type definitions for the Signal Service
 */

// Export configuration
export { default as Config } from '../config';

// Export enums
export enum SignalType {
  ENTRY = 'entry',           // Entry signal
  EXIT = 'exit',             // Exit signal
  REBALANCE = 'rebalance',   // Rebalance signal
  ALERT = 'alert',           // Alert signal
  INFO = 'info'              // Info signal
}

export enum SignalStrength {
  VERY_WEAK = 1,
  WEAK = 2,
  MODERATE = 3,
  STRONG = 4,
  VERY_STRONG = 5
}

export enum SignalTimeframe {
  SHORT_TERM = 'short_term',     // Short term (hours)
  MEDIUM_TERM = 'medium_term',   // Medium term (days)
  LONG_TERM = 'long_term'        // Long term (weeks)
}

export enum SignalReliability {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3
}

export enum StrategyType {
  TREND_FOLLOWING = 'trend_following',        // Trend following
  MEAN_REVERSION = 'mean_reversion',          // Mean reversion
  LIQUIDITY_CONCENTRATION = 'liquidity_concentration', // Liquidity concentration
  VOLATILITY_BASED = 'volatility_based',      // Volatility based
  MULTI_FACTOR = 'multi_factor'               // Multi-factor
}

// Export interfaces from other files
export * from './analysis';

// Export service configuration interface
export interface SignalServiceConfig {
  port: number;
  dataServiceUrl: string;
  scoringServiceUrl: string;
  
  // Signal generation configuration
  signalGenerationInterval: number; // Signal generation interval (ms)
  signalHistoryRetention: number;   // Signal history retention time (ms)
  
  // Strategy configuration
  strategyUpdateInterval: number;   // Strategy update interval (ms)
  maxStrategiesPerPool: number;     // Maximum strategies per pool
  
  // Monitoring configuration
  monitoringInterval: number;       // Monitoring interval (ms)
  anomalyThreshold: number;         // Anomaly threshold
  
  // API keys for authentication
  apiKeys: string[];                // API keys

  // Connection pool configuration
  maxConnections?: number;          // Maximum number of connections
  maxConnectionsPerIP?: number;     // Maximum connections per IP
  connectionTimeout?: number;       // Connection timeout in ms
  inactiveTimeout?: number;         // Inactive timeout in ms
  
  // Batch processing configuration
  batchSize?: number;               // Maximum batch size
  batchWaitTime?: number;           // Maximum wait time in ms
  
  // CORS configuration
  cors: {
    origin: string | string[];
    credentials: boolean;
  };
  
  // Debug mode
  debug?: boolean;                  // Enable debug logging

  // Rate limiting configuration
  rateLimit: {
    windowMs: number;               // Rate limit window in ms
    maxRequests: number;            // Maximum requests per window
  };
}

/**
 * 信号对象
 */
export interface Signal {
  id: string;                         // 信号ID
  poolAddress: string;                // 池子地址
  tokenPair: string;                  // 代币对
  type: SignalType;                   // 信号类型
  strength: SignalStrength;           // 信号强度
  timeframe: SignalTimeframe;         // 时间范围
  reliability: SignalReliability;     // 可靠性
  timestamp: number;                  // 生成时间戳
  expirationTimestamp: number;        // 过期时间戳
  description: string;                // 描述
  suggestedAction: string;            // 建议操作
  parameters: Record<string, any>;    // 参数
  metadata: Record<string, any>;      // 元数据
}

/**
 * 策略对象
 */
export interface Strategy {
  id: string;                         // 策略ID
  name: string;                       // 策略名称
  description: string;                // 策略描述
  type: StrategyType;                 // 策略类型
  poolAddresses: string[];            // 适用的池子地址
  parameters: Record<string, any>;    // 策略参数
  performance: {                      // 策略性能
    winRate: number;                  // 胜率
    profitFactor: number;             // 盈亏比
    sharpeRatio: number;              // 夏普比率
    maxDrawdown: number;              // 最大回撤
  };
  createdAt: number;                  // 创建时间
  updatedAt: number;                  // 更新时间
  isActive: boolean;                  // 是否激活
  metadata: Record<string, any>;      // 元数据
}

/**
 * 信号订阅选项
 */
export interface SignalSubscriptionOptions {
  poolAddresses?: string[];           // 池子地址过滤
  signalTypes?: SignalType[];         // 信号类型过滤
  minStrength?: SignalStrength;       // 最小信号强度
  timeframes?: SignalTimeframe[];     // 时间范围过滤
  minReliability?: SignalReliability; // 最小可靠性
  fromTimestamp?: number;             // 开始时间戳
  toTimestamp?: number;               // 结束时间戳
  metadata?: Record<string, any>;     // 元数据过滤
}

/**
 * 信号查询选项
 */
export interface SignalQueryOptions {
  poolAddresses?: string[];           // 池子地址过滤
  signalTypes?: SignalType[];         // 信号类型过滤
  minStrength?: SignalStrength;       // 最小信号强度
  timeframes?: SignalTimeframe[];     // 时间范围过滤
  minReliability?: SignalReliability; // 最小可靠性
  fromTimestamp?: number;             // 开始时间戳
  toTimestamp?: number;               // 结束时间戳
  limit?: number;                     // 限制数量
  offset?: number;                    // 偏移量
}

/**
 * 策略查询选项
 */
export interface StrategyQueryOptions {
  poolAddresses?: string[];           // 池子地址过滤
  strategyTypes?: StrategyType[];     // 策略类型过滤
  isActive?: boolean;                 // 是否激活
  limit?: number;                     // 限制数量
  offset?: number;                    // 偏移量
}

/**
 * 信号分析结果
 */
export interface SignalAnalysisResult {
  signals: Signal[];                  // 信号列表
  metadata: {                         // 元数据
    totalCount: number;               // 总数
    filteredCount: number;            // 过滤后数量
    generatedAt: number;              // 生成时间
  };
}

/**
 * 策略性能评估结果
 */
export interface StrategyPerformanceResult {
  strategyId: string;                 // 策略ID
  poolAddress: string;                // 池子地址
  timeframe: SignalTimeframe;         // 时间范围
  metrics: {                          // 性能指标
    winRate: number;                  // 胜率
    profitFactor: number;             // 盈亏比
    sharpeRatio: number;              // 夏普比率
    maxDrawdown: number;              // 最大回撤
    totalSignals: number;             // 总信号数
    successfulSignals: number;        // 成功信号数
  };
  periodStart: number;                // 评估开始时间
  periodEnd: number;                  // 评估结束时间
} 