import { Router } from 'express';
import { PoolController } from './controller';
import { validateRequest } from '../../middleware/validation';
import { poolSchemas } from './schemas';

const router = Router();
const controller = new PoolController();

// 获取推荐池子列表
router.get(
  '/recommended',
  validateRequest({ query: poolSchemas.getRecommendedPoolsSchema }),
  controller.getRecommendedPools
);

// 获取池子详情
router.get(
  '/:address',
  validateRequest({ params: poolSchemas.getPoolDetailSchema }),
  controller.getPoolDetail
);

// 获取监控的池子列表
router.get(
  '/monitored',
  validateRequest({ query: poolSchemas.getMonitoredPoolsSchema }),
  controller.getMonitoredPools
);

export default router; 