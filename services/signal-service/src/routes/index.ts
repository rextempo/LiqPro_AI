import { Router, Request, Response } from 'express';
import { logger } from '../logger';
import mongoose from 'mongoose';

// 声明express模块
declare module 'express';

// 初始化 MongoDB 连接
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/liqpro';

// 连接到 MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => {
    logger.info('成功连接到 MongoDB');
  })
  .catch((error) => {
    logger.error('MongoDB 连接失败:', error);
    process.exit(1);
  });

// 定义信号数据模型
const signalSchema = new mongoose.Schema({
  id: String,
  analysis_timestamp: Date,
  market_condition: {
    trend: String,
    volatility: String
  },
  t1_pools: [{
    pool_address: String,
    name: String,
    token_pair: {
      token_x: {
        symbol: String,
        address: String
      },
      token_y: {
        symbol: String,
        address: String
      }
    },
    metrics: {
      liquidity: Number,
      volume_24h: Number,
      fees_24h: Number,
      daily_yield: Number,
      active_bin: {
        binId: Number,
        price: String,
        pricePerToken: String
      }
    },
    liquidity_distribution: {
      effective_liquidity_ratio: Number,
      distribution_type: String
    },
    fee_info: {
      base_fee: String,
      max_fee: String,
      current_dynamic_fee: String
    },
    stability_metrics: {
      price_volatility: Number,
      yield_stability: Number,
      stability_score: Number
    },
    risk_metrics: {
      price_risk: Number,
      liquidity_risk: Number,
      overall_risk: Number
    },
    scores: {
      base_performance_score: Number,
      liquidity_distribution_score: Number,
      fee_efficiency_score: Number,
      stability_score: Number,
      risk_score: Number,
      final_score: Number
    },
    recommendation: {
      position_size: String,
      price_range: {
        min: Number,
        max: Number,
        current: Number,
        optimal_range_percentage: Number
      },
      bin_distribution: String,
      bin_step: Number
    },
    tier: String
  }],
  t2_pools: [{
    // 与 t1_pools 相同的结构
  }],
  t3_pools: [{
    // 与 t1_pools 相同的结构
  }],
  createdAt: Date,
  updatedAt: Date
}, {
  timestamps: true
});

const Signal = mongoose.model('Signal', signalSchema);

const router = Router();

/**
 * @route GET /health
 * @desc 健康检查端点
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    // 检查 MongoDB 连接
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        status: 'error',
        message: 'MongoDB 连接不可用'
      });
    }

    res.status(200).json({
      status: 'ok',
      service: 'signal-service',
      timestamp: new Date().toISOString(),
      connections: {
        mongodb: 'connected'
      }
    });
  } catch (error) {
    logger.error('健康检查失败:', error);
    res.status(500).json({
      status: 'error',
      message: '健康检查失败'
    });
  }
});

/**
 * @route GET /api/signals
 * @desc 获取所有信号
 */
router.get('/api/signals', async (req: Request, res: Response) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    
    // 从数据库获取信号数据
    const signals = await Signal.find()
      .sort({ analysis_timestamp: -1 })
      .skip(Number(offset))
      .limit(Number(limit));
    
    // 获取总数
    const total = await Signal.countDocuments();
    
    res.status(200).json({
      signals,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset)
      }
    });
  } catch (error) {
    logger.error('获取信号失败:', error);
    res.status(500).json({ error: '获取信号失败' });
  }
});

/**
 * @route GET /api/signals/:id
 * @desc 获取特定信号
 */
router.get('/api/signals/:id', async (req: Request, res: Response) => {
  try {
    const signal = await Signal.findOne({ id: req.params.id });
    
    if (!signal) {
      return res.status(404).json({ error: '信号未找到' });
    }
    
    res.status(200).json(signal);
  } catch (error) {
    logger.error('获取信号失败:', error);
    res.status(500).json({ error: '获取信号失败' });
  }
});

export default router; 