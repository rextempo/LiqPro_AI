import express from 'express';
import { config } from 'dotenv';
import mongoose from 'mongoose';
import { setupRabbitMQ } from './rabbitmq';
import { logger } from './logger';
import signalRoutes from './routes';
import { SignalController } from './controllers/signal-controller';

// 加载环境变量
config();

// 创建 Express 应用
const app = express();
const PORT = process.env.PORT || 3000;

// 初始化信号控制器
const signalController = new SignalController();

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 健康检查路由
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'signal-service' });
});

// API 路由
app.use('/api', signalRoutes);

// 连接到 MongoDB
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/liqpro';
    await mongoose.connect(mongoURI);
    logger.info('MongoDB 连接成功');
  } catch (error) {
    logger.error('MongoDB 连接失败:', error);
    process.exit(1);
  }
};

// 启动服务器
const startServer = async () => {
  try {
    logger.info('信号服务启动中...');
    
    // 连接数据库
    await connectDB();
    
    // 设置 RabbitMQ
    await setupRabbitMQ();
    
    // 启动信号控制器
    await signalController.start();
    
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
  signalController.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('接收到 SIGTERM 信号，正在关闭服务...');
  signalController.stop();
  process.exit(0);
});

// 启动服务器
startServer(); 