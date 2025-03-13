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

// 加载环境变量
dotenv.config();

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

// WebSocket 连接处理
wss.on('connection', (ws) => {
  logger.info('WebSocket 客户端已连接');
  
  // 发送欢迎消息
  ws.send(JSON.stringify({ type: 'welcome', message: 'Welcome to LiqPro API' }));
  
  // 处理消息
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      logger.info('收到 WebSocket 消息', { data });
      
      // 处理不同类型的消息
      switch (data.type) {
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
          break;
        default:
          ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
      }
    } catch (error) {
      logger.error('处理 WebSocket 消息时出错', { error });
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  });
  
  // 处理关闭
  ws.on('close', () => {
    logger.info('WebSocket 客户端已断开连接');
  });
});

// 健康检查路由
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'api-service' });
});

// API 路由
app.get('/api/pools', async (req, res) => {
  try {
    const dataServiceUrl = process.env.DATA_SERVICE_URL || 'http://data-service:3001';
    const response = await axios.get(`${dataServiceUrl}/pools`);
    res.status(200).json(response.data);
  } catch (error) {
    logger.error('获取池数据失败', { error });
    
    const errorMessage = error.message || String(error);
    
    if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('connect ECONNREFUSED') || 
        errorMessage.includes('getaddrinfo') || errorMessage.includes('network error')) {
      res.status(503).json({ 
        error: 'Data service is currently unavailable',
        code: 'SERVICE_UNAVAILABLE'
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to get pools',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  }
});

app.get('/api/signals', async (req, res) => {
  try {
    const signalServiceUrl = process.env.SIGNAL_SERVICE_URL || 'http://signal-service:3002';
    const response = await axios.get(`${signalServiceUrl}/api/signals`);
    res.status(200).json(response.data);
  } catch (error) {
    logger.error('获取信号数据失败', { error });
    
    const errorMessage = error.message || String(error);
    
    if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('connect ECONNREFUSED') || 
        errorMessage.includes('getaddrinfo') || errorMessage.includes('network error')) {
      res.status(503).json({ 
        error: 'Signal service is currently unavailable',
        code: 'SERVICE_UNAVAILABLE'
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to get signals',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  }
});

// 启动服务器
const startServer = async () => {
  try {
    // 连接到 MongoDB（如果需要）
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI);
      logger.info('MongoDB 连接成功');
    }
    
    // 启动 HTTP 服务器
    server.listen(PORT, () => {
      logger.info(`API 服务运行在端口 ${PORT}`);
    });
  } catch (error) {
    logger.error('服务器启动失败', { error });
    process.exit(1);
  }
};

// 处理进程终止信号
process.on('SIGINT', () => {
  logger.info('接收到 SIGINT 信号，正在关闭服务...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('接收到 SIGTERM 信号，正在关闭服务...');
  process.exit(0);
});

// 启动服务器
startServer();
