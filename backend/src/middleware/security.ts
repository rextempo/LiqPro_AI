import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { ApiError, ApiErrorCode } from '@liqpro/shared/src/types/api';
import config from '../config';

// 基础安全头
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", config.solana.rpcEndpoint, config.solana.wsEndpoint],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      sandbox: ['allow-forms', 'allow-scripts', 'allow-same-origin'],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

// 速率限制
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: Number(config.security.rateLimit.max),
  message: {
    success: false,
    error: {
      code: ApiErrorCode.RATE_LIMIT,
      message: 'Too many requests, please try again later.',
    },
  },
});

// 请求验证中间件
export const validateRequest = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const apiError = {
          status: 400,
          message: 'Invalid request parameters',
          isOperational: true,
          code: ApiErrorCode.INVALID_PARAMS
        } as ApiError;
        next(apiError);
      } else {
        next(error);
      }
    }
  };
};

// CORS配置
export const corsOptions = {
  origin: config.security.cors.origin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400, // 24小时
}; 