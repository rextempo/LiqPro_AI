/**
 * 池数据快照路由
 */

const express = require('express');
const {
  getHourlySnapshots,
  getDailySnapshots,
  getWeeklySnapshots,
} = require('../services/snapshot-service');
const logger = require('../utils/logger');

const router = express.Router();

// 获取小时快照
router.get('/:address/hourly', async (req, res) => {
  try {
    const { address } = req.params;
    const limit = parseInt(req.query.limit) || 24;
    const skip = parseInt(req.query.skip) || 0;

    const snapshots = await getHourlySnapshots(address, limit, skip);
    res.status(200).json({
      status: 'success',
      data: {
        snapshots,
        count: snapshots.length,
        timestamp: Date.now(),
      },
    });
  } catch (error) {
    logger.error(`获取池 ${req.params.address} 的小时快照失败`, { error: error.message });
    res.status(500).json({
      status: 'error',
      message: '获取小时快照失败',
    });
  }
});

// 获取日快照
router.get('/:address/daily', async (req, res) => {
  try {
    const { address } = req.params;
    const limit = parseInt(req.query.limit) || 30;
    const skip = parseInt(req.query.skip) || 0;

    const snapshots = await getDailySnapshots(address, limit, skip);
    res.status(200).json({
      status: 'success',
      data: {
        snapshots,
        count: snapshots.length,
        timestamp: Date.now(),
      },
    });
  } catch (error) {
    logger.error(`获取池 ${req.params.address} 的日快照失败`, { error: error.message });
    res.status(500).json({
      status: 'error',
      message: '获取日快照失败',
    });
  }
});

// 获取周快照
router.get('/:address/weekly', async (req, res) => {
  try {
    const { address } = req.params;
    const limit = parseInt(req.query.limit) || 12;
    const skip = parseInt(req.query.skip) || 0;

    const snapshots = await getWeeklySnapshots(address, limit, skip);
    res.status(200).json({
      status: 'success',
      data: {
        snapshots,
        count: snapshots.length,
        timestamp: Date.now(),
      },
    });
  } catch (error) {
    logger.error(`获取池 ${req.params.address} 的周快照失败`, { error: error.message });
    res.status(500).json({
      status: 'error',
      message: '获取周快照失败',
    });
  }
});

// 获取最新的变化率指标
router.get('/:address/changes', async (req, res) => {
  try {
    const { address } = req.params;
    
    // 获取最新的小时、日、周快照
    const hourlySnapshots = await getHourlySnapshots(address, 1, 0);
    const dailySnapshots = await getDailySnapshots(address, 1, 0);
    const weeklySnapshots = await getWeeklySnapshots(address, 1, 0);
    
    if (hourlySnapshots.length === 0 || dailySnapshots.length === 0 || weeklySnapshots.length === 0) {
      res.status(404).json({
        status: 'error',
        message: '找不到完整的快照数据',
      });
      return;
    }
    
    const hourly = hourlySnapshots[0];
    const daily = dailySnapshots[0];
    const weekly = weeklySnapshots[0];
    
    res.status(200).json({
      status: 'success',
      data: {
        address,
        changes: {
          price: {
            '1h': hourly.price_change_1h,
            '24h': daily.price_change_24h,
            '7d': weekly.price_change_7d,
          },
          liquidity: {
            '1h': hourly.liquidity_change_1h,
            '24h': daily.liquidity_change_24h,
            '7d': weekly.liquidity_change_7d,
          },
          volume: {
            '1h': hourly.volume_change_1h,
            '24h': daily.volume_change_24h,
            '7d': weekly.volume_change_7d,
          },
        },
        volatility: {
          price_24h: daily.price_volatility_24h,
          price_7d: weekly.price_volatility_7d,
          liquidity_stability: weekly.liquidity_stability,
        },
        efficiency: {
          capital_efficiency_1h: hourly.capital_efficiency,
          capital_efficiency_24h: daily.capital_efficiency_24h,
          avg_capital_efficiency_7d: weekly.avg_capital_efficiency_7d,
          fee_to_volume_ratio: hourly.fee_to_volume_ratio,
          fee_apy: daily.fee_apy,
        },
        timestamp: Date.now(),
      },
    });
  } catch (error) {
    logger.error(`获取池 ${req.params.address} 的变化率指标失败`, { error: error.message });
    res.status(500).json({
      status: 'error',
      message: '获取变化率指标失败',
    });
  }
});

module.exports = router; 