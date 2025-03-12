import client from 'prom-client';
import { Request, Response, NextFunction } from 'express';
import { createLogger } from './logger';

const logger = createLogger('Metrics');

// 创建一个注册表来注册指标
export const register = new client.Registry();

// 添加默认指标（进程、GC 等）
client.collectDefaultMetrics({ register });

// HTTP 请求计数器
export const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

// HTTP 请求持续时间直方图
export const httpRequestDurationSeconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
  registers: [register]
});

// 消息队列指标
export const mqConnectionStatus = new client.Gauge({
  name: 'mq_connection_status',
  help: 'Status of the RabbitMQ connection (1 = connected, 0 = disconnected)',
  registers: [register]
});

export const mqMessagesPublishedTotal = new client.Counter({
  name: 'mq_messages_published_total',
  help: 'Total number of messages published to RabbitMQ',
  labelNames: ['exchange', 'routing_key'],
  registers: [register]
});

export const mqMessagesConsumedTotal = new client.Counter({
  name: 'mq_messages_consumed_total',
  help: 'Total number of messages consumed from RabbitMQ',
  labelNames: ['queue', 'event_type'],
  registers: [register]
});

export const mqMessageProcessingDurationSeconds = new client.Histogram({
  name: 'mq_message_processing_duration_seconds',
  help: 'Duration of message processing in seconds',
  labelNames: ['queue', 'event_type'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
  registers: [register]
});

export const mqMessageProcessingErrorsTotal = new client.Counter({
  name: 'mq_message_processing_errors_total',
  help: 'Total number of errors during message processing',
  labelNames: ['queue', 'event_type', 'error_type'],
  registers: [register]
});

// 代理指标
export const agentsTotal = new client.Gauge({
  name: 'agents_total',
  help: 'Total number of agents',
  labelNames: ['status'],
  registers: [register]
});

export const agentOperationsTotal = new client.Counter({
  name: 'agent_operations_total',
  help: 'Total number of agent operations',
  labelNames: ['operation', 'status'],
  registers: [register]
});

export const agentOperationDurationSeconds = new client.Histogram({
  name: 'agent_operation_duration_seconds',
  help: 'Duration of agent operations in seconds',
  labelNames: ['operation'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 30, 60],
  registers: [register]
});

// 系统健康指标
export const systemHealthStatus = new client.Gauge({
  name: 'system_health_status',
  help: 'Health status of system components (1 = healthy, 0 = unhealthy)',
  labelNames: ['component'],
  registers: [register]
});

// 创建 Express 中间件来收集 HTTP 指标
export function metricsMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // 排除 /metrics 端点，避免自引用
    if (req.path === '/metrics') {
      return next();
    }
    
    // 记录请求开始时间
    const start = Date.now();
    
    // 处理响应完成事件
    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000;
      
      // 规范化路由路径，替换 ID 为参数
      const route = req.route ? req.baseUrl + req.route.path : req.path;
      const normalizedRoute = route.replace(/\/[0-9a-f]{24}|\/[0-9]+/g, '/:id');
      
      // 增加请求计数
      httpRequestsTotal.inc({
        method: req.method,
        route: normalizedRoute,
        status_code: res.statusCode
      });
      
      // 记录请求持续时间
      httpRequestDurationSeconds.observe(
        {
          method: req.method,
          route: normalizedRoute,
          status_code: res.statusCode
        },
        duration
      );
    });
    
    next();
  };
}

// 创建 Prometheus 指标端点
export function setupMetricsEndpoint(app: any) {
  app.get('/metrics', async (req: Request, res: Response) => {
    try {
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
    } catch (error) {
      logger.error('Error generating metrics', { error });
      res.status(500).end();
    }
  });
  
  logger.info('Metrics endpoint set up at /metrics');
}

// 重置所有指标（主要用于测试）
export function resetMetrics() {
  register.resetMetrics();
  logger.info('All metrics have been reset');
}

// 导出注册表和所有指标
export default {
  register,
  httpRequestsTotal,
  httpRequestDurationSeconds,
  mqConnectionStatus,
  mqMessagesPublishedTotal,
  mqMessagesConsumedTotal,
  mqMessageProcessingDurationSeconds,
  mqMessageProcessingErrorsTotal,
  agentsTotal,
  agentOperationsTotal,
  agentOperationDurationSeconds,
  systemHealthStatus,
  metricsMiddleware,
  setupMetricsEndpoint,
  resetMetrics
}; 