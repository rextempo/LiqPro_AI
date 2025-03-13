const express = require('express');
const mongoose = require('mongoose');
const amqp = require('amqplib');
const { v4: uuidv4 } = require('uuid');
const winston = require('winston');

// 创建日志记录器
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.colorize(),
    winston.format.printf(({ level, message, timestamp }) => {
      return `${timestamp} ${level}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// 在非生产环境下，添加控制台输出
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// 创建 Express 应用
const app = express();
const PORT = process.env.PORT || 3002;

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 健康检查路由
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'signal-service' });
});

// 信号存储
const signals = new Map();

// RabbitMQ 配置
const RABBITMQ_HOST = process.env.RABBITMQ_HOST || 'localhost';
const RABBITMQ_PORT = process.env.RABBITMQ_PORT || '5672';
const RABBITMQ_USER = process.env.RABBITMQ_USER || 'guest';
const RABBITMQ_PASS = process.env.RABBITMQ_PASS || 'guest';

// 队列名称
const POOL_DATA_QUEUE = 'pool_data_queue';
const SIGNAL_QUEUE = 'signal_queue';

// 连接 URL
const connectionURL = `amqp://${RABBITMQ_USER}:${RABBITMQ_PASS}@${RABBITMQ_HOST}:${RABBITMQ_PORT}`;

// 连接和通道
let connection = null;
let channel = null;

/**
 * 设置 RabbitMQ 连接和通道
 */
const setupRabbitMQ = async () => {
  try {
    logger.info('正在连接到 RabbitMQ...');
    
    // 创建连接
    connection = await amqp.connect(connectionURL);
    logger.info('RabbitMQ 连接成功');
    
    // 处理连接关闭
    connection.on('close', () => {
      logger.warn('RabbitMQ 连接已关闭，尝试重新连接...');
      setTimeout(setupRabbitMQ, 5000);
    });
    
    // 创建通道
    channel = await connection.createChannel();
    logger.info('RabbitMQ 通道创建成功');
    
    // 确保队列存在
    await channel.assertQueue(POOL_DATA_QUEUE, { durable: true });
    await channel.assertQueue(SIGNAL_QUEUE, { durable: true });
    logger.info(`队列 ${POOL_DATA_QUEUE} 和 ${SIGNAL_QUEUE} 已确认`);
    
    // 设置消费者
    await setupConsumers();
    
    logger.info('RabbitMQ 设置完成');
    return true;
  } catch (error) {
    logger.error('RabbitMQ 设置失败:', error);
    return false;
  }
};

/**
 * 设置消息消费者
 */
const setupConsumers = async () => {
  if (!channel) {
    throw new Error('RabbitMQ 通道未初始化');
  }
  
  // 消费池数据队列
  channel.consume(POOL_DATA_QUEUE, async (msg) => {
    if (msg) {
      try {
        const content = msg.content.toString();
        logger.info(`收到池数据消息: ${content.substring(0, 100)}...`);
        
        // 处理池数据
        await processPoolData(JSON.parse(content));
        
        // 确认消息
        channel.ack(msg);
      } catch (error) {
        logger.error('处理池数据消息失败:', error);
        // 拒绝消息并重新排队
        channel.nack(msg, false, true);
      }
    }
  });
  
  logger.info(`已设置 ${POOL_DATA_QUEUE} 队列的消费者`);
};

/**
 * 发布信号到队列
 */
const publishSignal = async (signal) => {
  if (!channel) {
    logger.warn('RabbitMQ 通道未初始化，无法发布信号');
    return;
  }
  
  try {
    const message = JSON.stringify(signal);
    channel.publish('', SIGNAL_QUEUE, Buffer.from(message));
    logger.info(`信号已发布到 ${SIGNAL_QUEUE} 队列`);
  } catch (error) {
    logger.error('发布信号失败:', error);
  }
};

/**
 * 处理池数据并生成信号
 */
const processPoolData = async (poolData) => {
  try {
    logger.info(`处理池数据: ${poolData.poolId}`);
    
    // 生成信号
    const generatedSignals = await generateSignalsFromPoolData(poolData);
    
    // 存储和发布信号
    for (const signal of generatedSignals) {
      const signalId = uuidv4();
      const timestamp = new Date().toISOString();
      
      const newSignal = {
        id: signalId,
        timestamp,
        poolId: signal.poolId || '',
        tokenA: signal.tokenA || '',
        tokenB: signal.tokenB || '',
        action: signal.action || 'HOLD',
        confidence: signal.confidence || 0,
        price: signal.price,
        reason: signal.reason,
        metadata: signal.metadata
      };
      
      // 存储信号
      signals.set(signalId, newSignal);
      
      // 发布信号到队列
      await publishSignal(newSignal);
      
      logger.info(`信号已生成并发布: ${signalId}`);
    }
  } catch (error) {
    logger.error('处理池数据失败:', error);
  }
};

/**
 * 从池数据生成信号
 */
const generateSignalsFromPoolData = async (poolData) => {
  try {
    logger.info(`从池数据生成信号: ${poolData.poolId}`);
    
    const generatedSignals = [];
    
    // 简单的信号生成逻辑
    // 这里只是一个示例，实际应用中应该有更复杂的算法
    
    // 价格变化超过5%时生成信号
    if (Math.abs(poolData.priceChange24h) > 0.05) {
      const action = poolData.priceChange24h > 0 ? 'BUY' : 'SELL';
      const confidence = Math.min(Math.abs(poolData.priceChange24h) * 10, 1); // 0-1之间的置信度
      
      generatedSignals.push({
        poolId: poolData.poolId,
        tokenA: poolData.tokenA,
        tokenB: poolData.tokenB,
        action: action,
        confidence: confidence,
        price: poolData.price,
        reason: `价格24小时变化: ${(poolData.priceChange24h * 100).toFixed(2)}%`,
        metadata: {
          volume24h: poolData.volume24h,
          liquidity: poolData.liquidity
        }
      });
      
      logger.info(`为池 ${poolData.poolId} 生成了 ${action} 信号，置信度: ${confidence}`);
    } else {
      logger.info(`池 ${poolData.poolId} 的价格变化不足以生成信号`);
    }
    
    return generatedSignals;
  } catch (error) {
    logger.error('生成信号失败:', error);
    return [];
  }
};

// API 路由
app.get('/api/signals', async (req, res) => {
  try {
    const allSignals = Array.from(signals.values());
    res.status(200).json(allSignals);
  } catch (error) {
    logger.error('获取信号失败:', error);
    res.status(500).json({ error: '获取信号失败' });
  }
});

app.get('/api/signals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const signal = signals.get(id);
    
    if (signal) {
      res.status(200).json(signal);
    } else {
      res.status(404).json({ error: '信号未找到' });
    }
  } catch (error) {
    logger.error('获取特定信号失败:', error);
    res.status(500).json({ error: '获取特定信号失败' });
  }
});

// 清理过期信号
const cleanupExpiredSignals = () => {
  const now = new Date();
  let cleanupCount = 0;
  
  signals.forEach((signal, id) => {
    const signalDate = new Date(signal.timestamp);
    const ageInHours = (now.getTime() - signalDate.getTime()) / (1000 * 60 * 60);
    
    // 删除超过24小时的信号
    if (ageInHours > 24) {
      signals.delete(id);
      cleanupCount++;
    }
  });
  
  if (cleanupCount > 0) {
    logger.info(`已清理 ${cleanupCount} 个过期信号`);
  }
};

// 设置定期清理过期信号的间隔
const cleanupInterval = setInterval(cleanupExpiredSignals, 3600000); // 每小时清理一次

// 连接到 MongoDB
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/liqpro';
    await mongoose.connect(mongoURI);
    logger.info('MongoDB 连接成功');
    return true;
  } catch (error) {
    logger.error('MongoDB 连接失败:', error);
    return false;
  }
};

// 启动服务器
const startServer = async () => {
  try {
    logger.info('信号服务启动中...');
    
    // 连接数据库
    const dbConnected = await connectDB();
    if (!dbConnected) {
      logger.warn('数据库连接失败，但服务将继续运行');
    }
    
    // 设置 RabbitMQ
    const rabbitConnected = await setupRabbitMQ();
    if (!rabbitConnected) {
      logger.warn('RabbitMQ 连接失败，但服务将继续运行');
    }
    
    // 启动 HTTP 服务器
    app.listen(PORT, () => {
      logger.info(`信号服务运行在端口 ${PORT}`);
    });
    
    logger.info('信号服务已启动');
  } catch (error) {
    logger.error('服务器启动失败:', error);
    process.exit(1);
  }
};

// 处理进程终止信号
process.on('SIGINT', async () => {
  logger.info('接收到 SIGINT 信号，正在关闭服务...');
  clearInterval(cleanupInterval);
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('接收到 SIGTERM 信号，正在关闭服务...');
  clearInterval(cleanupInterval);
  process.exit(0);
});

// 启动服务器
startServer(); 