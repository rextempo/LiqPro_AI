/**
 * 评分服务入口文件
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const dotenv = require('dotenv');
const logger = require('./src/utils/logger');
const ScoringController = require('./src/controllers/scoring-controller');
const { createApiRoutes } = require('./src/routes/api');

// 加载环境变量
dotenv.config();

// 创建Express应用
const app = express();
const port = process.env.PORT || 3000;

// 配置中间件
app.use(helmet()); // 安全头
app.use(cors()); // 跨域支持
app.use(compression()); // 响应压缩
app.use(express.json()); // JSON解析

// 配置评分服务
const config = {
  dataServiceUrl: process.env.DATA_SERVICE_URL || 'http://localhost:3001',
  signalServiceUrl: process.env.SIGNAL_SERVICE_URL || 'http://localhost:3002',
  scoringInterval: parseInt(process.env.SCORING_INTERVAL || '300000'), // 默认5分钟
  historyRetentionPeriod: parseInt(process.env.HISTORY_RETENTION_PERIOD || '86400000'), // 默认24小时
  riskThresholds: {
    extremelyLowRisk: parseFloat(process.env.THRESHOLD_EXTREMELY_LOW_RISK || '4.5'),
    lowRisk: parseFloat(process.env.THRESHOLD_LOW_RISK || '3.5'),
    mediumRisk: parseFloat(process.env.THRESHOLD_MEDIUM_RISK || '2.5'),
    highRisk: parseFloat(process.env.THRESHOLD_HIGH_RISK || '1.5'),
  },
  actionThresholds: {
    monitor: parseFloat(process.env.THRESHOLD_ACTION_MONITOR || '3.5'),
    rebalance: parseFloat(process.env.THRESHOLD_ACTION_REBALANCE || '3.0'),
    partialExit: parseFloat(process.env.THRESHOLD_ACTION_PARTIAL_EXIT || '2.5'),
    fullExit: parseFloat(process.env.THRESHOLD_ACTION_FULL_EXIT || '1.5'),
  },
};

// 初始化评分控制器
const scoringController = new ScoringController(config);

// 设置API路由
app.use('/api', createApiRoutes(scoringController));

// 根路由
app.get('/', (req, res) => {
  res.json({
    service: 'LiqPro Scoring Service',
    version: '1.0.0',
    status: 'running',
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  logger.error(`服务器错误: ${err.message}`);
  res.status(500).json({
    status: 'error',
    message: '服务器内部错误',
  });
});

// 启动服务
app.listen(port, async () => {
  logger.info(`评分服务监听端口 http://localhost:${port}`);
  
  try {
    // 启动评分控制器
    await scoringController.start();
    logger.info('评分控制器启动成功');
  } catch (error) {
    logger.error(`启动评分控制器失败: ${error.message}`);
  }
});

// 处理进程终止信号
process.on('SIGTERM', () => {
  logger.info('收到SIGTERM信号，正在关闭服务...');
  scoringController.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('收到SIGINT信号，正在关闭服务...');
  scoringController.stop();
  process.exit(0);
}); 