import { StorageTier, StorageConfig } from '../../../src/modules/storage/data-storage';
import { PoolData, WhaleActivity } from '../../../src/types/data-types';

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

// Import the module after mocking dependencies
import { DataStorage } from '../../../src/modules/storage/data-storage';

describe('DataStorage', () => {
  let dataStorage: DataStorage;

  const mockConfig: StorageConfig = {
    hotDataThreshold: 30 * 24 * 60 * 60 * 1000, // 30 days
    warmDataThreshold: 90 * 24 * 60 * 60 * 1000, // 90 days
    maxHotDataPoints: 1000,
    compressWarmData: true,
    compressColdData: true,
    enableAutoArchiving: true,
    archiveInterval: 24 * 60 * 60 * 1000, // 24 hours
  };

  const mockPoolData: PoolData = {
    poolAddress: 'mock-pool-address',
    timestamp: Date.now(),
    tokenX: {
      mint: 'token-x-mint',
      symbol: 'TX',
      decimals: 9,
      price: 1.5,
      reserve: 1000,
    },
    tokenY: {
      mint: 'token-y-mint',
      symbol: 'TY',
      decimals: 6,
      price: 0.5,
      reserve: 2000,
    },
    liquidity: 2500,
    volume24h: 5000,
    fees24h: 15,
    apy: 12.5,
    tvl: 3500,
    priceRatio: 3,
  };

  const mockWhaleActivity: WhaleActivity = {
    id: 'mock-whale-activity-id',
    poolAddress: 'mock-pool-address',
    timestamp: Date.now(),
    type: 'swap',
    tokenX: {
      mint: 'token-x-mint',
      symbol: 'TX',
      amount: 1000,
      valueUSD: 1500,
    },
    tokenY: {
      mint: 'token-y-mint',
      symbol: 'TY',
      amount: 3000,
      valueUSD: 1500,
    },
    totalValueUSD: 3000,
    percentOfPool: 10,
    walletAddress: 'mock-wallet-address',
  };

  beforeEach(() => {
    // Create a new instance for each test
    dataStorage = new DataStorage(mockConfig);

    // Initialize the storage
    return dataStorage.initialize();
  });

  afterEach(() => {
    // Clean up after each test
    if (dataStorage) {
      dataStorage.close();
    }

    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize correctly', () => {
      expect(dataStorage).toBeDefined();
    });
  });

  describe('Pool data operations', () => {
    test('should store and retrieve pool data', async () => {
      // Store pool data
      await dataStorage.storePoolData(mockPoolData);

      // Retrieve the data
      const data = await dataStorage.getPoolData(
        mockPoolData.poolAddress,
        mockPoolData.timestamp - 1000,
        mockPoolData.timestamp + 1000
      );

      expect(data).toHaveLength(1);
      expect(data[0]).toEqual(mockPoolData);
    });

    test('should get latest pool data', async () => {
      // Store pool data
      await dataStorage.storePoolData(mockPoolData);

      // Get latest data point
      const latestData = await dataStorage.getLatestPoolData(mockPoolData.poolAddress);

      expect(latestData).toEqual(mockPoolData);
    });

    test('should return null for non-existent pool', async () => {
      const latestData = await dataStorage.getLatestPoolData('non-existent-pool');

      expect(latestData).toBeNull();
    });
  });

  describe('Whale activity operations', () => {
    test('should store and retrieve whale activities', async () => {
      // Store whale activity
      await dataStorage.storeWhaleActivity(mockWhaleActivity);

      // Retrieve whale activities
      const activities = await dataStorage.getWhaleActivities(
        mockWhaleActivity.poolAddress,
        mockWhaleActivity.timestamp - 1000,
        mockWhaleActivity.timestamp + 1000
      );

      expect(activities).toHaveLength(1);
      expect(activities[0]).toEqual(mockWhaleActivity);
    });
  });

  describe('Storage statistics', () => {
    test('should get storage statistics', async () => {
      // Store some data first
      await dataStorage.storePoolData(mockPoolData);
      await dataStorage.storeWhaleActivity(mockWhaleActivity);

      // Get storage stats
      const stats = await dataStorage.getStats();

      expect(stats).toBeDefined();
      expect(stats.poolCount).toBe(1);
      expect(stats.totalDataPoints).toBeGreaterThan(0);
    });
  });

  describe('Data tiering', () => {
    test('should categorize data into correct tiers', () => {
      const now = Date.now();

      // Hot data (recent)
      const hotData = { ...mockPoolData, timestamp: now - 1 * 24 * 60 * 60 * 1000 }; // 1 day ago

      // Warm data (older)
      const warmData = { ...mockPoolData, timestamp: now - 60 * 24 * 60 * 60 * 1000 }; // 60 days ago

      // Cold data (oldest)
      const coldData = { ...mockPoolData, timestamp: now - 120 * 24 * 60 * 60 * 1000 }; // 120 days ago

      // Determine tiers using the private method (accessed via any)
      const hotTier = (dataStorage as any).getStorageTier(hotData.timestamp);
      const warmTier = (dataStorage as any).getStorageTier(warmData.timestamp);
      const coldTier = (dataStorage as any).getStorageTier(coldData.timestamp);

      expect(hotTier).toBe(StorageTier.HOT);
      expect(warmTier).toBe(StorageTier.WARM);
      expect(coldTier).toBe(StorageTier.COLD);
    });
  });
});
