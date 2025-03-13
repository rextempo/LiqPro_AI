/**
 * LiqPro Data Service - 真实Meteora数据集成
 * 
 * 数据服务负责从Solana区块链收集Meteora DLMM池数据，
 * 并提供API端点供其他服务访问这些数据。
 */

const express = require('express');
const { MeteoraPoolCollector } = require('./src/meteora/meteora');
const { RabbitMQPublisher } = require('./rabbitmq-integration');
const logger = require('./src/utils/logger');

// 创建 Express 应用
const app = express();
const port = process.env.PORT || 3000;

// 创建 RabbitMQ 发布者
const rabbitMQConfig = {
  host: process.env.RABBITMQ_HOST || 'rabbitmq',
  port: parseInt(process.env.RABBITMQ_PORT || '5672'),
  username: process.env.RABBITMQ_USER || 'liqpro',
  password: process.env.RABBITMQ_PASS || 'liqpro',
  poolDataQueue: 'pool_data_queue'
};

const rabbitMQPublisher = new RabbitMQPublisher(rabbitMQConfig);

// 连接到RabbitMQ
rabbitMQPublisher.connect().catch(error => {
  logger.error('连接到RabbitMQ失败', { error: error.message });
});

// 创建 Meteora 池收集器
let meteoraCollector;
try {
  meteoraCollector = new MeteoraPoolCollector('https://api.mainnet-beta.solana.com', 'confirmed');
} catch (error) {
  logger.error('初始化 Meteora Pool Collector 失败', { error: error.message });
}

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'data-service' });
});

// 获取所有 Meteora 池
app.get('/api/meteora/pools', async (req, res) => {
  try {
    const pools = await meteoraCollector.getAllPools();
    res.json({ success: true, data: pools });
  } catch (error) {
    logger.error('获取所有 Meteora 池失败', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取特定池的信息
app.get('/api/meteora/pool/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const poolInfo = await meteoraCollector.getPoolInfo(address);
    res.json({ success: true, data: poolInfo });
  } catch (error) {
    logger.error(`获取池 ${req.params.address} 信息失败`, { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取特定代币对的所有池
app.get('/api/meteora/pools/:tokenX/:tokenY', async (req, res) => {
  try {
    const { tokenX, tokenY } = req.params;
    const pools = await meteoraCollector.getPoolsForTokenPair(tokenX, tokenY);
    res.json({ success: true, data: pools });
  } catch (error) {
    logger.error(`获取代币对 ${req.params.tokenX}/${req.params.tokenY} 的池失败`, { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取流动性分布
app.get('/api/meteora/liquidity/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const distribution = await meteoraCollector.getLiquidityDistribution(address);
    res.json({ success: true, data: distribution });
  } catch (error) {
    logger.error(`获取池 ${req.params.address} 的流动性分布失败`, { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// 测试发布池数据到RabbitMQ
app.post('/api/test/publish-pool-data', async (req, res) => {
  try {
    const testPoolData = {
      address: 'test-pool-address',
      poolId: 'test-pool-id',
      tokenX: 'SOL',
      tokenY: 'USDC',
      price: 100.0,
      liquidity: 1000000,
      volume24h: 500000,
      priceChange24h: 0.05,
      timestamp: new Date().toISOString()
    };
    
    const result = await rabbitMQPublisher.publishPoolData(testPoolData);
    
    if (result) {
      res.json({ success: true, message: '测试池数据已发布到RabbitMQ' });
    } else {
      res.status(500).json({ success: false, error: '发布测试池数据失败' });
    }
  } catch (error) {
    logger.error('发布测试池数据失败', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// 启动服务器
app.listen(port, () => {
  logger.info(`数据服务已启动，监听端口 ${port}`);
  
  // 设置定期更新任务
  const updateInterval = 5 * 60 * 1000; // 5分钟
  logger.info(`启动Meteora数据收集任务，间隔: ${updateInterval}ms`);
  
  // 立即执行一次数据收集
  meteoraCollector.getAllPools().then(pools => {
    logger.info(`初始数据收集成功，获取到 ${pools.length} 个池`);
    
    // 发布池数据到RabbitMQ
    pools.forEach(pool => {
      rabbitMQPublisher.publishPoolData(pool).catch(error => {
        logger.error(`发布池 ${pool.address} 数据失败`, { error: error.message });
      });
    });
  }).catch(error => {
    logger.error('初始数据收集失败', { error: error.message });
  });
  
  // 设置定期更新
  setInterval(() => {
    meteoraCollector.getAllPools().then(pools => {
      logger.info(`定期数据收集成功，获取到 ${pools.length} 个池`);
      
      // 发布池数据到RabbitMQ
      pools.forEach(pool => {
        rabbitMQPublisher.publishPoolData(pool).catch(error => {
          logger.error(`发布池 ${pool.address} 数据失败`, { error: error.message });
        });
      });
    }).catch(error => {
      logger.error('定期数据收集失败', { error: error.message });
    });
  }, updateInterval);
});

// 处理进程终止信号
process.on('SIGINT', async () => {
  logger.info('接收到 SIGINT 信号，正在关闭服务...');
  await rabbitMQPublisher.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('接收到 SIGTERM 信号，正在关闭服务...');
  await rabbitMQPublisher.close();
  process.exit(0);
});
