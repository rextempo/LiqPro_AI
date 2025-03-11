import { Router } from 'express';
import { CruiseController } from '../controllers/CruiseController';
import { Logger } from '../../utils/logger';
import { CruiseService } from '../../core/cruise/CruiseService';

/**
 * 创建巡航服务路由
 * @param logger 日志记录器
 * @param cruiseService 巡航服务实例
 * @returns Express路由器
 */
export const createCruiseRoutes = (
  logger: Logger,
  cruiseService: CruiseService
): Router => {
  const router = Router();
  const cruiseController = new CruiseController(logger, cruiseService);

  // 获取巡航服务状态
  router.get('/status', cruiseController.getStatus);

  // 获取巡航服务指标
  router.get('/metrics', cruiseController.getMetrics);

  // 获取特定代理的指标
  router.get('/metrics/:agentId', cruiseController.getAgentMetrics);

  // 执行代理健康检查
  router.post('/agents/:agentId/health-check', cruiseController.performHealthCheck);

  // 执行代理仓位优化
  router.post('/agents/:agentId/optimize', cruiseController.optimizePositions);

  logger.info('Cruise routes initialized');
  return router;
}; 