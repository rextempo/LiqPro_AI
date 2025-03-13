import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { Logger } from '../utils/logger';

/**
 * 基础服务客户端类
 * 提供通用的HTTP请求方法和错误处理
 */
export class BaseClient {
  protected client: AxiosInstance;
  protected serviceName: string;
  protected logger: Logger;
  protected baseUrl: string;

  /**
   * 创建基础客户端实例
   * @param serviceName 服务名称
   * @param baseUrl 服务基础URL
   * @param timeout 请求超时时间(毫秒)
   */
  constructor(serviceName: string, baseUrl: string, timeout = 10000) {
    this.serviceName = serviceName;
    this.baseUrl = baseUrl;
    this.logger = new Logger(`${serviceName}Client`);

    this.client = axios.create({
      baseURL: baseUrl,
      timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 请求拦截器
    this.client.interceptors.request.use(
      (config: AxiosRequestConfig) => {
        this.logger.debug(`Sending request to ${config.url}`);
        return config;
      },
      (error: any) => {
        this.logger.error(`Request error: ${error.message}`);
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        this.logger.debug(`Received response from ${response.config.url}`);
        return response;
      },
      (error: any) => {
        if (error.response) {
          this.logger.error(
            `Response error: ${error.response.status} - ${JSON.stringify(error.response.data)}`
          );
        } else if (error.request) {
          this.logger.error(`No response received: ${error.message}`);
        } else {
          this.logger.error(`Request configuration error: ${error.message}`);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * 发送GET请求
   * @param url 请求路径
   * @param config 请求配置
   * @returns 响应数据
   */
  protected async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.client.get(url, config);
      return response.data;
    } catch (error: any) {
      this.handleError(error, 'GET', url);
      throw error;
    }
  }

  /**
   * 发送POST请求
   * @param url 请求路径
   * @param data 请求数据
   * @param config 请求配置
   * @returns 响应数据
   */
  protected async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.client.post(url, data, config);
      return response.data;
    } catch (error: any) {
      this.handleError(error, 'POST', url);
      throw error;
    }
  }

  /**
   * 发送PUT请求
   * @param url 请求路径
   * @param data 请求数据
   * @param config 请求配置
   * @returns 响应数据
   */
  protected async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.client.put(url, data, config);
      return response.data;
    } catch (error: any) {
      this.handleError(error, 'PUT', url);
      throw error;
    }
  }

  /**
   * 发送DELETE请求
   * @param url 请求路径
   * @param config 请求配置
   * @returns 响应数据
   */
  protected async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.client.delete(url, config);
      return response.data;
    } catch (error: any) {
      this.handleError(error, 'DELETE', url);
      throw error;
    }
  }

  /**
   * 处理请求错误
   * @param error 错误对象
   * @param method HTTP方法
   * @param url 请求URL
   */
  private handleError(error: any, method: string, url: string): void {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;
    
    this.logger.error(
      `${method} ${url} failed: ${status ? `${status} - ` : ''}${message}`
    );
  }

  /**
   * 检查服务健康状态
   * @returns 服务是否健康
   */
  public async healthCheck(): Promise<boolean> {
    try {
      await this.get('/health');
      return true;
    } catch (error: any) {
      this.logger.warn(`Health check failed for ${this.serviceName}: ${error.message}`);
      return false;
    }
  }
} 