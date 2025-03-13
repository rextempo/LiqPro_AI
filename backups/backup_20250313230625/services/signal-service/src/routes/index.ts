import { Router } from 'express';
import { SignalController } from '../controllers/signal-controller';
import { logger } from '../logger';

// 创建路由实例
const router = Router();

// 初始化控制器
const signalController = new SignalController();

/**
 * 信号路由
 */
// 获取信号
router.get('/signals', signalController.getSignals);

// 获取信号详情
router.get('/signals/:id', signalController.getSignalById);

// 手动生成信号
router.post('/signals/generate', signalController.generateSignals);

/**
 * 策略路由
 */
// 获取策略列表
router.get('/strategies', signalController.getStrategies);

// 获取策略详情
router.get('/strategies/:id', signalController.getStrategyById);

// 创建策略
router.post('/strategies', signalController.createStrategy);

// 更新策略
router.put('/strategies/:id', signalController.updateStrategy);

// 删除策略
router.delete('/strategies/:id', signalController.deleteStrategy);

// 评估策略性能
router.post('/strategies/:id/evaluate', signalController.evaluateStrategyPerformance);

// 优化策略参数
router.post('/strategies/:id/optimize', signalController.optimizeStrategyParameters);

// 记录路由注册
logger.info('信号服务路由已注册');

export default router; 