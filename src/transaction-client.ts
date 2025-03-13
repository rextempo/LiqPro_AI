/**
 * 交易API客户端
 * 处理交易相关的API请求
 */

import httpClient from '../utils/http-client';
import websocketClient from '../utils/websocket-client';
import { ApiResponse, Transaction, TransactionType, TransactionStatus, PaginationParams, PaginatedResponse } from '../types';

class TransactionClient {
  private readonly basePath = '/transactions';

  /**
   * 获取交易历史
   */
  public async getTransactions(params?: PaginationParams & {
    walletAddress?: string;
    agentId?: string;
    poolAddress?: string;
    type?: TransactionType;
    status?: TransactionStatus;
    fromTimestamp?: string;
    toTimestamp?: string;
  }): Promise<ApiResponse<PaginatedResponse<Transaction>>> {
    return httpClient.get<PaginatedResponse<Transaction>>(this.basePath, { params });
  }

  /**
   * 获取单个交易详情
   */
  public async getTransaction(id: string): Promise<ApiResponse<Transaction>> {
    return httpClient.get<Transaction>(`${this.basePath}/${id}`);
  }

  /**
   * 获取交易状态
   */
  public async getTransactionStatus(txHash: string): Promise<ApiResponse<{
    status: TransactionStatus;
    confirmations: number;
    blockTime?: number;
    error?: string;
  }>> {
    return httpClient.get<any>(`${this.basePath}/status/${txHash}`);
  }

  /**
   * 执行代币交换交易
   */
  public async executeSwap(data: {
    walletAddress: string;
    fromToken: string;
    toToken: string;
    amount: number;
    slippage: number;
    agentId?: string;
  }): Promise<ApiResponse<{
    txHash: string;
    status: TransactionStatus;
    expectedAmount: number;
    fee: number;
  }>> {
    return httpClient.post<any>(`${this.basePath}/swap`, data);
  }

  /**
   * 添加流动性
   */
  public async addLiquidity(data: {
    walletAddress: string;
    poolAddress: string;
    token0Amount?: number;
    token1Amount?: number;
    solAmount?: number;
    lowerBin?: number;
    upperBin?: number;
    agentId?: string;
  }): Promise<ApiResponse<{
    txHash: string;
    status: TransactionStatus;
    positionId: string;
  }>> {
    return httpClient.post<any>(`${this.basePath}/add-liquidity`, data);
  }

  /**
   * 移除流动性
   */
  public async removeLiquidity(data: {
    walletAddress: string;
    poolAddress: string;
    positionId: string;
    percentage: number;
    agentId?: string;
  }): Promise<ApiResponse<{
    txHash: string;
    status: TransactionStatus;
    token0Amount: number;
    token1Amount: number;
  }>> {
    return httpClient.post<any>(`${this.basePath}/remove-liquidity`, data);
  }

  /**
   * 收集交易费用
   */
  public async harvestFees(data: {
    walletAddress: string;
    poolAddress: string;
    positionId: string;
    agentId?: string;
  }): Promise<ApiResponse<{
    txHash: string;
    status: TransactionStatus;
    token0Amount: number;
    token1Amount: number;
  }>> {
    return httpClient.post<any>(`${this.basePath}/harvest-fees`, data);
  }

  /**
   * 获取交易统计数据
   */
  public async getTransactionStats(walletAddress?: string, agentId?: string): Promise<ApiResponse<{
    total: number;
    totalVolume: number;
    byType: Record<TransactionType, number>;
    byStatus: Record<TransactionStatus, number>;
    recentActivity: Array<{
      timestamp: string;
      count: number;
      volume: number;
    }>;
  }>> {
    const params: Record<string, string> = {};
    if (walletAddress) params.walletAddress = walletAddress;
    if (agentId) params.agentId = agentId;
    
    return httpClient.get<any>(`${this.basePath}/stats`, { params });
  }

  /**
   * 模拟交易（不实际执行）
   */
  public async simulateTransaction(data: {
    type: TransactionType;
    walletAddress: string;
    params: Record<string, any>;
  }): Promise<ApiResponse<{
    success: boolean;
    estimatedFee: number;
    estimatedResult: Record<string, any>;
    warnings?: string[];
  }>> {
    return httpClient.post<any>(`${this.basePath}/simulate`, data);
  }

  /**
   * 订阅交易更新
   */
  public subscribeToTransactionUpdates(walletAddress?: string, agentId?: string): string {
    return websocketClient.subscribe({
      topic: 'transactions',
      options: { walletAddress, agentId },
    });
  }

  /**
   * 取消订阅交易更新
   */
  public unsubscribeFromTransactionUpdates(subscriptionId: string): boolean {
    return websocketClient.unsubscribe(subscriptionId);
  }

  /**
   * 添加交易创建监听器
   */
  public onTransactionCreated(subscriptionId: string, listener: (transaction: Transaction) => void): boolean {
    return websocketClient.on(subscriptionId, 'created', listener);
  }

  /**
   * 添加交易状态更新监听器
   */
  public onTransactionStatusUpdate(subscriptionId: string, listener: (data: { id: string; txHash: string; status: TransactionStatus; error?: string }) => void): boolean {
    return websocketClient.on(subscriptionId, 'status', listener);
  }

  /**
   * 清除交易缓存
   */
  public clearCache(): void {
    httpClient.clearPathCache(this.basePath);
  }
}

// 导出默认实例
export default new TransactionClient(); 