"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceMonitor = void 0;
/**
 * 性能监控工具
 * 用于监控API服务的性能指标
 */
const events_1 = require("events");
const logger_1 = require("./logger");
const cache_service_1 = require("../services/cache-service");
const os_1 = __importDefault(require("os"));
/**
 * 性能监控类
 */
class PerformanceMonitor extends events_1.EventEmitter {
    /**
     * 创建性能监控实例
     * @param options 监控配置
     */
    constructor(options = {}) {
        super();
        this.metrics = [];
        this.requestStats = {
            total: 0,
            success: 0,
            error: 0,
            responseTimes: []
        };
        this.timer = null;
        this.logger = new logger_1.Logger('PerformanceMonitor');
        this.cacheService = cache_service_1.CacheService.getInstance();
        this.interval = options.interval || 60000; // 默认1分钟
        this.maxHistory = options.maxHistory || 60; // 默认保留60条记录
        this.logMetrics = options.logMetrics || false;
        // 监听缓存服务事件
        this.setupCacheListeners();
        this.logger.info('PerformanceMonitor initialized');
    }
    /**
     * 设置缓存服务事件监听
     */
    setupCacheListeners() {
        this.cacheService.on('hit', () => {
            this.emit('cache:hit');
        });
        this.cacheService.on('miss', () => {
            this.emit('cache:miss');
        });
        this.cacheService.on('error', (error) => {
            this.logger.error(`Cache error: ${error.message}`);
            this.emit('cache:error', error);
        });
    }
    /**
     * 获取性能监控实例
     * @param options 监控配置
     * @returns 性能监控实例
     */
    static getInstance(options = {}) {
        if (!PerformanceMonitor.instance) {
            PerformanceMonitor.instance = new PerformanceMonitor(options);
        }
        return PerformanceMonitor.instance;
    }
    /**
     * 开始监控
     */
    start() {
        if (this.timer) {
            this.logger.warn('Performance monitor already started');
            return;
        }
        this.logger.info('Starting performance monitoring');
        // 立即收集一次指标
        this.collectMetrics();
        // 设置定时器，定期收集指标
        this.timer = setInterval(() => {
            this.collectMetrics();
        }, this.interval);
        this.emit('start');
    }
    /**
     * 停止监控
     */
    stop() {
        if (!this.timer) {
            this.logger.warn('Performance monitor not started');
            return;
        }
        clearInterval(this.timer);
        this.timer = null;
        this.logger.info('Performance monitoring stopped');
        this.emit('stop');
    }
    /**
     * 收集性能指标
     */
    collectMetrics() {
        try {
            const cacheStats = this.cacheService.getStats();
            const cpuUsage = this.getCpuUsage();
            const memoryUsage = process.memoryUsage();
            const metrics = {
                timestamp: Date.now(),
                cache: {
                    hitRate: cacheStats.hitRate,
                    keys: cacheStats.keys,
                    memoryUsage: cacheStats.memoryUsage
                },
                system: {
                    cpuUsage,
                    memoryUsage: {
                        rss: memoryUsage.rss,
                        heapTotal: memoryUsage.heapTotal,
                        heapUsed: memoryUsage.heapUsed,
                        external: memoryUsage.external
                    },
                    loadAverage: os_1.default.loadavg()
                },
                requests: {
                    total: this.requestStats.total,
                    success: this.requestStats.success,
                    error: this.requestStats.error,
                    avgResponseTime: this.calculateAvgResponseTime()
                }
            };
            // 添加到指标历史
            this.metrics.push(metrics);
            // 如果历史记录超过最大数量，则移除最旧的记录
            if (this.metrics.length > this.maxHistory) {
                this.metrics.shift();
            }
            // 如果配置了记录指标到日志，则记录
            if (this.logMetrics) {
                this.logger.info('Performance metrics collected', {
                    timestamp: new Date(metrics.timestamp).toISOString(),
                    cacheHitRate: `${metrics.cache.hitRate.toFixed(2)}%`,
                    memoryUsage: `${(metrics.system.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
                    requestsPerMinute: this.requestStats.total
                });
            }
            // 重置请求响应时间数组，避免内存泄漏
            this.requestStats.responseTimes = [];
            // 触发指标收集事件
            this.emit('metrics', metrics);
        }
        catch (error) {
            this.logger.error(`Error collecting metrics: ${error.message}`);
            this.emit('error', error);
        }
    }
    /**
     * 获取CPU使用率
     * @returns CPU使用率（0-100）
     */
    getCpuUsage() {
        const cpus = os_1.default.cpus();
        let totalIdle = 0;
        let totalTick = 0;
        cpus.forEach(cpu => {
            for (const type in cpu.times) {
                totalTick += cpu.times[type];
            }
            totalIdle += cpu.times.idle;
        });
        const idle = totalIdle / cpus.length;
        const total = totalTick / cpus.length;
        return 100 - (idle / total) * 100;
    }
    /**
     * 计算平均响应时间
     * @returns 平均响应时间（毫秒）
     */
    calculateAvgResponseTime() {
        if (this.requestStats.responseTimes.length === 0) {
            return 0;
        }
        const sum = this.requestStats.responseTimes.reduce((a, b) => a + b, 0);
        return sum / this.requestStats.responseTimes.length;
    }
    /**
     * 记录请求
     * @param responseTime 响应时间（毫秒）
     * @param isSuccess 是否成功
     */
    recordRequest(responseTime, isSuccess) {
        this.requestStats.total++;
        if (isSuccess) {
            this.requestStats.success++;
        }
        else {
            this.requestStats.error++;
        }
        this.requestStats.responseTimes.push(responseTime);
    }
    /**
     * 获取当前性能指标
     * @returns 当前性能指标
     */
    getCurrentMetrics() {
        return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
    }
    /**
     * 获取性能指标历史
     * @param limit 限制返回的记录数量
     * @returns 性能指标历史
     */
    getMetricsHistory(limit) {
        if (!limit || limit >= this.metrics.length) {
            return [...this.metrics];
        }
        return this.metrics.slice(this.metrics.length - limit);
    }
    /**
     * 重置性能指标
     */
    resetMetrics() {
        this.metrics = [];
        this.requestStats = {
            total: 0,
            success: 0,
            error: 0,
            responseTimes: []
        };
        this.logger.info('Performance metrics reset');
        this.emit('reset');
    }
}
exports.PerformanceMonitor = PerformanceMonitor;
//# sourceMappingURL=performance-monitor.js.map