import { Request, Response, NextFunction } from 'express';

export interface Logger {
  debug: jest.Mock;
  info: jest.Mock;
  warn: jest.Mock;
  error: jest.Mock;
}

export const createLogger = jest.fn().mockImplementation(() => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

export const metricsRegistry = {
  contentType: 'text/plain',
  metrics: jest.fn().mockResolvedValue('mock_metrics_data'),
  register: jest.fn(),
  increment: jest.fn(),
  decrement: jest.fn(),
  set: jest.fn(),
  startTimer: jest.fn().mockReturnValue(jest.fn()),
};

export const createMetricsMiddleware = jest.fn().mockImplementation(() => {
  return (_req: Request, _res: Response, next: NextFunction) => next();
});

export const createErrorLoggingMiddleware = jest.fn().mockImplementation(() => {
  return (err: Error, _req: Request, _res: Response, next: NextFunction) => next(err);
});
