/**
 * Meteora 池数据路由
 */

import express from 'express';
import {
  getAllPools,
  getPoolByAddress,
  getHighActivityPools,
  getBestYieldPools,
  getPoolHistory,
} from '../services/pool-service';
import logger from '../utils/logger';

const router = express.Router();

// 获取所有池数据
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const skip = parseInt(req.query.skip as string) || 0;

    const pools = await getAllPools(limit, skip);
    res.status(200).json({
      status: 'success',
      data: {
        pools,
        timestamp: Date.now(),
      },
    });
  } catch (error) {
    logger.error('获取所有池数据失败', { error });
    res.status(500).json({
      status: 'error',
      message: '获取池数据失败',
    });
  }
});

// 获取特定池数据
router.get('/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const pool = await getPoolByAddress(address);

    if (!pool) {
      res.status(404).json({
        status: 'error',
        message: '池不存在',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: {
        pool,
        timestamp: Date.now(),
      },
    });
  } catch (error) {
    logger.error(`获取池数据失败: ${req.params.address}`, { error });
    res.status(500).json({
      status: 'error',
      message: '获取池数据失败',
    });
  }
});

// 获取高活跃度池
router.get('/high-activity', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const pools = await getHighActivityPools(limit);

    res.status(200).json({
      status: 'success',
      data: {
        pools,
        timestamp: Date.now(),
      },
    });
  } catch (error) {
    logger.error('获取高活跃度池失败', { error });
    res.status(500).json({
      status: 'error',
      message: '获取高活跃度池失败',
    });
  }
});

// 获取最佳收益率池
router.get('/best', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const pools = await getBestYieldPools(limit);

    res.status(200).json({
      status: 'success',
      data: {
        pools,
        timestamp: Date.now(),
      },
    });
  } catch (error) {
    logger.error('获取最佳收益率池失败', { error });
    res.status(500).json({
      status: 'error',
      message: '获取最佳收益率池失败',
    });
  }
});

// 获取池历史数据
router.get('/:address/history', async (req, res) => {
  try {
    const { address } = req.params;
    const startTime = new Date(req.query.startTime as string);
    const endTime = new Date(req.query.endTime as string);

    const pools = await getPoolHistory(address, startTime, endTime);
    res.status(200).json({
      status: 'success',
      data: {
        pools,
        timestamp: Date.now(),
      },
    });
  } catch (error) {
    logger.error(`获取池历史数据失败: ${req.params.address}`, { error });
    res.status(500).json({
      status: 'error',
      message: '获取池历史数据失败',
    });
  }
});

export default router; 