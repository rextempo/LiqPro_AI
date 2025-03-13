const winston = require('winston');

// 创建日志记录器
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'data-service' },
  transports: [
    new winston.transports.Console()
  ]
});

module.exports = logger; 