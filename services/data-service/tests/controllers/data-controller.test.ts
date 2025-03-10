import {
  DataController,
  PoolData,
  WhaleActivity,
  TimePeriod,
} from '../../src/controllers/data-controller';

// Mock the @liqpro/monitoring module
jest.mock('@liqpro/monitoring', () => {
  return {
    createLogger: jest.fn().mockReturnValue({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }),
  };
});

describe('DataController', () => {
  let dataController: DataController;

  const mockConfig = {
    rpcEndpoint: 'https://api.mainnet-beta.solana.com',
    rpcCommitment: 'confirmed' as 'processed' | 'confirmed' | 'finalized',
    apiKeys: {
      coingecko: 'mock-coingecko-key',
      coinmarketcap: 'mock-coinmarketcap-key',
      jupiter: 'mock-jupiter-key',
    },
    poolDataInterval: 60000,
    marketPriceInterval: 300000,
    eventPollingInterval: 10000,
    storage: {
      hotDataThreshold: 30 * 24 * 60 * 60 * 1000,
      warmDataThreshold: 90 * 24 * 60 * 60 * 1000,
      maxHotDataPoints: 10000,
      compressWarmData: true,
      compressColdData: true,
      enableAutoArchiving: true,
      archiveInterval: 24 * 60 * 60 * 1000,
    },
    whaleMonitoring: {
      minValueUSD: 50000,
      minPoolPercentage: 5,
    },
  };

  beforeEach(() => {
    dataController = new DataController(mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Lifecycle methods', () => {
    test('should initialize correctly', () => {
      expect(dataController).toBeDefined();
    });

    test('should start and stop correctly', async () => {
      await dataController.start();
      expect(dataController['isRunning']).toBe(true);

      dataController.stop();
      expect(dataController['isRunning']).toBe(false);
    });
  });

  describe('Pool tracking methods', () => {
    const mockPoolAddress = 'mock-pool-address';
    const mockPoolName = 'Mock Pool';
    const mockPoolDescription = 'A mock pool for testing';

    test('should track a pool', async () => {
      await dataController.trackPool(mockPoolAddress, mockPoolName, mockPoolDescription);

      const trackedPools = await dataController.getTrackedPools();
      expect(trackedPools).toHaveLength(1);
      expect(trackedPools[0].address).toBe(mockPoolAddress);
      expect(trackedPools[0].name).toBe(mockPoolName);
      expect(trackedPools[0].description).toBe(mockPoolDescription);
    });

    test('should untrack a pool', async () => {
      await dataController.trackPool(mockPoolAddress, mockPoolName, mockPoolDescription);
      await dataController.untrackPool(mockPoolAddress);

      const trackedPools = await dataController.getTrackedPools();
      expect(trackedPools).toHaveLength(0);
    });
  });

  describe('Data retrieval methods', () => {
    const mockPoolAddress = 'mock-pool-address';

    test('should get aggregated data', async () => {
      const data = await dataController.getAggregatedData(
        mockPoolAddress,
        TimePeriod.HOUR_1,
        '100'
      );

      expect(Array.isArray(data)).toBe(true);
    });

    test('should get raw data', async () => {
      const data = await dataController.getRawData(
        mockPoolAddress,
        Date.now() - 24 * 60 * 60 * 1000,
        Date.now(),
        100
      );

      expect(Array.isArray(data)).toBe(true);
    });

    test('should get latest data point', async () => {
      const data = await dataController.getLatestDataPoint(mockPoolAddress);
      expect(data).toBeNull(); // Initially null since no data is added
    });

    test('should get whale activities', async () => {
      const activities = await dataController.getWhaleActivities();
      expect(Array.isArray(activities)).toBe(true);
    });

    test('should get storage stats', async () => {
      const stats = await dataController.getStorageStats();
      expect(stats).toBeDefined();
      expect(stats.poolCount).toBe(0); // Initially 0 since no pools are tracked
    });
  });

  describe('Subscription methods', () => {
    const mockPoolAddress = 'mock-pool-address';

    test('should subscribe to pool updates', () => {
      const mockCallback = jest.fn();
      const subscription = dataController.subscribeToPoolUpdates(mockPoolAddress, mockCallback);

      expect(subscription).toBeDefined();
      expect(typeof subscription.unsubscribe).toBe('function');

      // Test that the callback is stored
      expect(dataController['poolSubscriptions'].has(mockPoolAddress)).toBe(true);
      expect(dataController['poolSubscriptions'].get(mockPoolAddress)?.has(mockCallback)).toBe(
        true
      );
    });

    test('should unsubscribe from pool updates', () => {
      const mockCallback = jest.fn();
      const subscription = dataController.subscribeToPoolUpdates(mockPoolAddress, mockCallback);

      subscription.unsubscribe();

      // Test that the callback is removed
      expect(dataController['poolSubscriptions'].has(mockPoolAddress)).toBe(false);
    });

    test('should notify subscribers', () => {
      const mockCallback = jest.fn();
      dataController.subscribeToPoolUpdates(mockPoolAddress, mockCallback);

      const mockData = { type: 'test', value: 123 };
      dataController['notifyPoolSubscribers'](mockPoolAddress, mockData);

      expect(mockCallback).toHaveBeenCalledWith(mockData);
    });
  });
});
