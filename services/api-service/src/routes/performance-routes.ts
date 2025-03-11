/**
 * 性能监控路由
 * 提供API性能监控指标的访问
 */
import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/error-handler';
import { getPerformanceMonitor } from '../middleware/performance';
import { Logger } from '../utils/logger';

const router = Router();
const logger = new Logger('PerformanceRoutes');

/**
 * @route   GET /performance
 * @desc    获取当前性能指标
 * @access  Private
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const performanceMonitor = getPerformanceMonitor();
  const metrics = performanceMonitor.getCurrentMetrics();
  
  if (!metrics) {
    return res.status(404).json({
      status: 'error',
      message: 'No performance metrics available yet'
    });
  }
  
  res.json({
    status: 'success',
    timestamp: new Date(metrics.timestamp).toISOString(),
    metrics
  });
}));

/**
 * @route   GET /performance/history
 * @desc    获取性能指标历史
 * @access  Private
 */
router.get('/history', asyncHandler(async (req: Request, res: Response) => {
  const performanceMonitor = getPerformanceMonitor();
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
  const metrics = performanceMonitor.getMetricsHistory(limit);
  
  res.json({
    status: 'success',
    count: metrics.length,
    metrics
  });
}));

/**
 * @route   GET /performance/cache
 * @desc    获取缓存性能指标
 * @access  Private
 */
router.get('/cache', asyncHandler(async (req: Request, res: Response) => {
  const performanceMonitor = getPerformanceMonitor();
  const metrics = performanceMonitor.getCurrentMetrics();
  
  if (!metrics) {
    return res.status(404).json({
      status: 'error',
      message: 'No performance metrics available yet'
    });
  }
  
  // 提取缓存相关指标
  const cacheMetrics = {
    hitRate: metrics.cache.hitRate,
    hitRateFormatted: `${metrics.cache.hitRate.toFixed(2)}%`,
    keys: metrics.cache.keys,
    memoryUsage: metrics.cache.memoryUsage,
    memoryUsageFormatted: `${(metrics.cache.memoryUsage / (1024 * 1024)).toFixed(2)} MB`,
    efficiency: metrics.cache.hitRate > 80 ? 'Excellent' : 
               metrics.cache.hitRate > 60 ? 'Good' : 
               metrics.cache.hitRate > 40 ? 'Average' : 'Poor'
  };
  
  res.json({
    status: 'success',
    timestamp: new Date(metrics.timestamp).toISOString(),
    cache: cacheMetrics
  });
}));

/**
 * @route   GET /performance/system
 * @desc    获取系统性能指标
 * @access  Private
 */
router.get('/system', asyncHandler(async (req: Request, res: Response) => {
  const performanceMonitor = getPerformanceMonitor();
  const metrics = performanceMonitor.getCurrentMetrics();
  
  if (!metrics) {
    return res.status(404).json({
      status: 'error',
      message: 'No performance metrics available yet'
    });
  }
  
  // 提取系统相关指标
  const systemMetrics = {
    cpuUsage: metrics.system.cpuUsage,
    cpuUsageFormatted: `${metrics.system.cpuUsage.toFixed(2)}%`,
    memoryUsage: {
      rss: metrics.system.memoryUsage.rss,
      rssFormatted: `${(metrics.system.memoryUsage.rss / (1024 * 1024)).toFixed(2)} MB`,
      heapTotal: metrics.system.memoryUsage.heapTotal,
      heapTotalFormatted: `${(metrics.system.memoryUsage.heapTotal / (1024 * 1024)).toFixed(2)} MB`,
      heapUsed: metrics.system.memoryUsage.heapUsed,
      heapUsedFormatted: `${(metrics.system.memoryUsage.heapUsed / (1024 * 1024)).toFixed(2)} MB`,
      external: metrics.system.memoryUsage.external,
      externalFormatted: `${(metrics.system.memoryUsage.external / (1024 * 1024)).toFixed(2)} MB`
    },
    loadAverage: metrics.system.loadAverage
  };
  
  res.json({
    status: 'success',
    timestamp: new Date(metrics.timestamp).toISOString(),
    system: systemMetrics
  });
}));

/**
 * @route   GET /performance/requests
 * @desc    获取请求性能指标
 * @access  Private
 */
router.get('/requests', asyncHandler(async (req: Request, res: Response) => {
  const performanceMonitor = getPerformanceMonitor();
  const metrics = performanceMonitor.getCurrentMetrics();
  
  if (!metrics) {
    return res.status(404).json({
      status: 'error',
      message: 'No performance metrics available yet'
    });
  }
  
  // 提取请求相关指标
  const requestMetrics = {
    total: metrics.requests.total,
    success: metrics.requests.success,
    error: metrics.requests.error,
    successRate: metrics.requests.total > 0 
      ? (metrics.requests.success / metrics.requests.total) * 100 
      : 0,
    successRateFormatted: metrics.requests.total > 0 
      ? `${((metrics.requests.success / metrics.requests.total) * 100).toFixed(2)}%` 
      : '0.00%',
    avgResponseTime: metrics.requests.avgResponseTime,
    avgResponseTimeFormatted: `${metrics.requests.avgResponseTime.toFixed(2)} ms`
  };
  
  res.json({
    status: 'success',
    timestamp: new Date(metrics.timestamp).toISOString(),
    requests: requestMetrics
  });
}));

/**
 * @route   POST /performance/reset
 * @desc    重置性能指标
 * @access  Private
 */
router.post('/reset', asyncHandler(async (req: Request, res: Response) => {
  const performanceMonitor = getPerformanceMonitor();
  performanceMonitor.resetMetrics();
  
  logger.info('Performance metrics reset');
  
  res.json({
    status: 'success',
    message: 'Performance metrics reset successfully',
    timestamp: new Date().toISOString()
  });
}));

export default router; 