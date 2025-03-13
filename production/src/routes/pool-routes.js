/**
 * 池数据路由
 */

const express = require('express');
const {
  getAllPools,
  getPoolByAddress,
  getPoolsByTokenPair,
} = require('../services/pool-service');
const logger = require('../utils/logger');

const router = express.Router();

// 获取所有池
router.get('/', async (req, res) => {
  try {
    const { limit = 100, skip = 0, sort = 'apr', order = 'desc' } = req.query;
    
    // 构建排序对象
    let sortObj = {};
    if (sort === 'apr') {
      sortObj = { 'yields.apr': order === 'desc' ? -1 : 1 };
    } else if (sort === 'volume') {
      sortObj = { volume24h: order === 'desc' ? -1 : 1 };
    } else if (sort === 'liquidity') {
      sortObj = { liquidity: order === 'desc' ? -1 : 1 };
    } else if (sort === 'feesToTVL') {
      sortObj = { 'yields.feesToTVL': order === 'desc' ? -1 : 1 };
    } else {
      sortObj = { 'yields.apr': -1 }; // 默认按APR降序
    }
    
    // 构建过滤对象
    const filter = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.tokenA) {
      filter.tokenAAddress = req.query.tokenA;
    }
    if (req.query.tokenB) {
      filter.tokenBAddress = req.query.tokenB;
    }
    
    const pools = await getAllPools(
      filter,
      sortObj,
      parseInt(limit),
      parseInt(skip)
    );
    
    res.status(200).json({
      status: 'success',
      data: {
        pools,
        count: pools.length,
        timestamp: Date.now(),
      },
    });
  } catch (error) {
    logger.error('获取所有池失败', { error: error.message });
    res.status(500).json({
      status: 'error',
      message: '获取所有池失败',
    });
  }
});

// 获取特定池
router.get('/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const pool = await getPoolByAddress(address);
    
    if (!pool) {
      return res.status(404).json({
        status: 'error',
        message: `找不到地址为 ${address} 的池`,
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        pool,
        timestamp: Date.now(),
      },
    });
  } catch (error) {
    logger.error(`获取池 ${req.params.address} 失败`, { error: error.message });
    res.status(500).json({
      status: 'error',
      message: '获取池失败',
    });
  }
});

// 获取特定代币对的所有池
router.get('/pair/:tokenA/:tokenB', async (req, res) => {
  try {
    const { tokenA, tokenB } = req.params;
    const pools = await getPoolsByTokenPair(tokenA, tokenB);
    
    res.status(200).json({
      status: 'success',
      data: {
        pools,
        count: pools.length,
        timestamp: Date.now(),
      },
    });
  } catch (error) {
    logger.error(`获取代币对 ${req.params.tokenA}/${req.params.tokenB} 的池失败`, { error: error.message });
    res.status(500).json({
      status: 'error',
      message: '获取代币对的池失败',
    });
  }
});

// 获取热门池
router.get('/top/volume', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const pools = await getAllPools(
      {},
      { volume24h: -1 },
      parseInt(limit),
      0
    );
    
    res.status(200).json({
      status: 'success',
      data: {
        pools,
        count: pools.length,
        timestamp: Date.now(),
      },
    });
  } catch (error) {
    logger.error('获取交易量最高的池失败', { error: error.message });
    res.status(500).json({
      status: 'error',
      message: '获取交易量最高的池失败',
    });
  }
});

// 获取收益率最高的池
router.get('/top/apr', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const pools = await getAllPools(
      {},
      { 'yields.apr': -1 },
      parseInt(limit),
      0
    );
    
    res.status(200).json({
      status: 'success',
      data: {
        pools,
        count: pools.length,
        timestamp: Date.now(),
      },
    });
  } catch (error) {
    logger.error('获取收益率最高的池失败', { error: error.message });
    res.status(500).json({
      status: 'error',
      message: '获取收益率最高的池失败',
    });
  }
});

module.exports = router; 