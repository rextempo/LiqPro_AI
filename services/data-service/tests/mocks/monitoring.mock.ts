/**
 * Mock implementation of the @liqpro/monitoring module
 */
import { Request, Response, NextFunction } from 'express';

export const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

export const mockMetricsRegistry = {
  contentType: 'text/plain',
  metrics: jest.fn().mockResolvedValue('mock_metrics_data'),
  register: jest.fn(),
  increment: jest.fn(),
  decrement: jest.fn(),
  set: jest.fn(),
  startTimer: jest.fn().mockReturnValue(jest.fn())
};

export const createLogger = jest.fn().mockReturnValue(mockLogger);
export const createMetricsMiddleware = jest.fn().mockReturnValue(
  (req: Request, res: Response, next: NextFunction) => next()
);
export const createErrorLoggingMiddleware = jest.fn().mockReturnValue(
  (err: Error, req: Request, res: Response, next: NextFunction) => {
    res.status(500).json({ error: 'Internal Server Error' });
  }
); 