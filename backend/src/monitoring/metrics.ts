import { Registry, Counter, Histogram, Gauge } from 'prom-client';
import { Request, Response, NextFunction } from 'express';
import config from '../config';

// 创建指标注册表
const register = new Registry();

// HTTP请求指标
const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5],
});

// 错误计数指标
const errorCounter = new Counter({
  name: 'error_total',
  help: 'Total number of errors',
  labelNames: ['type', 'code'],
});

// 内存使用指标
const memoryUsage = new Gauge({
  name: 'node_memory_usage_bytes',
  help: 'Memory usage in bytes',
  labelNames: ['type'],
});

// 注册指标
register.registerMetric(httpRequestDuration);
register.registerMetric(errorCounter);
register.registerMetric(memoryUsage);

// 请求监控中间件
export const requestMetrics = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode.toString())
      .observe(duration);
  });
  next();
};

// 错误监控中间件
export const errorMetrics = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof Error) {
    errorCounter.inc({ type: err.name, code: 'unknown' });
  }
  next(err);
};

// 内存监控
export const updateMemoryMetrics = () => {
  const usage = process.memoryUsage();
  Object.entries(usage).forEach(([type, value]) => {
    memoryUsage.set({ type }, value);
  });
};

// 获取指标
export const getMetrics = async () => {
  if (config.monitoring.metrics?.enabled) {
    return await register.metrics();
  }
  return '';
};

// 启动定期更新
if (config.monitoring.metrics?.enabled) {
  setInterval(updateMemoryMetrics, 60000); // 每分钟更新一次
} 