import { DataController } from '../../modules/data-controller';
import { PoolDataCollector } from '../../modules/collectors/pool-data-collector';
import { EventCollector } from '../../modules/collectors/event-collector';
import { MarketPriceCollector } from '../../modules/collectors/market-price-collector';
import { WhaleActivityCollector } from '../../modules/collectors/whale-activity-collector';
import { DataStorage } from '../../modules/storage/data-storage';
import { PoolData, PoolEvent, WhaleActivity, EventType } from '../../types/data-types';

// Mock all dependencies
jest.mock('../../modules/collectors/pool-data-collector');
jest.mock('../../modules/collectors/event-collector');
jest.mock('../../modules/collectors/market-price-collector');
jest.mock('../../modules/collectors/whale-activity-collector');
jest.mock('@liqpro/monitoring', () => ({
  createLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  }),
}));

describe('DataController', () => {
  let dataController: DataController;
  let mockStorage: jest.Mocked<DataStorage>;
  let mockPoolDataCollector: jest.Mocked<PoolDataCollector>;
  let mockEventCollector: jest.Mocked<EventCollector>;
  let mockMarketPriceCollector: jest.Mocked<MarketPriceCollector>;
  let mockWhaleActivityCollector: jest.Mocked<WhaleActivityCollector>;

  beforeEach(() => {
    // Create mock storage
    mockStorage = {
      storePoolData: jest.fn(),
      storePoolMetadata: jest.fn(),
      storeEvent: jest.fn(),
      storeTokenPrices: jest.fn(),
      storeTokenMetadata: jest.fn(),
      storeWhaleActivity: jest.fn(),
      getLatestPoolData: jest.fn(),
      getLatestTokenPrice: jest.fn(),
      getRawPoolData: jest.fn(),
      getAggregatedPoolData: jest.fn(),
      getWhaleActivities: jest.fn(),
      getStats: jest.fn(),
    } as unknown as jest.Mocked<DataStorage>;

    // Reset mocks
    (PoolDataCollector as jest.Mock).mockClear();
    (EventCollector as jest.Mock).mockClear();
    (MarketPriceCollector as jest.Mock).mockClear();
    (WhaleActivityCollector as jest.Mock).mockClear();

    // Setup mock implementations
    mockPoolDataCollector = {
      start: jest.fn(),
      stop: jest.fn(),
      trackPool: jest.fn(),
      untrackPool: jest.fn(),
      getTrackedPools: jest.fn().mockReturnValue(['pool1', 'pool2']),
    } as unknown as jest.Mocked<PoolDataCollector>;

    mockEventCollector = {
      start: jest.fn(),
      stop: jest.fn(),
      trackPool: jest.fn(),
      untrackPool: jest.fn(),
    } as unknown as jest.Mocked<EventCollector>;

    mockMarketPriceCollector = {
      start: jest.fn(),
      stop: jest.fn(),
      addToken: jest.fn(),
      removeToken: jest.fn(),
      getTrackedTokens: jest.fn().mockReturnValue(['token1', 'token2']),
    } as unknown as jest.Mocked<MarketPriceCollector>;

    mockWhaleActivityCollector = {
      start: jest.fn(),
      stop: jest.fn(),
      trackPool: jest.fn(),
      untrackPool: jest.fn(),
    } as unknown as jest.Mocked<WhaleActivityCollector>;

    // Setup constructor mocks
    (PoolDataCollector as jest.Mock).mockImplementation(() => mockPoolDataCollector);
    (EventCollector as jest.Mock).mockImplementation(() => mockEventCollector);
    (MarketPriceCollector as jest.Mock).mockImplementation(() => mockMarketPriceCollector);
    (WhaleActivityCollector as jest.Mock).mockImplementation(() => mockWhaleActivityCollector);

    // Create data controller
    dataController = new DataController({
      rpcEndpoint: 'https://api.mainnet-beta.solana.com',
      rpcCommitment: 'confirmed',
      meteoraProgramId: 'meteora123',
      collectionIntervals: {
        poolData: 60000,
        events: 30000,
        marketPrices: 300000,
      },
      whaleThresholds: {
        swapUsdValue: 10000,
        depositUsdValue: 50000,
        withdrawUsdValue: 50000,
      },
      storage: mockStorage,
    });
  });

  describe('Initialization', () => {
    test('should initialize all collectors', () => {
      expect(PoolDataCollector).toHaveBeenCalledTimes(1);
      expect(EventCollector).toHaveBeenCalledTimes(1);
      expect(MarketPriceCollector).toHaveBeenCalledTimes(1);
      expect(WhaleActivityCollector).toHaveBeenCalledTimes(1);
    });
  });

  describe('Start/Stop', () => {
    test('should start all collectors', async () => {
      await dataController.start();

      expect(mockMarketPriceCollector.start).toHaveBeenCalledTimes(1);
      expect(mockPoolDataCollector.start).toHaveBeenCalledTimes(1);
      expect(mockEventCollector.start).toHaveBeenCalledTimes(1);
      expect(mockWhaleActivityCollector.start).toHaveBeenCalledTimes(1);
    });

    test('should stop all collectors', () => {
      dataController.stop();

      expect(mockWhaleActivityCollector.stop).toHaveBeenCalledTimes(1);
      expect(mockEventCollector.stop).toHaveBeenCalledTimes(1);
      expect(mockPoolDataCollector.stop).toHaveBeenCalledTimes(1);
      expect(mockMarketPriceCollector.stop).toHaveBeenCalledTimes(1);
    });

    test('should not start collectors if already running', async () => {
      await dataController.start();
      await dataController.start(); // Second call should be ignored

      expect(mockMarketPriceCollector.start).toHaveBeenCalledTimes(1);
      expect(mockPoolDataCollector.start).toHaveBeenCalledTimes(1);
      expect(mockEventCollector.start).toHaveBeenCalledTimes(1);
      expect(mockWhaleActivityCollector.start).toHaveBeenCalledTimes(1);
    });

    test('should not stop collectors if not running', () => {
      dataController.stop();
      dataController.stop(); // Second call should be ignored

      expect(mockWhaleActivityCollector.stop).toHaveBeenCalledTimes(1);
      expect(mockEventCollector.stop).toHaveBeenCalledTimes(1);
      expect(mockPoolDataCollector.stop).toHaveBeenCalledTimes(1);
      expect(mockMarketPriceCollector.stop).toHaveBeenCalledTimes(1);
    });
  });

  describe('Pool Tracking', () => {
    test('should track a pool in all collectors', async () => {
      const poolAddress = 'pool123';
      const metadata = { name: 'Test Pool', description: 'A test pool' };

      await dataController.trackPool(poolAddress, metadata);

      expect(mockPoolDataCollector.trackPool).toHaveBeenCalledWith(poolAddress);
      expect(mockEventCollector.trackPool).toHaveBeenCalledWith(poolAddress);
      expect(mockWhaleActivityCollector.trackPool).toHaveBeenCalledWith(poolAddress);
      expect(mockStorage.storePoolMetadata).toHaveBeenCalledWith(poolAddress, metadata);
    });

    test('should untrack a pool in all collectors', async () => {
      const poolAddress = 'pool123';

      await dataController.untrackPool(poolAddress);

      expect(mockPoolDataCollector.untrackPool).toHaveBeenCalledWith(poolAddress);
      expect(mockEventCollector.untrackPool).toHaveBeenCalledWith(poolAddress);
      expect(mockWhaleActivityCollector.untrackPool).toHaveBeenCalledWith(poolAddress);
    });

    test('should get all tracked pools', () => {
      const pools = dataController.getTrackedPools();

      expect(mockPoolDataCollector.getTrackedPools).toHaveBeenCalledTimes(1);
      expect(pools).toEqual(['pool1', 'pool2']);
    });
  });

  describe('Token Tracking', () => {
    test('should track a token', async () => {
      const tokenMint = 'token123';
      const metadata = { symbol: 'TKN', name: 'Test Token' };

      await dataController.trackToken(tokenMint, metadata);

      expect(mockMarketPriceCollector.addToken).toHaveBeenCalledWith(tokenMint);
      expect(mockStorage.storeTokenMetadata).toHaveBeenCalledWith(tokenMint, metadata);
    });

    test('should untrack a token', () => {
      const tokenMint = 'token123';

      dataController.untrackToken(tokenMint);

      expect(mockMarketPriceCollector.removeToken).toHaveBeenCalledWith(tokenMint);
    });

    test('should get all tracked tokens', () => {
      const tokens = dataController.getTrackedTokens();

      expect(mockMarketPriceCollector.getTrackedTokens).toHaveBeenCalledTimes(1);
      expect(tokens).toEqual(['token1', 'token2']);
    });
  });

  describe('Data Retrieval', () => {
    test('should get token price from cache', async () => {
      const tokenMint = 'token123';
      const price = 1.23;

      // Set up private cache
      (dataController as any).tokenPrices.set(tokenMint, price);

      const result = await dataController.getTokenPrice(tokenMint);

      expect(result).toBe(price);
      expect(mockStorage.getLatestTokenPrice).not.toHaveBeenCalled();
    });

    test('should get token price from storage if not in cache', async () => {
      const tokenMint = 'token123';
      const price = 1.23;

      mockStorage.getLatestTokenPrice.mockResolvedValue({
        price,
        source: 'jupiter',
        timestamp: Math.floor(Date.now() / 1000),
      });

      const result = await dataController.getTokenPrice(tokenMint);

      expect(result).toBe(price);
      expect(mockStorage.getLatestTokenPrice).toHaveBeenCalledWith(tokenMint);
    });

    test('should get aggregated pool data', async () => {
      const poolAddress = 'pool123';
      const timeframe = 86400; // 1 day
      const mockData = { some: 'data' };

      mockStorage.getAggregatedPoolData.mockResolvedValue(mockData);

      const result = await dataController.getAggregatedPoolData(poolAddress, timeframe);

      expect(result).toBe(mockData);
      expect(mockStorage.getAggregatedPoolData).toHaveBeenCalledWith(poolAddress, timeframe);
    });

    test('should get raw pool data', async () => {
      const poolAddress = 'pool123';
      const startTime = Math.floor(Date.now() / 1000) - 86400; // 1 day ago
      const endTime = Math.floor(Date.now() / 1000);
      const mockData = [{ some: 'data' }] as unknown as PoolData[];

      mockStorage.getRawPoolData.mockResolvedValue(mockData);

      const result = await dataController.getRawPoolData(poolAddress, startTime, endTime);

      expect(result).toBe(mockData);
      expect(mockStorage.getRawPoolData).toHaveBeenCalledWith(poolAddress, startTime, endTime);
    });

    test('should get latest pool data', async () => {
      const poolAddress = 'pool123';
      const mockData = { some: 'data' } as unknown as PoolData;

      mockStorage.getLatestPoolData.mockResolvedValue(mockData);

      const result = await dataController.getLatestPoolData(poolAddress);

      expect(result).toBe(mockData);
      expect(mockStorage.getLatestPoolData).toHaveBeenCalledWith(poolAddress);
    });

    test('should get whale activities', async () => {
      const poolAddress = 'pool123';
      const startTime = Math.floor(Date.now() / 1000) - 86400; // 1 day ago
      const endTime = Math.floor(Date.now() / 1000);
      const mockData = [{ some: 'data' }] as unknown as WhaleActivity[];

      mockStorage.getWhaleActivities.mockResolvedValue(mockData);

      const result = await dataController.getWhaleActivities(poolAddress, startTime, endTime);

      expect(result).toBe(mockData);
      expect(mockStorage.getWhaleActivities).toHaveBeenCalledWith(poolAddress, startTime, endTime);
    });

    test('should get storage stats', async () => {
      const mockStats = { some: 'stats' };

      mockStorage.getStats.mockResolvedValue(mockStats);

      const result = await dataController.getStorageStats();

      expect(result).toBe(mockStats);
      expect(mockStorage.getStats).toHaveBeenCalledTimes(1);
    });
  });

  describe('Data Handling', () => {
    test('should handle pool data', async () => {
      const poolData = {
        address: 'pool123',
        tokenA: { mint: 'tokenA', decimals: 9, reserve: BigInt(1000) },
        tokenB: { mint: 'tokenB', decimals: 6, reserve: BigInt(500) },
        fee: 0.003,
        tickSpacing: 10,
        liquidity: BigInt(2000),
        sqrtPrice: BigInt(1500),
        currentTick: 100,
        feeGrowthGlobalA: BigInt(5000),
        feeGrowthGlobalB: BigInt(3000),
        timestamp: Math.floor(Date.now() / 1000),
        slot: 12345,
      } as PoolData;

      // Call private method
      await (dataController as any).handlePoolData(poolData);

      expect(mockStorage.storePoolData).toHaveBeenCalledWith(poolData);
    });

    test('should handle event', async () => {
      const event = {
        id: 'event123',
        poolAddress: 'pool123',
        type: EventType.SWAP,
        signature: 'sig123',
        blockTime: Math.floor(Date.now() / 1000),
        slot: 12345,
        data: { amount: 1000 },
      } as PoolEvent;

      // Call private method
      await (dataController as any).handleEvent(event);

      expect(mockStorage.storeEvent).toHaveBeenCalledWith(event);
    });

    test('should handle market prices', async () => {
      const priceData = {
        token1: { price: 1.23, source: 'jupiter' },
        token2: { price: 4.56, source: 'coingecko' },
      };

      // Call private method
      await (dataController as any).handleMarketPrices(priceData);

      expect(mockStorage.storeTokenPrices).toHaveBeenCalledWith(priceData, expect.any(Number));

      // Check that prices were cached
      expect((dataController as any).tokenPrices.get('token1')).toBe(1.23);
      expect((dataController as any).tokenPrices.get('token2')).toBe(4.56);
    });

    test('should handle whale activity', async () => {
      const activity = {
        id: 'activity123',
        poolAddress: 'pool123',
        type: EventType.SWAP,
        signature: 'sig123',
        blockTime: Math.floor(Date.now() / 1000),
        slot: 12345,
        tokenA: { mint: 'tokenA', amount: '1000', usdValue: 1000 },
        tokenB: { mint: 'tokenB', amount: '500', usdValue: 1000 },
        totalUsdValue: 2000,
        walletAddress: 'wallet123',
      } as WhaleActivity;

      // Call private method
      await (dataController as any).handleWhaleActivity(activity);

      expect(mockStorage.storeWhaleActivity).toHaveBeenCalledWith(activity);
    });
  });
});
