/**
 * 认证API客户端
 * 处理用户登录、注册和令牌管理
 */

import httpClient from '../utils/http-client';
import { ApiResponse, AuthTokens, UserProfile } from '../types';
import { AUTH_CONFIG } from '../config';

class AuthClient {
  /**
   * 使用钱包地址登录
   */
  public async loginWithWallet(walletAddress: string, signature: string): Promise<ApiResponse<AuthTokens>> {
    const response = await httpClient.post<AuthTokens>('/auth/wallet', {
      walletAddress,
      signature,
    });

    if (response.success && response.data) {
      this.saveTokens(response.data);
      httpClient.setAuthToken(response.data.accessToken);
    }

    return response;
  }

  /**
   * 使用API密钥登录
   */
  public async loginWithApiKey(apiKey: string): Promise<ApiResponse<AuthTokens>> {
    const response = await httpClient.post<AuthTokens>('/auth/api-key', {
      apiKey,
    });

    if (response.success && response.data) {
      this.saveTokens(response.data);
      httpClient.setAuthToken(response.data.accessToken);
    }

    return response;
  }

  /**
   * 注册新用户
   */
  public async register(walletAddress: string, signature: string, username?: string): Promise<ApiResponse<AuthTokens>> {
    const response = await httpClient.post<AuthTokens>('/auth/register', {
      walletAddress,
      signature,
      username,
    });

    if (response.success && response.data) {
      this.saveTokens(response.data);
      httpClient.setAuthToken(response.data.accessToken);
    }

    return response;
  }

  /**
   * 刷新访问令牌
   */
  public async refreshToken(): Promise<ApiResponse<AuthTokens>> {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      return {
        success: false,
        error: {
          code: 'no_refresh_token',
          message: 'No refresh token available',
        },
        timestamp: new Date().toISOString(),
      };
    }

    const response = await httpClient.post<AuthTokens>('/auth/refresh', {
      refreshToken,
    });

    if (response.success && response.data) {
      this.saveTokens(response.data);
      httpClient.setAuthToken(response.data.accessToken);
    }

    return response;
  }

  /**
   * 登出
   */
  public async logout(): Promise<ApiResponse<void>> {
    const response = await httpClient.post<void>('/auth/logout');
    
    if (response.success) {
      this.clearTokens();
      httpClient.clearAuthToken();
    }
    
    return response;
  }

  /**
   * 获取当前用户信息
   */
  public async getCurrentUser(): Promise<ApiResponse<UserProfile>> {
    return httpClient.get<UserProfile>('/user/profile');
  }

  /**
   * 验证当前会话
   */
  public async validateSession(): Promise<ApiResponse<{ valid: boolean }>> {
    return httpClient.get<{ valid: boolean }>('/auth/validate');
  }

  /**
   * 保存令牌到本地存储
   */
  private saveTokens(tokens: AuthTokens): void {
    localStorage.setItem(AUTH_CONFIG.tokenStorageKey, tokens.accessToken);
    localStorage.setItem(AUTH_CONFIG.refreshTokenStorageKey, tokens.refreshToken);
    
    // 计算过期时间
    const expiryTime = Date.now() + tokens.expiresIn * 1000;
    localStorage.setItem(AUTH_CONFIG.tokenExpiryKey, expiryTime.toString());
  }

  /**
   * 从本地存储获取访问令牌
   */
  public getAccessToken(): string | null {
    return localStorage.getItem(AUTH_CONFIG.tokenStorageKey);
  }

  /**
   * 从本地存储获取刷新令牌
   */
  public getRefreshToken(): string | null {
    return localStorage.getItem(AUTH_CONFIG.refreshTokenStorageKey);
  }

  /**
   * 获取令牌过期时间
   */
  public getTokenExpiry(): number | null {
    const expiry = localStorage.getItem(AUTH_CONFIG.tokenExpiryKey);
    return expiry ? parseInt(expiry, 10) : null;
  }

  /**
   * 检查令牌是否过期
   */
  public isTokenExpired(): boolean {
    const expiry = this.getTokenExpiry();
    return expiry ? Date.now() > expiry : true;
  }

  /**
   * 清除所有令牌
   */
  public clearTokens(): void {
    localStorage.removeItem(AUTH_CONFIG.tokenStorageKey);
    localStorage.removeItem(AUTH_CONFIG.refreshTokenStorageKey);
    localStorage.removeItem(AUTH_CONFIG.tokenExpiryKey);
  }

  /**
   * 初始化认证状态
   * 在应用启动时调用，设置HTTP客户端的认证令牌
   */
  public initAuth(): boolean {
    const token = this.getAccessToken();
    
    if (token && !this.isTokenExpired()) {
      httpClient.setAuthToken(token);
      // 设置令牌刷新回调
      this.setupTokenRefreshCallback();
      return true;
    }
    
    return false;
  }

  /**
   * 设置令牌刷新回调
   * 这将允许HTTP客户端在令牌过期时自动刷新令牌
   */
  private setupTokenRefreshCallback(): void {
    httpClient.setTokenRefreshCallback(async () => {
      // 使用当前实例的refreshToken方法
      return this.refreshToken();
    });
  }
}

// 导出默认实例
export default new AuthClient(); 