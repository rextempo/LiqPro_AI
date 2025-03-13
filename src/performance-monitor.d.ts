/**
 * 性能监控工具
 * 用于监控API服务的性能指标
 */
import { EventEmitter } from 'events';
/**
 * 性能指标接口
 */
export interface PerformanceMetrics {
    timestamp: number;
    cache: {
        hitRate: number;
        keys: number;
        memoryUsage: number;
    };
    system: {
        cpuUsage: number;
        memoryUsage: {
            rss: number;
            heapTotal: number;
            heapUsed: number;
            external: number;
        };
        loadAverage: number[];
    };
    requests: {
        total: number;
        success: number;
        error: number;
        avgResponseTime: number;
    };
}
/**
 * 性能监控配置接口
 */
export interface PerformanceMonitorOptions {
    interval?: number;
    maxHistory?: number;
    logMetrics?: boolean;
}
/**
 * 性能监控类
 */
export declare class PerformanceMonitor extends EventEmitter {
    private static instance;
    private logger;
    private cacheService;
    private interval;
    private maxHistory;
    private logMetrics;
    private metrics;
    private requestStats;
    private timer;
    /**
     * 创建性能监控实例
     * @param options 监控配置
     */
    private constructor();
    /**
     * 设置缓存服务事件监听
     */
    private setupCacheListeners;
    /**
     * 获取性能监控实例
     * @param options 监控配置
     * @returns 性能监控实例
     */
    static getInstance(options?: PerformanceMonitorOptions): PerformanceMonitor;
    /**
     * 开始监控
     */
    start(): void;
    /**
     * 停止监控
     */
    stop(): void;
    /**
     * 收集性能指标
     */
    private collectMetrics;
    /**
     * 获取CPU使用率
     * @returns CPU使用率（0-100）
     */
    private getCpuUsage;
    /**
     * 计算平均响应时间
     * @returns 平均响应时间（毫秒）
     */
    private calculateAvgResponseTime;
    /**
     * 记录请求
     * @param responseTime 响应时间（毫秒）
     * @param isSuccess 是否成功
     */
    recordRequest(responseTime: number, isSuccess: boolean): void;
    /**
     * 获取当前性能指标
     * @returns 当前性能指标
     */
    getCurrentMetrics(): PerformanceMetrics | null;
    /**
     * 获取性能指标历史
     * @param limit 限制返回的记录数量
     * @returns 性能指标历史
     */
    getMetricsHistory(limit?: number): PerformanceMetrics[];
    /**
     * 重置性能指标
     */
    resetMetrics(): void;
}
