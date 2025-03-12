import { createLogger } from '../logger';

const logger = createLogger('EnhancedErrorHandler');

/**
 * Standardized error types for the application
 */
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND_ERROR',
  CONFLICT = 'CONFLICT_ERROR',
  TIMEOUT = 'TIMEOUT_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE_ERROR',
  INTERNAL = 'INTERNAL_ERROR',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE_ERROR',
  NETWORK = 'NETWORK_ERROR',
  UNKNOWN = 'UNKNOWN_ERROR'
}

/**
 * HTTP status codes mapped to error types
 */
export const HTTP_STATUS_TO_ERROR_TYPE: Record<number, ErrorType> = {
  400: ErrorType.VALIDATION,
  401: ErrorType.AUTHENTICATION,
  403: ErrorType.AUTHORIZATION,
  404: ErrorType.NOT_FOUND,
  409: ErrorType.CONFLICT,
  408: ErrorType.TIMEOUT,
  429: ErrorType.SERVICE_UNAVAILABLE,
  500: ErrorType.INTERNAL,
  502: ErrorType.EXTERNAL_SERVICE,
  503: ErrorType.SERVICE_UNAVAILABLE,
  504: ErrorType.TIMEOUT
};

/**
 * Error details interface with improved typing
 */
export interface ErrorDetails {
  type: ErrorType;
  message: string;
  code?: string;
  details?: Record<string, unknown>;
  source?: string;
  timestamp?: string;
  correlationId?: string;
  statusCode?: number;
  originalError?: Error;
}

/**
 * Enhanced service error class with improved typing
 */
export class ServiceError extends Error {
  public readonly type: ErrorType;
  public readonly code?: string;
  public readonly details?: Record<string, unknown>;
  public readonly source?: string;
  public readonly timestamp: string;
  public readonly correlationId?: string;
  public readonly statusCode?: number;
  public readonly originalError?: Error;

  constructor(details: ErrorDetails) {
    super(details.message);
    this.name = 'ServiceError';
    this.type = details.type;
    this.code = details.code;
    this.details = details.details;
    this.source = details.source;
    this.timestamp = details.timestamp || new Date().toISOString();
    this.correlationId = details.correlationId;
    this.statusCode = details.statusCode;
    this.originalError = details.originalError;
    
    // Ensure the prototype chain is properly maintained
    Object.setPrototypeOf(this, ServiceError.prototype);
  }

  /**
   * Convert error to JSON representation
   */
  toJSON(): ErrorDetails {
    return {
      type: this.type,
      message: this.message,
      code: this.code,
      details: this.details,
      source: this.source,
      timestamp: this.timestamp,
      correlationId: this.correlationId,
      statusCode: this.statusCode
    };
  }

  /**
   * Create a user-friendly error message
   */
  toUserFriendlyMessage(): string {
    switch (this.type) {
      case ErrorType.VALIDATION:
        return '输入数据验证失败，请检查您的输入';
      case ErrorType.AUTHENTICATION:
        return '认证失败，请重新登录';
      case ErrorType.AUTHORIZATION:
        return '您没有权限执行此操作';
      case ErrorType.NOT_FOUND:
        return '请求的资源不存在';
      case ErrorType.CONFLICT:
        return '操作冲突，请刷新页面后重试';
      case ErrorType.TIMEOUT:
        return '请求超时，请稍后重试';
      case ErrorType.SERVICE_UNAVAILABLE:
        return '服务暂时不可用，请稍后重试';
      case ErrorType.NETWORK:
        return '网络连接错误，请检查您的网络连接';
      case ErrorType.EXTERNAL_SERVICE:
        return '外部服务错误，请稍后重试';
      case ErrorType.INTERNAL:
      case ErrorType.UNKNOWN:
      default:
        return '发生了一个错误，请稍后重试';
    }
  }

  /**
   * Create error from HTTP error response
   */
  static fromHttpError(
    error: unknown, 
    defaultMessage = '未知错误'
  ): ServiceError {
    // Handle axios errors
    if (error && typeof error === 'object' && 'isAxiosError' in error) {
      // Type assertion with unknown intermediate step to avoid TypeScript error
      const axiosError = error as unknown as {
        isAxiosError: boolean;
        response?: {
          status: number;
          data?: {
            message?: string;
            error?: string;
            errorMessage?: string;
            details?: Record<string, unknown>;
            code?: string;
          };
        };
        request?: unknown;
        message: string;
      };

      if (axiosError.response) {
        // Server responded with an error
        const status = axiosError.response.status;
        const data = axiosError.response.data || {};
        const message = data.message || data.error || data.errorMessage || defaultMessage;
        const errorType = HTTP_STATUS_TO_ERROR_TYPE[status] || ErrorType.UNKNOWN;
        
        return new ServiceError({
          type: errorType,
          message,
          code: data.code || `HTTP_${status}`,
          details: data.details || {},
          statusCode: status,
          originalError: error instanceof Error ? error : undefined
        });
      } else if (axiosError.request) {
        // Request was made but no response received
        return new ServiceError({
          type: ErrorType.NETWORK,
          message: '网络请求失败，未收到响应',
          code: 'NETWORK_ERROR',
          originalError: error instanceof Error ? error : undefined
        });
      }
    }

    // Handle standard errors
    if (error instanceof Error) {
      return new ServiceError({
        type: ErrorType.UNKNOWN,
        message: error.message || defaultMessage,
        originalError: error
      });
    }

    // Handle unknown errors
    return new ServiceError({
      type: ErrorType.UNKNOWN,
      message: typeof error === 'string' ? error : defaultMessage
    });
  }
}

/**
 * Type-safe async error handler
 */
export function asyncErrorHandler<Args extends unknown[], ReturnType>(
  fn: (...args: Args) => Promise<ReturnType>,
  errorCallback?: (error: Error) => void
): (...args: Args) => Promise<ReturnType> {
  return async (...args: Args): Promise<ReturnType> => {
    try {
      return await fn(...args);
    } catch (error) {
      if (errorCallback) {
        errorCallback(error instanceof Error ? error : new Error(String(error)));
      } else {
        logger.error('Unhandled error in async function', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
      }
      throw error;
    }
  };
}

/**
 * Create a timeout promise that rejects after the specified time
 */
export function createTimeout(ms: number, message = 'Operation timed out'): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new ServiceError({
        type: ErrorType.TIMEOUT,
        message,
        code: 'TIMEOUT',
        timestamp: new Date().toISOString()
      }));
    }, ms);
  });
}

/**
 * Execute a promise with a timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    createTimeout(timeoutMs, timeoutMessage)
  ]);
}

/**
 * Type-safe retry options
 */
export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryCondition?: (error: Error) => boolean;
  onRetry?: (attempt: number, error: Error, delay: number) => void;
}

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    retryCondition = () => true,
    onRetry
  } = options;

  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxRetries || !retryCondition(lastError)) {
        throw lastError;
      }
      
      const delay = Math.min(
        initialDelay * Math.pow(backoffFactor, attempt),
        maxDelay
      );
      
      logger.info(`Retrying operation after error (attempt ${attempt + 1}/${maxRetries}) with delay ${delay}ms`, {
        error: lastError.message
      });
      
      if (onRetry) {
        onRetry(attempt + 1, lastError, delay);
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // This should never be reached due to the throw in the catch block
  throw lastError!;
}

/**
 * Circuit breaker options with improved typing
 */
export interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeout: number;
  monitorInterval?: number;
  onStateChange?: (oldState: CircuitBreakerState, newState: CircuitBreakerState) => void;
}

/**
 * Circuit breaker states
 */
export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/**
 * Circuit breaker pattern implementation with improved typing
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: CircuitBreakerState = 'CLOSED';
  private monitorIntervalId?: NodeJS.Timeout;

  constructor(private readonly options: CircuitBreakerOptions) {
    if (options.monitorInterval) {
      this.monitorIntervalId = setInterval(() => this.monitor(), options.monitorInterval);
    }
  }

  /**
   * Clean up resources when circuit breaker is no longer needed
   */
  public dispose(): void {
    if (this.monitorIntervalId) {
      clearInterval(this.monitorIntervalId);
    }
  }

  private changeState(newState: CircuitBreakerState): void {
    if (this.state !== newState) {
      const oldState = this.state;
      this.state = newState;
      
      logger.info(`Circuit breaker state changed from ${oldState} to ${newState}`);
      
      if (this.options.onStateChange) {
        this.options.onStateChange(oldState, newState);
      }
    }
  }

  private monitor(): void {
    if (this.state === 'OPEN') {
      const now = Date.now();
      if (now - this.lastFailureTime >= this.options.resetTimeout) {
        this.changeState('HALF_OPEN');
      }
    }
  }

  /**
   * Execute a function with circuit breaker protection
   */
  public async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      throw new ServiceError({
        type: ErrorType.SERVICE_UNAVAILABLE,
        message: 'Circuit breaker is open',
        code: 'CIRCUIT_OPEN'
      });
    }

    try {
      const result = await fn();
      
      if (this.state === 'HALF_OPEN') {
        this.changeState('CLOSED');
        this.failures = 0;
      }
      
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();
      
      if (this.failures >= this.options.failureThreshold) {
        this.changeState('OPEN');
      }
      
      throw error;
    }
  }

  /**
   * Reset the circuit breaker to closed state
   */
  public reset(): void {
    this.failures = 0;
    this.changeState('CLOSED');
  }

  /**
   * Get the current state of the circuit breaker
   */
  public getState(): CircuitBreakerState {
    return this.state;
  }
} 