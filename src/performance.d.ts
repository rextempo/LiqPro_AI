/**
 * 性能监控中间件
 * 用于监控API请求的性能
 */
import { Request, Response, NextFunction } from 'express';
import { PerformanceMonitor } from '../utils/performance-monitor';
/**
 * 性能监控中间件
 * 记录请求的响应时间和成功/失败状态
 * @returns 中间件函数
 */
export declare const performanceMiddleware: () => (req: Request, res: Response, next: NextFunction) => void;
/**
 * 启动性能监控
 * @param options 监控配置
 */
export declare const startPerformanceMonitoring: (options?: any) => PerformanceMonitor;
/**
 * 获取性能监控实例
 * @returns 性能监控实例
 */
export declare const getPerformanceMonitor: () => PerformanceMonitor;
