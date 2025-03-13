/**
 * Standardized error types for the application
 */
export declare enum ErrorType {
    VALIDATION = "VALIDATION_ERROR",
    AUTHENTICATION = "AUTHENTICATION_ERROR",
    AUTHORIZATION = "AUTHORIZATION_ERROR",
    NOT_FOUND = "NOT_FOUND_ERROR",
    CONFLICT = "CONFLICT_ERROR",
    TIMEOUT = "TIMEOUT_ERROR",
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE_ERROR",
    INTERNAL = "INTERNAL_ERROR",
    EXTERNAL_SERVICE = "EXTERNAL_SERVICE_ERROR",
    NETWORK = "NETWORK_ERROR",
    UNKNOWN = "UNKNOWN_ERROR"
}
/**
 * HTTP status codes mapped to error types
 */
export declare const HTTP_STATUS_TO_ERROR_TYPE: Record<number, ErrorType>;
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
export declare class ServiceError extends Error {
    readonly type: ErrorType;
    readonly code?: string;
    readonly details?: Record<string, unknown>;
    readonly source?: string;
    readonly timestamp: string;
    readonly correlationId?: string;
    readonly statusCode?: number;
    readonly originalError?: Error;
    constructor(details: ErrorDetails);
    /**
     * Convert error to JSON representation
     */
    toJSON(): ErrorDetails;
    /**
     * Create a user-friendly error message
     */
    toUserFriendlyMessage(): string;
    /**
     * Create error from HTTP error response
     */
    static fromHttpError(error: unknown, defaultMessage?: string): ServiceError;
}
/**
 * Type-safe async error handler
 */
export declare function asyncErrorHandler<Args extends unknown[], ReturnType>(fn: (...args: Args) => Promise<ReturnType>, errorCallback?: (error: Error) => void): (...args: Args) => Promise<ReturnType>;
/**
 * Create a timeout promise that rejects after the specified time
 */
export declare function createTimeout(ms: number, message?: string): Promise<never>;
/**
 * Execute a promise with a timeout
 */
export declare function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage?: string): Promise<T>;
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
export declare function withRetry<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T>;
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
export declare class CircuitBreaker {
    private readonly options;
    private failures;
    private lastFailureTime;
    private state;
    private monitorIntervalId?;
    constructor(options: CircuitBreakerOptions);
    /**
     * Clean up resources when circuit breaker is no longer needed
     */
    dispose(): void;
    private changeState;
    private monitor;
    /**
     * Execute a function with circuit breaker protection
     */
    execute<T>(fn: () => Promise<T>): Promise<T>;
    /**
     * Reset the circuit breaker to closed state
     */
    reset(): void;
    /**
     * Get the current state of the circuit breaker
     */
    getState(): CircuitBreakerState;
}
//# sourceMappingURL=enhanced-error-handler.d.ts.map