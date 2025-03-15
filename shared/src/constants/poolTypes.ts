/**
 * 池子类型枚举
 */
export enum PoolType {
  CONCENTRATED = 'CONCENTRATED', // 集中流动性池
  STABLE = 'STABLE',           // 稳定币池
  WEIGHTED = 'WEIGHTED'        // 权重池
}

/**
 * 池子风险等级
 */
export enum PoolRiskLevel {
  LOW = 'LOW',           // 低风险
  MEDIUM = 'MEDIUM',     // 中等风险
  HIGH = 'HIGH'          // 高风险
}

/**
 * 池子状态
 */
export enum PoolStatus {
  ACTIVE = 'ACTIVE',     // 活跃
  PAUSED = 'PAUSED',     // 暂停
  CLOSED = 'CLOSED'      // 关闭
}

/**
 * 池子配置常量
 */
export const POOL_CONFIG = {
  // 集中流动性池配置
  CONCENTRATED: {
    MIN_TICK_SPACING: 1,
    MAX_TICK_SPACING: 100,
    DEFAULT_FEE: 0.003, // 0.3%
    MAX_FEE: 0.01,      // 1%
    MIN_FEE: 0.0001,    // 0.01%
  },
  
  // 稳定币池配置
  STABLE: {
    MIN_AMP: 1,
    MAX_AMP: 1000,
    DEFAULT_FEE: 0.0001, // 0.01%
    MAX_FEE: 0.001,      // 0.1%
    MIN_FEE: 0.00001,    // 0.001%
  },
  
  // 权重池配置
  WEIGHTED: {
    MIN_WEIGHT: 0.01,    // 1%
    MAX_WEIGHT: 0.99,    // 99%
    DEFAULT_FEE: 0.003,  // 0.3%
    MAX_FEE: 0.01,       // 1%
    MIN_FEE: 0.0001,     // 0.01%
  }
} as const;

/**
 * 风险等级配置
 */
export const RISK_CONFIG = {
  [PoolRiskLevel.LOW]: {
    maxPriceImpact: 0.01,    // 1%
    maxSlippage: 0.005,      // 0.5%
    minLiquidity: 100000,    // 最小流动性
    maxExposure: 0.1,        // 最大敞口
  },
  [PoolRiskLevel.MEDIUM]: {
    maxPriceImpact: 0.02,    // 2%
    maxSlippage: 0.01,       // 1%
    minLiquidity: 50000,     // 最小流动性
    maxExposure: 0.2,        // 最大敞口
  },
  [PoolRiskLevel.HIGH]: {
    maxPriceImpact: 0.05,    // 5%
    maxSlippage: 0.02,       // 2%
    minLiquidity: 10000,     // 最小流动性
    maxExposure: 0.3,        // 最大敞口
  }
} as const; 