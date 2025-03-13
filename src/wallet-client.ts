/**
 * 钱包API客户端
 * 处理钱包相关的API请求
 */

import httpClient from '../utils/http-client';
import websocketClient from '../utils/websocket-client';
import { ApiResponse } from '../types';

class WalletClient {
  private readonly basePath = '/wallet';

  /**
   * 获取钱包资产
   */
  public async getWalletAssets(walletAddress: string): Promise<ApiResponse<Array<{
    token: string;
    symbol: string;
    amount: number;
    decimals: number;
    usdValue: number;
    solValue: number;
    icon?: string;
  }>>> {
    return httpClient.get<any>(`${this.basePath}/assets/${walletAddress}`);
  }

  /**
   * 获取钱包SOL余额
   */
  public async getSolBalance(walletAddress: string): Promise<ApiResponse<{
    amount: number;
    usdValue: number;
  }>> {
    return httpClient.get<any>(`${this.basePath}/sol-balance/${walletAddress}`);
  }

  /**
   * 获取钱包代币余额
   */
  public async getTokenBalance(walletAddress: string, tokenAddress: string): Promise<ApiResponse<{
    amount: number;
    decimals: number;
    usdValue: number;
    solValue: number;
  }>> {
    return httpClient.get<any>(`${this.basePath}/token-balance/${walletAddress}/${tokenAddress}`);
  }

  /**
   * 获取钱包交易历史
   */
  public async getWalletTransactionHistory(walletAddress: string, params?: {
    limit?: number;
    before?: string;
    after?: string;
  }): Promise<ApiResponse<Array<{
    signature: string;
    blockTime: number;
    slot: number;
    type: string;
    status: 'success' | 'failed';
    fee: number;
    description: string;
    change?: {
      symbol: string;
      amount: number;
      usdValue: number;
    };
  }>>> {
    return httpClient.get<any>(`${this.basePath}/history/${walletAddress}`, { params });
  }

  /**
   * 获取钱包NFT
   */
  public async getWalletNFTs(walletAddress: string, params?: {
    limit?: number;
    offset?: number;
    collection?: string;
  }): Promise<ApiResponse<Array<{
    mint: string;
    name: string;
    symbol: string;
    image: string;
    collection?: {
      name: string;
      family: string;
    };
    attributes?: Record<string, string>;
  }>>> {
    return httpClient.get<any>(`${this.basePath}/nfts/${walletAddress}`, { params });
  }

  /**
   * 创建签名消息
   */
  public async createSignatureMessage(walletAddress: string): Promise<ApiResponse<{
    message: string;
    timestamp: number;
    nonce: string;
  }>> {
    return httpClient.post<any>(`${this.basePath}/signature-message`, { walletAddress });
  }

  /**
   * 验证签名
   */
  public async verifySignature(data: {
    walletAddress: string;
    signature: string;
    message: string;
    nonce: string;
  }): Promise<ApiResponse<{
    valid: boolean;
    walletAddress: string;
  }>> {
    return httpClient.post<any>(`${this.basePath}/verify-signature`, data);
  }

  /**
   * 获取钱包连接状态
   */
  public async getWalletConnectionStatus(walletAddress: string): Promise<ApiResponse<{
    connected: boolean;
    lastSeen: string;
    permissions: string[];
  }>> {
    return httpClient.get<any>(`${this.basePath}/connection-status/${walletAddress}`);
  }

  /**
   * 获取支持的钱包列表
   */
  public async getSupportedWallets(): Promise<ApiResponse<Array<{
    id: string;
    name: string;
    icon: string;
    website: string;
    installUrl?: string;
    mobile: boolean;
    desktop: boolean;
    browser: boolean;
  }>>> {
    return httpClient.get<any>(`${this.basePath}/supported-wallets`);
  }

  /**
   * 订阅钱包余额更新
   */
  public subscribeToWalletUpdates(walletAddress: string): string {
    return websocketClient.subscribe({
      topic: 'wallet',
      options: { walletAddress },
    });
  }

  /**
   * 取消订阅钱包更新
   */
  public unsubscribeFromWalletUpdates(subscriptionId: string): boolean {
    return websocketClient.unsubscribe(subscriptionId);
  }

  /**
   * 添加钱包余额更新监听器
   */
  public onWalletBalanceUpdate(subscriptionId: string, listener: (data: { 
    walletAddress: string; 
    token: string; 
    symbol: string;
    amount: number; 
    usdValue: number;
    change: number;
  }) => void): boolean {
    return websocketClient.on(subscriptionId, 'balance', listener);
  }

  /**
   * 添加钱包连接状态更新监听器
   */
  public onWalletConnectionUpdate(subscriptionId: string, listener: (data: { 
    walletAddress: string; 
    connected: boolean;
  }) => void): boolean {
    return websocketClient.on(subscriptionId, 'connection', listener);
  }

  /**
   * 清除钱包缓存
   */
  public clearCache(): void {
    httpClient.clearPathCache(this.basePath);
  }

  /**
   * 清除特定钱包的缓存
   */
  public clearWalletCache(walletAddress: string): void {
    httpClient.clearPathCache(`${this.basePath}/assets/${walletAddress}`);
    httpClient.clearPathCache(`${this.basePath}/sol-balance/${walletAddress}`);
    httpClient.clearPathCache(`${this.basePath}/history/${walletAddress}`);
    httpClient.clearPathCache(`${this.basePath}/nfts/${walletAddress}`);
  }
}

// 导出默认实例
export default new WalletClient(); 