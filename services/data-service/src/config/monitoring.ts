import { Registry, collectDefaultMetrics } from 'prom-client';
import winston from 'winston';
import { ElasticsearchTransport } from 'winston-elasticsearch';

// Prometheus metrics setup
export const metricsRegistry = new Registry();
collectDefaultMetrics({ register: metricsRegistry });

// Custom metrics
export const httpRequestDuration = new metricsRegistry.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5],
});

export const httpRequestTotal = new metricsRegistry.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

// Winston logger setup
export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'data-service' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    new ElasticsearchTransport({
      level: 'info',
      clientOpts: {
        node: 'http://elasticsearch:9200',
        maxRetries: 5,
        requestTimeout: 10000,
      },
      indexPrefix: 'liqpro-logs',
    }),
  ],
}); 