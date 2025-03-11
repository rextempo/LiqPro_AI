/**
 * Health Check Routes
 * Provides endpoints for checking the health status of all services
 */
import { Router, Request, Response } from 'express';
import { ServiceManager } from '../clients/service-manager';
import { CacheService } from '../services/cache-service';
import { Logger } from '../utils/logger';
import { asyncHandler } from '../middleware/error-handler';
import os from 'os';

const router = Router();
const logger = new Logger('HealthRoutes');

/**
 * @route   GET /health
 * @desc    Get health status of all services
 * @access  Public
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const serviceManager = ServiceManager.getInstance();
  const cacheService = CacheService.getInstance();
  
  // 检查所有服务的健康状态
  const servicesHealth = await serviceManager.checkServicesHealth();
  
  // 获取缓存服务的统计信息
  const cacheStats = cacheService.getStats();
  
  // 获取系统信息
  const systemInfo = {
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: os.cpus(),
    loadavg: os.loadavg(),
    platform: process.platform,
    nodeVersion: process.version
  };
  
  logger.info('Health check performed', { 
    timestamp: new Date().toISOString(),
    services: Object.keys(servicesHealth)
  });
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: servicesHealth,
    cache: {
      status: 'ok',
      stats: cacheStats
    },
    system: systemInfo
  });
}));

/**
 * @route   GET /health/cache
 * @desc    Get cache service health status
 * @access  Public
 */
router.get('/cache', asyncHandler(async (req: Request, res: Response) => {
  const cacheService = CacheService.getInstance();
  const cacheStats = cacheService.getStats();
  
  // 获取更详细的缓存信息
  const detailedStats = {
    ...cacheStats,
    performance: {
      hitRatePercent: `${cacheStats.hitRate.toFixed(2)}%`,
      efficiency: cacheStats.hitRate > 80 ? 'Excellent' : 
                 cacheStats.hitRate > 60 ? 'Good' : 
                 cacheStats.hitRate > 40 ? 'Average' : 'Poor',
      memoryUsageMB: (cacheStats.memoryUsage / (1024 * 1024)).toFixed(2)
    },
    recommendations: [] as string[]
  };
  
  // 根据缓存命中率提供优化建议
  if (cacheStats.hitRate < 40) {
    detailedStats.recommendations.push('Consider increasing TTL for frequently accessed resources');
    detailedStats.recommendations.push('Review cache invalidation strategy to avoid unnecessary cache misses');
  }
  
  if (cacheStats.keys > 10000) {
    detailedStats.recommendations.push('Large number of cache keys detected. Consider implementing cache cleanup for unused keys');
  }
  
  logger.info('Cache health check performed', { 
    timestamp: new Date().toISOString(),
    hitRate: cacheStats.hitRate,
    keys: cacheStats.keys
  });
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    cache: {
      status: cacheStats.hitRate > 30 ? 'ok' : 'warning',
      stats: detailedStats
    }
  });
}));

/**
 * @route   POST /health/cache/reset
 * @desc    Reset cache statistics
 * @access  Private
 */
router.post('/cache/reset', asyncHandler(async (req: Request, res: Response) => {
  const cacheService = CacheService.getInstance();
  cacheService.resetStats();
  
  logger.info('Cache statistics reset', { 
    timestamp: new Date().toISOString()
  });
  
  res.json({
    status: 'ok',
    message: 'Cache statistics reset successfully',
    timestamp: new Date().toISOString()
  });
}));

/**
 * @route   POST /health/cache/prewarm
 * @desc    Prewarm cache with common data
 * @access  Private
 */
router.post('/cache/prewarm', asyncHandler(async (req: Request, res: Response) => {
  const cacheService = CacheService.getInstance();
  const serviceManager = ServiceManager.getInstance();
  
  // 启动异步预热过程
  const prewarmProcess = async () => {
    try {
      logger.info('Starting cache prewarm process');
      
      // 预热常用数据
      // 这里只是一个示例，实际实现应该根据应用需求来预热数据
      const commonData: Record<string, any> = {
        'api:root': {
          status: 'success',
          message: 'LiqPro API服务',
          version: '1.0.0',
          endpoints: ['/api/signals', '/api/data', '/api/scoring', '/api/agent']
        }
      };
      
      // 预热服务健康状态
      const servicesHealth = await serviceManager.checkServicesHealth();
      commonData['api:health'] = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: servicesHealth
      };
      
      // 执行预热
      await cacheService.prewarm(commonData, { ttl: 3600 });
      
      logger.info('Cache prewarm completed successfully');
    } catch (error: any) {
      logger.error(`Cache prewarm failed: ${error.message}`);
    }
  };
  
  // 异步执行预热，不阻塞响应
  prewarmProcess().catch(error => {
    logger.error(`Unhandled error in prewarm process: ${error.message}`);
  });
  
  res.json({
    status: 'ok',
    message: 'Cache prewarm process started',
    timestamp: new Date().toISOString()
  });
}));

export default router; 