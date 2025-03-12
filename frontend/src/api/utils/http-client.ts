/**
 * HTTP客户端基类
 * 处理API请求、响应和错误
 */

import { API_BASE_URL, API_TIMEOUT, RETRY_CONFIG, AUTH_CONFIG } from '../config';
import { ApiResponse, ApiError, ApiRequestOptions } from '../types';

// 请求方法类型
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

// 缓存存储
interface CacheStorage {
  [key: string]: {
    data: any;
    timestamp: number;
    expiry: number;
  };
}

export class HttpClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private timeout: number;
  private cache: CacheStorage = {};
  private refreshTokenPromise: Promise<ApiResponse<any>> | null = null;
  private tokenRefreshCallback?: () => Promise<ApiResponse<any>>;

  constructor(
    baseUrl: string = API_BASE_URL,
    timeout: number = API_TIMEOUT,
    defaultHeaders: Record<string, string> = {}
  ) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...defaultHeaders,
    };
  }

  /**
   * 设置默认请求头
   */
  public setDefaultHeaders(headers: Record<string, string>): void {
    this.defaultHeaders = {
      ...this.defaultHeaders,
      ...headers,
    };
  }

  /**
   * 设置认证令牌
   */
  public setAuthToken(token: string): void {
    this.defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  /**
   * 清除认证令牌
   */
  public clearAuthToken(): void {
    delete this.defaultHeaders['Authorization'];
  }

  /**
   * 设置令牌刷新回调
   * 这个回调函数将在令牌过期时被调用
   */
  public setTokenRefreshCallback(callback: () => Promise<ApiResponse<any>>): void {
    this.tokenRefreshCallback = callback;
  }

  /**
   * 发送GET请求
   */
  public async get<T>(path: string, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('GET', path, undefined, options);
  }

  /**
   * 发送POST请求
   */
  public async post<T>(path: string, data?: any, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('POST', path, data, options);
  }

  /**
   * 发送PUT请求
   */
  public async put<T>(path: string, data?: any, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', path, data, options);
  }

  /**
   * 发送DELETE请求
   */
  public async delete<T>(path: string, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', path, undefined, options);
  }

  /**
   * 发送PATCH请求
   */
  public async patch<T>(path: string, data?: any, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', path, data, options);
  }

  /**
   * 发送请求
   */
  private async request<T>(
    method: HttpMethod,
    path: string,
    data?: any,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    // 检查是否是刷新令牌的请求，避免无限循环
    const isRefreshTokenRequest = path.includes('/auth/refresh');
    
    // 如果不是刷新令牌请求，且令牌已过期，则尝试刷新令牌
    if (!isRefreshTokenRequest && this.isTokenExpired() && this.tokenRefreshCallback) {
      await this.refreshTokenIfNeeded();
    }
    
    const url = this.buildUrl(path, options.params);
    const cacheKey = this.getCacheKey(method, url);
    
    // 检查缓存
    if (method === 'GET' && options.cache !== false) {
      const cachedResponse = this.getFromCache<T>(cacheKey);
      if (cachedResponse) {
        return cachedResponse;
      }
    }

    const headers = {
      ...this.defaultHeaders,
      ...options.headers,
    };

    const requestOptions: RequestInit = {
      method,
      headers,
      signal: options.signal,
    };

    if (data) {
      requestOptions.body = JSON.stringify(data);
    }

    try {
      // 设置超时
      const timeoutPromise = this.createTimeoutPromise(options.timeout || this.timeout);
      const fetchPromise = fetch(url, requestOptions);
      
      // 使用Promise.race来实现超时
      const response = await Promise.race([fetchPromise, timeoutPromise]);
      
      // 处理响应
      const responseData = await this.handleResponse<T>(response as Response);
      
      // 缓存GET请求的响应
      if (method === 'GET' && options.cache !== false) {
        this.saveToCache(cacheKey, responseData);
      }
      
      return responseData;
    } catch (error) {
      // 处理认证错误
      if (this.isAuthError(error) && !isRefreshTokenRequest && this.tokenRefreshCallback) {
        try {
          // 尝试刷新令牌
          await this.refreshTokenIfNeeded();
          
          // 使用新令牌重试请求
          return this.request<T>(method, path, data, {
            ...options,
            retry: false, // 防止无限重试
          });
        } catch (refreshError) {
          // 刷新令牌失败，返回原始错误
          return this.handleError<T>(error as Error);
        }
      }
      
      // 处理重试逻辑
      if (options.retry !== false && this.shouldRetry(error as Error)) {
        return this.retryRequest<T>(method, path, data, options);
      }
      
      return this.handleError<T>(error as Error);
    }
  }

  /**
   * 检查令牌是否过期
   */
  private isTokenExpired(): boolean {
    const tokenExpiry = localStorage.getItem(AUTH_CONFIG.tokenExpiryKey);
    if (!tokenExpiry) return true;
    
    // 提前5分钟刷新令牌，避免令牌刚好在请求过程中过期
    const expiryTime = parseInt(tokenExpiry, 10) - 5 * 60 * 1000;
    return Date.now() > expiryTime;
  }

  /**
   * 检查是否是认证错误
   */
  private isAuthError(error: any): boolean {
    return (
      error.error?.code === 'unauthorized' ||
      error.error?.code === 'token_expired' ||
      (error.response && error.response.status === 401)
    );
  }

  /**
   * 刷新令牌（如果需要）
   * 使用单例模式确保同一时间只有一个刷新请求
   */
  private async refreshTokenIfNeeded(): Promise<void> {
    // 如果已经有一个刷新请求在进行中，等待它完成
    if (this.refreshTokenPromise) {
      await this.refreshTokenPromise;
      return;
    }
    
    // 如果没有刷新回调，无法刷新令牌
    if (!this.tokenRefreshCallback) {
      throw new Error('Token refresh callback not set');
    }
    
    // 创建新的刷新请求
    this.refreshTokenPromise = this.tokenRefreshCallback();
    
    try {
      // 等待刷新完成
      const result = await this.refreshTokenPromise;
      
      // 检查刷新是否成功
      if (!result.success) {
        throw new Error('Token refresh failed');
      }
    } finally {
      // 无论成功与否，清除刷新请求
      this.refreshTokenPromise = null;
    }
  }

  /**
   * 构建完整URL
   */
  private buildUrl(path: string, params?: Record<string, any>): string {
    // 确保路径以/开头
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(`${this.baseUrl}${normalizedPath}`);
    
    // 添加查询参数
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    
    return url.toString();
  }

  /**
   * 创建超时Promise
   */
  private createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Request timeout after ${timeout}ms`));
      }, timeout);
    });
  }

  /**
   * 处理响应
   */
  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    try {
      // 获取响应文本
      const text = await response.text();
      
      // 尝试解析为JSON
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        console.error('API响应解析失败:', e);
        console.log('原始响应:', text);
        return {
          success: false,
          error: {
            code: 'parse_error',
            message: '无法解析API响应',
            details: { responseText: text }
          },
          timestamp: new Date().toISOString()
        };
      }
      
      // 检查HTTP状态码
      if (!response.ok) {
        console.error(`API请求失败: ${response.status} ${response.statusText}`, data);
        return {
          success: false,
          error: {
            code: data.error?.code || `http_${response.status}`,
            message: data.error?.message || data.message || response.statusText,
            details: data.error?.details || data
          },
          timestamp: data.timestamp || new Date().toISOString()
        };
      }
      
      // 成功响应
      return {
        success: true,
        data: data.data || data,
        message: data.message,
        timestamp: data.timestamp || new Date().toISOString()
      };
    } catch (error) {
      console.error('处理API响应时发生错误:', error);
      return {
        success: false,
        error: {
          code: 'response_processing_error',
          message: error instanceof Error ? error.message : '处理响应时发生未知错误',
          details: { error }
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 处理错误
   */
  private handleError<T>(error: Error | any): ApiResponse<T> {
    console.error('API请求错误:', error);
    
    // 网络错误
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      return {
        success: false,
        error: {
          code: 'network_error',
          message: '网络连接失败，请检查您的互联网连接',
          details: { originalError: error.message }
        },
        timestamp: new Date().toISOString()
      };
    }
    
    // 超时错误
    if (error.name === 'AbortError' || error.code === 'timeout') {
      return {
        success: false,
        error: {
          code: 'timeout',
          message: '请求超时，请稍后重试',
          details: { originalError: error.message }
        },
        timestamp: new Date().toISOString()
      };
    }
    
    // 其他错误
    return {
      success: false,
      error: {
        code: error.code || 'unknown_error',
        message: error.message || '发生未知错误',
        details: error.details || { originalError: error }
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 判断是否应该重试请求
   */
  private shouldRetry(error: Error): boolean {
    // 网络错误或超时错误可以重试
    if (
      error.message.includes('network') ||
      error.message.includes('timeout') ||
      error.message.includes('failed to fetch')
    ) {
      return true;
    }
    
    // 服务器错误(5xx)可以重试
    if (error.name === 'HttpError' && (error as any).status >= 500) {
      return true;
    }
    
    return false;
  }

  /**
   * 重试请求
   */
  private async retryRequest<T>(
    method: HttpMethod,
    path: string,
    data?: any,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    let retries = 0;
    const maxRetries = RETRY_CONFIG.maxRetries;
    let delay = RETRY_CONFIG.initialDelayMs;
    
    while (retries < maxRetries) {
      try {
        // 等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // 指数退避，增加延迟时间
        delay = Math.min(delay * 2, RETRY_CONFIG.maxDelayMs);
        retries++;
        
        // 重试请求
        return await this.request<T>(method, path, data, {
          ...options,
          retry: false, // 防止无限重试
        });
      } catch (error) {
        // 最后一次重试失败，返回错误
        if (retries === maxRetries) {
          return this.handleError<T>(error as Error);
        }
      }
    }
    
    // 不应该到达这里，但为了类型安全
    return this.handleError<T>(new Error('Max retries exceeded'));
  }

  /**
   * 获取缓存键
   */
  private getCacheKey(method: string, url: string): string {
    return `${method}:${url}`;
  }

  /**
   * 从缓存获取数据
   */
  private getFromCache<T>(key: string): ApiResponse<T> | null {
    const cached = this.cache[key];
    
    if (!cached) {
      return null;
    }
    
    // 检查缓存是否过期
    const now = Date.now();
    if (now - cached.timestamp > cached.expiry) {
      delete this.cache[key];
      return null;
    }
    
    return cached.data as ApiResponse<T>;
  }

  /**
   * 保存数据到缓存
   */
  private saveToCache(key: string, data: any, expiry: number = 5 * 60 * 1000): void {
    this.cache[key] = {
      data,
      timestamp: Date.now(),
      expiry,
    };
  }

  /**
   * 清除缓存
   */
  public clearCache(): void {
    this.cache = {};
  }

  /**
   * 清除特定路径的缓存
   */
  public clearPathCache(path: string): void {
    const prefix = this.getCacheKey('GET', this.buildUrl(path));
    
    Object.keys(this.cache).forEach(key => {
      if (key.startsWith(prefix)) {
        delete this.cache[key];
      }
    });
  }
}

// 导出默认实例
export default new HttpClient(); 