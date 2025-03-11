/**
 * 日志工具
 */
import { createLogger as createWinstonLogger, format, transports } from 'winston';

// 日志级别
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// 日志颜色
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// 创建格式化器
const logFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.printf(({ timestamp, level, message, module, ...meta }) => {
    const moduleStr = module ? `[${module}] ` : '';
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level.toUpperCase()}: ${moduleStr}${message}${metaStr}`;
  })
);

// 创建日志记录器
export const createLogger = (module?: string) => {
  return createWinstonLogger({
    levels: logLevels,
    format: logFormat,
    defaultMeta: { module },
    transports: [
      // 控制台输出
      new transports.Console({
        format: format.combine(
          format.colorize({ all: true }),
          logFormat
        ),
      }),
      // 文件输出 - 错误日志
      new transports.File({ 
        filename: 'logs/signal-service-error.log', 
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
      // 文件输出 - 所有日志
      new transports.File({ 
        filename: 'logs/signal-service.log',
        maxsize: 10485760, // 10MB
        maxFiles: 10,
      }),
    ],
  });
};

// 创建默认日志记录器
export const logger = createLogger('signal-service');

export default logger; 