import request from 'supertest';
import { Request, Response, NextFunction } from 'express';
import app from '../src/app';

// Mock the @liqpro/monitoring module
jest.mock('@liqpro/monitoring', () => {
  return {
    createLogger: jest.fn().mockReturnValue({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }),
    metricsRegistry: {
      contentType: 'text/plain',
      metrics: jest.fn().mockResolvedValue('mock_metrics_data'),
    },
    createMetricsMiddleware: jest
      .fn()
      .mockReturnValue((req: Request, res: Response, next: NextFunction) => next()),
    createErrorLoggingMiddleware: jest
      .fn()
      .mockReturnValue((err: Error, req: Request, res: Response, next: NextFunction) => next(err)),
  };
});

// Mock the DataController
jest.mock('../src/controllers/data-controller', () => {
  return {
    DataController: jest.fn().mockImplementation(() => ({
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn(),
      trackPool: jest.fn().mockResolvedValue(undefined),
      untrackPool: jest.fn().mockResolvedValue(undefined),
      getTrackedPools: jest.fn().mockResolvedValue([]),
      getAggregatedData: jest.fn().mockResolvedValue([]),
      getRawData: jest.fn().mockResolvedValue([]),
      getLatestDataPoint: jest.fn().mockResolvedValue(null),
      getWhaleActivities: jest.fn().mockResolvedValue([]),
      getStorageStats: jest.fn().mockResolvedValue({}),
      subscribeToPoolUpdates: jest.fn().mockReturnValue({ unsubscribe: jest.fn() }),
    })),
  };
});

describe('App', () => {
  describe('Health check endpoint', () => {
    test('GET /health should return 200 OK', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
  });

  describe('Metrics endpoint', () => {
    test('GET /metrics should return metrics data', async () => {
      const response = await request(app).get('/metrics');

      expect(response.status).toBe(200);
      expect(response.text).toBe('mock_metrics_data');
    });
  });

  describe('API routes', () => {
    test('GET /api/health should return 200 OK', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
  });

  describe('Error handling', () => {
    test('GET /non-existent-route should return 404', async () => {
      const response = await request(app).get('/non-existent-route');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Not found');
    });
  });
});
