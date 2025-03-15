import { Request, Response, NextFunction } from 'express';
import { ApiError, ApiErrorCode } from '@liqpro/shared/src/types/api';

/**
 * 自定义应用错误类
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true,
    public code?: ApiErrorCode
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * 错误处理中间件
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code || ApiErrorCode.SYSTEM_ERROR,
        message: err.message,
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      },
    });
  }

  // 处理未知错误
  return res.status(500).json({
    success: false,
    error: {
      code: ApiErrorCode.SYSTEM_ERROR,
      message: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    },
  });
};

/**
 * 异步错误处理包装器
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}; 