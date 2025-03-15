import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { json, urlencoded } from 'body-parser';
import { errorHandler } from './utils/errors';
import { requestLogger } from './utils/logger';
import config from './config';

const app = express();

// 基础中间件
app.use(helmet()); // 安全头
app.use(cors(config.security.cors)); // CORS配置
app.use(compression()); // 响应压缩
app.use(json()); // JSON解析
app.use(urlencoded({ extended: true })); // URL编码解析

// 请求日志
app.use(requestLogger);

// API路由
app.use('/api/v1/agents', require('./api/agents'));
app.use('/api/v1/auth', require('./api/auth'));
app.use('/api/v1/pools', require('./api/pools'));

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404处理
app.use((req, res, next) => {
  const error = new Error('Not Found') as any;
  error.status = 404;
  next(error);
});

// 错误处理中间件
app.use(errorHandler);

export default app; 