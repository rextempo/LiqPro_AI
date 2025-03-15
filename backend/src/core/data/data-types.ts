/**
 * @file 数据与监控模块的核心类型定义
 * @module core/data/data-types
 * @description 定义数据与监控模块所需的所有接口和类型
 */

import { PublicKey } from '@solana/web3.js';

/**
 * 代币信息接口
 */
export interface TokenInfo {
  mint: string;           // 代币合约地址
  reserve: string;        // 储备账户地址
  amount: number;         // 当前储备量
  symbol: string;         // 代币符号
  decimals: number;       // 代币精度
  price: number;         // 代币价格
}

/**
 * 时间序列数据接口
 */
export interface TimeSeriesData {
  min_30: number;        // 30分钟数据
  hour_1: number;        // 1小时数据
  hour_2: number;        // 2小时数据
  hour_4: number;        // 4小时数据
  hour_12: number;       // 12小时数据
  hour_24: number;       // 24小时数据
}

/**
 * 池子数据接口
 */
export interface PoolData {
  id: string;
  address: string;
  name: string;
  tokens: {
    tokenX: TokenInfo;
    tokenY: TokenInfo;
  };
  fees: {
    base: string;
    max: string;
    protocol: string;
    today: number;
    last24h: number;
  };
  volume: {
    last24h: number;
    cumulative: string;
  };
  liquidity: {
    total: string;
  };
  rewards: {
    mintX: string;
    mintY: string;
    farmApr: number;
    farmApy: number;
  };
  yields: {
    apr: number;
    fees24hTvl: number;
  };
  parameters: {
    binStep: number;
    currentPrice: number;
    hide: boolean;
    isBlacklisted: boolean;
  };
  tags: string[];
  lastUpdate: string;
}

/**
 * 市场指标接口
 */
export interface MarketMetrics {
  poolId: string;       // 池子ID
  timestamp: Date;      // 时间戳
  price: number;        // 价格
  volume: number;       // 交易量
  liquidity: number;    // 流动性
  fees: number;         // 费用
}

/**
 * 数据更新事件接口
 */
export interface DataUpdateEvent {
  type: 'POOL_UPDATE' | 'TOKEN_UPDATE' | 'METRICS_UPDATE'; // 更新类型
  data: PoolData | TokenInfo | MarketMetrics;              // 更新数据
  timestamp: Date;                                         // 时间戳
}

/**
 * 数据查询选项接口
 */
export interface DataQueryOptions {
  startTime?: Date;     // 开始时间
  endTime?: Date;       // 结束时间
  limit?: number;       // 限制数量
  offset?: number;      // 偏移量
} 