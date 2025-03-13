/**
 * LiqPro Data Service - 真实Meteora数据集成
 * 
 * 数据服务负责从Solana区块链收集Meteora DLMM池数据，
 * 并提供API端点供其他服务访问这些数据。
 */

const express = require('express');
const { MeteoraPoolCollector } = require('./src/meteora/meteora');
const logger = require('./src/utils/logger');
const amqp = require('amqplib');

// 创建 Express 应用
const app = express();
const port = process.env.PORT || 3002;

// RabbitMQ 配置
const rabbitmqHost = process.env.RABBITMQ_HOST || 'rabbitmq';
const rabbitmqPort = process.env.RABBITMQ_PORT || 5672;
const rabbitmqUser = process.env.RABBITMQ_USER || 'guest';
const rabbitmqPass = process.env.RABBITMQ_PASS || 'guest';
const rabbitmqUrl = `amqp://${rabbitmqUser}:${rabbitmqPass}@${rabbitmqHost}:${rabbitmqPort}`;
const queueName = 'pool_data_queue';

// 创建 Meteora 池收集器
let meteoraCollector;
try {
  meteoraCollector = new MeteoraPoolCollector('https://soft-snowy-asphalt.solana-mainnet.quiknode.pro/48639631c6e4e81af5a0b8e228f6f9a0329154b7/', 'confirmed');
} catch (error) {
  logger.error('初始化 Meteora Pool Collector 失败', { error: error.message });
}

// RabbitMQ 连接和通道
let rabbitmqConnection;
let rabbitmqChannel;

// 连接到 RabbitMQ
async function connectToRabbitMQ() {
  try {
    logger.info(`正在连接到 RabbitMQ: ${rabbitmqUrl}`);
    rabbitmqConnection = await amqp.connect(rabbitmqUrl);
    rabbitmqChannel = await rabbitmqConnection.createChannel();
    
    // 确保队列存在
    await rabbitmqChannel.assertQueue(queueName, { durable: true });
    
    logger.info('成功连接到 RabbitMQ');
    
    // 设置连接关闭处理
    rabbitmqConnection.on('close', () => {
      logger.warn('RabbitMQ 连接已关闭，尝试重新连接...');
      setTimeout(connectToRabbitMQ, 5000);
    });
  } catch (error) {
    logger.error('连接到 RabbitMQ 失败', { error: error.message });
    setTimeout(connectToRabbitMQ, 5000);
  }
}

// 发布池数据到 RabbitMQ
async function publishPoolData(poolData) {
  try {
    if (!rabbitmqChannel) {
      logger.warn('RabbitMQ 通道未连接，无法发布数据');
      return;
    }
    
    await rabbitmqChannel.sendToQueue(
      queueName,
      Buffer.from(JSON.stringify(poolData)),
      { persistent: true }
    );
    
    logger.info(`已发布 ${poolData.length} 个池数据到 RabbitMQ`);
  } catch (error) {
    logger.error('发布池数据到 RabbitMQ 失败', { error: error.message });
  }
}

// 收集并发布池数据
async function collectAndPublishPoolData() {
  try {
    logger.info('开始收集高活跃度池数据');
    
    // 使用新的 getHighActivityPools 方法获取高活跃度池子
    const pools = await meteoraCollector.getHighActivityPools(100);
    
    if (!pools || pools.length === 0) {
      logger.warn('未找到高活跃度池数据');
      return;
    }
    
    logger.info(`成功收集 ${pools.length} 个高活跃度池数据`);
    
    // 发布到 RabbitMQ
    await publishPoolData(pools);
  } catch (error) {
    logger.error('收集和发布池数据失败', { error: error.message });
  }
}

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'data-service' });
});

// 手动触发数据收集端点
app.get('/api/collect-data', async (req, res) => {
  try {
    await collectAndPublishPoolData();
    res.json({ success: true, message: '数据收集已触发' });
  } catch (error) {
    logger.error('手动触发数据收集失败', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取所有 Meteora 池
app.get('/api/meteora/pools', async (req, res) => {
  try {
    const pools = await meteoraCollector.getHighActivityPools();
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

// 启动服务器
app.listen(port, async () => {
  logger.info(`数据服务已启动，监听端口 ${port}`);
  
  // 连接到 RabbitMQ
  await connectToRabbitMQ();
  
  // 设置定期更新任务
  const updateInterval = 5 * 60 * 1000; // 5分钟
  logger.info(`启动Meteora数据收集任务，间隔: ${updateInterval}ms`);
  
  // 立即执行一次数据收集
  collectAndPublishPoolData().catch(error => {
    logger.error('初始数据收集失败', { error: error.message });
  });
  
  // 设置定期更新
  setInterval(() => {
    collectAndPublishPoolData().catch(error => {
      logger.error('定期数据收集失败', { error: error.message });
    });
  }, updateInterval);
}); 