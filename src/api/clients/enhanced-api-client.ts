import axios from 'axios';
import { createLogger } from '../../../libs/common/src/logger';
import { ServiceError, withRetry, withTimeout, RetryOptions } from '../../../libs/common/src/utils/enhanced-error-handler';
import config from '../../config/env';

const logger = createLogger('EnhancedApiClient');

/**
 * Request configuration with improved typing
 */
export interface RequestConfig {
  headers?: Record<string, string>;
  retry?: RetryOptions;
  timeout?: number;
  skipAuthHeader?: boolean;
  params?: Record<string, unknown>;
  baseURL?: string;
  responseType?: 'arraybuffer' | 'blob' | 'document' | 'json' | 'text' | 'stream';
  withCredentials?: boolean;
}

/**
 * API response with improved typing
 */
export interface ApiResponse<T> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

/**
 * Enhanced API client with improved TypeScript types and error handling
 */
export class EnhancedApiClient {
  protected baseUrl: string;
  private defaultTimeout: number = 30000;
  private defaultRetryOptions: RetryOptions = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
    retryCondition: (error: Error) => {
      if (error instanceof ServiceError) {
        // Retry on server errors and specific client errors
        return error.statusCode !== undefined && 
               (error.statusCode >= 500 || 
                error.statusCode === 408 || 
                error.statusCode === 429);
      }
      return false;
    }
  };

  /**
   * Constructor
   * @param baseUrl API base URL
   * @param path API path
   */
  constructor(baseUrl: string = config.api.baseUrl, path: string = '') {
    this.baseUrl = `${baseUrl}${path}`;
  }

  /**
   * Set default timeout for all requests
   * @param timeout Timeout in milliseconds
   */
  public setDefaultTimeout(timeout: number): void {
    this.defaultTimeout = timeout;
  }

  /**
   * Set default retry options for all requests
   * @param options Retry options
   */
  public setDefaultRetryOptions(options: Partial<RetryOptions>): void {
    this.defaultRetryOptions = { ...this.defaultRetryOptions, ...options };
  }

  /**
   * Create request configuration with authentication
   */
  private createRequestConfig(config?: RequestConfig): Record<string, unknown> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(config?.headers || {})
    };

    // Add authentication token if available and not explicitly skipped
    if (!config?.skipAuthHeader) {
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return {
      baseURL: config?.baseURL || this.baseUrl,
      headers,
      timeout: config?.timeout || this.defaultTimeout,
      params: config?.params,
      responseType: config?.responseType,
      withCredentials: config?.withCredentials
    };
  }

  /**
   * Execute request with enhanced error handling
   * @param method HTTP method
   * @param url Request URL
   * @param data Request data
   * @param config Request configuration
   * @returns API response
   */
  private async request<T>(
    method: string,
    url: string,
    data?: unknown,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      // Apply timeout if specified
      const timeoutMs = config?.timeout || this.defaultTimeout;
      
      // Apply retry options if specified
      const retryOptions = config?.retry || this.defaultRetryOptions;
      
      // Create request configuration
      const requestConfig = this.createRequestConfig(config);
      
      // Execute request with timeout and retry
      const response = await withRetry(
        async () => {
          // Use Promise.resolve to ensure we're working with a standard Promise
          return await withTimeout(
            Promise.resolve(axios.request({
              method,
              url,
              data,
              ...requestConfig as any
            })),
            timeoutMs,
            '请求超时，请稍后重试'
          );
        },
        retryOptions
      );
      
      return {
        data: response.data as T,
        status: response.status,
        headers: response.headers as Record<string, string>
      };
    } catch (error) {
      logger.error('API request failed', {
        url: `${config?.baseURL || this.baseUrl}${url}`,
        method,
        error: error instanceof Error ? error.message : String(error)
      });
      
      throw ServiceError.fromHttpError(error);
    }
  }

  /**
   * Execute GET request
   * @param url Request URL
   * @param config Request configuration
   * @returns API response
   */
  public async get<T>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('get', url, undefined, config);
  }

  /**
   * Execute POST request
   * @param url Request URL
   * @param data Request data
   * @param config Request configuration
   * @returns API response
   */
  public async post<T>(url: string, data?: Record<string, unknown>, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('post', url, data, config);
  }

  /**
   * Execute PUT request
   * @param url Request URL
   * @param data Request data
   * @param config Request configuration
   * @returns API response
   */
  public async put<T>(url: string, data?: Record<string, unknown>, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('put', url, data, config);
  }

  /**
   * Execute DELETE request
   * @param url Request URL
   * @param config Request configuration
   * @returns API response
   */
  public async delete<T>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('delete', url, undefined, config);
  }

  /**
   * Execute PATCH request
   * @param url Request URL
   * @param data Request data
   * @param config Request configuration
   * @returns API response
   */
  public async patch<T>(url: string, data?: Record<string, unknown>, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('patch', url, data, config);
  }
} 