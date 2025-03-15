/**
 * 流动性分布类型
 */
export interface LiquidityDistribution {
  token0: {
    amount: number;      // 代币0数量
    weight: number;      // 代币0权重
    price: number;       // 代币0价格
  };
  token1: {
    amount: number;      // 代币1数量
    weight: number;      // 代币1权重
    price: number;       // 代币1价格
  };
  totalLiquidity: number; // 总流动性
}

/**
 * 价格范围
 */
export interface PriceRange {
  min: number;          // 最小价格
  max: number;          // 最大价格
  current: number;      // 当前价格
}

/**
 * 收益率计算参数
 */
export interface APYCalculationParams {
  fees24h: number;      // 24小时手续费
  rewards24h: number;   // 24小时奖励
  totalLiquidity: number; // 总流动性
  priceImpact: number;  // 价格影响
}

/**
 * 池子基础信息
 */
export interface PoolInfo {
  id: string;           // 池子ID
  address: string;      // 合约地址
  token0: string;       // 代币0地址
  token1: string;       // 代币1地址
  fee: number;         // 手续费率
  tickSpacing: number; // tick间距
  createdAt: Date;     // 创建时间
}

/**
 * 池子状态
 */
export interface PoolState {
  liquidity: LiquidityDistribution; // 流动性分布
  priceRange: PriceRange;          // 价格范围
  volume24h: number;               // 24小时交易量
  fees24h: number;                 // 24小时手续费
  apy: number;                     // 当前APY
  tvl: number;                     // 总锁仓价值
  lastUpdateTime: Date;            // 最后更新时间
}

/**
 * 池子完整接口
 */
export interface Pool extends PoolInfo, PoolState {
  metadata?: Record<string, any>; // 元数据
} 