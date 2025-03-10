import express from 'express';
import { createApiRoutes } from '../../src/routes/api';

// Mock the @liqpro/monitoring module
jest.mock('@liqpro/monitoring', () => ({
  createLogger: jest.fn().mockReturnValue({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  })
}));

// Mock the DataController
const mockDataController = {
  trackPool: jest.fn().mockResolvedValue(undefined),
  untrackPool: jest.fn().mockResolvedValue(undefined),
  getTrackedPools: jest.fn().mockResolvedValue([]),
  getAggregatedData: jest.fn().mockResolvedValue([]),
  getRawData: jest.fn().mockResolvedValue([]),
  getLatestDataPoint: jest.fn().mockResolvedValue(null),
  getWhaleActivities: jest.fn().mockResolvedValue([]),
  getStorageStats: jest.fn().mockResolvedValue({}),
  subscribeToPoolUpdates: jest.fn().mockReturnValue({ unsubscribe: jest.fn() })
};

describe('API Routes', () => {
  let router;
  
  beforeEach(() => {
    router = createApiRoutes(mockDataController as any);
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  test('should create router', () => {
    expect(router).toBeDefined();
    expect(typeof router).toBe('function');
  });
}); 