/**
 * 日志工具
 * 用于记录服务日志
 */

const winston = require('winston');

// 定义日志级别
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

// 创建日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, service }) => {
    return `[${timestamp}] [${service || 'scoring-service'}] [${level.toUpperCase()}]: ${message}`;
  })
);

// 创建日志记录器
const logger = winston.createLogger({
  levels: logLevels,
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // 控制台输出
    new winston.transports.Console(),
    // 文件输出
    new winston.transports.File({ 
      filename: 'logs/scoring-service-error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/scoring-service.log' 
    }),
  ],
});

// 导出日志记录器
module.exports = logger; 