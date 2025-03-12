import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { createLogger } from '../logger';

const logger = createLogger('HttpClient');

// Circuit breaker states
enum CircuitState {
  CLOSED,  // Normal operation, requests are allowed
  OPEN,    // Circuit is open, requests are not allowed
  HALF_OPEN // Testing if the service is back, allowing limited requests
}

// Default configuration
const DEFAULT_TIMEOUT = 10000; // 10 seconds
const DEFAULT_RETRY_COUNT = 3;
const DEFAULT_RETRY_DELAY = 1000; // 1 second
const DEFAULT_CIRCUIT_THRESHOLD = 5; // Number of failures before opening circuit
const DEFAULT_CIRCUIT_RESET_TIMEOUT = 30000; // 30 seconds

export interface HttpClientConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
  retryCount?: number;
  retryDelay?: number;
  circuitThreshold?: number;
  circuitResetTimeout?: number;
}

export class HttpClient {
  private client: AxiosInstance;
  private retryCount: number;
  private retryDelay: number;
  private circuitState: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private circuitThreshold: number;
  private circuitResetTimeout: number;
  private nextAttemptTime: number = 0;

  constructor(config: HttpClientConfig) {
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || DEFAULT_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers
      }
    });

    this.retryCount = config.retryCount || DEFAULT_RETRY_COUNT;
    this.retryDelay = config.retryDelay || DEFAULT_RETRY_DELAY;
    this.circuitThreshold = config.circuitThreshold || DEFAULT_CIRCUIT_THRESHOLD;
    this.circuitResetTimeout = config.circuitResetTimeout || DEFAULT_CIRCUIT_RESET_TIMEOUT;

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug(`Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error('Request error', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.debug(`Response: ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`);
        return response;
      },
      (error) => {
        if (error.response) {
          logger.error(`Response error: ${error.response.status} ${error.config.method?.toUpperCase()} ${error.config.url}`);
        } else if (error.request) {
          logger.error(`Request error: No response received ${error.config.method?.toUpperCase()} ${error.config.url}`);
        } else {
          logger.error(`Error: ${error.message}`);
        }
        return Promise.reject(error);
      }
    );
  }

  private async executeWithRetry<T>(
    requestFn: () => Promise<AxiosResponse<T>>,
    retries: number = this.retryCount
  ): Promise<AxiosResponse<T>> {
    try {
      // Check circuit state
      if (this.circuitState === CircuitState.OPEN) {
        if (Date.now() < this.nextAttemptTime) {
          throw new Error('Circuit is open, request rejected');
        } else {
          // Move to half-open state
          this.circuitState = CircuitState.HALF_OPEN;
          logger.info('Circuit moved to half-open state');
        }
      }

      const response = await requestFn();
      
      // If we're in half-open state and request succeeded, close the circuit
      if (this.circuitState === CircuitState.HALF_OPEN) {
        this.closeCircuit();
      }
      
      return response;
    } catch (error: any) {
      // Increment failure count
      this.failureCount++;
      
      // Check if we should open the circuit
      if (this.circuitState === CircuitState.CLOSED && this.failureCount >= this.circuitThreshold) {
        this.openCircuit();
      }
      
      // If we're in half-open state and request failed, open the circuit again
      if (this.circuitState === CircuitState.HALF_OPEN) {
        this.openCircuit();
      }
      
      // Check if we should retry
      if (retries > 0 && this.isRetryable(error)) {
        logger.warn(`Request failed, retrying (${this.retryCount - retries + 1}/${this.retryCount})...`);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        
        // Retry with one less retry attempt
        return this.executeWithRetry(requestFn, retries - 1);
      }
      
      // No more retries or not retryable, rethrow the error
      throw error;
    }
  }

  private isRetryable(error: any): boolean {
    // Don't retry if the circuit is open
    if (this.circuitState === CircuitState.OPEN) {
      return false;
    }
    
    // Retry on network errors
    if (!error.response) {
      return true;
    }
    
    // Retry on 5xx errors
    if (error.response.status >= 500) {
      return true;
    }
    
    // Retry on 429 (Too Many Requests)
    if (error.response.status === 429) {
      return true;
    }
    
    // Don't retry on other status codes
    return false;
  }

  private openCircuit(): void {
    this.circuitState = CircuitState.OPEN;
    this.nextAttemptTime = Date.now() + this.circuitResetTimeout;
    logger.warn(`Circuit opened, will try again in ${this.circuitResetTimeout / 1000} seconds`);
  }

  private closeCircuit(): void {
    this.circuitState = CircuitState.CLOSED;
    this.failureCount = 0;
    logger.info('Circuit closed');
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.executeWithRetry(() => this.client.get<T>(url, config));
    return response.data;
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.executeWithRetry(() => this.client.post<T>(url, data, config));
    return response.data;
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.executeWithRetry(() => this.client.put<T>(url, data, config));
    return response.data;
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.executeWithRetry(() => this.client.delete<T>(url, config));
    return response.data;
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.executeWithRetry(() => this.client.patch<T>(url, data, config));
    return response.data;
  }
}

// Factory function to create an HTTP client
export function createHttpClient(config: HttpClientConfig): HttpClient {
  return new HttpClient(config);
} 