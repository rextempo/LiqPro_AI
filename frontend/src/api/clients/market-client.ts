/**
 * 市场数据API客户端
 * 处理市场数据相关的API请求
 */

import httpClient from '../utils/http-client';
import websocketClient from '../utils/websocket-client';
import { ApiResponse, MarketData } from '../types';

class MarketClient {
  private readonly basePath = '/market';

  /**
   * 获取市场概览数据
   */
  public async getMarketOverview(): Promise<ApiResponse<MarketData>> {
    return httpClient.get<MarketData>(`${this.basePath}/overview`);
  }

  /**
   * 获取代币价格数据
   */
  public async getTokenPrice(symbol: string): Promise<ApiResponse<{
    price: number;
    change24h: number;
    high24h: number;
    low24h: number;
    volume24h: number;
    marketCap: number;
    lastUpdated: string;
  }>> {
    return httpClient.get<any>(`${this.basePath}/price/${symbol}`);
  }

  /**
   * 获取多个代币的价格数据
   */
  public async getTokenPrices(symbols: string[]): Promise<ApiResponse<Record<string, {
    price: number;
    change24h: number;
  }>>> {
    return httpClient.get<any>(`${this.basePath}/prices`, {
      params: { symbols: symbols.join(',') }
    });
  }

  /**
   * 获取代币价格历史数据
   */
  public async getTokenPriceHistory(symbol: string, params?: {
    timeRange?: '24h' | '7d' | '30d' | '90d' | '1y' | 'all';
    interval?: 'minute' | 'hour' | 'day' | 'week';
  }): Promise<ApiResponse<Array<{
    timestamp: string;
    price: number;
    volume?: number;
  }>>> {
    return httpClient.get<any>(`${this.basePath}/history/${symbol}`, { params });
  }

  /**
   * 获取市场趋势分析
   */
  public async getMarketTrends(): Promise<ApiResponse<{
    topGainers: Array<{ symbol: string; name: string; change24h: number; price: number }>;
    topLosers: Array<{ symbol: string; name: string; change24h: number; price: number }>;
    trendingTokens: Array<{ symbol: string; name: string; change24h: number; price: number }>;
    marketSentiment: 'bullish' | 'bearish' | 'neutral';
    volatilityIndex: number;
  }>> {
    return httpClient.get<any>(`${this.basePath}/trends`);
  }

  /**
   * 获取Solana生态系统数据
   */
  public async getSolanaEcosystemData(): Promise<ApiResponse<{
    totalValueLocked: number;
    totalTransactions24h: number;
    averageFee: number;
    activeWallets: number;
    topDapps: Array<{ name: string; tvl: number; change24h: number }>;
  }>> {
    return httpClient.get<any>(`${this.basePath}/solana/ecosystem`);
  }

  /**
   * 获取Meteora协议数据
   */
  public async getMeteoraProtocolData(): Promise<ApiResponse<{
    totalValueLocked: number;
    volume24h: number;
    volumeChange: number;
    totalPools: number;
    totalFees24h: number;
    topPools: Array<{ name: string; address: string; tvl: number; volume24h: number }>;
  }>> {
    return httpClient.get<any>(`${this.basePath}/meteora/stats`);
  }

  /**
   * 订阅市场数据更新
   */
  public subscribeToMarketUpdates(symbols?: string[]): string {
    return websocketClient.subscribe({
      topic: 'market',
      options: { symbols },
    });
  }

  /**
   * 取消订阅市场数据更新
   */
  public unsubscribeFromMarketUpdates(subscriptionId: string): boolean {
    return websocketClient.unsubscribe(subscriptionId);
  }

  /**
   * 添加市场概览更新监听器
   */
  public onMarketOverviewUpdate(subscriptionId: string, listener: (data: MarketData) => void): boolean {
    return websocketClient.on(subscriptionId, 'overview', listener);
  }

  /**
   * 添加代币价格更新监听器
   */
  public onTokenPriceUpdate(subscriptionId: string, listener: (data: { symbol: string; price: number; change: number }) => void): boolean {
    return websocketClient.on(subscriptionId, 'price', listener);
  }

  /**
   * 清除市场数据缓存
   */
  public clearCache(): void {
    httpClient.clearPathCache(this.basePath);
  }
}

// 导出默认实例
export default new MarketClient(); 