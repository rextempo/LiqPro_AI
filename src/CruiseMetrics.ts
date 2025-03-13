import { Logger } from '../../utils/logger';

/**
 * 指标类型枚举
 */
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary'
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
export class CruiseMetrics {
  private logger: Logger;
  private metrics: Map<string, Metric> = new Map();
  private agentMetrics: Map<string, AgentMetrics> = new Map();
  private startTime: number;
  private metricsReportInterval: number;
  private metricsReportTimer: NodeJS.Timeout | null = null;
  
  /**
   * 构造函数
   */
  constructor(logger: Logger, metricsReportIntervalMs = 60000) {
    this.logger = logger.child({ module: 'CruiseMetrics' });
    this.startTime = Date.now();
    this.metricsReportInterval = metricsReportIntervalMs;
    
    // 初始化全局指标
    this.initializeGlobalMetrics();
    
    this.logger.info('CruiseMetrics initialized');
  }
  
  /**
   * 初始化全局指标
   */
  private initializeGlobalMetrics(): void {
    // 注册代理数量指标
    this.registerMetric({
      name: 'cruise_registered_agents',
      type: MetricType.GAUGE,
      description: 'Number of registered agents',
      value: 0,
      timestamp: Date.now()
    });
    
    // 健康检查指标
    this.registerMetric({
      name: 'cruise_health_checks_total',
      type: MetricType.COUNTER,
      description: 'Total number of health checks performed',
      value: 0,
      timestamp: Date.now()
    });
    
    this.registerMetric({
      name: 'cruise_health_checks_success',
      type: MetricType.COUNTER,
      description: 'Number of successful health checks',
      value: 0,
      timestamp: Date.now()
    });
    
    this.registerMetric({
      name: 'cruise_health_checks_failed',
      type: MetricType.COUNTER,
      description: 'Number of failed health checks',
      value: 0,
      timestamp: Date.now()
    });
    
    // 优化指标
    this.registerMetric({
      name: 'cruise_optimizations_total',
      type: MetricType.COUNTER,
      description: 'Total number of optimizations performed',
      value: 0,
      timestamp: Date.now()
    });
    
    this.registerMetric({
      name: 'cruise_optimizations_success',
      type: MetricType.COUNTER,
      description: 'Number of successful optimizations',
      value: 0,
      timestamp: Date.now()
    });
    
    this.registerMetric({
      name: 'cruise_optimizations_failed',
      type: MetricType.COUNTER,
      description: 'Number of failed optimizations',
      value: 0,
      timestamp: Date.now()
    });
    
    // 任务指标
    this.registerMetric({
      name: 'cruise_tasks_total',
      type: MetricType.GAUGE,
      description: 'Total number of scheduled tasks',
      value: 0,
      timestamp: Date.now()
    });
    
    this.registerMetric({
      name: 'cruise_tasks_active',
      type: MetricType.GAUGE,
      description: 'Number of active tasks',
      value: 0,
      timestamp: Date.now()
    });
    
    // 性能指标
    this.registerMetric({
      name: 'cruise_uptime_seconds',
      type: MetricType.GAUGE,
      description: 'Uptime in seconds',
      value: 0,
      timestamp: Date.now()
    });
    
    this.registerMetric({
      name: 'cruise_memory_usage_mb',
      type: MetricType.GAUGE,
      description: 'Memory usage in MB',
      value: 0,
      timestamp: Date.now()
    });
  }
  
  /**
   * 启动指标报告
   */
  public startMetricsReporting(): void {
    if (this.metricsReportTimer) {
      return;
    }
    
    this.metricsReportTimer = setInterval(() => {
      this.reportMetrics();
    }, this.metricsReportInterval);
    
    this.logger.info(`Metrics reporting started with interval ${this.metricsReportInterval}ms`);
  }
  
  /**
   * 停止指标报告
   */
  public stopMetricsReporting(): void {
    if (this.metricsReportTimer) {
      clearInterval(this.metricsReportTimer);
      this.metricsReportTimer = null;
      this.logger.info('Metrics reporting stopped');
    }
  }
  
  /**
   * 注册指标
   */
  public registerMetric(metric: Metric): void {
    this.metrics.set(metric.name, metric);
  }
  
  /**
   * 更新指标值
   */
  public updateMetric(name: string, value: number): void {
    const metric = this.metrics.get(name);
    if (metric) {
      if (typeof metric.value === 'number') {
        if (metric.type === MetricType.COUNTER) {
          metric.value += value;
        } else {
          metric.value = value;
        }
      }
      metric.timestamp = Date.now();
    }
  }
  
  /**
   * 获取指标值
   */
  public getMetric(name: string): Metric | undefined {
    return this.metrics.get(name);
  }
  
  /**
   * 获取所有指标
   */
  public getAllMetrics(): Metric[] {
    return Array.from(this.metrics.values());
  }
  
  /**
   * 注册代理
   */
  public registerAgent(agentId: string): void {
    if (!this.agentMetrics.has(agentId)) {
      this.agentMetrics.set(agentId, {
        agentId,
        healthChecks: {
          totalChecks: 0,
          successfulChecks: 0,
          failedChecks: 0,
          averageDuration: 0,
          unhealthyPositionsDetected: 0,
          lastCheckTimestamp: 0
        },
        optimizations: {
          totalOptimizations: 0,
          successfulOptimizations: 0,
          failedOptimizations: 0,
          averageDuration: 0,
          totalActionsExecuted: 0,
          totalActionsSucceeded: 0,
          totalActionsFailed: 0,
          averageHealthImprovement: 0,
          lastOptimizationTimestamp: 0
        },
        lastHealthScore: 0,
        positionsCount: 0,
        totalValueSol: 0,
        lastUpdateTimestamp: Date.now()
      });
      
      this.updateMetric('cruise_registered_agents', 1);
      this.logger.info(`Agent ${agentId} registered for metrics tracking`);
    }
  }
  
  /**
   * 注销代理
   */
  public unregisterAgent(agentId: string): void {
    if (this.agentMetrics.has(agentId)) {
      this.agentMetrics.delete(agentId);
      this.updateMetric('cruise_registered_agents', -1);
      this.logger.info(`Agent ${agentId} unregistered from metrics tracking`);
    }
  }
  
  /**
   * 记录健康检查
   */
  public recordHealthCheck(
    agentId: string, 
    success: boolean, 
    duration: number, 
    unhealthyPositions = 0,
    healthScore = 0
  ): void {
    // 更新全局指标
    this.updateMetric('cruise_health_checks_total', 1);
    if (success) {
      this.updateMetric('cruise_health_checks_success', 1);
    } else {
      this.updateMetric('cruise_health_checks_failed', 1);
    }
    
    // 更新代理指标
    const agentMetric = this.agentMetrics.get(agentId);
    if (agentMetric) {
      const healthChecks = agentMetric.healthChecks;
      
      // 更新总检查次数
      healthChecks.totalChecks++;
      
      // 更新成功/失败次数
      if (success) {
        healthChecks.successfulChecks++;
      } else {
        healthChecks.failedChecks++;
      }
      
      // 更新平均持续时间
      healthChecks.averageDuration = 
        (healthChecks.averageDuration * (healthChecks.totalChecks - 1) + duration) / 
        healthChecks.totalChecks;
      
      // 更新不健康的仓位数量
      healthChecks.unhealthyPositionsDetected += unhealthyPositions;
      
      // 更新最后检查时间戳
      healthChecks.lastCheckTimestamp = Date.now();
      
      // 更新健康评分
      if (healthScore > 0) {
        agentMetric.lastHealthScore = healthScore;
      }
      
      // 更新最后更新时间戳
      agentMetric.lastUpdateTimestamp = Date.now();
    }
  }
  
  /**
   * 记录优化
   */
  public recordOptimization(
    agentId: string,
    success: boolean,
    duration: number,
    actionsExecuted = 0,
    actionsSucceeded = 0,
    healthImprovement = 0,
    positionsCount = 0,
    totalValueSol = 0
  ): void {
    // 更新全局指标
    this.updateMetric('cruise_optimizations_total', 1);
    if (success) {
      this.updateMetric('cruise_optimizations_success', 1);
    } else {
      this.updateMetric('cruise_optimizations_failed', 1);
    }
    
    // 更新代理指标
    const agentMetric = this.agentMetrics.get(agentId);
    if (agentMetric) {
      const optimizations = agentMetric.optimizations;
      
      // 更新总优化次数
      optimizations.totalOptimizations++;
      
      // 更新成功/失败次数
      if (success) {
        optimizations.successfulOptimizations++;
      } else {
        optimizations.failedOptimizations++;
      }
      
      // 更新平均持续时间
      optimizations.averageDuration = 
        (optimizations.averageDuration * (optimizations.totalOptimizations - 1) + duration) / 
        optimizations.totalOptimizations;
      
      // 更新操作数量
      optimizations.totalActionsExecuted += actionsExecuted;
      optimizations.totalActionsSucceeded += actionsSucceeded;
      optimizations.totalActionsFailed += (actionsExecuted - actionsSucceeded);
      
      // 更新平均健康度改善
      if (healthImprovement > 0) {
        optimizations.averageHealthImprovement = 
          (optimizations.averageHealthImprovement * (optimizations.successfulOptimizations - 1) + healthImprovement) / 
          optimizations.successfulOptimizations;
      }
      
      // 更新最后优化时间戳
      optimizations.lastOptimizationTimestamp = Date.now();
      
      // 更新仓位数量和总价值
      if (positionsCount > 0) {
        agentMetric.positionsCount = positionsCount;
      }
      
      if (totalValueSol > 0) {
        agentMetric.totalValueSol = totalValueSol;
      }
      
      // 更新最后更新时间戳
      agentMetric.lastUpdateTimestamp = Date.now();
    }
  }
  
  /**
   * 更新任务指标
   */
  public updateTaskMetrics(totalTasks: number, activeTasks: number): void {
    this.updateMetric('cruise_tasks_total', totalTasks);
    this.updateMetric('cruise_tasks_active', activeTasks);
  }
  
  /**
   * 获取代理指标
   */
  public getAgentMetrics(agentId: string): AgentMetrics | undefined {
    return this.agentMetrics.get(agentId);
  }
  
  /**
   * 获取所有代理指标
   */
  public getAllAgentMetrics(): AgentMetrics[] {
    return Array.from(this.agentMetrics.values());
  }
  
  /**
   * 报告指标
   */
  private reportMetrics(): void {
    try {
      // 更新运行时间
      const uptime = Math.floor((Date.now() - this.startTime) / 1000);
      this.updateMetric('cruise_uptime_seconds', uptime);
      
      // 更新内存使用情况
      const memoryUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100;
      this.updateMetric('cruise_memory_usage_mb', heapUsedMB);
      
      // 记录指标
      const metrics = this.getAllMetrics();
      const agentMetrics = this.getAllAgentMetrics();
      
      this.logger.info(`Cruise Metrics Report - Uptime: ${uptime}s, Memory: ${heapUsedMB}MB, Agents: ${agentMetrics.length}`);
      
      // 记录关键指标
      const healthChecksTotal = this.getMetric('cruise_health_checks_total')?.value || 0;
      const healthChecksSuccess = this.getMetric('cruise_health_checks_success')?.value || 0;
      const optimizationsTotal = this.getMetric('cruise_optimizations_total')?.value || 0;
      const optimizationsSuccess = this.getMetric('cruise_optimizations_success')?.value || 0;
      
      this.logger.info(`Health Checks: ${healthChecksTotal} (${healthChecksSuccess} successful), Optimizations: ${optimizationsTotal} (${optimizationsSuccess} successful)`);
      
      // 记录代理指标摘要
      for (const agentMetric of agentMetrics) {
        this.logger.info(
          `Agent ${agentMetric.agentId} - Health Score: ${agentMetric.lastHealthScore}, ` +
          `Positions: ${agentMetric.positionsCount}, Value: ${agentMetric.totalValueSol} SOL, ` +
          `Health Checks: ${agentMetric.healthChecks.totalChecks}, ` +
          `Optimizations: ${agentMetric.optimizations.totalOptimizations}`
        );
      }
      
      // 这里可以添加将指标发送到监控系统的代码
      // 例如 Prometheus, Datadog, CloudWatch 等
      
    } catch (error) {
      this.logger.error(`Error reporting metrics: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * 获取指标摘要
   */
  public getMetricsSummary(): any {
    const metrics = this.getAllMetrics();
    const agentMetrics = this.getAllAgentMetrics();
    
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100;
    
    return {
      uptime,
      memoryUsageMB: heapUsedMB,
      registeredAgents: agentMetrics.length,
      healthChecks: {
        total: this.getMetric('cruise_health_checks_total')?.value || 0,
        successful: this.getMetric('cruise_health_checks_success')?.value || 0,
        failed: this.getMetric('cruise_health_checks_failed')?.value || 0
      },
      optimizations: {
        total: this.getMetric('cruise_optimizations_total')?.value || 0,
        successful: this.getMetric('cruise_optimizations_success')?.value || 0,
        failed: this.getMetric('cruise_optimizations_failed')?.value || 0
      },
      tasks: {
        total: this.getMetric('cruise_tasks_total')?.value || 0,
        active: this.getMetric('cruise_tasks_active')?.value || 0
      },
      agents: agentMetrics.map(agent => ({
        id: agent.agentId,
        healthScore: agent.lastHealthScore,
        positionsCount: agent.positionsCount,
        totalValueSol: agent.totalValueSol,
        healthChecks: {
          total: agent.healthChecks.totalChecks,
          successful: agent.healthChecks.successfulChecks,
          failed: agent.healthChecks.failedChecks
        },
        optimizations: {
          total: agent.optimizations.totalOptimizations,
          successful: agent.optimizations.successfulOptimizations,
          failed: agent.optimizations.failedOptimizations
        }
      }))
    };
  }
} 