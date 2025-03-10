import { createLogger } from '@liqpro/monitoring';

const logger = createLogger('data-service:error-handler');

/**
 * Error types
 */
export enum ErrorType {
  VALIDATION = 'validation_error',
  DATABASE = 'database_error',
  NETWORK = 'network_error',
  RPC = 'rpc_error',
  AUTHENTICATION = 'authentication_error',
  AUTHORIZATION = 'authorization_error',
  NOT_FOUND = 'not_found_error',
  RATE_LIMIT = 'rate_limit_error',
  INTERNAL = 'internal_error',
  EXTERNAL_API = 'external_api_error',
}

/**
 * Application error class
 */
export class AppError extends Error {
  public type: ErrorType;
  public statusCode: number;
  public details?: any;
  public isOperational: boolean;

  /**
   * Create a new application error
   * @param message Error message
   * @param type Error type
   * @param statusCode HTTP status code
   * @param details Additional error details
   * @param isOperational Whether the error is operational (expected)
   */
  constructor(
    message: string,
    type: ErrorType = ErrorType.INTERNAL,
    statusCode: number = 500,
    details?: any,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.type = type;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational;

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error handler utility
 */
export class ErrorHandler {
  /**
   * Handle error
   * @param error Error to handle
   * @param context Additional context information
   */
  static handleError(error: Error, context?: any): void {
    // Log error
    if (error instanceof AppError) {
      logger.error(`[${error.type}] ${error.message}`, {
        statusCode: error.statusCode,
        details: error.details,
        isOperational: error.isOperational,
        stack: error.stack,
        context,
      });
    } else {
      logger.error(`[${ErrorType.INTERNAL}] ${error.message}`, {
        stack: error.stack,
        context,
      });
    }

    // If error is not operational, we might want to do something more drastic
    // like exit the process, but for now we'll just log it
    if (error instanceof AppError && !error.isOperational) {
      logger.warn('Non-operational error occurred, consider restarting the service');
    }
  }

  /**
   * Create a validation error
   * @param message Error message
   * @param details Validation details
   * @returns Application error
   */
  static validationError(message: string, details?: any): AppError {
    return new AppError(message, ErrorType.VALIDATION, 400, details);
  }

  /**
   * Create a database error
   * @param message Error message
   * @param details Error details
   * @returns Application error
   */
  static databaseError(message: string, details?: any): AppError {
    return new AppError(message, ErrorType.DATABASE, 500, details);
  }

  /**
   * Create a network error
   * @param message Error message
   * @param details Error details
   * @returns Application error
   */
  static networkError(message: string, details?: any): AppError {
    return new AppError(message, ErrorType.NETWORK, 500, details);
  }

  /**
   * Create an RPC error
   * @param message Error message
   * @param details Error details
   * @returns Application error
   */
  static rpcError(message: string, details?: any): AppError {
    return new AppError(message, ErrorType.RPC, 500, details);
  }

  /**
   * Create an authentication error
   * @param message Error message
   * @param details Error details
   * @returns Application error
   */
  static authenticationError(message: string, details?: any): AppError {
    return new AppError(message, ErrorType.AUTHENTICATION, 401, details);
  }

  /**
   * Create an authorization error
   * @param message Error message
   * @param details Error details
   * @returns Application error
   */
  static authorizationError(message: string, details?: any): AppError {
    return new AppError(message, ErrorType.AUTHORIZATION, 403, details);
  }

  /**
   * Create a not found error
   * @param message Error message
   * @param details Error details
   * @returns Application error
   */
  static notFoundError(message: string, details?: any): AppError {
    return new AppError(message, ErrorType.NOT_FOUND, 404, details);
  }

  /**
   * Create a rate limit error
   * @param message Error message
   * @param details Error details
   * @returns Application error
   */
  static rateLimitError(message: string, details?: any): AppError {
    return new AppError(message, ErrorType.RATE_LIMIT, 429, details);
  }

  /**
   * Create an external API error
   * @param message Error message
   * @param details Error details
   * @returns Application error
   */
  static externalApiError(message: string, details?: any): AppError {
    return new AppError(message, ErrorType.EXTERNAL_API, 502, details);
  }

  /**
   * Create an internal error
   * @param message Error message
   * @param details Error details
   * @returns Application error
   */
  static internalError(message: string, details?: any): AppError {
    return new AppError(message, ErrorType.INTERNAL, 500, details);
  }

  /**
   * Wrap async function with error handling
   * @param fn Async function to wrap
   * @returns Wrapped function
   */
  static asyncHandler<T>(fn: (...args: any[]) => Promise<T>): (...args: any[]) => Promise<T> {
    return async (...args: any[]): Promise<T> => {
      try {
        return await fn(...args);
      } catch (error: any) {
        ErrorHandler.handleError(error, { args });
        throw error;
      }
    };
  }

  /**
   * Express异步处理器包装函数
   * @param fn 要包装的异步函数
   * @returns 包装后的函数
   */
  static expressAsyncHandler(
    fn: (req: Express.Request, res: Express.Response, next: Express.NextFunction) => Promise<any>
  ): (req: Express.Request, res: Express.Response, next: Express.NextFunction) => void {
    return (req: Express.Request, res: Express.Response, next: Express.NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch((error: unknown) => {
        ErrorHandler.handleError(error, { path: req.path, method: req.method });
        next(error);
      });
    };
  }
}
