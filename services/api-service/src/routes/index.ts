/**
 * API路由索引
 */
import { Router } from 'express';
import { Logger } from '../utils/logger';
import { cacheMiddleware, clearCacheByTagsMiddleware } from '../middleware/cache';
import { config } from '../config';
import signalRoutes from './signal-routes';
import dataRoutes from './data-routes';
import scoringRoutes from './scoring-routes';
import agentRoutes from './agent-routes';

const logger = new Logger('Routes');
const router = Router();

// 缓存选项
const defaultCacheOptions = {
  ttl: config.cache.defaultTtl,
  useRedis: config.cache.redis.enabled
};

// 信号路由 - 应用缓存中间件
router.use('/signals', cacheMiddleware({
  ...defaultCacheOptions,
  keyPrefix: 'api:signals:',
  tags: ['signals', 'api'],
  // 只缓存GET请求，且不包含特定查询参数的请求
  condition: (req) => {
    return req.method === 'GET' && !req.query.nocache;
  }
}), signalRoutes);

// 数据路由 - 应用缓存中间件
router.use('/data', cacheMiddleware({
  ...defaultCacheOptions,
  keyPrefix: 'api:data:',
  tags: ['data', 'api'],
  // 市场数据缓存时间较短，因为它变化较快
  ttl: 60, // 1分钟
  condition: (req) => {
    return req.method === 'GET' && !req.query.nocache;
  }
}), dataRoutes);

// 评分路由 - 应用缓存中间件
router.use('/scoring', cacheMiddleware({
  ...defaultCacheOptions,
  keyPrefix: 'api:scoring:',
  tags: ['scoring', 'api'],
  // 评分数据缓存时间较长，因为它变化较慢
  ttl: 600, // 10分钟
  condition: (req) => {
    return req.method === 'GET' && !req.query.nocache;
  }
}), scoringRoutes);

// 代理路由 - 不应用缓存中间件，因为代理操作通常需要实时数据
router.use('/agent', agentRoutes);

// 当信号更新时，清除相关缓存
router.post('/signals/update', clearCacheByTagsMiddleware(['signals'], defaultCacheOptions));

// 当数据更新时，清除相关缓存
router.post('/data/update', clearCacheByTagsMiddleware(['data'], defaultCacheOptions));

// 当评分更新时，清除相关缓存
router.post('/scoring/update', clearCacheByTagsMiddleware(['scoring'], defaultCacheOptions));

// API根路径
router.get('/', cacheMiddleware({
  ...defaultCacheOptions,
  ttl: 3600, // 根路径信息缓存1小时
  keyPrefix: 'api:root:',
  tags: ['root', 'api']
}), (req, res) => {
  logger.info('访问API根路径');
  res.json({
    status: 'success',
    message: 'LiqPro API服务',
    version: '1.0.0',
    endpoints: [
      '/api/signals',
      '/api/data',
      '/api/scoring',
      '/api/agent'
    ]
  });
});

logger.info('API路由已注册');

export default router; 