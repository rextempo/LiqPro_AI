/**
 * 流动性池API客户端
 * 处理流动性池相关的API请求
 */

import httpClient from '../utils/http-client';
import websocketClient from '../utils/websocket-client';
import { ApiResponse, Pool, PaginationParams, PaginatedResponse } from '../types';

class PoolClient {
  private readonly basePath = '/pools';

  /**
   * 获取流动性池列表
   */
  public async getPools(params?: PaginationParams & {
    search?: string;
    minTvl?: number;
    minApr?: number;
    token?: string;
    recommended?: boolean;
    risk?: 'low' | 'medium' | 'high';
  }): Promise<ApiResponse<PaginatedResponse<Pool>>> {
    return httpClient.get<PaginatedResponse<Pool>>(this.basePath, { params });
  }

  /**
   * 获取单个流动性池详情
   */
  public async getPool(address: string): Promise<ApiResponse<Pool>> {
    return httpClient.get<Pool>(`${this.basePath}/${address}`);
  }

  /**
   * 获取推荐的流动性池
   */
  public async getRecommendedPools(limit: number = 5): Promise<ApiResponse<Pool[]>> {
    return httpClient.get<Pool[]>(`${this.basePath}/recommended`, {
      params: { limit },
    });
  }

  /**
   * 获取特定代币的流动性池
   */
  public async getPoolsByToken(tokenAddress: string, params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<Pool>>> {
    return httpClient.get<PaginatedResponse<Pool>>(`${this.basePath}/token/${tokenAddress}`, {
      params,
    });
  }

  /**
   * 获取流动性池历史数据
   */
  public async getPoolHistory(address: string, params?: {
    timeRange?: '24h' | '7d' | '30d' | 'all';
    interval?: 'hour' | 'day' | 'week';
  }): Promise<ApiResponse<{
    tvl: Array<{ timestamp: string; value: number }>;
    volume: Array<{ timestamp: string; value: number }>;
    apr: Array<{ timestamp: string; value: number }>;
    price: Array<{ timestamp: string; value: number }>;
  }>> {
    return httpClient.get<any>(`${this.basePath}/${address}/history`, { params });
  }

  /**
   * 获取流动性池统计数据
   */
  public async getPoolStats(): Promise<ApiResponse<{
    totalPools: number;
    totalTvl: number;
    totalVolume24h: number;
    averageApr: number;
    topPerformers: Pool[];
  }>> {
    return httpClient.get<any>(`${this.basePath}/stats`);
  }

  /**
   * 获取用户在特定池中的仓位
   */
  public async getUserPoolPositions(poolAddress: string, walletAddress: string): Promise<ApiResponse<Array<{
    id: string;
    lowerBin: number;
    upperBin: number;
    token0Amount: number;
    token1Amount: number;
    solValue: number;
    usdValue: number;
    apr: number;
    createdAt: string;
  }>>> {
    return httpClient.get<any>(`${this.basePath}/${poolAddress}/positions/${walletAddress}`);
  }

  /**
   * 订阅流动性池更新
   */
  public subscribeToPoolUpdates(poolAddress?: string): string {
    return websocketClient.subscribe({
      topic: 'pools',
      options: { poolAddress },
    });
  }

  /**
   * 取消订阅流动性池更新
   */
  public unsubscribeFromPoolUpdates(subscriptionId: string): boolean {
    return websocketClient.unsubscribe(subscriptionId);
  }

  /**
   * 添加流动性池更新监听器
   */
  public onPoolUpdate(subscriptionId: string, listener: (pool: Pool) => void): boolean {
    return websocketClient.on(subscriptionId, 'update', listener);
  }

  /**
   * 添加流动性池价格更新监听器
   */
  public onPoolPriceUpdate(subscriptionId: string, listener: (data: { poolAddress: string; price: number; change: number }) => void): boolean {
    return websocketClient.on(subscriptionId, 'price', listener);
  }

  /**
   * 添加流动性池TVL更新监听器
   */
  public onPoolTvlUpdate(subscriptionId: string, listener: (data: { poolAddress: string; tvl: number; change: number }) => void): boolean {
    return websocketClient.on(subscriptionId, 'tvl', listener);
  }

  /**
   * 添加流动性池交易量更新监听器
   */
  public onPoolVolumeUpdate(subscriptionId: string, listener: (data: { poolAddress: string; volume: number; change: number }) => void): boolean {
    return websocketClient.on(subscriptionId, 'volume', listener);
  }

  /**
   * 清除流动性池缓存
   */
  public clearCache(): void {
    httpClient.clearPathCache(this.basePath);
  }

  /**
   * 清除特定流动性池的缓存
   */
  public clearPoolCache(address: string): void {
    httpClient.clearPathCache(`${this.basePath}/${address}`);
  }
}

// 导出默认实例
export default new PoolClient(); 