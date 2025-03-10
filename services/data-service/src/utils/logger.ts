/**
 * 日志模块
 * 提供日志记录功能
 */

// 日志接口定义
export interface Logger {
  debug(message: string, meta?: Record<string, any>): void;
  info(message: string, meta?: Record<string, any>): void;
  warn(message: string, meta?: Record<string, any>): void;
  error(message: string, meta?: Record<string, any>): void;
}

/**
 * 创建一个带有命名空间的日志记录器
 * @param namespace 日志命名空间
 * @returns 日志记录器实例
 */
export function createLogger(namespace: string): Logger {
  return {
    debug: (message: string, meta: Record<string, any> = {}) => {
      console.debug(`[DEBUG] ${namespace}: ${message}`, meta);
    },
    info: (message: string, meta: Record<string, any> = {}) => {
      console.info(`[INFO] ${namespace}: ${message}`, meta);
    },
    warn: (message: string, meta: Record<string, any> = {}) => {
      console.warn(`[WARN] ${namespace}: ${message}`, meta);
    },
    error: (message: string, meta: Record<string, any> = {}) => {
      console.error(`[ERROR] ${namespace}: ${message}`, meta);
    },
  };
}

// 为了兼容性，也导出默认的logger实例
export const logger = createLogger('default');
