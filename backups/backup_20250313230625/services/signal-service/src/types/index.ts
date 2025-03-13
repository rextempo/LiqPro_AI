/**
 * 信号类型枚举
 */
export enum SignalType {
  ENTRY = 'ENTRY',           // 入场信号
  EXIT = 'EXIT',             // 出场信号
  REBALANCE = 'REBALANCE',   // 再平衡信号
  RISK_ALERT = 'RISK_ALERT'  // 风险警报
}

/**
 * 信号强度枚举
 */
export enum SignalStrength {
  VERY_WEAK = 1,
  WEAK = 2,
  MODERATE = 3,
  STRONG = 4,
  VERY_STRONG = 5
}

/**
 * 信号时间范围枚举
 */
export enum SignalTimeframe {
  SHORT = 'SHORT',     // 短期（小时级）
  MEDIUM = 'MEDIUM',   // 中期（天级）
  LONG = 'LONG'        // 长期（周级）
}

/**
 * 信号可靠性枚举
 */
export enum SignalReliability {
  VERY_LOW = 1,
  LOW = 2,
  MODERATE = 3,
  HIGH = 4,
  VERY_HIGH = 5
}

/**
 * 信号因子接口
 */
export interface SignalFactor {
  id: string;
  name: string;
  value: number;
  weight: number;
  description: string;
}

/**
 * 信号接口
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
  factors: SignalFactor[];            // 信号因子
  metadata?: Record<string, any>;     // 元数据
}

/**
 * 信号查询选项接口
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
 * 信号订阅选项接口
 */
export interface SignalSubscriptionOptions {
  poolAddresses?: string[];           // 池子地址过滤
  signalTypes?: SignalType[];         // 信号类型过滤
  minStrength?: SignalStrength;       // 最小信号强度
  timeframes?: SignalTimeframe[];     // 时间范围过滤
  minReliability?: SignalReliability; // 最小可靠性
}

/**
 * 池子数据接口
 */
export interface PoolData {
  address: string;                    // 池子地址
  tokenX: string;                     // X代币地址
  tokenY: string;                     // Y代币地址
  tokenXSymbol: string;               // X代币符号
  tokenYSymbol: string;               // Y代币符号
  feeTier: number;                    // 费率层级
  liquidity: string;                  // 流动性
  sqrtPrice: string;                  // 价格平方根
  currentPrice: number;               // 当前价格
  volume24h: number;                  // 24小时交易量
  fees24h: number;                    // 24小时费用
  tvl: number;                        // 总锁仓价值
  binStep: number;                    // bin步长
  currentBinId: number;               // 当前bin ID
  status: string;                     // 状态
  metadata?: Record<string, any>;     // 元数据
}

/**
 * 市场分析接口
 */
export interface MarketAnalysis {
  poolAddress: string;                // 池子地址
  timestamp: number;                  // 分析时间戳
  trend: {                            // 趋势分析
    direction: number;                // 方向 (-1 到 1)
    momentum: number;                 // 动量 (-1 到 1)
    volatility: number;               // 波动率 (0 到 1)
    breakoutProbability: number;      // 突破概率 (0 到 1)
  };
  liquidity: {                        // 流动性分析
    depth: number;                    // 深度 (0 到 1)
    concentration: number;            // 集中度 (0 到 1)
    imbalanceRisk: number;            // 不平衡风险 (0 到 1)
    optimalBinRanges: Array<{         // 最优bin范围
      start: number;                  // 开始bin ID
      end: number;                    // 结束bin ID
      confidence: number;             // 置信度 (0 到 1)
    }>;
    binDistribution: Array<{          // bin分布
      binId: number;                  // bin ID
      liquidity: number;              // 流动性
      isActive: boolean;              // 是否活跃
    }>;
  };
  volume: {                           // 交易量分析
    trend: number;                    // 趋势 (-1 到 1)
    predictedTrend: number;           // 预测趋势 (-1 到 1)
    anomalies: Array<{                // 异常
      timestamp: number;              // 时间戳
      severity: number;               // 严重程度 (0 到 1)
      description: string;            // 描述
    }>;
  };
  risk: {                             // 风险分析
    volatilityRisk: number;           // 波动风险 (0 到 1)
    liquidityRisk: number;            // 流动性风险 (0 到 1)
    impermanentLossRisk: number;      // 无常损失风险 (0 到 1)
    systemicRisk: number;             // 系统性风险 (0 到 1)
  };
}

/**
 * 策略接口
 */
export interface Strategy {
  id: string;                         // 策略ID
  name: string;                       // 策略名称
  description: string;                // 策略描述
  poolAddresses: string[];            // 适用池子地址
  parameters: Record<string, any>;    // 策略参数
  active: boolean;                    // 是否激活
  createdAt: number;                  // 创建时间戳
  updatedAt: number;                  // 更新时间戳
  performance?: {                     // 性能指标
    roi: number;                      // 投资回报率
    sharpeRatio: number;              // 夏普比率
    maxDrawdown: number;              // 最大回撤
    winRate: number;                  // 胜率
  };
}

/**
 * 信号分析结果接口
 */
export interface SignalAnalysisResult {
  signalId: string;                   // 信号ID
  poolAddress: string;                // 池子地址
  signalType: SignalType;             // 信号类型
  timestamp: number;                  // 信号时间戳
  outcome: 'SUCCESS' | 'FAILURE' | 'NEUTRAL'; // 结果
  roi: number;                        // 投资回报率
  holdingPeriod: number;              // 持有期
  notes: string;                      // 备注
} 