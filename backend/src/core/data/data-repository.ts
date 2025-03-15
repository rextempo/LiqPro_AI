import { PoolData, TokenInfo, MarketMetrics, DataQueryOptions } from './data-types';

export interface IDataRepository {
  // 池子数据存储
  savePoolData(data: PoolData): Promise<void>;
  getPoolData(poolId: string): Promise<PoolData | null>;
  getAllPoolData(): Promise<PoolData[]>;
  
  // 代币数据存储
  saveTokenData(data: TokenInfo): Promise<void>;
  getTokenData(tokenAddress: string): Promise<TokenInfo | null>;
  
  // 市场指标存储
  saveMarketMetrics(data: MarketMetrics): Promise<void>;
  getMarketMetrics(poolId: string, options?: DataQueryOptions): Promise<MarketMetrics[]>;
  
  // 缓存管理
  clearCache(): Promise<void>;
  invalidateCache(key: string): Promise<void>;
  
  // 数据清理
  cleanupOldData(beforeDate: Date): Promise<void>;
  archiveData(beforeDate: Date): Promise<void>;
} 