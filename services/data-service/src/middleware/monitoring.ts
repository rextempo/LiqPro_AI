import { Request, Response, NextFunction } from 'express';
import { httpRequestDuration, httpRequestTotal, logger } from '../config/monitoring';

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  // Record metrics after response
  res.on('finish', () => {
    const duration = Date.now() - start;
    const labels = {
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode.toString(),
    };

    // Record request duration
    httpRequestDuration.observe(labels, duration / 1000);

    // Increment request counter
    httpRequestTotal.inc(labels);

    // Log request details
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

// Error logging middleware
export const errorLoggingMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
