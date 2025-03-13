"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircuitBreaker = exports.withRetry = exports.withTimeout = exports.createTimeout = exports.asyncErrorHandler = exports.ServiceError = exports.HTTP_STATUS_TO_ERROR_TYPE = exports.ErrorType = void 0;
const logger_1 = require("../logger");
const logger = (0, logger_1.createLogger)('EnhancedErrorHandler');
/**
 * Standardized error types for the application
 */
var ErrorType;
(function (ErrorType) {
    ErrorType["VALIDATION"] = "VALIDATION_ERROR";
    ErrorType["AUTHENTICATION"] = "AUTHENTICATION_ERROR";
    ErrorType["AUTHORIZATION"] = "AUTHORIZATION_ERROR";
    ErrorType["NOT_FOUND"] = "NOT_FOUND_ERROR";
    ErrorType["CONFLICT"] = "CONFLICT_ERROR";
    ErrorType["TIMEOUT"] = "TIMEOUT_ERROR";
    ErrorType["SERVICE_UNAVAILABLE"] = "SERVICE_UNAVAILABLE_ERROR";
    ErrorType["INTERNAL"] = "INTERNAL_ERROR";
    ErrorType["EXTERNAL_SERVICE"] = "EXTERNAL_SERVICE_ERROR";
    ErrorType["NETWORK"] = "NETWORK_ERROR";
    ErrorType["UNKNOWN"] = "UNKNOWN_ERROR";
})(ErrorType || (exports.ErrorType = ErrorType = {}));
/**
 * HTTP status codes mapped to error types
 */
exports.HTTP_STATUS_TO_ERROR_TYPE = {
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
 * Enhanced service error class with improved typing
 */
class ServiceError extends Error {
    constructor(details) {
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
    toJSON() {
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
    toUserFriendlyMessage() {
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
    static fromHttpError(error, defaultMessage = '未知错误') {
        // Handle axios errors
        if (error && typeof error === 'object' && 'isAxiosError' in error) {
            // Type assertion with unknown intermediate step to avoid TypeScript error
            const axiosError = error;
            if (axiosError.response) {
                // Server responded with an error
                const status = axiosError.response.status;
                const data = axiosError.response.data || {};
                const message = data.message || data.error || data.errorMessage || defaultMessage;
                const errorType = exports.HTTP_STATUS_TO_ERROR_TYPE[status] || ErrorType.UNKNOWN;
                return new ServiceError({
                    type: errorType,
                    message,
                    code: data.code || `HTTP_${status}`,
                    details: data.details || {},
                    statusCode: status,
                    originalError: error instanceof Error ? error : undefined
                });
            }
            else if (axiosError.request) {
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
exports.ServiceError = ServiceError;
/**
 * Type-safe async error handler
 */
function asyncErrorHandler(fn, errorCallback) {
    return async (...args) => {
        try {
            return await fn(...args);
        }
        catch (error) {
            if (errorCallback) {
                errorCallback(error instanceof Error ? error : new Error(String(error)));
            }
            else {
                logger.error('Unhandled error in async function', {
                    error: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined
                });
            }
            throw error;
        }
    };
}
exports.asyncErrorHandler = asyncErrorHandler;
/**
 * Create a timeout promise that rejects after the specified time
 */
function createTimeout(ms, message = 'Operation timed out') {
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
exports.createTimeout = createTimeout;
/**
 * Execute a promise with a timeout
 */
async function withTimeout(promise, timeoutMs, timeoutMessage = 'Operation timed out') {
    return Promise.race([
        promise,
        createTimeout(timeoutMs, timeoutMessage)
    ]);
}
exports.withTimeout = withTimeout;
/**
 * Retry a function with exponential backoff
 */
async function withRetry(fn, options = {}) {
    const { maxRetries = 3, initialDelay = 1000, maxDelay = 10000, backoffFactor = 2, retryCondition = () => true, onRetry } = options;
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            if (attempt === maxRetries || !retryCondition(lastError)) {
                throw lastError;
            }
            const delay = Math.min(initialDelay * Math.pow(backoffFactor, attempt), maxDelay);
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
    throw lastError;
}
exports.withRetry = withRetry;
/**
 * Circuit breaker pattern implementation with improved typing
 */
class CircuitBreaker {
    constructor(options) {
        this.options = options;
        this.failures = 0;
        this.lastFailureTime = 0;
        this.state = 'CLOSED';
        if (options.monitorInterval) {
            this.monitorIntervalId = setInterval(() => this.monitor(), options.monitorInterval);
        }
    }
    /**
     * Clean up resources when circuit breaker is no longer needed
     */
    dispose() {
        if (this.monitorIntervalId) {
            clearInterval(this.monitorIntervalId);
        }
    }
    changeState(newState) {
        if (this.state !== newState) {
            const oldState = this.state;
            this.state = newState;
            logger.info(`Circuit breaker state changed from ${oldState} to ${newState}`);
            if (this.options.onStateChange) {
                this.options.onStateChange(oldState, newState);
            }
        }
    }
    monitor() {
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
    async execute(fn) {
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
        }
        catch (error) {
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
    reset() {
        this.failures = 0;
        this.changeState('CLOSED');
    }
    /**
     * Get the current state of the circuit breaker
     */
    getState() {
        return this.state;
    }
}
exports.CircuitBreaker = CircuitBreaker;
