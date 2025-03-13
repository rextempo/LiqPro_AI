import { Router } from 'express';
import { logger } from '../logger';

const router = Router();

/**
 * @route GET /api/signals
 * @desc 获取所有信号
 */
router.get('/signals', async (req, res) => {
  try {
    // 这里将来会从数据库获取信号
    // 目前返回一个空数组
    res.status(200).json([]);
  } catch (error) {
    logger.error('获取信号失败:', error);
    res.status(500).json({ error: '获取信号失败' });
  }
});

/**
 * @route GET /api/signals/:id
 * @desc 获取特定信号
 */
router.get('/signals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // 这里将来会从数据库获取特定信号
    // 目前返回404
    res.status(404).json({ error: '信号未找到' });
  } catch (error) {
    logger.error('获取特定信号失败:', error);
    res.status(500).json({ error: '获取特定信号失败' });
  }
});

/**
 * @route GET /api/strategies
 * @desc 获取所有策略
 */
router.get('/strategies', async (req, res) => {
  try {
    // 这里将来会从数据库获取策略
    // 目前返回一个空数组
    res.status(200).json([]);
  } catch (error) {
    logger.error('获取策略失败:', error);
    res.status(500).json({ error: '获取策略失败' });
  }
});

export default router; 