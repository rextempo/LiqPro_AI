/**
 * 日志模块
 * 提供日志记录功能
 */

// 模拟winston日志库
const logger = {
  debug: (message, meta = {}) => {
    console.debug(`[DEBUG] ${message}`, meta);
  },
  info: (message, meta = {}) => {
    console.info(`[INFO] ${message}`, meta);
  },
  warn: (message, meta = {}) => {
    console.warn(`[WARN] ${message}`, meta);
  },
  error: (message, meta = {}) => {
    console.error(`[ERROR] ${message}`, meta);
  }
};

module.exports = { logger }; 