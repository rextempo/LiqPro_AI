"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorHandler = exports.AppError = exports.ErrorType = void 0;
const monitoring_1 = require("@liqpro/monitoring");
const logger = (0, monitoring_1.createLogger)('data-service:error-handler');
/**
 * Error types
 */
var ErrorType;
(function (ErrorType) {
    ErrorType["VALIDATION"] = "validation_error";
    ErrorType["DATABASE"] = "database_error";
    ErrorType["NETWORK"] = "network_error";
    ErrorType["RPC"] = "rpc_error";
    ErrorType["AUTHENTICATION"] = "authentication_error";
    ErrorType["AUTHORIZATION"] = "authorization_error";
    ErrorType["NOT_FOUND"] = "not_found_error";
    ErrorType["RATE_LIMIT"] = "rate_limit_error";
    ErrorType["INTERNAL"] = "internal_error";
    ErrorType["EXTERNAL_API"] = "external_api_error";
})(ErrorType || (exports.ErrorType = ErrorType = {}));
/**
 * Application error class
 */
class AppError extends Error {
    /**
     * Create a new application error
     * @param message Error message
     * @param type Error type
     * @param statusCode HTTP status code
     * @param details Additional error details
     * @param isOperational Whether the error is operational (expected)
     */
    constructor(message, type = ErrorType.INTERNAL, statusCode = 500, details, isOperational = true) {
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
exports.AppError = AppError;
/**
 * Error handler utility
 */
class ErrorHandler {
    /**
     * Handle error
     * @param error Error to handle
     * @param context Additional context information
     */
    static handleError(error, context) {
        // Log error
        if (error instanceof AppError) {
            logger.error(`[${error.type}] ${error.message}`, {
                statusCode: error.statusCode,
                details: error.details,
                isOperational: error.isOperational,
                stack: error.stack,
                context,
            });
        }
        else {
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
    static validationError(message, details) {
        return new AppError(message, ErrorType.VALIDATION, 400, details);
    }
    /**
     * Create a database error
     * @param message Error message
     * @param details Error details
     * @returns Application error
     */
    static databaseError(message, details) {
        return new AppError(message, ErrorType.DATABASE, 500, details);
    }
    /**
     * Create a network error
     * @param message Error message
     * @param details Error details
     * @returns Application error
     */
    static networkError(message, details) {
        return new AppError(message, ErrorType.NETWORK, 500, details);
    }
    /**
     * Create an RPC error
     * @param message Error message
     * @param details Error details
     * @returns Application error
     */
    static rpcError(message, details) {
        return new AppError(message, ErrorType.RPC, 500, details);
    }
    /**
     * Create an authentication error
     * @param message Error message
     * @param details Error details
     * @returns Application error
     */
    static authenticationError(message, details) {
        return new AppError(message, ErrorType.AUTHENTICATION, 401, details);
    }
    /**
     * Create an authorization error
     * @param message Error message
     * @param details Error details
     * @returns Application error
     */
    static authorizationError(message, details) {
        return new AppError(message, ErrorType.AUTHORIZATION, 403, details);
    }
    /**
     * Create a not found error
     * @param message Error message
     * @param details Error details
     * @returns Application error
     */
    static notFoundError(message, details) {
        return new AppError(message, ErrorType.NOT_FOUND, 404, details);
    }
    /**
     * Create a rate limit error
     * @param message Error message
     * @param details Error details
     * @returns Application error
     */
    static rateLimitError(message, details) {
        return new AppError(message, ErrorType.RATE_LIMIT, 429, details);
    }
    /**
     * Create an external API error
     * @param message Error message
     * @param details Error details
     * @returns Application error
     */
    static externalApiError(message, details) {
        return new AppError(message, ErrorType.EXTERNAL_API, 502, details);
    }
    /**
     * Create an internal error
     * @param message Error message
     * @param details Error details
     * @returns Application error
     */
    static internalError(message, details) {
        return new AppError(message, ErrorType.INTERNAL, 500, details);
    }
    /**
     * Wrap async function with error handling
     * @param fn Async function to wrap
     * @returns Wrapped function
     */
    static asyncHandler(fn) {
        return async (...args) => {
            try {
                return await fn(...args);
            }
            catch (error) {
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
    static expressAsyncHandler(fn) {
        return (req, res, next) => {
            Promise.resolve(fn(req, res, next)).catch((error) => {
                ErrorHandler.handleError(error, { path: req.path, method: req.method });
                next(error);
            });
        };
    }
}
exports.ErrorHandler = ErrorHandler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXJyb3ItaGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy91dGlscy9lcnJvci1oYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1EQUFrRDtBQUVsRCxNQUFNLE1BQU0sR0FBRyxJQUFBLHlCQUFZLEVBQUMsNEJBQTRCLENBQUMsQ0FBQztBQUUxRDs7R0FFRztBQUNILElBQVksU0FXWDtBQVhELFdBQVksU0FBUztJQUNuQiw0Q0FBK0IsQ0FBQTtJQUMvQix3Q0FBMkIsQ0FBQTtJQUMzQixzQ0FBeUIsQ0FBQTtJQUN6Qiw4QkFBaUIsQ0FBQTtJQUNqQixvREFBdUMsQ0FBQTtJQUN2QyxrREFBcUMsQ0FBQTtJQUNyQywwQ0FBNkIsQ0FBQTtJQUM3Qiw0Q0FBK0IsQ0FBQTtJQUMvQix3Q0FBMkIsQ0FBQTtJQUMzQixnREFBbUMsQ0FBQTtBQUNyQyxDQUFDLEVBWFcsU0FBUyx5QkFBVCxTQUFTLFFBV3BCO0FBRUQ7O0dBRUc7QUFDSCxNQUFhLFFBQVMsU0FBUSxLQUFLO0lBTWpDOzs7Ozs7O09BT0c7SUFDSCxZQUNFLE9BQWUsRUFDZixPQUFrQixTQUFTLENBQUMsUUFBUSxFQUNwQyxhQUFxQixHQUFHLEVBQ3hCLE9BQWEsRUFDYixnQkFBeUIsSUFBSTtRQUU3QixLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDZixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDO1FBQ2xDLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBQ2pCLElBQUksQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFDO1FBQzdCLElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxhQUFhLEdBQUcsYUFBYSxDQUFDO1FBRW5DLHNCQUFzQjtRQUN0QixLQUFLLENBQUMsaUJBQWlCLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztJ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LEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztnQkFDeEUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ2QsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFqS0Qsb0NBaUtDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgY3JlYXRlTG9nZ2VyIH0gZnJvbSAnQGxpcXByby9tb25pdG9yaW5nJztcblxuY29uc3QgbG9nZ2VyID0gY3JlYXRlTG9nZ2VyKCdkYXRhLXNlcnZpY2U6ZXJyb3ItaGFuZGxlcicpO1xuXG4vKipcbiAqIEVycm9yIHR5cGVzXG4gKi9cbmV4cG9ydCBlbnVtIEVycm9yVHlwZSB7XG4gIFZBTElEQVRJT04gPSAndmFsaWRhdGlvbl9lcnJvcicsXG4gIERBVEFCQVNFID0gJ2RhdGFiYXNlX2Vycm9yJyxcbiAgTkVUV09SSyA9ICduZXR3b3JrX2Vycm9yJyxcbiAgUlBDID0gJ3JwY19lcnJvcicsXG4gIEFVVEhFTlRJQ0FUSU9OID0gJ2F1dGhlbnRpY2F0aW9uX2Vycm9yJyxcbiAgQVVUSE9SSVpBVElPTiA9ICdhdXRob3JpemF0aW9uX2Vycm9yJyxcbiAgTk9UX0ZPVU5EID0gJ25vdF9mb3VuZF9lcnJvcicsXG4gIFJBVEVfTElNSVQgPSAncmF0ZV9saW1pdF9lcnJvcicsXG4gIElOVEVSTkFMID0gJ2ludGVybmFsX2Vycm9yJyxcbiAgRVhURVJOQUxfQVBJID0gJ2V4dGVybmFsX2FwaV9lcnJvcicsXG59XG5cbi8qKlxuICogQXBwbGljYXRpb24gZXJyb3IgY2xhc3NcbiAqL1xuZXhwb3J0IGNsYXNzIEFwcEVycm9yIGV4dGVuZHMgRXJyb3Ige1xuICBwdWJsaWMgdHlwZTogRXJyb3JUeXBlO1xuICBwdWJsaWMgc3RhdHVzQ29kZTogbnVtYmVyO1xuICBwdWJsaWMgZGV0YWlscz86IGFueTtcbiAgcHVibGljIGlzT3BlcmF0aW9uYWw6IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIG5ldyBhcHBsaWNhdGlvbiBlcnJvclxuICAgKiBAcGFyYW0gbWVzc2FnZSBFcnJvciBtZXNzYWdlXG4gICAqIEBwYXJhbSB0eXBlIEVycm9yIHR5cGVcbiAgICogQHBhcmFtIHN0YXR1c0NvZGUgSFRUUCBzdGF0dXMgY29kZVxuICAgKiBAcGFyYW0gZGV0YWlscyBBZGRpdGlvbmFsIGVycm9yIGRldGFpbHNcbiAgICogQHBhcmFtIGlzT3BlcmF0aW9uYWwgV2hldGhlciB0aGUgZXJyb3IgaXMgb3BlcmF0aW9uYWwgKGV4cGVjdGVkKVxuICAgKi9cbiAgY29uc3RydWN0b3IoXG4gICAgbWVzc2FnZTogc3RyaW5nLFxuICAgIHR5cGU6IEVycm9yVHlwZSA9IEVycm9yVHlwZS5JTlRFUk5BTCxcbiAgICBzdGF0dXNDb2RlOiBudW1iZXIgPSA1MDAsXG4gICAgZGV0YWlscz86IGFueSxcbiAgICBpc09wZXJhdGlvbmFsOiBib29sZWFuID0gdHJ1ZVxuICApIHtcbiAgICBzdXBlcihtZXNzYWdlKTtcbiAgICB0aGlzLm5hbWUgPSB0aGlzLmNvbnN0cnVjdG9yLm5hbWU7XG4gICAgdGhpcy50eXBlID0gdHlwZTtcbiAgICB0aGlzLnN0YXR1c0NvZGUgPSBzdGF0dXNDb2RlO1xuICAgIHRoaXMuZGV0YWlscyA9IGRldGFpbHM7XG4gICAgdGhpcy5pc09wZXJhdGlvbmFsID0gaXNPcGVyYXRpb25hbDtcblxuICAgIC8vIENhcHR1cmUgc3RhY2sgdHJhY2VcbiAgICBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLCB0aGlzLmNvbnN0cnVjdG9yKTtcbiAgfVxufVxuXG4vKipcbiAqIEVycm9yIGhhbmRsZXIgdXRpbGl0eVxuICovXG5leHBvcnQgY2xhc3MgRXJyb3JIYW5kbGVyIHtcbiAgLyoqXG4gICAqIEhhbmRsZSBlcnJvclxuICAgKiBAcGFyYW0gZXJyb3IgRXJyb3IgdG8gaGFuZGxlXG4gICAqIEBwYXJhbSBjb250ZXh0IEFkZGl0aW9uYWwgY29udGV4dCBpbmZvcm1hdGlvblxuICAgKi9cbiAgc3RhdGljIGhhbmRsZUVycm9yKGVycm9yOiBFcnJvciwgY29udGV4dD86IGFueSk6IHZvaWQge1xuICAgIC8vIExvZyBlcnJvclxuICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEFwcEVycm9yKSB7XG4gICAgICBsb2dnZXIuZXJyb3IoYFske2Vycm9yLnR5cGV9XSAke2Vycm9yLm1lc3NhZ2V9YCwge1xuICAgICAgICBzdGF0dXNDb2RlOiBlcnJvci5zdGF0dXNDb2RlLFxuICAgICAgICBkZXRhaWxzOiBlcnJvci5kZXRhaWxzLFxuICAgICAgICBpc09wZXJhdGlvbmFsOiBlcnJvci5pc09wZXJhdGlvbmFsLFxuICAgICAgICBzdGFjazogZXJyb3Iuc3RhY2ssXG4gICAgICAgIGNvbnRleHQsXG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgbG9nZ2VyLmVycm9yKGBbJHtFcnJvclR5cGUuSU5URVJOQUx9XSAke2Vycm9yLm1lc3NhZ2V9YCwge1xuICAgICAgICBzdGFjazogZXJyb3Iuc3RhY2ssXG4gICAgICAgIGNvbnRleHQsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBJZiBlcnJvciBpcyBub3Qgb3BlcmF0aW9uYWwsIHdlIG1pZ2h0IHdhbnQgdG8gZG8gc29tZXRoaW5nIG1vcmUgZHJhc3RpY1xuICAgIC8vIGxpa2UgZXhpdCB0aGUgcHJvY2VzcywgYnV0IGZvciBub3cgd2UnbGwganVzdCBsb2cgaXRcbiAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBBcHBFcnJvciAmJiAhZXJyb3IuaXNPcGVyYXRpb25hbCkge1xuICAgICAgbG9nZ2VyLndhcm4oJ05vbi1vcGVyYXRpb25hbCBlcnJvciBvY2N1cnJlZCwgY29uc2lkZXIgcmVzdGFydGluZyB0aGUgc2VydmljZScpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSB2YWxpZGF0aW9uIGVycm9yXG4gICAqIEBwYXJhbSBtZXNzYWdlIEVycm9yIG1lc3NhZ2VcbiAgICogQHBhcmFtIGRldGFpbHMgVmFsaWRhdGlvbiBkZXRhaWxzXG4gICAqIEByZXR1cm5zIEFwcGxpY2F0aW9uIGVycm9yXG4gICAqL1xuICBzdGF0aWMgdmFsaWRhdGlvbkVycm9yKG1lc3NhZ2U6IHN0cmluZywgZGV0YWlscz86IGFueSk6IEFwcEVycm9yIHtcbiAgICByZXR1cm4gbmV3IEFwcEVycm9yKG1lc3NhZ2UsIEVycm9yVHlwZS5WQUxJREFUSU9OLCA0MDAsIGRldGFpbHMpO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIGRhdGFiYXNlIGVycm9yXG4gICAqIEBwYXJhbSBtZXNzYWdlIEVycm9yIG1lc3NhZ2VcbiAgICogQHBhcmFtIGRldGFpbHMgRXJyb3IgZGV0YWlsc1xuICAgKiBAcmV0dXJucyBBcHBsaWNhdGlvbiBlcnJvclxuICAgKi9cbiAgc3RhdGljIGRhdGFiYXNlRXJyb3IobWVzc2FnZTogc3RyaW5nLCBkZXRhaWxzPzogYW55KTogQXBwRXJyb3Ige1xuICAgIHJldHVybiBuZXcgQXBwRXJyb3IobWVzc2FnZSwgRXJyb3JUeXBlLkRBVEFCQVNFLCA1MDAsIGRldGFpbHMpO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIG5ldHdvcmsgZXJyb3JcbiAgICogQHBhcmFtIG1lc3NhZ2UgRXJyb3IgbWVzc2FnZVxuICAgKiBAcGFyYW0gZGV0YWlscyBFcnJvciBkZXRhaWxzXG4gICAqIEByZXR1cm5zIEFwcGxpY2F0aW9uIGVycm9yXG4gICAqL1xuICBzdGF0aWMgbmV0d29ya0Vycm9yKG1lc3NhZ2U6IHN0cmluZywgZGV0YWlscz86IGFueSk6IEFwcEVycm9yIHtcbiAgICByZXR1cm4gbmV3IEFwcEVycm9yKG1lc3NhZ2UsIEVycm9yVHlwZS5ORVRXT1JLLCA1MDAsIGRldGFpbHMpO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhbiBSUEMgZXJyb3JcbiAgICogQHBhcmFtIG1lc3NhZ2UgRXJyb3IgbWVzc2FnZVxuICAgKiBAcGFyYW0gZGV0YWlscyBFcnJvciBkZXRhaWxzXG4gICAqIEByZXR1cm5zIEFwcGxpY2F0aW9uIGVycm9yXG4gICAqL1xuICBzdGF0aWMgcnBjRXJyb3IobWVzc2FnZTogc3RyaW5nLCBkZXRhaWxzPzogYW55KTogQXBwRXJyb3Ige1xuICAgIHJldHVybiBuZXcgQXBwRXJyb3IobWVzc2FnZSwgRXJyb3JUeXBlLlJQQywgNTAwLCBkZXRhaWxzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYW4gYXV0aGVudGljYXRpb24gZXJyb3JcbiAgICogQHBhcmFtIG1lc3NhZ2UgRXJyb3IgbWVzc2FnZVxuICAgKiBAcGFyYW0gZGV0YWlscyBFcnJvciBkZXRhaWxzXG4gICAqIEByZXR1cm5zIEFwcGxpY2F0aW9uIGVycm9yXG4gICAqL1xuICBzdGF0aWMgYXV0aGVudGljYXRpb25FcnJvcihtZXNzYWdlOiBzdHJpbmcsIGRldGFpbHM/OiBhbnkpOiBBcHBFcnJvciB7XG4gICAgcmV0dXJuIG5ldyBBcHBFcnJvcihtZXNzYWdlLCBFcnJvclR5cGUuQVVUSEVOVElDQVRJT04sIDQwMSwgZGV0YWlscyk7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIGFuIGF1dGhvcml6YXRpb24gZXJyb3JcbiAgICogQHBhcmFtIG1lc3NhZ2UgRXJyb3IgbWVzc2FnZVxuICAgKiBAcGFyYW0gZGV0YWlscyBFcnJvciBkZXRhaWxzXG4gICAqIEByZXR1cm5zIEFwcGxpY2F0aW9uIGVycm9yXG4gICAqL1xuICBzdGF0aWMgYXV0aG9yaXphdGlvbkVycm9yKG1lc3NhZ2U6IHN0cmluZywgZGV0YWlscz86IGFueSk6IEFwcEVycm9yIHtcbiAgICByZXR1cm4gbmV3IEFwcEVycm9yKG1lc3NhZ2UsIEVycm9yVHlwZS5BVVRIT1JJWkFUSU9OLCA0MDMsIGRldGFpbHMpO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIG5vdCBmb3VuZCBlcnJvclxuICAgKiBAcGFyYW0gbWVzc2FnZSBFcnJvciBtZXNzYWdlXG4gICAqIEBwYXJhbSBkZXRhaWxzIEVycm9yIGRldGFpbHNcbiAgICogQHJldHVybnMgQXBwbGljYXRpb24gZXJyb3JcbiAgICovXG4gIHN0YXRpYyBub3RGb3VuZEVycm9yKG1lc3NhZ2U6IHN0cmluZywgZGV0YWlscz86IGFueSk6IEFwcEVycm9yIHtcbiAgICByZXR1cm4gbmV3IEFwcEVycm9yKG1lc3NhZ2UsIEVycm9yVHlwZS5OT1RfRk9VTkQsIDQwNCwgZGV0YWlscyk7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIGEgcmF0ZSBsaW1pdCBlcnJvclxuICAgKiBAcGFyYW0gbWVzc2FnZSBFcnJvciBtZXNzYWdlXG4gICAqIEBwYXJhbSBkZXRhaWxzIEVycm9yIGRldGFpbHNcbiAgICogQHJldHVybnMgQXBwbGljYXRpb24gZXJyb3JcbiAgICovXG4gIHN0YXRpYyByYXRlTGltaXRFcnJvcihtZXNzYWdlOiBzdHJpbmcsIGRldGFpbHM/OiBhbnkpOiBBcHBFcnJvciB7XG4gICAgcmV0dXJuIG5ldyBBcHBFcnJvcihtZXNzYWdlLCBFcnJvclR5cGUuUkFURV9MSU1JVCwgNDI5LCBkZXRhaWxzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYW4gZXh0ZXJuYWwgQVBJIGVycm9yXG4gICAqIEBwYXJhbSBtZXNzYWdlIEVycm9yIG1lc3NhZ2VcbiAgICogQHBhcmFtIGRldGFpbHMgRXJyb3IgZGV0YWlsc1xuICAgKiBAcmV0dXJucyBBcHBsaWNhdGlvbiBlcnJvclxuICAgKi9cbiAgc3RhdGljIGV4dGVybmFsQXBpRXJyb3IobWVzc2FnZTogc3RyaW5nLCBkZXRhaWxzPzogYW55KTogQXBwRXJyb3Ige1xuICAgIHJldHVybiBuZXcgQXBwRXJyb3IobWVzc2FnZSwgRXJyb3JUeXBlLkVYVEVSTkFMX0FQSSwgNTAyLCBkZXRhaWxzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYW4gaW50ZXJuYWwgZXJyb3JcbiAgICogQHBhcmFtIG1lc3NhZ2UgRXJyb3IgbWVzc2FnZVxuICAgKiBAcGFyYW0gZGV0YWlscyBFcnJvciBkZXRhaWxzXG4gICAqIEByZXR1cm5zIEFwcGxpY2F0aW9uIGVycm9yXG4gICAqL1xuICBzdGF0aWMgaW50ZXJuYWxFcnJvcihtZXNzYWdlOiBzdHJpbmcsIGRldGFpbHM/OiBhbnkpOiBBcHBFcnJvciB7XG4gICAgcmV0dXJuIG5ldyBBcHBFcnJvcihtZXNzYWdlLCBFcnJvclR5cGUuSU5URVJOQUwsIDUwMCwgZGV0YWlscyk7XG4gIH1cblxuICAvKipcbiAgICogV3JhcCBhc3luYyBmdW5jdGlvbiB3aXRoIGVycm9yIGhhbmRsaW5nXG4gICAqIEBwYXJhbSBmbiBBc3luYyBmdW5jdGlvbiB0byB3cmFwXG4gICAqIEByZXR1cm5zIFdyYXBwZWQgZnVuY3Rpb25cbiAgICovXG4gIHN0YXRpYyBhc3luY0hhbmRsZXI8VD4oZm46ICguLi5hcmdzOiBhbnlbXSkgPT4gUHJvbWlzZTxUPik6ICguLi5hcmdzOiBhbnlbXSkgPT4gUHJvbWlzZTxUPiB7XG4gICAgcmV0dXJuIGFzeW5jICguLi5hcmdzOiBhbnlbXSk6IFByb21pc2U8VD4gPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIGF3YWl0IGZuKC4uLmFyZ3MpO1xuICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICBFcnJvckhhbmRsZXIuaGFuZGxlRXJyb3IoZXJyb3IsIHsgYXJncyB9KTtcbiAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBFeHByZXNz5byC5q2l5aSE55CG5Zmo5YyF6KOF5Ye95pWwXG4gICAqIEBwYXJhbSBmbiDopoHljIXoo4XnmoTlvILmraXlh73mlbBcbiAgICogQHJldHVybnMg5YyF6KOF5ZCO55qE5Ye95pWwXG4gICAqL1xuICBzdGF0aWMgZXhwcmVzc0FzeW5jSGFuZGxlcihcbiAgICBmbjogKHJlcTogRXhwcmVzcy5SZXF1ZXN0LCByZXM6IEV4cHJlc3MuUmVzcG9uc2UsIG5leHQ6IEV4cHJlc3MuTmV4dEZ1bmN0aW9uKSA9PiBQcm9taXNlPGFueT5cbiAgKTogKHJlcTogRXhwcmVzcy5SZXF1ZXN0LCByZXM6IEV4cHJlc3MuUmVzcG9uc2UsIG5leHQ6IEV4cHJlc3MuTmV4dEZ1bmN0aW9uKSA9PiB2b2lkIHtcbiAgICByZXR1cm4gKHJlcTogRXhwcmVzcy5SZXF1ZXN0LCByZXM6IEV4cHJlc3MuUmVzcG9uc2UsIG5leHQ6IEV4cHJlc3MuTmV4dEZ1bmN0aW9uKSA9PiB7XG4gICAgICBQcm9taXNlLnJlc29sdmUoZm4ocmVxLCByZXMsIG5leHQpKS5jYXRjaCgoZXJyb3I6IHVua25vd24pID0+IHtcbiAgICAgICAgRXJyb3JIYW5kbGVyLmhhbmRsZUVycm9yKGVycm9yLCB7IHBhdGg6IHJlcS5wYXRoLCBtZXRob2Q6IHJlcS5tZXRob2QgfSk7XG4gICAgICAgIG5leHQoZXJyb3IpO1xuICAgICAgfSk7XG4gICAgfTtcbiAgfVxufVxuIl19