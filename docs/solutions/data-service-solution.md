# Data Service 修改方案

## 问题描述

Data Service 需要与 RabbitMQ 消息队列集成，以便将收集到的池数据发布到消息队列，供 Signal Service 消费和生成交易信号。

## 实施方案

### 1. 添加 RabbitMQ 集成

我们创建了一个 `rabbitmq-integration.js` 文件，实现了与 RabbitMQ 的集成：

```javascript
const amqp = require('amqplib');

/**
 * RabbitMQ 发布者类
 * 负责连接到 RabbitMQ 并发布消息
 */
class RabbitMQPublisher {
  constructor(config = {}) {
    this.host = config.host || 'rabbitmq';
    this.port = config.port || '5672';
    this.username = config.username || 'liqpro';
    this.password = config.password || 'liqpro';
    this.poolDataQueue = config.poolDataQueue || 'pool_data_queue';
    this.connection = null;
    this.channel = null;
    this.connectionUrl = `amqp://${this.username}:${this.password}@${this.host}:${this.port}`;
  }

  /**
   * 连接到 RabbitMQ
   */
  async connect() {
    try {
      console.log(`正在连接到 RabbitMQ: ${this.host}:${this.port}`);
      this.connection = await amqp.connect(this.connectionUrl);
      
      this.connection.on('error', (err) => {
        console.error('RabbitMQ 连接错误:', err);
        this.reconnect();
      });
      
      this.connection.on('close', () => {
        console.warn('RabbitMQ 连接已关闭，尝试重新连接...');
        this.reconnect();
      });
      
      this.channel = await this.connection.createChannel();
      await this.channel.assertQueue(this.poolDataQueue, { durable: true });
      
      console.log('RabbitMQ 连接成功');
      return true;
    } catch (error) {
      console.error('RabbitMQ 连接失败:', error);
      this.reconnect();
      return false;
    }
  }

  /**
   * 重新连接到 RabbitMQ
   */
  reconnect() {
    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        console.error('RabbitMQ 重新连接失败:', error);
      }
    }, 5000);
  }

  /**
   * 发布池数据到队列
   */
  async publishPoolData(poolData) {
    if (!this.channel) {
      console.warn('RabbitMQ 通道未初始化，无法发布池数据');
      await this.connect();
      if (!this.channel) {
        return false;
      }
    }
    
    try {
      const message = JSON.stringify(poolData);
      this.channel.sendToQueue(this.poolDataQueue, Buffer.from(message));
      console.log(`池数据已发布到 ${this.poolDataQueue} 队列`);
      return true;
    } catch (error) {
      console.error('发布池数据失败:', error);
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
      }
      if (this.connection) {
        await this.connection.close();
      }
      console.log('RabbitMQ 连接已关闭');
      return true;
    } catch (error) {
      console.error('关闭 RabbitMQ 连接失败:', error);
      return false;
    }
  }
}

module.exports = RabbitMQPublisher;
```

### 2. 修改 Server.js 文件

我们修改了 `server.js` 文件，集成了 RabbitMQ 发布者：

```javascript
// 引入 RabbitMQ 发布者
const RabbitMQPublisher = require('./rabbitmq-integration');

// 创建 RabbitMQ 发布者实例
const rabbitMQPublisher = new RabbitMQPublisher({
  host: process.env.RABBITMQ_HOST || 'rabbitmq',
  port: process.env.RABBITMQ_PORT || '5672',
  username: process.env.RABBITMQ_USER || 'liqpro',
  password: process.env.RABBITMQ_PASS || 'liqpro',
  poolDataQueue: 'pool_data_queue'
});

// 在服务器启动时连接到 RabbitMQ
const startServer = async () => {
  try {
    // 连接到 RabbitMQ
    const rabbitConnected = await rabbitMQPublisher.connect();
    if (!rabbitConnected) {
      console.warn('RabbitMQ 连接失败，但服务将继续运行');
    }
    
    // 启动服务器
    // ...
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
};
```

### 3. 添加测试端点

我们添加了一个测试端点，用于发布带有大价格变化的池数据，以触发信号生成：

```javascript
// 添加测试端点，用于发布带有大价格变化的池数据
app.post('/api/test/publish-pool-data-with-signal', async (req, res) => {
  try {
    const poolData = req.body;
    
    // 确保必要的字段存在
    if (!poolData.address || !poolData.tokenX || !poolData.tokenY || !poolData.price) {
      return res.status(400).json({ 
        success: false, 
        message: '缺少必要的池数据字段' 
      });
    }
    
    // 添加 tokenA 和 tokenB 字段，与 tokenX 和 tokenY 保持一致
    poolData.tokenA = poolData.tokenX;
    poolData.tokenB = poolData.tokenY;
    
    // 发布到 RabbitMQ
    const published = await rabbitMQPublisher.publishPoolData(poolData);
    
    if (published) {
      console.log('带有大价格变化的测试池数据已发布:', poolData);
      res.status(200).json({ 
        success: true, 
        message: '带有大价格变化的测试池数据已发布到RabbitMQ，应该会触发信号生成',
        data: poolData
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: '发布池数据失败，RabbitMQ 可能未连接' 
      });
    }
  } catch (error) {
    console.error('发布测试池数据失败:', error);
    res.status(500).json({ 
      success: false, 
      message: '发布测试池数据失败',
      error: error.message
    });
  }
});
```

### 4. 更新 package.json

我们更新了 `package.json` 文件，添加了 `amqplib` 依赖：

```json
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
    "@types/express": "^4.17.21",
    "jest": "^29.7.0",
    "@types/node": "^20.11.24"
  }
}
```

### 5. 添加环境变量配置

我们创建了一个 `.env` 文件，用于配置 RabbitMQ 连接参数：

```
RABBITMQ_HOST=rabbitmq
RABBITMQ_PORT=5672
RABBITMQ_USER=liqpro
RABBITMQ_PASS=liqpro
```

## 验证方法

1. 检查 RabbitMQ 连接：

```bash
docker logs data-service-real | grep "RabbitMQ 连接成功"
```

2. 发送测试池数据：

```bash
curl -X POST http://localhost:3005/api/test/publish-pool-data-with-signal -H "Content-Type: application/json" -d '{"address":"TEST123","tokenX":"SOL","tokenY":"USDC","feeRate":0.01,"price":25.5,"priceChange":0.25,"liquidity":1000000,"volume":500000,"timestamp":1621234567890}'
```

3. 检查 Signal Service 是否接收到数据并生成信号：

```bash
docker logs signal-service-fixed | grep "收到池数据消息"
curl http://localhost:3007/api/signals
```

## 注意事项

1. 当前实现是一个基本的集成，在生产环境中应该考虑以下改进：
   - 添加更多的错误处理和重试机制
   - 实现消息确认和持久化
   - 添加消息序列化和反序列化的验证
   - 实现消息的优先级和过期机制
   - 添加监控和告警机制

2. RabbitMQ 连接参数应该通过环境变量配置，而不是硬编码在代码中。

3. 在生产环境中，应该考虑使用 RabbitMQ 的集群模式，以提高可用性和可靠性。 