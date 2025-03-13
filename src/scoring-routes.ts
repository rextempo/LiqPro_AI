/**
 * 评分服务路由
 */
import { Router, Request, Response, NextFunction } from 'express';
import { Logger } from '../utils/logger';
import { ServiceManager } from '../clients/service-manager';
import { Signal } from '../clients/signal-client';

const router = Router();
const logger = new Logger('ScoringRoutes');

/**
 * 对单个信号进行评分
 */
router.post('/signal', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const signal = req.body.signal as Signal;
    
    if (!signal || !signal.id) {
      return res.status(400).json({
        status: 'error',
        message: '请提供有效的信号数据'
      });
    }
    
    const scoringClient = ServiceManager.getInstance().getScoringClient();
    
    logger.info(`对信号进行评分，ID: ${signal.id}`);
    const score = await scoringClient.scoreSignal(signal);
    
    res.json({
      status: 'success',
      data: { score }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`对信号评分失败: ${errorMessage}`);
    next(error);
  }
});

/**
 * 批量对信号进行评分
 */
router.post('/signals', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const signals = req.body.signals as Signal[];
    
    if (!signals || !Array.isArray(signals) || signals.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: '请提供有效的信号数组'
      });
    }
    
    const scoringClient = ServiceManager.getInstance().getScoringClient();
    
    logger.info(`批量对信号进行评分，数量: ${signals.length}`);
    const scores = await scoringClient.scoreSignals(signals);
    
    res.json({
      status: 'success',
      data: {
        scores,
        count: scores.length
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`批量对信号评分失败: ${errorMessage}`);
    next(error);
  }
});

/**
 * 获取池风险评估
 */
router.get('/risk/:poolAddress', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { poolAddress } = req.params;
    const scoringClient = ServiceManager.getInstance().getScoringClient();
    
    logger.info(`获取池风险评估，地址: ${poolAddress}`);
    const riskAssessment = await scoringClient.getRiskAssessment(poolAddress);
    
    res.json({
      status: 'success',
      data: { riskAssessment }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`获取池风险评估失败: ${errorMessage}`);
    next(error);
  }
});

/**
 * 获取池健康状况
 */
router.get('/health/:poolAddress', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { poolAddress } = req.params;
    const scoringClient = ServiceManager.getInstance().getScoringClient();
    
    logger.info(`获取池健康状况，地址: ${poolAddress}`);
    const poolHealth = await scoringClient.getPoolHealth(poolAddress);
    
    res.json({
      status: 'success',
      data: { poolHealth }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`获取池健康状况失败: ${errorMessage}`);
    next(error);
  }
});

/**
 * 批量获取池健康状况
 */
router.post('/health/bulk', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { poolAddresses } = req.body;
    
    if (!poolAddresses || !Array.isArray(poolAddresses) || poolAddresses.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: '请提供有效的池地址数组'
      });
    }
    
    const scoringClient = ServiceManager.getInstance().getScoringClient();
    
    logger.info(`批量获取池健康状况，地址: ${poolAddresses.join(',')}`);
    const bulkPoolHealth = await scoringClient.getBulkPoolHealth(poolAddresses);
    
    res.json({
      status: 'success',
      data: { bulkPoolHealth }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`批量获取池健康状况失败: ${errorMessage}`);
    next(error);
  }
});

/**
 * 获取信号准确率
 */
router.get('/accuracy', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const scoringClient = ServiceManager.getInstance().getScoringClient();
    const timeframe = req.query.timeframe ? parseInt(req.query.timeframe as string, 10) : 30;
    
    logger.info(`获取信号准确率，时间范围: ${timeframe}天`);
    const accuracy = await scoringClient.getSignalAccuracy(timeframe);
    
    res.json({
      status: 'success',
      data: { accuracy }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`获取信号准确率失败: ${errorMessage}`);
    next(error);
  }
});

export default router; 