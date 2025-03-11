/**
 * 性能监控中间件
 * 用于监控API请求的性能
 */
import { Request, Response, NextFunction } from 'express';
import { PerformanceMonitor } from '../utils/performance-monitor';
import { Logger } from '../utils/logger';

const logger = new Logger('PerformanceMiddleware');

/**
 * 性能监控中间件
 * 记录请求的响应时间和成功/失败状态
 * @returns 中间件函数
 */
export const performanceMiddleware = () => {
  const performanceMonitor = PerformanceMonitor.getInstance();
  
  return (req: Request, res: Response, next: NextFunction) => {
    // 记录请求开始时间
    const startTime = Date.now();
    
    // 处理请求完成事件
    res.on('finish', () => {
      // 计算响应时间
      const responseTime = Date.now() - startTime;
      
      // 判断请求是否成功
      const isSuccess = res.statusCode >= 200 && res.statusCode < 400;
      
      // 记录请求性能
      performanceMonitor.recordRequest(responseTime, isSuccess);
      
      // 记录慢请求
      if (responseTime > 1000) {
        logger.warn(`Slow request: ${req.method} ${req.originalUrl || req.url} - ${responseTime}ms`, {
          method: req.method,
          url: req.originalUrl || req.url,
          statusCode: res.statusCode,
          responseTime
        });
      }
    });
    
    next();
  };
};

/**
 * 启动性能监控
 * @param options 监控配置
 */
export const startPerformanceMonitoring = (options: any = {}) => {
  const performanceMonitor = PerformanceMonitor.getInstance(options);
  performanceMonitor.start();
  
  logger.info('Performance monitoring started', options);
  
  return performanceMonitor;
};

/**
 * 获取性能监控实例
 * @returns 性能监控实例
 */
export const getPerformanceMonitor = () => {
  return PerformanceMonitor.getInstance();
}; 