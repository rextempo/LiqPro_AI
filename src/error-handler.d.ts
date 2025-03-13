/**
 * Error types
 */
export declare enum ErrorType {
    VALIDATION = "validation_error",
    DATABASE = "database_error",
    NETWORK = "network_error",
    RPC = "rpc_error",
    AUTHENTICATION = "authentication_error",
    AUTHORIZATION = "authorization_error",
    NOT_FOUND = "not_found_error",
    RATE_LIMIT = "rate_limit_error",
    INTERNAL = "internal_error",
    EXTERNAL_API = "external_api_error"
}
/**
 * Application error class
 */
export declare class AppError extends Error {
    type: ErrorType;
    statusCode: number;
    details?: any;
    isOperational: boolean;
    /**
     * Create a new application error
     * @param message Error message
     * @param type Error type
     * @param statusCode HTTP status code
     * @param details Additional error details
     * @param isOperational Whether the error is operational (expected)
     */
    constructor(message: string, type?: ErrorType, statusCode?: number, details?: any, isOperational?: boolean);
}
/**
 * Error handler utility
 */
export declare class ErrorHandler {
    /**
     * Handle error
     * @param error Error to handle
     * @param context Additional context information
     */
    static handleError(error: Error, context?: any): void;
    /**
     * Create a validation error
     * @param message Error message
     * @param details Validation details
     * @returns Application error
     */
    static validationError(message: string, details?: any): AppError;
    /**
     * Create a database error
     * @param message Error message
     * @param details Error details
     * @returns Application error
     */
    static databaseError(message: string, details?: any): AppError;
    /**
     * Create a network error
     * @param message Error message
     * @param details Error details
     * @returns Application error
     */
    static networkError(message: string, details?: any): AppError;
    /**
     * Create an RPC error
     * @param message Error message
     * @param details Error details
     * @returns Application error
     */
    static rpcError(message: string, details?: any): AppError;
    /**
     * Create an authentication error
     * @param message Error message
     * @param details Error details
     * @returns Application error
     */
    static authenticationError(message: string, details?: any): AppError;
    /**
     * Create an authorization error
     * @param message Error message
     * @param details Error details
     * @returns Application error
     */
    static authorizationError(message: string, details?: any): AppError;
    /**
     * Create a not found error
     * @param message Error message
     * @param details Error details
     * @returns Application error
     */
    static notFoundError(message: string, details?: any): AppError;
    /**
     * Create a rate limit error
     * @param message Error message
     * @param details Error details
     * @returns Application error
     */
    static rateLimitError(message: string, details?: any): AppError;
    /**
     * Create an external API error
     * @param message Error message
     * @param details Error details
     * @returns Application error
     */
    static externalApiError(message: string, details?: any): AppError;
    /**
     * Create an internal error
     * @param message Error message
     * @param details Error details
     * @returns Application error
     */
    static internalError(message: string, details?: any): AppError;
    /**
     * Wrap async function with error handling
     * @param fn Async function to wrap
     * @returns Wrapped function
     */
    static asyncHandler<T>(fn: (...args: any[]) => Promise<T>): (...args: any[]) => Promise<T>;
    /**
     * Express异步处理器包装函数
     * @param fn 要包装的异步函数
     * @returns 包装后的函数
     */
    static expressAsyncHandler(fn: (req: Express.Request, res: Express.Response, next: Express.NextFunction) => Promise<any>): (req: Express.Request, res: Express.Response, next: Express.NextFunction) => void;
}
