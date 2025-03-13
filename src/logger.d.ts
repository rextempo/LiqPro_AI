/**
 * 日志模块
 * 提供日志记录功能
 */
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
export declare function createLogger(namespace: string): Logger;
export declare const logger: Logger;
