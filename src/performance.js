"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPerformanceMonitor = exports.startPerformanceMonitoring = exports.performanceMiddleware = void 0;
const performance_monitor_1 = require("../utils/performance-monitor");
const logger_1 = require("../utils/logger");
const logger = new logger_1.Logger('PerformanceMiddleware');
/**
 * 性能监控中间件
 * 记录请求的响应时间和成功/失败状态
 * @returns 中间件函数
 */
const performanceMiddleware = () => {
    const performanceMonitor = performance_monitor_1.PerformanceMonitor.getInstance();
    return (req, res, next) => {
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
exports.performanceMiddleware = performanceMiddleware;
/**
 * 启动性能监控
 * @param options 监控配置
 */
const startPerformanceMonitoring = (options = {}) => {
    const performanceMonitor = performance_monitor_1.PerformanceMonitor.getInstance(options);
    performanceMonitor.start();
    logger.info('Performance monitoring started', options);
    return performanceMonitor;
};
exports.startPerformanceMonitoring = startPerformanceMonitoring;
/**
 * 获取性能监控实例
 * @returns 性能监控实例
 */
const getPerformanceMonitor = () => {
    return performance_monitor_1.PerformanceMonitor.getInstance();
};
exports.getPerformanceMonitor = getPerformanceMonitor;
//# sourceMappingURL=performance.js.map