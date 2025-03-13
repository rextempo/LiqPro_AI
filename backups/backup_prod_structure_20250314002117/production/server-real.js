/**
 * LiqPro Data Service - 真实Meteora数据集成
 * 
 * 数据服务负责从Solana区块链收集Meteora DLMM池数据，
 * 并提供API端点供其他服务访问这些数据。
 */

const express = require('express');
const { MeteoraPoolCollector } = require('./src/meteora/meteora');
const logger = require('./logger');
const amqp = require('amqplib');
const { connectToDatabase, closeDatabaseConnection } = require('./src/utils/db');
const { startDataCollectionTask } = require('./src/meteora');
const poolRoutes = require('./src/routes/pool-routes');
const snapshotRoutes = require('./src/routes/snapshot-routes');

// RabbitMQ 配置
const RABBITMQ_CONFIG = {
  host: process.env.RABBITMQ_HOST || 'rabbitmq',
  port: process.env.RABBITMQ_PORT || 5672,
  username: process.env.RABBITMQ_USER || 'liqpro',
  password: process.env.RABBITMQ_PASS || 'liqpro'
};

// 创建 Express 应用
const app = express();
const port = process.env.PORT || 3000;

// 数据收集间隔（毫秒）
const DATA_COLLECTION_INTERVAL = parseInt(process.env.DATA_COLLECTION_INTERVAL || '300000', 10); // 默认5分钟

let rabbitMQChannel;
let rabbitMQConnection;
let dataCollectionTask;

// 初始化 RabbitMQ 连接
async function initializeRabbitMQ() {
  try {
    const connectionString = `amqp://${RABBITMQ_CONFIG.username}:${RABBITMQ_CONFIG.password}@${RABBITMQ_CONFIG.host}:${RABBITMQ_CONFIG.port}`;
    logger.info(`正在连接到RabbitMQ: amqp://${RABBITMQ_CONFIG.username}:***@${RABBITMQ_CONFIG.host}:${RABBITMQ_CONFIG.port}`);
    
    // 创建连接
    rabbitMQConnection = await amqp.connect(connectionString);
    logger.info('RabbitMQ连接成功');
    
    // 处理连接关闭
    rabbitMQConnection.on('close', () => {
      logger.warn('RabbitMQ连接已关闭，尝试重新连接...');
      rabbitMQConnection = null;
      rabbitMQChannel = null;
      
      // 延迟重连
      setTimeout(() => {
        initializeRabbitMQ();
      }, 5000);
    });
    
    // 处理错误
    rabbitMQConnection.on('error', (err) => {
      logger.error('RabbitMQ连接错误', { error: err.message });
      
      if (rabbitMQConnection) {
        try {
          rabbitMQConnection.close();
        } catch (closeErr) {
          logger.error('关闭RabbitMQ连接时出错', { error: closeErr.message });
        }
      }
      
      rabbitMQConnection = null;
      rabbitMQChannel = null;
      
      // 延迟重连
      setTimeout(() => {
        initializeRabbitMQ();
      }, 5000);
    });
    
    // 创建通道
    rabbitMQChannel = await rabbitMQConnection.createChannel();
    logger.info('RabbitMQ通道创建成功');
    
    // 确保队列存在
    await rabbitMQChannel.assertQueue('pool_data_queue', { durable: true });
    logger.info(`队列 pool_data_queue 已确认`);
  } catch (error) {
    logger.error('RabbitMQ连接失败', { error: error.message });
    
    // 延迟重连
    setTimeout(() => {
      initializeRabbitMQ();
    }, 5000);
  }
}

// 发布池数据到 RabbitMQ
async function publishPoolData(poolData) {
  try {
    if (!rabbitMQChannel) {
      throw new Error('RabbitMQ channel 未初始化');
    }
    
    const message = JSON.stringify(poolData);
    await rabbitMQChannel.sendToQueue('pool_data_queue', Buffer.from(message), {
      persistent: true
    });
    
    logger.info(`成功发布池数据到 RabbitMQ`);
  } catch (error) {
    logger.error('发布池数据到 RabbitMQ 失败', { error: error.message });
    throw error;
  }
}

// 创建 Meteora 池收集器
let meteoraCollector;
try {
  meteoraCollector = new MeteoraPoolCollector('https://api.mainnet-beta.solana.com', 'confirmed');
} catch (error) {
  logger.error('初始化 Meteora Pool Collector 失败', { error: error.message });
}

// 中间件
app.use(express.json());

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'data-service',
    rabbitmq: rabbitMQChannel ? 'connected' : 'disconnected'
  });
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

// 集成新的路由
app.use('/api/v1/meteora/pools', poolRoutes);
app.use('/api/v1/meteora/snapshots', snapshotRoutes);

// 错误处理中间件
app.use((err, req, res, next) => {
  logger.error('服务器错误', { error: err.message, stack: err.stack });
  res.status(500).json({
    status: 'error',
    message: '服务器内部错误'
  });
});

// 启动服务器和初始化 RabbitMQ
async function startServer() {
  try {
    // 连接到数据库
    await connectToDatabase();
    
    // 连接到RabbitMQ
    await initializeRabbitMQ();
    
    app.listen(port, () => {
      logger.info(`数据服务已启动，监听端口 ${port}`);
      
      // 启动数据收集任务
      logger.info(`启动Meteora数据收集任务，间隔: ${DATA_COLLECTION_INTERVAL}ms`);
      
      // 启动新的数据收集和快照生成任务
      dataCollectionTask = startDataCollectionTask(DATA_COLLECTION_INTERVAL);
      
      // 立即执行一次数据收集
      meteoraCollector.getAllPools()
        .then(pools => {
          return publishPoolData(pools);
        })
        .catch(error => {
          logger.error('初始数据收集失败', { error: error.message });
        });
      
      // 设置定期更新
      setInterval(() => {
        meteoraCollector.getAllPools()
          .then(pools => {
            return publishPoolData(pools);
          })
          .catch(error => {
            logger.error('定期数据收集失败', { error: error.message });
          });
      }, DATA_COLLECTION_INTERVAL);
    });
  } catch (error) {
    logger.error('服务启动失败', { error: error.message });
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGTERM', async () => {
  try {
    // 停止数据收集任务
    if (dataCollectionTask) {
      dataCollectionTask.stop();
    }
    
    // 关闭RabbitMQ连接
    if (rabbitMQChannel) {
      await rabbitMQChannel.close();
    }
    if (rabbitMQConnection) {
      await rabbitMQConnection.close();
    }
    
    // 关闭数据库连接
    await closeDatabaseConnection();
    
    process.exit(0);
  } catch (error) {
    logger.error('关闭服务失败', { error: error.message });
    process.exit(1);
  }
});

// 处理SIGINT信号
process.on('SIGINT', async () => {
  try {
    // 停止数据收集任务
    if (dataCollectionTask) {
      dataCollectionTask.stop();
    }
    
    // 关闭RabbitMQ连接
    if (rabbitMQChannel) {
      await rabbitMQChannel.close();
    }
    if (rabbitMQConnection) {
      await rabbitMQConnection.close();
    }
    
    // 关闭数据库连接
    await closeDatabaseConnection();
    
    process.exit(0);
  } catch (error) {
    logger.error('关闭服务失败', { error: error.message });
    process.exit(1);
  }
});

startServer(); 