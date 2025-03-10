import { Registry, collectDefaultMetrics, Histogram, Counter } from 'prom-client';
import winston from 'winston';
import { ElasticsearchTransport } from 'winston-elasticsearch';
import { Request, Response, NextFunction } from 'express';

// Prometheus metrics setup
export const metricsRegistry = new Registry();
collectDefaultMetrics({ register: metricsRegistry });

// Custom metrics
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['service', 'method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [metricsRegistry],
});

export const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['service', 'method', 'route', 'status_code'],
  registers: [metricsRegistry],
});

// Create logger factory
export const createLogger = (serviceName: string) => {
  return winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    defaultMeta: { service: serviceName },
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
};

// Create metrics middleware factory
export const createMetricsMiddleware = (serviceName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      const labels = {
        service: serviceName,
        method: req.method,
        route: req.route?.path || req.path,
        status_code: res.statusCode.toString(),
      };

      httpRequestDuration.observe(labels, duration / 1000);
      httpRequestTotal.inc(labels);

      const logger = createLogger(serviceName);
      logger.info('HTTP Request', {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration: duration,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });
    });

    next();
  };
};

// Create error logging middleware factory
export const createErrorLoggingMiddleware = (serviceName: string) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return (err: Error, req: Request, _res: Response, next: NextFunction) => {
    const logger = createLogger(serviceName);
    logger.error('Error occurred', {
      error: {
        message: err.message,
        stack: err.stack,
      },
      request: {
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    next(err);
  };
}; 