import { Logger } from '../../utils/logger';
/**
 * 指标类型枚举
 */
export declare enum MetricType {
    COUNTER = "counter",
    GAUGE = "gauge",
    HISTOGRAM = "histogram",
    SUMMARY = "summary"
}
/**
 * 指标接口
 */
export interface Metric {
    name: string;
    type: MetricType;
    description: string;
    value: number | Map<string, number>;
    labels?: string[];
    timestamp: number;
}
/**
 * 健康检查指标
 */
export interface HealthCheckMetrics {
    totalChecks: number;
    successfulChecks: number;
    failedChecks: number;
    averageDuration: number;
    unhealthyPositionsDetected: number;
    lastCheckTimestamp: number;
}
/**
 * 优化指标
 */
export interface OptimizationMetrics {
    totalOptimizations: number;
    successfulOptimizations: number;
    failedOptimizations: number;
    averageDuration: number;
    totalActionsExecuted: number;
    totalActionsSucceeded: number;
    totalActionsFailed: number;
    averageHealthImprovement: number;
    lastOptimizationTimestamp: number;
}
/**
 * 任务指标
 */
export interface TaskMetrics {
    totalTasks: number;
    activeTasks: number;
    completedTasks: number;
    failedTasks: number;
    averageTaskDuration: number;
}
/**
 * 代理指标
 */
export interface AgentMetrics {
    agentId: string;
    healthChecks: HealthCheckMetrics;
    optimizations: OptimizationMetrics;
    lastHealthScore: number;
    positionsCount: number;
    totalValueSol: number;
    lastUpdateTimestamp: number;
}
/**
 * Cruise 模块指标
 */
export declare class CruiseMetrics {
    private logger;
    private metrics;
    private agentMetrics;
    private startTime;
    private metricsReportInterval;
    private metricsReportTimer;
    /**
     * 构造函数
     */
    constructor(logger: Logger, metricsReportIntervalMs?: number);
    /**
     * 初始化全局指标
     */
    private initializeGlobalMetrics;
    /**
     * 启动指标报告
     */
    startMetricsReporting(): void;
    /**
     * 停止指标报告
     */
    stopMetricsReporting(): void;
    /**
     * 注册指标
     */
    registerMetric(metric: Metric): void;
    /**
     * 更新指标值
     */
    updateMetric(name: string, value: number): void;
    /**
     * 获取指标值
     */
    getMetric(name: string): Metric | undefined;
    /**
     * 获取所有指标
     */
    getAllMetrics(): Metric[];
    /**
     * 注册代理
     */
    registerAgent(agentId: string): void;
    /**
     * 注销代理
     */
    unregisterAgent(agentId: string): void;
    /**
     * 记录健康检查
     */
    recordHealthCheck(agentId: string, success: boolean, duration: number, unhealthyPositions?: number, healthScore?: number): void;
    /**
     * 记录优化
     */
    recordOptimization(agentId: string, success: boolean, duration: number, actionsExecuted?: number, actionsSucceeded?: number, healthImprovement?: number, positionsCount?: number, totalValueSol?: number): void;
    /**
     * 更新任务指标
     */
    updateTaskMetrics(totalTasks: number, activeTasks: number): void;
    /**
     * 获取代理指标
     */
    getAgentMetrics(agentId: string): AgentMetrics | undefined;
    /**
     * 获取所有代理指标
     */
    getAllAgentMetrics(): AgentMetrics[];
    /**
     * 报告指标
     */
    private reportMetrics;
    /**
     * 获取指标摘要
     */
    getMetricsSummary(): any;
}
