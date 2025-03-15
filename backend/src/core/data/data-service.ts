import { PoolData, TokenInfo, MarketMetrics, DataQueryOptions, DataUpdateEvent } from './data-types';

export interface IDataService {
  // 池子数据相关
  getPoolData(poolId: string): Promise<PoolData>;
  getPoolsByToken(tokenAddress: string): Promise<PoolData[]>;
  getAllPools(): Promise<PoolData[]>;
  
  // 代币数据相关
  getTokenInfo(tokenAddress: string): Promise<TokenInfo>;
  getTokenPrice(tokenAddress: string): Promise<number>;
  
  // 市场指标相关
  getMarketMetrics(poolId: string, options?: DataQueryOptions): Promise<MarketMetrics[]>;
  getLatestMetrics(poolId: string): Promise<MarketMetrics>;
  
  // 数据更新相关
  subscribeToUpdates(callback: (event: DataUpdateEvent) => void): () => void;
  refreshPoolData(poolId: string): Promise<void>;
  refreshTokenData(tokenAddress: string): Promise<void>;
  
  // 数据验证相关
  validatePoolData(data: PoolData): Promise<boolean>;
  validateTokenData(data: TokenInfo): Promise<boolean>;
  validateMetricsData(data: MarketMetrics): Promise<boolean>;
} 