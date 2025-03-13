#!/bin/bash

# 创建RabbitMQ集成文件
cat > rabbitmq-integration.js << 'EOL'
/**
 * RabbitMQ集成模块
 * 
 * 负责将数据发送到RabbitMQ消息队列
 */

const amqp = require('amqplib');
const logger = require('./src/utils/logger');

class RabbitMQPublisher {
  constructor(config) {
    this.config = {
      host: config.host || 'rabbitmq',
      port: config.port || 5672,
      username: config.username || 'liqpro',
      password: config.password || 'liqpro',
      poolDataQueue: config.poolDataQueue || 'pool_data_queue',
      reconnectInterval: config.reconnectInterval || 5000,
      ...config
    };
    
    this.connection = null;
    this.channel = null;
    this.isConnecting = false;
    this.connectionRetries = 0;
    this.maxRetries = 10;
  }
  
  /**
   * 连接到RabbitMQ
   */
  async connect() {
    if (this.isConnecting) {
      return;
    }
    
    this.isConnecting = true;
    
    try {
      // 构建连接URL
      const connectionUrl = `amqp://${this.config.username}:${this.config.password}@${this.config.host}:${this.config.port}`;
      logger.info(`正在连接到RabbitMQ: amqp://${this.config.username}:***@${this.config.host}:${this.config.port}`);
      
      // 创建连接
      this.connection = await amqp.connect(connectionUrl);
      logger.info('RabbitMQ连接成功');
      
      // 重置重试计数
      this.connectionRetries = 0;
      
      // 处理连接关闭
      this.connection.on('close', () => {
        logger.warn('RabbitMQ连接已关闭，尝试重新连接...');
        this.connection = null;
        this.channel = null;
        
        // 延迟重连
        setTimeout(() => {
          this.isConnecting = false;
          this.connect();
        }, this.config.reconnectInterval);
      });
      
      // 处理错误
      this.connection.on('error', (err) => {
        logger.error('RabbitMQ连接错误', { error: err.message });
        
        if (this.connection) {
          try {
            this.connection.close();
          } catch (closeErr) {
            logger.error('关闭RabbitMQ连接时出错', { error: closeErr.message });
          }
        }
        
        this.connection = null;
        this.channel = null;
        
        // 延迟重连
        setTimeout(() => {
          this.isConnecting = false;
          this.connect();
        }, this.config.reconnectInterval);
      });
      
      // 创建通道
      this.channel = await this.connection.createChannel();
      logger.info('RabbitMQ通道创建成功');
      
      // 确保队列存在
      await this.channel.assertQueue(this.config.poolDataQueue, { durable: true });
      logger.info(`队列 ${this.config.poolDataQueue} 已确认`);
      
      this.isConnecting = false;
    } catch (error) {
      this.connectionRetries++;
      logger.error('RabbitMQ连接失败', { 
        error: error.message, 
        retries: this.connectionRetries,
        maxRetries: this.maxRetries
      });
      
      this.connection = null;
      this.channel = null;
      
      // 如果重试次数超过最大值，停止重试
      if (this.connectionRetries >= this.maxRetries) {
        logger.error(`RabbitMQ连接失败次数超过最大值(${this.maxRetries})，停止重试`);
        this.isConnecting = false;
        return;
      }
      
      // 延迟重连
      setTimeout(() => {
        this.isConnecting = false;
        this.connect();
      }, this.config.reconnectInterval);
    }
  }
  
  /**
   * 发布池数据到队列
   * @param {Object} poolData 池数据
   */
  async publishPoolData(poolData) {
    try {
      // 如果没有连接或通道，尝试连接
      if (!this.connection || !this.channel) {
        await this.connect();
        
        // 如果连接失败，记录错误并返回
        if (!this.connection || !this.channel) {
          logger.error('无法发布池数据，RabbitMQ未连接');
          return false;
        }
      }
      
      // 发布消息
      const message = JSON.stringify(poolData);
      const result = this.channel.publish('', this.config.poolDataQueue, Buffer.from(message));
      
      if (result) {
        logger.info(`池数据已发布到 ${this.config.poolDataQueue} 队列`, { 
          poolId: poolData.poolId || poolData.address,
          messageSize: message.length
        });
        return true;
      } else {
        logger.warn('发布池数据失败，通道已满或已关闭');
        return false;
      }
    } catch (error) {
      logger.error('发布池数据时出错', { error: error.message });
      
      // 重置连接和通道
      this.connection = null;
      this.channel = null;
      
      return false;
    }
  }
  
  /**
   * 关闭连接
   */
  async close() {
    try {
      if (this.channel) {
        await this.channel.close();
        logger.info('RabbitMQ通道已关闭');
      }
      
      if (this.connection) {
        await this.connection.close();
        logger.info('RabbitMQ连接已关闭');
      }
    } catch (error) {
      logger.error('关闭RabbitMQ连接时出错', { error: error.message });
    } finally {
      this.channel = null;
      this.connection = null;
    }
  }
}

module.exports = { RabbitMQPublisher };
EOL

# 创建更新后的server.js文件
cat > server-with-rabbitmq.js << 'EOL'
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
EOL

# 创建更新后的package.json文件
cat > package-with-rabbitmq.json << 'EOL'
{
  "name": "data-service",
  "version": "1.0.0",
  "description": "LiqPro Data Service",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "@meteora-ag/dlmm": "^1.3.15",
    "@solana/web3.js": "^1.98.0",
    "amqplib": "^0.10.3",
    "axios": "^1.8.3",
    "express": "^4.21.2",
    "winston": "^3.17.0"
  },
  "devDependencies": {
    "@types/amqplib": "^0.8.2",
    "@types/express": "^5.0.0",
    "@types/jest": "^29.5.14",
    "@types/node": "^22.13.10"
  }
}
EOL

# 创建.env文件
cat > data-service-env << 'EOL'
PORT=3000
NODE_ENV=production
LOG_LEVEL=info
RABBITMQ_HOST=rabbitmq
RABBITMQ_PORT=5672
RABBITMQ_USER=liqpro
RABBITMQ_PASS=liqpro
EOL

echo "RabbitMQ集成文件已创建" 