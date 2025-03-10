/**
 * 信号系统监控模块
 * 负责监控信号系统的性能、准确性和健康状况
 */

const { logger } = require('../utils/logger');

/**
 * 信号监控类
 */
class SignalMonitor {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   * @param {number} options.maxMetricsAge - 指标最大保存时间（毫秒）
   * @param {Object} options.memoryThreshold - 内存阈值
   * @param {number} options.memoryThreshold.warning - 警告阈值（字节）
   * @param {number} options.memoryThreshold.critical - 严重阈值（字节）
   * @param {number} options.apiTimeout - API超时时间（毫秒）
   */
  constructor(options = {}) {
    this.options = {
      maxMetricsAge: options.maxMetricsAge || 7 * 24 * 60 * 60 * 1000, // 默认7天
      memoryThreshold: {
        warning: options.memoryThreshold?.warning || 500 * 1024 * 1024, // 默认500MB
        critical: options.memoryThreshold?.critical || 1000 * 1024 * 1024 // 默认1GB
      },
      apiTimeout: options.apiTimeout || 10000 // 默认10秒
    };
    
    // 初始化指标存储
    this.metrics = {
      apiCalls: [], // API调用性能
      scoringAccuracy: [], // 评分准确性
      memoryUsage: [], // 内存使用
      errors: [] // 错误记录
    };
    
    // 启动定期清理任务
    this._startCleanupTask();
    
    logger.info('SignalMonitor initialized', { options: this.options });
  }
  
  /**
   * 跟踪API调用性能
   * @param {string} operation - 操作名称
   * @param {string} target - 目标（如池子地址）
   * @param {number} duration - 持续时间（毫秒）
   */
  trackApiCall(operation, target, duration = null) {
    const timestamp = Date.now();
    
    // 如果没有提供持续时间，则只记录开始时间
    if (duration === null) {
      this.metrics.apiCalls.push({
        operation,
        target,
        startTime: timestamp,
        status: 'pending'
      });
      return;
    }
    
    // 记录完整的API调用
    this.metrics.apiCalls.push({
      operation,
      target,
      duration,
      timestamp,
      status: duration > this.options.apiTimeout ? 'timeout' : 'success'
    });
    
    // 记录超时情况
    if (duration > this.options.apiTimeout) {
      logger.warn(`API call timeout: ${operation}`, {
        target,
        duration,
        threshold: this.options.apiTimeout
      });
    }
  }
  
  /**
   * 跟踪评分准确性
   * @param {string} poolAddress - 池子地址
   * @param {number} predictedYield - 预测收益率
   * @param {number} actualYield - 实际收益率
   */
  trackScoringAccuracy(poolAddress, predictedYield, actualYield) {
    const timestamp = Date.now();
    const error = Math.abs(predictedYield - actualYield);
    const errorPercent = actualYield !== 0 ? (error / actualYield) * 100 : 0;
    
    this.metrics.scoringAccuracy.push({
      poolAddress,
      predictedYield,
      actualYield,
      error,
      errorPercent,
      timestamp
    });
    
    // 记录大误差情况
    if (errorPercent > 20) {
      logger.warn(`High scoring error for pool ${poolAddress}`, {
        predictedYield,
        actualYield,
        errorPercent
      });
    }
  }
  
  /**
   * 跟踪内存使用
   */
  trackMemoryUsage() {
    const timestamp = Date.now();
    const memoryUsage = process.memoryUsage();
    
    this.metrics.memoryUsage.push({
      ...memoryUsage,
      timestamp
    });
    
    // 检查内存使用是否超过阈值
    if (memoryUsage.heapUsed > this.options.memoryThreshold.critical) {
      logger.error('Critical memory usage detected', {
        heapUsed: this._formatBytes(memoryUsage.heapUsed),
        heapTotal: this._formatBytes(memoryUsage.heapTotal),
        threshold: this._formatBytes(this.options.memoryThreshold.critical)
      });
    } else if (memoryUsage.heapUsed > this.options.memoryThreshold.warning) {
      logger.warn('High memory usage detected', {
        heapUsed: this._formatBytes(memoryUsage.heapUsed),
        heapTotal: this._formatBytes(memoryUsage.heapTotal),
        threshold: this._formatBytes(this.options.memoryThreshold.warning)
      });
    }
  }
  
  /**
   * 跟踪错误
   * @param {string} operation - 操作名称
   * @param {Error} error - 错误对象
   * @param {Object} metadata - 元数据
   */
  trackError(operation, error, metadata = {}) {
    const timestamp = Date.now();
    
    this.metrics.errors.push({
      operation,
      message: error.message,
      stack: error.stack,
      metadata,
      timestamp
    });
    
    logger.error(`Error in operation ${operation}: ${error.message}`, {
      ...metadata,
      stack: error.stack
    });
  }
  
  /**
   * 生成性能报告
   * @returns {Object} 性能报告
   */
  generatePerformanceReport() {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    
    // 获取最近24小时的指标
    const recentApiCalls = this.metrics.apiCalls.filter(m => m.timestamp >= oneDayAgo);
    const recentScoringAccuracy = this.metrics.scoringAccuracy.filter(m => m.timestamp >= oneDayAgo);
    const recentMemoryUsage = this.metrics.memoryUsage.filter(m => m.timestamp >= oneDayAgo);
    const recentErrors = this.metrics.errors.filter(m => m.timestamp >= oneDayAgo);
    
    // 计算API调用统计
    const apiCallStats = this._calculateApiCallStats(recentApiCalls);
    
    // 计算评分准确性统计
    const scoringAccuracyStats = this._calculateScoringAccuracyStats(recentScoringAccuracy);
    
    // 计算内存使用统计
    const memoryUsageStats = this._calculateMemoryUsageStats(recentMemoryUsage);
    
    // 计算错误统计
    const errorStats = this._calculateErrorStats(recentErrors);
    
    // 生成报告
    return {
      timestamp: new Date().toISOString(),
      timeRange: {
        start: new Date(oneDayAgo).toISOString(),
        end: new Date(now).toISOString()
      },
      api: apiCallStats,
      scoring: scoringAccuracyStats,
      memory: memoryUsageStats,
      errors: errorStats,
      summary: {
        status: this._calculateSystemStatus(apiCallStats, scoringAccuracyStats, memoryUsageStats, errorStats),
        recommendations: this._generateRecommendations(apiCallStats, scoringAccuracyStats, memoryUsageStats, errorStats)
      }
    };
  }
  
  /**
   * 启动定期清理任务
   * @private
   */
  _startCleanupTask() {
    // 每小时清理一次过期指标
    setInterval(() => {
      this._cleanupMetrics();
    }, 60 * 60 * 1000);
  }
  
  /**
   * 清理过期指标
   * @private
   */
  _cleanupMetrics() {
    const cutoffTime = Date.now() - this.options.maxMetricsAge;
    
    // 清理API调用指标
    this.metrics.apiCalls = this.metrics.apiCalls.filter(m => m.timestamp >= cutoffTime);
    
    // 清理评分准确性指标
    this.metrics.scoringAccuracy = this.metrics.scoringAccuracy.filter(m => m.timestamp >= cutoffTime);
    
    // 清理内存使用指标
    this.metrics.memoryUsage = this.metrics.memoryUsage.filter(m => m.timestamp >= cutoffTime);
    
    // 清理错误指标
    this.metrics.errors = this.metrics.errors.filter(m => m.timestamp >= cutoffTime);
    
    logger.info('Metrics cleanup completed', {
      apiCallsCount: this.metrics.apiCalls.length,
      scoringAccuracyCount: this.metrics.scoringAccuracy.length,
      memoryUsageCount: this.metrics.memoryUsage.length,
      errorsCount: this.metrics.errors.length
    });
  }
  
  /**
   * 计算API调用统计
   * @param {Array} apiCalls - API调用指标
   * @returns {Object} API调用统计
   * @private
   */
  _calculateApiCallStats(apiCalls) {
    if (apiCalls.length === 0) {
      return {
        totalCalls: 0,
        avgDuration: 0,
        timeouts: 0,
        operations: {}
      };
    }
    
    // 按操作分组
    const operationGroups = {};
    let totalDuration = 0;
    let timeouts = 0;
    
    apiCalls.forEach(call => {
      if (call.status === 'pending') return;
      
      if (!operationGroups[call.operation]) {
        operationGroups[call.operation] = {
          count: 0,
          totalDuration: 0,
          timeouts: 0
        };
      }
      
      operationGroups[call.operation].count++;
      operationGroups[call.operation].totalDuration += call.duration;
      totalDuration += call.duration;
      
      if (call.status === 'timeout') {
        operationGroups[call.operation].timeouts++;
        timeouts++;
      }
    });
    
    // 计算每个操作的平均持续时间
    const operations = {};
    Object.keys(operationGroups).forEach(operation => {
      const group = operationGroups[operation];
      operations[operation] = {
        count: group.count,
        avgDuration: group.count > 0 ? Math.round(group.totalDuration / group.count) : 0,
        timeouts: group.timeouts
      };
    });
    
    return {
      totalCalls: apiCalls.filter(call => call.status !== 'pending').length,
      avgDuration: apiCalls.length > 0 ? Math.round(totalDuration / apiCalls.length) : 0,
      timeouts,
      operations
    };
  }
  
  /**
   * 计算评分准确性统计
   * @param {Array} scoringAccuracy - 评分准确性指标
   * @returns {Object} 评分准确性统计
   * @private
   */
  _calculateScoringAccuracyStats(scoringAccuracy) {
    if (scoringAccuracy.length === 0) {
      return {
        totalPredictions: 0,
        avgError: 0,
        avgErrorPercent: 0,
        maxError: 0,
        accuracyRate: 0
      };
    }
    
    let totalError = 0;
    let totalErrorPercent = 0;
    let maxError = 0;
    let accuratePredictions = 0;
    
    scoringAccuracy.forEach(record => {
      totalError += record.error;
      totalErrorPercent += record.errorPercent;
      maxError = Math.max(maxError, record.error);
      
      // 如果误差百分比小于10%，则认为是准确的预测
      if (record.errorPercent < 10) {
        accuratePredictions++;
      }
    });
    
    return {
      totalPredictions: scoringAccuracy.length,
      avgError: scoringAccuracy.length > 0 ? totalError / scoringAccuracy.length : 0,
      avgErrorPercent: scoringAccuracy.length > 0 ? totalErrorPercent / scoringAccuracy.length : 0,
      maxError,
      accuracyRate: scoringAccuracy.length > 0 ? accuratePredictions / scoringAccuracy.length : 0
    };
  }
  
  /**
   * 计算内存使用统计
   * @param {Array} memoryUsage - 内存使用指标
   * @returns {Object} 内存使用统计
   * @private
   */
  _calculateMemoryUsageStats(memoryUsage) {
    if (memoryUsage.length === 0) {
      return {
        current: {
          heapUsed: 0,
          heapTotal: 0,
          rss: 0
        },
        peak: {
          heapUsed: 0,
          timestamp: null
        },
        average: {
          heapUsed: 0
        }
      };
    }
    
    // 获取最新的内存使用
    const current = memoryUsage[memoryUsage.length - 1];
    
    // 计算峰值内存使用
    let peakHeapUsed = 0;
    let peakTimestamp = null;
    let totalHeapUsed = 0;
    
    memoryUsage.forEach(record => {
      totalHeapUsed += record.heapUsed;
      
      if (record.heapUsed > peakHeapUsed) {
        peakHeapUsed = record.heapUsed;
        peakTimestamp = record.timestamp;
      }
    });
    
    return {
      current: {
        heapUsed: current.heapUsed,
        heapTotal: current.heapTotal,
        rss: current.rss
      },
      peak: {
        heapUsed: peakHeapUsed,
        timestamp: peakTimestamp ? new Date(peakTimestamp).toISOString() : null
      },
      average: {
        heapUsed: memoryUsage.length > 0 ? totalHeapUsed / memoryUsage.length : 0
      }
    };
  }
  
  /**
   * 计算错误统计
   * @param {Array} errors - 错误指标
   * @returns {Object} 错误统计
   * @private
   */
  _calculateErrorStats(errors) {
    if (errors.length === 0) {
      return {
        totalErrors: 0,
        recentErrors: 0,
        byOperation: {}
      };
    }
    
    // 按操作分组
    const operationGroups = {};
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    let recentErrors = 0;
    
    errors.forEach(error => {
      if (!operationGroups[error.operation]) {
        operationGroups[error.operation] = 0;
      }
      
      operationGroups[error.operation]++;
      
      if (error.timestamp >= oneHourAgo) {
        recentErrors++;
      }
    });
    
    return {
      totalErrors: errors.length,
      recentErrors,
      byOperation: operationGroups
    };
  }
  
  /**
   * 计算系统状态
   * @param {Object} apiCallStats - API调用统计
   * @param {Object} scoringAccuracyStats - 评分准确性统计
   * @param {Object} memoryUsageStats - 内存使用统计
   * @param {Object} errorStats - 错误统计
   * @returns {string} 系统状态
   * @private
   */
  _calculateSystemStatus(apiCallStats, scoringAccuracyStats, memoryUsageStats, errorStats) {
    // 检查是否有严重问题
    if (
      errorStats.recentErrors > 10 ||
      apiCallStats.timeouts > apiCallStats.totalCalls * 0.1 ||
      memoryUsageStats.current.heapUsed > this.options.memoryThreshold.critical ||
      scoringAccuracyStats.accuracyRate < 0.5
    ) {
      return 'critical';
    }
    
    // 检查是否有警告问题
    if (
      errorStats.recentErrors > 5 ||
      apiCallStats.timeouts > apiCallStats.totalCalls * 0.05 ||
      memoryUsageStats.current.heapUsed > this.options.memoryThreshold.warning ||
      scoringAccuracyStats.accuracyRate < 0.7
    ) {
      return 'warning';
    }
    
    return 'healthy';
  }
  
  /**
   * 生成建议
   * @param {Object} apiCallStats - API调用统计
   * @param {Object} scoringAccuracyStats - 评分准确性统计
   * @param {Object} memoryUsageStats - 内存使用统计
   * @param {Object} errorStats - 错误统计
   * @returns {Array} 建议列表
   * @private
   */
  _generateRecommendations(apiCallStats, scoringAccuracyStats, memoryUsageStats, errorStats) {
    const recommendations = [];
    
    // API调用建议
    if (apiCallStats.timeouts > 0) {
      recommendations.push({
        area: 'api',
        priority: apiCallStats.timeouts > apiCallStats.totalCalls * 0.1 ? 'high' : 'medium',
        message: `Consider optimizing API calls to reduce timeouts (${apiCallStats.timeouts} timeouts detected)`
      });
    }
    
    // 评分准确性建议
    if (scoringAccuracyStats.accuracyRate < 0.7) {
      recommendations.push({
        area: 'scoring',
        priority: scoringAccuracyStats.accuracyRate < 0.5 ? 'high' : 'medium',
        message: `Review scoring algorithm to improve accuracy (current rate: ${Math.round(scoringAccuracyStats.accuracyRate * 100)}%)`
      });
    }
    
    // 内存使用建议
    if (memoryUsageStats.current.heapUsed > this.options.memoryThreshold.warning) {
      recommendations.push({
        area: 'memory',
        priority: memoryUsageStats.current.heapUsed > this.options.memoryThreshold.critical ? 'high' : 'medium',
        message: `Optimize memory usage (current: ${this._formatBytes(memoryUsageStats.current.heapUsed)}, threshold: ${this._formatBytes(this.options.memoryThreshold.warning)})`
      });
    }
    
    // 错误处理建议
    if (errorStats.recentErrors > 0) {
      recommendations.push({
        area: 'errors',
        priority: errorStats.recentErrors > 10 ? 'high' : 'medium',
        message: `Investigate and fix recent errors (${errorStats.recentErrors} errors in the last hour)`
      });
    }
    
    return recommendations;
  }
  
  /**
   * 格式化字节数
   * @param {number} bytes - 字节数
   * @returns {string} 格式化后的字节数
   * @private
   */
  _formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

module.exports = { SignalMonitor }; 