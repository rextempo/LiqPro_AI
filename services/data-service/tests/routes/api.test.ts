import express, { Request, Response } from 'express';
import request from 'supertest';
import { createApiRoutes } from '../../src/routes/api';
import { DataController, PoolData, WhaleActivity } from '../../src/controllers/data-controller';

// Mock the @liqpro/monitoring module
jest.mock('@liqpro/monitoring', () => {
  return {
    createLogger: jest.fn().mockReturnValue({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    })
  };
});

// Mock the DataController
const mockDataController = {
  trackPool: jest.fn().mockResolvedValue(undefined),
  untrackPool: jest.fn().mockResolvedValue(undefined),
  getTrackedPools: jest.fn().mockResolvedValue([
    { address: 'pool-1', name: 'Pool 1', description: 'Test pool 1' },
    { address: 'pool-2', name: 'Pool 2', description: 'Test pool 2' }
  ]),
  getAggregatedData: jest.fn().mockResolvedValue([
    { timestamp: Date.now(), value: 100 },
    { timestamp: Date.now() - 3600000, value: 90 }
  ]),
  getRawData: jest.fn().mockResolvedValue([
    { poolAddress: 'pool-1', timestamp: Date.now(), tokenX: {}, tokenY: {}, liquidity: 1000 } as unknown as PoolData
  ]),
  getLatestDataPoint: jest.fn().mockResolvedValue({
    poolAddress: 'pool-1',
    timestamp: Date.now(),
    tokenX: { mint: 'token-x', symbol: 'TX', decimals: 9, price: 1.5, reserve: 1000 },
    tokenY: { mint: 'token-y', symbol: 'TY', decimals: 6, price: 0.5, reserve: 2000 },
    liquidity: 2500,
    volume24h: 5000,
    fees24h: 15,
    apy: 12.5,
    tvl: 3500,
    priceRatio: 3
  } as PoolData),
  getWhaleActivities: jest.fn().mockResolvedValue([
    {
      id: 'whale-1',
      poolAddress: 'pool-1',
      timestamp: Date.now(),
      type: 'swap',
      tokenX: { mint: 'token-x', symbol: 'TX', amount: 1000, valueUSD: 1500 },
      tokenY: { mint: 'token-y', symbol: 'TY', amount: 3000, valueUSD: 1500 },
      totalValueUSD: 3000,
      percentOfPool: 10,
      walletAddress: 'wallet-1'
    } as WhaleActivity
  ]),
  getStorageStats: jest.fn().mockResolvedValue({
    hotDataSize: 1024,
    warmDataSize: 4096,
    coldDataSize: 8192,
    totalDataPoints: 1000,
    poolCount: 2,
    oldestDataTimestamp: Date.now() - 90 * 24 * 60 * 60 * 1000,
    newestDataTimestamp: Date.now()
  }),
  subscribeToPoolUpdates: jest.fn().mockReturnValue({
    unsubscribe: jest.fn()
  })
} as unknown as DataController;

describe('API Routes', () => {
  let app: express.Application;
  
  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api', createApiRoutes(mockDataController));
    
    // Reset mock function calls
    jest.clearAllMocks();
  });
  
  describe('Health check endpoint', () => {
    test('GET /api/health should return 200 OK', async () => {
      const response = await request(app).get('/api/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
  });
  
  describe('Pool management endpoints', () => {
    test('POST /api/pools/track should track a pool', async () => {
      const response = await request(app)
        .post('/api/pools/track')
        .send({
          poolAddress: 'new-pool',
          name: 'New Pool',
          description: 'A new test pool'
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Pool tracking started'
      });
      expect(mockDataController.trackPool).toHaveBeenCalledWith(
        'new-pool', 'New Pool', 'A new test pool'
      );
    });
    
    test('POST /api/pools/track should return 400 if poolAddress is missing', async () => {
      const response = await request(app)
        .post('/api/pools/track')
        .send({
          name: 'New Pool',
          description: 'A new test pool'
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Missing required parameter: poolAddress'
      });
      expect(mockDataController.trackPool).not.toHaveBeenCalled();
    });
    
    test('DELETE /api/pools/untrack/:poolAddress should untrack a pool', async () => {
      const response = await request(app)
        .delete('/api/pools/untrack/pool-1');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Pool tracking stopped'
      });
      expect(mockDataController.untrackPool).toHaveBeenCalledWith('pool-1');
    });
    
    test('GET /api/pools should return tracked pools', async () => {
      const response = await request(app).get('/api/pools');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        { address: 'pool-1', name: 'Pool 1', description: 'Test pool 1' },
        { address: 'pool-2', name: 'Pool 2', description: 'Test pool 2' }
      ]);
      expect(mockDataController.getTrackedPools).toHaveBeenCalled();
    });
  });
  
  describe('Data retrieval endpoints', () => {
    test('GET /api/data/aggregated/:poolAddress should return aggregated data', async () => {
      const response = await request(app)
        .get('/api/data/aggregated/pool-1')
        .query({ timeframe: '1h', resolution: '100' });
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(mockDataController.getAggregatedData).toHaveBeenCalledWith(
        'pool-1', '1h', '100'
      );
    });
    
    test('GET /api/data/raw/:poolAddress should return raw data', async () => {
      const startTime = Date.now() - 24 * 60 * 60 * 1000;
      const endTime = Date.now();
      const limit = 100;
      
      const response = await request(app)
        .get('/api/data/raw/pool-1')
        .query({
          startTime: startTime.toString(),
          endTime: endTime.toString(),
          limit: limit.toString()
        });
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(mockDataController.getRawData).toHaveBeenCalledWith(
        'pool-1', startTime, endTime, limit
      );
    });
    
    test('GET /api/data/latest/:poolAddress should return latest data point', async () => {
      const response = await request(app).get('/api/data/latest/pool-1');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('poolAddress', 'pool-1');
      expect(mockDataController.getLatestDataPoint).toHaveBeenCalledWith('pool-1');
    });
    
    test('GET /api/data/latest/:poolAddress should return 404 if no data found', async () => {
      mockDataController.getLatestDataPoint = jest.fn().mockResolvedValue(null);
      
      const response = await request(app).get('/api/data/latest/non-existent-pool');
      
      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'No data found for pool' });
    });
  });
  
  describe('Whale activity endpoints', () => {
    test('GET /api/whales/activities should return whale activities', async () => {
      const response = await request(app).get('/api/whales/activities');
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(mockDataController.getWhaleActivities).toHaveBeenCalled();
    });
    
    test('GET /api/whales/activities should apply filters', async () => {
      const poolAddress = 'pool-1';
      const startTime = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const endTime = Date.now();
      const limit = 50;
      
      const response = await request(app)
        .get('/api/whales/activities')
        .query({
          poolAddress,
          startTime: startTime.toString(),
          endTime: endTime.toString(),
          limit: limit.toString()
        });
      
      expect(response.status).toBe(200);
      expect(mockDataController.getWhaleActivities).toHaveBeenCalledWith(
        poolAddress, startTime, endTime, limit
      );
    });
  });
  
  describe('Storage management endpoints', () => {
    test('GET /api/storage/stats should return storage statistics', async () => {
      const response = await request(app).get('/api/storage/stats');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('poolCount', 2);
      expect(mockDataController.getStorageStats).toHaveBeenCalled();
    });
  });
  
  describe('Error handling', () => {
    test('should handle errors in async handlers', async () => {
      mockDataController.getTrackedPools = jest.fn().mockRejectedValue(new Error('Test error'));
      
      const response = await request(app).get('/api/pools');
      
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Failed to get tracked pools');
    });
  });
}); 