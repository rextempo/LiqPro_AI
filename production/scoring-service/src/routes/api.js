/**
 * API路由
 * 定义评分服务的API端点
 */

const express = require('express');
const logger = require('../utils/logger');

/**
 * 创建API路由
 * @param {Object} scoringController 评分控制器实例
 * @returns {Object} Express路由器
 */
function createApiRoutes(scoringController) {
  const router = express.Router();

  // 中间件，用于处理异步错误
  const asyncHandler = (fn) => {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  };

  // 健康检查端点
  router.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', service: 'scoring-service' });
  });

  // 获取池的健康分数
  router.get(
    '/pools/:poolAddress/health-scores',
    asyncHandler(async (req, res) => {
      const { poolAddress } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit) : undefined;
      
      const scores = scoringController.getHealthScores(poolAddress, limit);
      return res.json(scores);
    })
  );

  // 获取池的最新健康分数
  router.get(
    '/pools/:poolAddress/health-score/latest',
    asyncHandler(async (req, res) => {
      const { poolAddress } = req.params;
      
      const score = scoringController.getLatestHealthScore(poolAddress);
      if (!score) {
        return res.status(404).json({ error: '未找到该池的健康分数' });
      }
      
      return res.json(score);
    })
  );

  // 获取池的风险评估
  router.get(
    '/pools/:poolAddress/risk-assessments',
    asyncHandler(async (req, res) => {
      const { poolAddress } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit) : undefined;
      
      const assessments = scoringController.getRiskAssessments(poolAddress, limit);
      return res.json(assessments);
    })
  );

  // 获取池的最新风险评估
  router.get(
    '/pools/:poolAddress/risk-assessment/latest',
    asyncHandler(async (req, res) => {
      const { poolAddress } = req.params;
      
      const assessment = scoringController.getLatestRiskAssessment(poolAddress);
      if (!assessment) {
        return res.status(404).json({ error: '未找到该池的风险评估' });
      }
      
      return res.json(assessment);
    })
  );

  // 获取池的决策推荐
  router.get(
    '/pools/:poolAddress/recommendations',
    asyncHandler(async (req, res) => {
      const { poolAddress } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit) : undefined;
      
      const recommendations = scoringController.getRecommendations(poolAddress, limit);
      return res.json(recommendations);
    })
  );

  // 获取池的最新决策推荐
  router.get(
    '/pools/:poolAddress/recommendation/latest',
    asyncHandler(async (req, res) => {
      const { poolAddress } = req.params;
      
      const recommendation = scoringController.getLatestRecommendation(poolAddress);
      if (!recommendation) {
        return res.status(404).json({ error: '未找到该池的决策推荐' });
      }
      
      return res.json(recommendation);
    })
  );

  // 手动触发池的评分
  router.post(
    '/pools/:poolAddress/score',
    asyncHandler(async (req, res) => {
      const { poolAddress } = req.params;
      
      logger.info(`手动触发池 ${poolAddress} 的评分`);
      
      try {
        await scoringController.processPool(poolAddress);
        
        const healthScore = scoringController.getLatestHealthScore(poolAddress);
        const riskAssessment = scoringController.getLatestRiskAssessment(poolAddress);
        const recommendation = scoringController.getLatestRecommendation(poolAddress);
        
        return res.json({
          status: 'success',
          data: {
            healthScore,
            riskAssessment,
            recommendation,
          },
        });
      } catch (error) {
        logger.error(`手动评分池 ${poolAddress} 失败: ${error.message}`);
        return res.status(500).json({
          status: 'error',
          message: `评分失败: ${error.message}`,
        });
      }
    })
  );

  // 手动触发所有池的评分周期
  router.post(
    '/score-cycle',
    asyncHandler(async (req, res) => {
      logger.info('手动触发评分周期');
      
      try {
        // 异步触发评分周期，不等待完成
        scoringController.runScoringCycle();
        
        return res.json({
          status: 'success',
          message: '评分周期已触发',
        });
      } catch (error) {
        logger.error(`触发评分周期失败: ${error.message}`);
        return res.status(500).json({
          status: 'error',
          message: `触发评分周期失败: ${error.message}`,
        });
      }
    })
  );

  // 错误处理中间件
  router.use((err, req, res, next) => {
    logger.error(`API错误: ${err.message}`);
    res.status(500).json({
      status: 'error',
      message: err.message,
    });
  });

  return router;
}

module.exports = { createApiRoutes }; 