/**
 * 信号监控类
 */
export class SignalMonitor {
    /**
     * 构造函数
     * @param {Object} options - 配置选项
     * @param {number} options.maxMetricsAge - 指标最大保存时间（毫秒）
     * @param {Object} options.memoryThreshold - 内存阈值
     * @param {number} options.memoryThreshold.warning - 警告阈值（字节）
     * @param {number} options.memoryThreshold.critical - 严重阈值（字节）
     * @param {number} options.apiTimeout - API超时时间（毫秒）
     */
    constructor(options?: {
        maxMetricsAge: number;
        memoryThreshold: {
            warning: number;
            critical: number;
        };
        apiTimeout: number;
    });
    options: {
        maxMetricsAge: number;
        memoryThreshold: {
            warning: number;
            critical: number;
        };
        apiTimeout: number;
    };
    metrics: {
        apiCalls: never[];
        scoringAccuracy: never[];
        memoryUsage: never[];
        errors: never[];
    };
    /**
     * 跟踪API调用性能
     * @param {string} operation - 操作名称
     * @param {string} target - 目标（如池子地址）
     * @param {number} duration - 持续时间（毫秒）
     */
    trackApiCall(operation: string, target: string, duration?: number): void;
    /**
     * 跟踪评分准确性
     * @param {string} poolAddress - 池子地址
     * @param {number} predictedYield - 预测收益率
     * @param {number} actualYield - 实际收益率
     */
    trackScoringAccuracy(poolAddress: string, predictedYield: number, actualYield: number): void;
    /**
     * 跟踪内存使用
     */
    trackMemoryUsage(): void;
    /**
     * 跟踪错误
     * @param {string} operation - 操作名称
     * @param {Error} error - 错误对象
     * @param {Object} metadata - 元数据
     */
    trackError(operation: string, error: Error, metadata?: any): void;
    /**
     * 生成性能报告
     * @returns {Object} 性能报告
     */
    generatePerformanceReport(): any;
    /**
     * 启动定期清理任务
     * @private
     */
    private _startCleanupTask;
    /**
     * 清理过期指标
     * @private
     */
    private _cleanupMetrics;
    /**
     * 计算API调用统计
     * @param {Array} apiCalls - API调用指标
     * @returns {Object} API调用统计
     * @private
     */
    private _calculateApiCallStats;
    /**
     * 计算评分准确性统计
     * @param {Array} scoringAccuracy - 评分准确性指标
     * @returns {Object} 评分准确性统计
     * @private
     */
    private _calculateScoringAccuracyStats;
    /**
     * 计算内存使用统计
     * @param {Array} memoryUsage - 内存使用指标
     * @returns {Object} 内存使用统计
     * @private
     */
    private _calculateMemoryUsageStats;
    /**
     * 计算错误统计
     * @param {Array} errors - 错误指标
     * @returns {Object} 错误统计
     * @private
     */
    private _calculateErrorStats;
    /**
     * 计算系统状态
     * @param {Object} apiCallStats - API调用统计
     * @param {Object} scoringAccuracyStats - 评分准确性统计
     * @param {Object} memoryUsageStats - 内存使用统计
     * @param {Object} errorStats - 错误统计
     * @returns {string} 系统状态
     * @private
     */
    private _calculateSystemStatus;
    /**
     * 生成建议
     * @param {Object} apiCallStats - API调用统计
     * @param {Object} scoringAccuracyStats - 评分准确性统计
     * @param {Object} memoryUsageStats - 内存使用统计
     * @param {Object} errorStats - 错误统计
     * @returns {Array} 建议列表
     * @private
     */
    private _generateRecommendations;
    /**
     * 格式化字节数
     * @param {number} bytes - 字节数
     * @returns {string} 格式化后的字节数
     * @private
     */
    private _formatBytes;
}
