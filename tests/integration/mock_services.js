/**
 * LiqPro 信号系统模拟服务器
 * 
 * 用于在实际服务未运行时进行测试
 */

const express = require('express');
const cors = require('cors');
const logger = require('./logger');

// 创建模拟服务
const dataService = express();
const signalService = express();
const scoringService = express();

// 中间件设置
[dataService, signalService, scoringService].forEach(app => {
  app.use(cors());
  app.use(express.json());
  
  // 日志中间件
  app.use((req, res, next) => {
    logger.debug(`${req.method} ${req.url}`);
    next();
  });
});

// 示例DLMM池数据
const dlmmPools = [
  {
    address: 'ARmSJaUxgKJExnYvVS91JiwxG7DTTaZh2JALiy2LCkxL',
    version: 'DLMM',
    active: true,
    tokenX: {
      address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      symbol: 'USDC',
      decimals: 6
    },
    tokenY: {
      address: 'So11111111111111111111111111111111111111112',
      symbol: 'SOL',
      decimals: 9
    },
    activeBin: 123456,
    price: 70.25,
    totalLiquidity: 1000000.5,
    bins: Array(50).fill(0).map((_, i) => ({
      binId: 123456 + i - 25,
      liquidity: 10000 + Math.random() * 50000,
      pricePerLamport: 70.25 * (1 + (i - 25) * 0.01)
    }))
  },
  {
    address: '2QdhepnKRTLjjSqPL1PtKNwpWHEZ3yjUDzJGnXTVJS7s',
    version: 'DLMM',
    active: true,
    tokenX: {
      address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      symbol: 'USDC',
      decimals: 6
    },
    tokenY: {
      address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
      symbol: 'USDT',
      decimals: 6
    },
    activeBin: 200000,
    price: 1.001,
    totalLiquidity: 5000000.75,
    bins: Array(50).fill(0).map((_, i) => ({
      binId: 200000 + i - 25,
      liquidity: 100000 + Math.random() * 100000,
      pricePerLamport: 1.001 * (1 + (i - 25) * 0.0001)
    }))
  },
  {
    address: 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo',
    version: 'DLMM',
    active: true,
    tokenX: {
      address: '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs',
      symbol: 'ETH',
      decimals: 8
    },
    tokenY: {
      address: 'So11111111111111111111111111111111111111112',
      symbol: 'SOL',
      decimals: 9
    },
    activeBin: 300000,
    price: 18.5,
    totalLiquidity: 2500000.25,
    bins: Array(50).fill(0).map((_, i) => ({
      binId: 300000 + i - 25,
      liquidity: 50000 + Math.random() * 75000,
      pricePerLamport: 18.5 * (1 + (i - 25) * 0.005)
    }))
  }
];

// 市场价格数据
const marketPrices = {
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 1.0, // USDC
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 1.0, // USDT
  'So11111111111111111111111111111111111111112': 70.25, // SOL
  '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs': 1300.5 // ETH
};

// ===== 数据服务模拟 API =====

// 健康检查端点
dataService.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: Date.now() });
});

// 获取所有DLMM池
dataService.get('/api/dlmm/pools', (req, res) => {
  res.json(dlmmPools);
});

// 获取特定DLMM池
dataService.get('/api/dlmm/pools/:address', (req, res) => {
  const pool = dlmmPools.find(p => p.address === req.params.address);
  if (pool) {
    res.json(pool);
  } else {
    res.status(404).json({ error: 'Pool not found' });
  }
});

// 获取市场价格
dataService.get('/api/market/prices', (req, res) => {
  res.json(marketPrices);
});

// 获取流动性分布
dataService.get('/api/dlmm/liquidity-distribution/:address', (req, res) => {
  const pool = dlmmPools.find(p => p.address === req.params.address);
  if (!pool) {
    return res.status(404).json({ error: 'Pool not found' });
  }
  
  res.json({
    totalBins: pool.bins.length,
    activeRangeBins: Math.floor(pool.bins.length * 0.7),
    concentration: 0.65 + Math.random() * 0.2,
    skew: -0.1 + Math.random() * 0.2
  });
});

// ===== 信号服务模拟 API =====

// 健康检查端点
signalService.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: Date.now() });
});

// 市场分析
signalService.get('/api/analysis/market', (req, res) => {
  res.json({
    trendDirection: Math.random() > 0.5 ? 'bullish' : 'bearish',
    volatility: 0.1 + Math.random() * 0.3,
    timestamp: Date.now()
  });
});

// 获取池策略
signalService.get('/api/strategy/:address', (req, res) => {
  const pool = dlmmPools.find(p => p.address === req.params.address);
  if (!pool) {
    return res.status(404).json({ error: 'Pool not found' });
  }
  
  const strategyTypes = ['rebalance', 'increasePosition', 'decreasePosition', 'maintainPosition'];
  const randomStrategy = strategyTypes[Math.floor(Math.random() * strategyTypes.length)];
  
  res.json({
    recommendation: randomStrategy,
    confidence: 0.6 + Math.random() * 0.3,
    timestamp: Date.now(),
    binRange: {
      min: pool.activeBin - 10 - Math.floor(Math.random() * 10),
      max: pool.activeBin + 10 + Math.floor(Math.random() * 10)
    },
    dynamicFee: 0.001 + Math.random() * 0.005
  });
});

// 回测
signalService.post('/api/backtest', (req, res) => {
  const { poolAddress, startTime, endTime, strategy } = req.body;
  
  if (!poolAddress || !startTime || !endTime) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }
  
  const tradeCount = 5 + Math.floor(Math.random() * 20);
  const trades = Array(tradeCount).fill(0).map((_, i) => ({
    timestamp: startTime + Math.floor((endTime - startTime) * (i / tradeCount)),
    type: Math.random() > 0.5 ? 'buy' : 'sell',
    amount: 1000 + Math.random() * 5000,
    price: 100 + Math.random() * 20
  }));
  
  res.json({
    performance: {
      startValue: 10000,
      endValue: 10000 * (1 + (-0.1 + Math.random() * 0.3)),
      roi: -0.1 + Math.random() * 0.3,
      sharpeRatio: 0.5 + Math.random() * 1.5
    },
    trades
  });
});

// ===== 评分服务模拟 API =====

// 健康检查端点
scoringService.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: Date.now() });
});

// 健康评分
scoringService.get('/api/health/:address', (req, res) => {
  const pool = dlmmPools.find(p => p.address === req.params.address);
  if (!pool) {
    return res.status(404).json({ error: 'Pool not found' });
  }
  
  res.json({
    overallScore: 70 + Math.random() * 20,
    liquidityScore: 65 + Math.random() * 25,
    stabilityScore: 75 + Math.random() * 15,
    feeEfficiencyScore: 60 + Math.random() * 30,
    timestamp: Date.now()
  });
});

// 风险评估
scoringService.get('/api/risk/:address', (req, res) => {
  const pool = dlmmPools.find(p => p.address === req.params.address);
  if (!pool) {
    return res.status(404).json({ error: 'Pool not found' });
  }
  
  res.json({
    overallRisk: 0.2 + Math.random() * 0.4,
    priceRisk: 0.15 + Math.random() * 0.5,
    liquidityRisk: 0.1 + Math.random() * 0.4,
    whaleActivityRisk: 0.05 + Math.random() * 0.3,
    timestamp: Date.now()
  });
});

// 行动推荐
scoringService.get('/api/recommendations/:address', (req, res) => {
  const pool = dlmmPools.find(p => p.address === req.params.address);
  if (!pool) {
    return res.status(404).json({ error: 'Pool not found' });
  }
  
  const actions = ['increase_exposure', 'maintain_position', 'reduce_exposure', 'exit_position'];
  const randomAction = actions[Math.floor(Math.random() * actions.length)];
  
  res.json({
    action: randomAction,
    allocation: 0.1 + Math.random() * 0.5,
    riskLevel: 'medium',
    timestamp: Date.now(),
    rationale: 'Based on current market conditions and pool performance metrics.'
  });
});

// 启动服务器
function startMockServices() {
  const dataServicePort = parseInt(process.env.MOCK_DATA_SERVICE_PORT || '3001');
  const signalServicePort = parseInt(process.env.MOCK_SIGNAL_SERVICE_PORT || '3002');
  const scoringServicePort = parseInt(process.env.MOCK_SCORING_SERVICE_PORT || '3003');
  
  const servers = [];
  
  const dataServer = dataService.listen(dataServicePort, () => {
    logger.info(`模拟数据服务运行在端口 ${dataServicePort}`);
  });
  servers.push(dataServer);
  
  const signalServer = signalService.listen(signalServicePort, () => {
    logger.info(`模拟信号服务运行在端口 ${signalServicePort}`);
  });
  servers.push(signalServer);
  
  const scoringServer = scoringService.listen(scoringServicePort, () => {
    logger.info(`模拟评分服务运行在端口 ${scoringServicePort}`);
  });
  servers.push(scoringServer);
  
  // 处理关闭
  function shutdown() {
    logger.info('正在关闭模拟服务...');
    servers.forEach(server => server.close());
  }
  
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  
  return {
    shutdown,
    ports: {
      dataService: dataServicePort,
      signalService: signalServicePort,
      scoringService: scoringServicePort
    }
  };
}

// 如果直接运行此脚本，则启动模拟服务
if (require.main === module) {
  startMockServices();
}

module.exports = { startMockServices }; 