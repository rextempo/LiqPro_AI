/**
 * 信号API客户端
 * 处理信号相关的API请求
 */

import httpClient from '../utils/http-client';
import websocketClient from '../utils/websocket-client';
import { ApiResponse, Signal, PaginationParams, PaginatedResponse } from '../types';

class SignalClient {
  private readonly basePath = '/signals';

  /**
   * 获取信号列表
   */
  public async getSignals(params?: PaginationParams & {
    type?: string;
    poolAddress?: string;
    minStrength?: number;
    minReliability?: number;
    fromTimestamp?: string;
    toTimestamp?: string;
  }): Promise<ApiResponse<PaginatedResponse<Signal>>> {
    return httpClient.get<PaginatedResponse<Signal>>(this.basePath, { params });
  }

  /**
   * 获取单个信号
   */
  public async getSignal(id: string): Promise<ApiResponse<Signal>> {
    return httpClient.get<Signal>(`${this.basePath}/${id}`);
  }

  /**
   * 获取最新信号
   */
  public async getLatestSignals(limit: number = 10): Promise<ApiResponse<Signal[]>> {
    return httpClient.get<Signal[]>(`${this.basePath}/latest`, {
      params: { limit },
    });
  }

  /**
   * 获取特定池子的信号
   */
  public async getPoolSignals(poolAddress: string, params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<Signal>>> {
    return httpClient.get<PaginatedResponse<Signal>>(`${this.basePath}/pool/${poolAddress}`, {
      params,
    });
  }

  /**
   * 获取信号统计信息
   */
  public async getSignalStats(): Promise<ApiResponse<{
    total: number;
    byType: Record<string, number>;
    byPool: Record<string, number>;
    averageStrength: number;
    averageReliability: number;
  }>> {
    return httpClient.get<any>(`${this.basePath}/stats`);
  }

  /**
   * 订阅实时信号
   */
  public subscribeToSignals(options?: {
    type?: string;
    poolAddresses?: string[];
    minStrength?: number;
    minReliability?: number;
  }): string {
    return websocketClient.subscribe({
      topic: 'signals',
      options,
    });
  }

  /**
   * 取消订阅实时信号
   */
  public unsubscribeFromSignals(subscriptionId: string): boolean {
    return websocketClient.unsubscribe(subscriptionId);
  }

  /**
   * 添加信号监听器
   */
  public onSignal(subscriptionId: string, listener: (signal: Signal) => void): boolean {
    return websocketClient.on(subscriptionId, 'signal', listener);
  }

  /**
   * 添加信号过期监听器
   */
  public onSignalExpired(subscriptionId: string, listener: (signalIds: string[]) => void): boolean {
    return websocketClient.on(subscriptionId, 'expired', listener);
  }

  /**
   * 清除信号缓存
   */
  public clearCache(): void {
    httpClient.clearPathCache(this.basePath);
  }
}

// 导出默认实例
export default new SignalClient(); 