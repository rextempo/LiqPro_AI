import winston from 'winston';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// 定义日志级别
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  HTTP = 'http',
  DEBUG = 'debug'
}

// 定义日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// 创建 Winston 日志实例
const winstonLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'agent-engine' },
  transports: [
    // 控制台输出
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, service, context, correlationId, ...meta }) => {
          const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
          return `[${timestamp}] ${level} [${service}${context ? `:${context}` : ''}] ${correlationId ? `(${correlationId}) ` : ''}${message}${metaStr}`;
        })
      )
    }),
    // 文件输出 - 所有日志
    new winston.transports.File({ 
      filename: 'logs/agent-engine.log',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true
    }),
    // 文件输出 - 仅错误日志
    new winston.transports.File({ 
      filename: 'logs/agent-engine-error.log', 
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true
    })
  ]
});

// 日志记录器接口
export interface Logger {
  error(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  http(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
  child(options: { context?: string, correlationId?: string }): Logger;
}

// 创建日志记录器
export function createLogger(context: string): Logger {
  return {
    error: (message: string, meta?: any) => winstonLogger.error(message, { context, ...meta }),
    warn: (message: string, meta?: any) => winstonLogger.warn(message, { context, ...meta }),
    info: (message: string, meta?: any) => winstonLogger.info(message, { context, ...meta }),
    http: (message: string, meta?: any) => winstonLogger.http(message, { context, ...meta }),
    debug: (message: string, meta?: any) => winstonLogger.debug(message, { context, ...meta }),
    child: (options: { context?: string, correlationId?: string }) => {
      const childContext = options.context ? `${context}:${options.context}` : context;
      return createLogger(childContext);
    }
  };
}

// 请求上下文中间件
export function requestContextMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // 生成或使用现有的关联 ID
    const correlationId = req.headers['x-correlation-id'] as string || uuidv4();
    req.headers['x-correlation-id'] = correlationId;
    res.setHeader('x-correlation-id', correlationId);
    
    // 将关联 ID 添加到请求对象
    (req as any).correlationId = correlationId;
    
    next();
  };
}

// Express 日志中间件
export function expressLogger() {
  const logger = createLogger('HTTP');
  
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    const correlationId = (req as any).correlationId || 'unknown';
    
    // 请求开始时记录
    logger.debug(`${req.method} ${req.originalUrl} started`, { 
      correlationId,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
    
    // 响应完成时记录
    res.on('finish', () => {
      const duration = Date.now() - start;
      const level = res.statusCode >= 400 ? 'error' : 'http';
      
      logger[level as keyof Pick<Logger, 'error' | 'http'>](
        `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`, 
        {
          correlationId,
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
          duration,
          ip: req.ip,
          userAgent: req.get('user-agent')
        }
      );
    });
    
    next();
  };
}

// 导出 Winston 日志实例，用于直接访问
export { winstonLogger }; 