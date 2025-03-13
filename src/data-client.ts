import { BaseClient } from './base-client';

/**
 * 市场数据过滤选项接口
 */
export interface MarketDataFilterOptions {
  poolAddresses?: string[];
  fromTimestamp?: number;
  toTimestamp?: number;
  interval?: string;
  limit?: number;
  offset?: number;
}

/**
 * 价格数据点接口
 */
export interface PriceDataPoint {
  timestamp: number;
  price: number;
  volume?: number;
  high?: number;
  low?: number;
  open?: number;
  close?: number;
}

/**
 * 流动性数据点接口
 */
export interface LiquidityDataPoint {
  timestamp: number;
  totalLiquidity: number;
  binDistribution: Record<string, number>;
}

/**
 * 池信息接口
 */
export interface PoolInfo {
  address: string;
  token0: {
    address: string;
    symbol: string;
    decimals: number;
  };
  token1: {
    address: string;
    symbol: string;
    decimals: number;
  };
  fee: number;
  createdAt: number;
  totalVolume24h: number;
  totalLiquidity: number;
  currentPrice: number;
  priceChange24h: number;
}

/**
 * 数据服务客户端
 * 用于与数据服务通信
 */
export class DataClient extends BaseClient {
  /**
   * 创建数据服务客户端实例
   * @param baseUrl 数据服务基础URL
   * @param timeout 请求超时时间(毫秒)
   */
  constructor(baseUrl: string, timeout = 10000) {
    super('Data', baseUrl, timeout);
  }

  /**
   * 获取池列表
   * @returns 池信息列表
   */
  public async getPools(): Promise<PoolInfo[]> {
    return this.get<PoolInfo[]>('/pools');
  }

  /**
   * 获取池信息
   * @param poolAddress 池地址
   * @returns 池信息
   */
  public async getPool(poolAddress: string): Promise<PoolInfo> {
    return this.get<PoolInfo>(`/pools/${poolAddress}`);
  }

  /**
   * 获取价格数据
   * @param poolAddress 池地址
   * @param options 过滤选项
   * @returns 价格数据点列表
   */
  public async getPriceData(poolAddress: string, options?: Omit<MarketDataFilterOptions, 'poolAddresses'>): Promise<PriceDataPoint[]> {
    return this.get<PriceDataPoint[]>(`/market-data/${poolAddress}/price`, { params: options });
  }

  /**
   * 获取流动性数据
   * @param poolAddress 池地址
   * @param options 过滤选项
   * @returns 流动性数据点列表
   */
  public async getLiquidityData(poolAddress: string, options?: Omit<MarketDataFilterOptions, 'poolAddresses'>): Promise<LiquidityDataPoint[]> {
    return this.get<LiquidityDataPoint[]>(`/market-data/${poolAddress}/liquidity`, { params: options });
  }

  /**
   * 获取多个池的价格数据
   * @param poolAddresses 池地址列表
   * @param options 过滤选项
   * @returns 按池地址分组的价格数据
   */
  public async getBulkPriceData(poolAddresses: string[], options?: Omit<MarketDataFilterOptions, 'poolAddresses'>): Promise<Record<string, PriceDataPoint[]>> {
    return this.post<Record<string, PriceDataPoint[]>>('/market-data/bulk/price', {
      poolAddresses,
      ...options
    });
  }

  /**
   * 获取市场概览数据
   * @returns 市场概览数据
   */
  public async getMarketOverview(): Promise<any> {
    return this.get('/market-data/overview');
  }
} 