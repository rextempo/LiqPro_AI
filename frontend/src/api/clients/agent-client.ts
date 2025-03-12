/**
 * Agent API客户端
 * 处理Agent相关的API请求
 */

import httpClient from '../utils/http-client';
import websocketClient from '../utils/websocket-client';
import { ApiResponse, Agent, PaginationParams, PaginatedResponse, AgentStatus } from '../types';

class AgentClient {
  private readonly basePath = '/agents';

  /**
   * 获取Agent列表
   */
  public async getAgents(params?: PaginationParams & {
    status?: AgentStatus;
    search?: string;
  }): Promise<ApiResponse<PaginatedResponse<Agent>>> {
    return httpClient.get<PaginatedResponse<Agent>>(this.basePath, { params });
  }

  /**
   * 获取单个Agent
   */
  public async getAgent(id: string): Promise<ApiResponse<Agent>> {
    return httpClient.get<Agent>(`${this.basePath}/${id}`);
  }

  /**
   * 创建新Agent
   */
  public async createAgent(data: {
    name: string;
    walletAddress: string;
    settings?: Record<string, any>;
  }): Promise<ApiResponse<Agent>> {
    return httpClient.post<Agent>(this.basePath, data);
  }

  /**
   * 更新Agent
   */
  public async updateAgent(id: string, data: {
    name?: string;
    settings?: Record<string, any>;
  }): Promise<ApiResponse<Agent>> {
    return httpClient.put<Agent>(`${this.basePath}/${id}`, data);
  }

  /**
   * 删除Agent
   */
  public async deleteAgent(id: string): Promise<ApiResponse<void>> {
    return httpClient.delete<void>(`${this.basePath}/${id}`);
  }

  /**
   * 启动Agent
   */
  public async startAgent(id: string): Promise<ApiResponse<Agent>> {
    return httpClient.post<Agent>(`${this.basePath}/${id}/start`, {});
  }

  /**
   * 停止Agent
   */
  public async stopAgent(id: string): Promise<ApiResponse<Agent>> {
    return httpClient.post<Agent>(`${this.basePath}/${id}/stop`, {});
  }

  /**
   * 切换Agent到观察模式
   */
  public async setAgentToObserveMode(id: string): Promise<ApiResponse<Agent>> {
    return httpClient.post<Agent>(`${this.basePath}/${id}/observe`, {});
  }

  /**
   * 获取Agent性能数据
   */
  public async getAgentPerformance(id: string, params?: {
    timeRange?: '24h' | '7d' | '30d' | 'all';
    interval?: 'hour' | 'day' | 'week';
  }): Promise<ApiResponse<{
    yields: Array<{ timestamp: string; value: number }>;
    transactions: number;
    profitLoss: number;
    profitLossPercentage: number;
    assetValueHistory: Array<{ timestamp: string; solValue: number; usdValue: number }>;
  }>> {
    return httpClient.get<any>(`${this.basePath}/${id}/performance`, { params });
  }

  /**
   * 获取Agent交易历史
   */
  public async getAgentTransactions(id: string, params?: PaginationParams & {
    fromTimestamp?: string;
    toTimestamp?: string;
    type?: string;
  }): Promise<ApiResponse<PaginatedResponse<any>>> {
    return httpClient.get<PaginatedResponse<any>>(`${this.basePath}/${id}/transactions`, { params });
  }

  /**
   * 获取Agent资产分布
   */
  public async getAgentAssets(id: string): Promise<ApiResponse<Array<{
    token: string;
    symbol: string;
    amount: number;
    solValue: number;
    usdValue: number;
    percentage: number;
  }>>> {
    return httpClient.get<any>(`${this.basePath}/${id}/assets`);
  }

  /**
   * 获取Agent策略设置
   */
  public async getAgentSettings(id: string): Promise<ApiResponse<Record<string, any>>> {
    return httpClient.get<Record<string, any>>(`${this.basePath}/${id}/settings`);
  }

  /**
   * 更新Agent策略设置
   */
  public async updateAgentSettings(id: string, settings: Record<string, any>): Promise<ApiResponse<Agent>> {
    return httpClient.put<Agent>(`${this.basePath}/${id}/settings`, { settings });
  }

  /**
   * 订阅Agent更新
   */
  public subscribeToAgentUpdates(agentId?: string): string {
    return websocketClient.subscribe({
      topic: 'agents',
      options: { agentId },
    });
  }

  /**
   * 取消订阅Agent更新
   */
  public unsubscribeFromAgentUpdates(subscriptionId: string): boolean {
    return websocketClient.unsubscribe(subscriptionId);
  }

  /**
   * 添加Agent更新监听器
   */
  public onAgentUpdate(subscriptionId: string, listener: (agent: Agent) => void): boolean {
    return websocketClient.on(subscriptionId, 'update', listener);
  }

  /**
   * 添加Agent状态变更监听器
   */
  public onAgentStatusChange(subscriptionId: string, listener: (data: { agentId: string; status: AgentStatus }) => void): boolean {
    return websocketClient.on(subscriptionId, 'status', listener);
  }

  /**
   * 添加Agent交易监听器
   */
  public onAgentTransaction(subscriptionId: string, listener: (transaction: any) => void): boolean {
    return websocketClient.on(subscriptionId, 'transaction', listener);
  }

  /**
   * 添加Agent性能更新监听器
   */
  public onAgentPerformanceUpdate(subscriptionId: string, listener: (performance: any) => void): boolean {
    return websocketClient.on(subscriptionId, 'performance', listener);
  }

  /**
   * 清除Agent缓存
   */
  public clearCache(): void {
    httpClient.clearPathCache(this.basePath);
  }

  /**
   * 清除特定Agent的缓存
   */
  public clearAgentCache(id: string): void {
    httpClient.clearPathCache(`${this.basePath}/${id}`);
  }
}

// 导出默认实例
export default new AgentClient(); 