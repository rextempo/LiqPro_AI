/**
 * 日志工具模块
 * 
 * 该模块提供统一的日志记录功能，支持不同级别的日志和格式化输出
 */

import winston from 'winston';
import path from 'path';
import fs from 'fs';

// 确保日志目录存在
const LOG_DIR = path.join(process.cwd(), 'logs');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// 创建自定义日志格式
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// 创建控制台输出格式
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} ${level}: ${message} ${metaStr}`;
  })
);

// 创建 Winston 日志记录器
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
  defaultMeta: { service: 'data-service' },
  transports: [
    // 写入所有日志到 combined.log
    new winston.transports.File({ 
      filename: path.join(LOG_DIR, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 10,
    }),
    // 写入错误日志到 error.log
    new winston.transports.File({ 
      filename: path.join(LOG_DIR, 'error.log'), 
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 10,
    }),
    // 控制台输出
    new winston.transports.Console({
      format: consoleFormat
    })
  ]
});

// 添加请求 ID 中间件（用于 Express）
export function requestLogger(req, res, next) {
  // 生成唯一请求 ID
  const requestId = req.headers['x-request-id'] || 
                   req.headers['x-correlation-id'] || 
                   `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // 将请求 ID 添加到请求对象
  req.requestId = requestId;
  
  // 创建请求特定的日志记录器
  req.logger = logger.child({ requestId });
  
  // 记录请求开始
  req.logger.info(`${req.method} ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });
  
  // 记录响应时间
  const start = Date.now();
  
  // 当响应结束时记录详情
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
    
    req.logger[logLevel](`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`, {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration
    });
  });
  
  next();
}

// 创建特定模块的日志记录器
export function createModuleLogger(moduleName) {
  return logger.child({ module: moduleName });
}

// 错误处理中间件（用于 Express）
export function errorLogger(err, req, res, next) {
  const logContext = {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method
  };
  
  if (req.requestId) {
    logContext.requestId = req.requestId;
  }
  
  logger.error(`Error processing request: ${err.message}`, logContext);
  
  next(err);
} 