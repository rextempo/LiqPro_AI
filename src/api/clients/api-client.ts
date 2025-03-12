import axios, { AxiosInstance, AxiosRequestConfig, AxiosError, AxiosResponse } from 'axios';
import config from '../../config/env';

/**
 * 基础API客户端
 * 处理所有API请求的基础功能，包括请求拦截、错误处理和重试机制
 */
export class ApiClient {
  protected api: AxiosInstance;
  protected baseUrl: string;
  private maxRetries: number = 3;
  private retryDelay: number = 1000;

  /**
   * 构造函数
   * @param baseUrl API基础URL
   * @param path API路径
   */
  constructor(baseUrl: string = config.api.baseUrl, path: string = '') {
    this.baseUrl = baseUrl;
    
    // 创建axios实例
    this.api = axios.create({
      baseURL: `${baseUrl}${path}`,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30秒超时
    });
    
    // 添加请求拦截器
    this.api.interceptors.request.use(
      (config: AxiosRequestConfig): AxiosRequestConfig => {
        // 从localStorage获取token
        const token = localStorage.getItem('token');
        
        // 如果有token，添加到请求头
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        return config;
      },
      (error: AxiosError): Promise<AxiosError> => Promise.reject(error)
    );
    
    // 添加响应拦截器
    this.api.interceptors.response.use(
      (response: AxiosResponse): AxiosResponse => response,
      async (error: AxiosError): Promise<any> => {
        const originalRequest = error.config as AxiosRequestConfig & { 
          _retry?: boolean,
          _retryCount?: number 
        };
        
        // 如果请求失败且未达到最大重试次数，则重试
        if (error.response && this.shouldRetry(error) && (!originalRequest._retryCount || originalRequest._retryCount < this.maxRetries)) {
          originalRequest._retryCount = originalRequest._retryCount ? originalRequest._retryCount + 1 : 1;
          
          // 指数退避策略
          const delay = this.retryDelay * Math.pow(2, originalRequest._retryCount - 1);
          
          // 等待一段时间后重试
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // 重试请求
          return this.api(originalRequest);
        }
        
        // 处理特定错误
        if (error.response) {
          // 401错误 - 未授权
          if (error.response.status === 401) {
            // 清除token
            localStorage.removeItem('token');
            // 重定向到登录页
            window.location.href = '/login';
          }
          
          // 构建错误信息
          const errorMessage = this.getErrorMessage(error);
          return Promise.reject(new Error(errorMessage));
        }
        
        return Promise.reject(error);
      }
    );
  }

  /**
   * 判断是否应该重试请求
   * @param error 错误对象
   * @returns 是否应该重试
   */
  private shouldRetry(error: AxiosError): boolean {
    // 网络错误总是重试
    if (!error.response) return true;
    
    // 只重试5xx错误和特定的4xx错误
    const status = error.response.status;
    
    // 重试服务器错误和请求超时
    return (status >= 500 && status < 600) || status === 429 || status === 408;
  }

  /**
   * 获取格式化的错误信息
   * @param error 错误对象
   * @returns 格式化的错误信息
   */
  private getErrorMessage(error: AxiosError): string {
    if (!error.response) {
      return '网络错误，请检查您的网络连接';
    }
    
    const status = error.response.status;
    const data = error.response.data as any;
    
    // 尝试从响应中获取错误信息
    const serverMessage = data && (data.message || data.error || data.errorMessage);
    
    switch (status) {
      case 400:
        return serverMessage || '请求参数错误';
      case 401:
        return '未授权，请重新登录';
      case 403:
        return '没有权限执行此操作';
      case 404:
        return '请求的资源不存在';
      case 408:
        return '请求超时，请稍后重试';
      case 429:
        return '请求过于频繁，请稍后重试';
      case 500:
        return '服务器内部错误，请稍后重试';
      case 502:
        return '网关错误，请稍后重试';
      case 503:
        return '服务不可用，请稍后重试';
      case 504:
        return '网关超时，请稍后重试';
      default:
        return serverMessage || `请求失败 (${status})`;
    }
  }

  /**
   * 设置最大重试次数
   * @param maxRetries 最大重试次数
   */
  public setMaxRetries(maxRetries: number): void {
    this.maxRetries = maxRetries;
  }

  /**
   * 设置重试延迟时间
   * @param retryDelay 重试延迟时间（毫秒）
   */
  public setRetryDelay(retryDelay: number): void {
    this.retryDelay = retryDelay;
  }
} 