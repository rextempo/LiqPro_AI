const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const http = require('http');
const WebSocket = require('ws');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const winston = require('winston');
const axios = require('axios');
const Redis = require('ioredis');

// 加载环境变量
dotenv.config();

// 创建日志记录器
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.colorize(),
    winston.format.printf(({ level, message, timestamp, ...metadata }) => {
      return `${timestamp} ${level}: ${message} ${Object.keys(metadata).length ? JSON.stringify(metadata) : ''}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// 创建 Redis 客户端
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  retryStrategy: (times) => Math.min(times * 50, 2000)
});

// 创建 Express 应用
const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(helmet());
app.use(compression());

// 创建 HTTP 服务器
const server = http.createServer(app);

// 创建 WebSocket 服务器
const wss = new WebSocket.Server({ server });

// 存储活跃的 WebSocket 连接
const clients = new Set();

// WebSocket 心跳检测
const heartbeat = (ws) => {
  ws.isAlive = true;
};

// 定期检查连接状态
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, process.env.WS_HEARTBEAT_INTERVAL || 30000);

// WebSocket 连接处理
wss.on('connection', (ws) => {
  clients.add(ws);
  ws.isAlive = true;
  logger.info('WebSocket 客户端已连接');
  
  // 发送欢迎消息
  ws.send(JSON.stringify({ type: 'welcome', message: 'Welcome to LiqPro API' }));
  
  // 心跳检测
  ws.on('pong', () => heartbeat(ws));
  
  // 处理消息
  ws.on('message', async (message) => {
    try {
      const { channel } = JSON.parse(message);
      let response;
      
      switch (channel) {
        case 'pools':
          response = await getPoolsData();
          break;
        case 'signals':
          // 直接从 MongoDB 获取信号数据
          const Signal = mongoose.model('Signal', new mongoose.Schema({}, { strict: false }), 'signals');
          const signals = await Signal.find()
            .sort({ analysis_timestamp: -1 })
            .limit(100);
          response = { signals };
          break;
      }
      ws.send(JSON.stringify({ type: channel, data: response }));
    } catch (error) {
      logger.error(`获取${channel}数据失败`, { error });
    }
  });
  
  // 处理关闭
  ws.on('close', () => {
    clients.delete(ws);
    logger.info('WebSocket 客户端已断开连接');
  });
});

// 处理订阅
async function handleSubscription(ws, data) {
  const { channel } = data;
  ws.subscriptions = ws.subscriptions || new Set();
  ws.subscriptions.add(channel);
  
  // 发送初始数据
  try {
    let response;
    switch (channel) {
      case 'pools':
        response = await getPoolsData();
        break;
      case 'signals':
        response = await getSignalsData();
        break;
    }
    ws.send(JSON.stringify({ type: channel, data: response }));
  } catch (error) {
    logger.error(`获取${channel}数据失败`, { error });
  }
}

// 处理取消订阅
function handleUnsubscription(ws, data) {
  const { channel } = data;
  if (ws.subscriptions) {
    ws.subscriptions.delete(channel);
  }
}

// 广播更新
function broadcast(type, data) {
  clients.forEach(client => {
    if (client.subscriptions && client.subscriptions.has(type)) {
      client.send(JSON.stringify({ type, data }));
    }
  });
}

// 缓存中间件
const cache = async (req, res, next) => {
  try {
    const { originalUrl } = req;
    const cachedResponse = await redis.get(originalUrl);
    
    if (cachedResponse) {
      return res.json(JSON.parse(cachedResponse));
    }
    
    next();
  } catch (error) {
    logger.error('缓存处理失败', { error });
    next();
  }
};

// API 路由
app.get('/api/pools', cache, async (req, res) => {
  try {
    const data = await getPoolsData();
    await redis.setex(req.originalUrl, process.env.CACHE_TTL || 300, JSON.stringify(data));
    res.status(200).json(data);
  } catch (error) {
    handleServiceError(res, error, 'pools');
  }
});

app.get('/api/signals', cache, async (req, res) => {
  try {
    // 直接从 MongoDB 获取信号数据
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;
    const offset = req.query.offset ? parseInt(req.query.offset) : 0;
    
    // 使用 mongoose 直接从 MongoDB 获取信号数据
    const Signal = mongoose.model('Signal', new mongoose.Schema({}, { strict: false }), 'signals');
    
    // 从数据库获取信号数据
    const signals = await Signal.find()
      .sort({ analysis_timestamp: -1 })
      .skip(offset)
      .limit(limit);
    
    const data = { signals };
    await redis.setex(req.originalUrl, process.env.CACHE_TTL || 300, JSON.stringify(data));
    res.status(200).json(data);
  } catch (error) {
    logger.error('获取信号数据失败', { error });
    handleServiceError(res, error, 'signals');
  }
});

// 获取特定 ID 的信号
app.get('/api/signals/:id', cache, async (req, res) => {
  try {
    const { id } = req.params;
    
    // 使用 mongoose 直接从 MongoDB 获取信号数据
    const Signal = mongoose.model('Signal', new mongoose.Schema({}, { strict: false }), 'signals');
    
    // 从数据库获取特定信号
    const signal = await Signal.findOne({ id });
    
    if (!signal) {
      return res.status(404).json({ 
        error: 'Signal not found',
        code: 'RESOURCE_NOT_FOUND'
      });
    }
    
    const data = { signal };
    await redis.setex(req.originalUrl, process.env.CACHE_TTL || 300, JSON.stringify(data));
    res.status(200).json(data);
  } catch (error) {
    logger.error('获取特定信号数据失败', { error });
    handleServiceError(res, error, 'signal');
  }
});

// 获取池数据
async function getPoolsData() {
  const dataServiceUrl = process.env.DATA_SERVICE_URL || 'http://data-service-real:3002';
  const response = await axios.get(`${dataServiceUrl}/api/meteora/pools`, {
    timeout: 5000,
    retry: 3,
    retryDelay: 1000
  });
  return response.data;
}

// 获取信号数据
async function getSignalsData() {
  try {
    // 使用 mongoose 直接从 MongoDB 获取信号数据
    const Signal = mongoose.model('Signal', new mongoose.Schema({}, { strict: false }), 'signals');
    
    // 从数据库获取信号数据
    const signals = await Signal.find()
      .sort({ analysis_timestamp: -1 })
      .limit(100);
    
    return { signals };
  } catch (error) {
    logger.error('获取信号数据失败', { error });
    throw error;
  }
}

// 错误处理
function handleServiceError(res, error, service) {
  logger.error(`获取${service}数据失败`, { error });
  
  const errorMessage = error.message || String(error);
  
  if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('connect ECONNREFUSED') || 
      errorMessage.includes('getaddrinfo') || errorMessage.includes('network error')) {
    res.status(503).json({ 
      error: `${service} service is currently unavailable`,
      code: 'SERVICE_UNAVAILABLE'
    });
  } else {
    res.status(500).json({ 
      error: `Failed to get ${service}`,
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
}

// 健康检查路由
app.get('/health', async (req, res) => {
  try {
    const services = {
      api: true,
      data: await checkServiceHealth(process.env.DATA_SERVICE_URL),
      signal: await checkServiceHealth(process.env.SIGNAL_SERVICE_URL),
      redis: redis.status === 'ready',
      mongodb: mongoose.connection.readyState === 1
    };
    
    const allHealthy = Object.values(services).every(Boolean);
    
    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'ok' : 'degraded',
      services
    });
  } catch (error) {
    logger.error('健康检查失败', { error });
    res.status(500).json({ status: 'error', error: error.message });
  }
});

// 检查服务健康状态
async function checkServiceHealth(url) {
  try {
    if (!url) return false;
    await axios.get(`${url}/health`, { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

// 启动服务器
const startServer = async () => {
  try {
    // 连接到 MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });
    logger.info('MongoDB 连接成功');
    
    // 启动 HTTP 服务器
    server.listen(PORT, () => {
      logger.info(`API 服务运行在端口 ${PORT}`);
    });
    
    // 设置定期健康检查
    setInterval(async () => {
      try {
        const poolsData = await getPoolsData();
        broadcast('pools', poolsData);
        
        const signalsData = await getSignalsData();
        broadcast('signals', signalsData);
      } catch (error) {
        logger.error('定期数据更新失败', { error });
      }
    }, process.env.HEALTH_CHECK_INTERVAL || 30000);
  } catch (error) {
    logger.error('服务器启动失败', { error });
    process.exit(1);
  }
};

// 优雅关闭
async function shutdown() {
  logger.info('正在关闭服务...');
  
  // 关闭 WebSocket 服务器
  clearInterval(interval);
  wss.close(() => {
    logger.info('WebSocket 服务器已关闭');
  });
  
  // 关闭 Redis 连接
  await redis.quit();
  logger.info('Redis 连接已关闭');
  
  // 关闭 MongoDB 连接
  await mongoose.connection.close();
  logger.info('MongoDB 连接已关闭');
  
  // 关闭 HTTP 服务器
  server.close(() => {
    logger.info('HTTP 服务器已关闭');
    process.exit(0);
  });
}

// 处理进程终止信号
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// 启动服务器
startServer();
