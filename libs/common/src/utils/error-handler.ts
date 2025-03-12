import { createLogger } from './logger';

const logger = createLogger('ErrorHandler');

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
  UNKNOWN = 'UNKNOWN_ERROR'
}

export interface ErrorDetails {
  type: ErrorType;
  message: string;
  code?: string;
  details?: any;
  source?: string;
  timestamp?: string;
  correlationId?: string;
}

export class ServiceError extends Error {
  public readonly type: ErrorType;
  public readonly code?: string;
  public readonly details?: any;
  public readonly source?: string;
  public readonly timestamp: string;
  public readonly correlationId?: string;

  constructor(details: ErrorDetails) {
    super(details.message);
    this.name = 'ServiceError';
    this.type = details.type;
    this.code = details.code;
    this.details = details.details;
    this.source = details.source;
    this.timestamp = details.timestamp || new Date().toISOString();
    this.correlationId = details.correlationId;
    
    // Ensure the prototype chain is properly maintained
    Object.setPrototypeOf(this, ServiceError.prototype);
  }

  toJSON(): ErrorDetails {
    return {
      type: this.type,
      message: this.message,
      code: this.code,
      details: this.details,
      source: this.source,
      timestamp: this.timestamp,
      correlationId: this.correlationId
    };
  }
}

/**
 * Safely handle errors in async functions
 */
export function asyncErrorHandler<T>(
  fn: (...args: any[]) => Promise<T>,
  errorCallback?: (error: Error) => void
): (...args: any[]) => Promise<T> {
  return async (...args: any[]): Promise<T> => {
    try {
      return await fn(...args);
    } catch (error) {
      if (errorCallback) {
        errorCallback(error as Error);
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
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffFactor?: number;
    retryCondition?: (error: Error) => boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    retryCondition = () => true
  } = options;

  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
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
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // This should never be reached due to the throw in the catch block
  throw lastError!;
}

/**
 * Circuit breaker pattern implementation
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private readonly options: {
      failureThreshold: number;
      resetTimeout: number;
      monitorInterval?: number;
      onStateChange?: (oldState: string, newState: string) => void;
    }
  ) {
    if (options.monitorInterval) {
      setInterval(() => this.monitor(), options.monitorInterval);
    }
  }

  private changeState(newState: 'CLOSED' | 'OPEN' | 'HALF_OPEN'): void {
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

  public reset(): void {
    this.failures = 0;
    this.changeState('CLOSED');
  }

  public getState(): string {
    return this.state;
  }
} 