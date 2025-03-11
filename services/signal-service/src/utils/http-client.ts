/**
 * HTTP客户端工具
 */
import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { logger } from './logger';

// 默认配置
const DEFAULT_TIMEOUT = 10000; // 10秒
const DEFAULT_RETRY_COUNT = 3;
const DEFAULT_RETRY_DELAY = 1000; // 1秒

/**
 * HTTP客户端类
 */
export class HttpClient {
  private client: AxiosInstance;
  private baseUrl: string;
  private retryCount: number;
  private retryDelay: number;

  /**
   * 构造函数
   * @param baseUrl 基础URL
   * @param options 选项
   */
  constructor(
    baseUrl: string,
    options: {
      timeout?: number;
      retryCount?: number;
      retryDelay?: number;
      headers?: Record<string, string>;
    } = {}
  ) {
    this.baseUrl = baseUrl;
    this.retryCount = options.retryCount || DEFAULT_RETRY_COUNT;
    this.retryDelay = options.retryDelay || DEFAULT_RETRY_DELAY;

    // 创建Axios实例
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: options.timeout || DEFAULT_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // 请求拦截器
    this.client.interceptors.request.use(
      (config: AxiosRequestConfig) => {
        logger.debug(`发送请求: ${config.method?.toUpperCase()} ${config.url}`, {
          module: 'HttpClient',
        });
        return config;
      },
      (error: any) => {
        logger.error(`请求错误: ${error.message}`, {
          module: 'HttpClient',
          error,
        });
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        logger.debug(`收到响应: ${response.status} ${response.config.url}`, {
          module: 'HttpClient',
        });
        return response;
      },
      async (error: any) => {
        // 获取请求配置和重试次数
        const config = error.config as AxiosRequestConfig & { _retryCount?: number };
        config._retryCount = config._retryCount || 0;

        // 如果是网络错误或超时，并且未超过重试次数，则重试
        if (
          (error.code === 'ECONNABORTED' || error.message.includes('timeout') || !error.response) &&
          config._retryCount < this.retryCount
        ) {
          config._retryCount += 1;
          logger.warn(`请求重试 (${config._retryCount}/${this.retryCount}): ${config.url}`, {
            module: 'HttpClient',
            error: error.message,
          });

          // 延迟重试
          await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
          return this.client(config);
        }

        logger.error(`响应错误: ${error.message}`, {
          module: 'HttpClient',
          status: error.response?.status,
          url: config.url,
          error,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * 发送GET请求
   * @param url 请求URL
   * @param params 查询参数
   * @param config 请求配置
   * @returns 响应数据
   */
  async get<T = any>(
    url: string,
    params?: Record<string, any>,
    config?: AxiosRequestConfig
  ): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.client.get(url, {
        params,
        ...config,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'GET', url);
    }
  }

  /**
   * 发送POST请求
   * @param url 请求URL
   * @param data 请求数据
   * @param config 请求配置
   * @returns 响应数据
   */
  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.client.post(url, data, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'POST', url);
    }
  }

  /**
   * 发送PUT请求
   * @param url 请求URL
   * @param data 请求数据
   * @param config 请求配置
   * @returns 响应数据
   */
  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.client.put(url, data, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'PUT', url);
    }
  }

  /**
   * 发送DELETE请求
   * @param url 请求URL
   * @param config 请求配置
   * @returns 响应数据
   */
  async delete<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.client.delete(url, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'DELETE', url);
    }
  }

  /**
   * 处理错误
   * @param error 错误对象
   * @param method 请求方法
   * @param url 请求URL
   * @returns 处理后的错误
   */
  private handleError(error: any, method: string, url: string): Error {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;
    
    const formattedError = new Error(
      `${method} ${url} 失败: ${status ? `${status} - ` : ''}${message}`
    );
    
    // 添加原始错误信息
    (formattedError as any).originalError = error;
    (formattedError as any).status = status;
    
    return formattedError;
  }
}

export default HttpClient; 