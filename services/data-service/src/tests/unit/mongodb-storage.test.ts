import { MongoDBStorage } from '../../modules/storage/mongodb-storage';
import { PoolData, PoolEvent, WhaleActivity, EventType } from '../../types/data-types';
import { MongoClient, Collection, Db } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Mock the logger
jest.mock('@liqpro/monitoring', () => ({
  createLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn()
  })
}));

describe('MongoDBStorage', () => {
  let mongoServer: MongoMemoryServer;
  let storage: MongoDBStorage;
  let mongoClient: MongoClient;
  let db: Db;
  let collections: {
    poolData: Collection;
    poolMetadata: Collection;
    events: Collection;
    tokenPrices: Collection;
    tokenMetadata: Collection;
    whaleActivities: Collection;
  };

  beforeAll(async () => {
    // Create a MongoDB Memory Server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // Create storage instance
    storage = new MongoDBStorage({
      uri: mongoUri,
      dbName: 'test_db',
      collections: {
        poolData: 'pool_data',
        poolMetadata: 'pool_metadata',
        events: 'events',
        tokenPrices: 'token_prices',
        tokenMetadata: 'token_metadata',
        whaleActivities: 'whale_activities'
      },
      indexes: {
        enabled: true
      }
    });

    // Connect to MongoDB
    await storage.connect();

    // Get direct access to collections for verification
    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    db = mongoClient.db('test_db');
    collections = {
      poolData: db.collection('pool_data'),
      poolMetadata: db.collection('pool_metadata'),
      events: db.collection('events'),
      tokenPrices: db.collection('token_prices'),
      tokenMetadata: db.collection('token_metadata'),
      whaleActivities: db.collection('whale_activities')
    };
  });

  afterAll(async () => {
    // Disconnect storage
    await storage.disconnect();

    // Disconnect direct client
    await mongoClient.close();

    // Stop MongoDB server
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear all collections before each test
    await Promise.all(Object.values(collections).map(collection => collection.deleteMany({})));
  });

  describe('Pool Data', () => {
    const samplePoolData: PoolData = {
      address: 'pool123',
      tokenA: {
        mint: 'tokenA123',
        decimals: 9,
        reserve: BigInt(1000000000)
      },
      tokenB: {
        mint: 'tokenB456',
        decimals: 6,
        reserve: BigInt(500000000)
      },
      fee: 0.003,
      tickSpacing: 10,
      liquidity: BigInt(2000000000),
      sqrtPrice: BigInt(1500000000),
      currentTick: 100,
      feeGrowthGlobalA: BigInt(5000),
      feeGrowthGlobalB: BigInt(3000),
      timestamp: Math.floor(Date.now() / 1000),
      slot: 12345
    };

    test('should store and retrieve pool data', async () => {
      // Store pool data
      await storage.storePoolData(samplePoolData);

      // Verify data was stored in MongoDB
      const storedData = await collections.poolData.findOne({ address: samplePoolData.address });
      expect(storedData).toBeTruthy();
      expect(storedData?.address).toBe(samplePoolData.address);

      // Retrieve latest pool data
      const retrievedData = await storage.getLatestPoolData(samplePoolData.address);
      expect(retrievedData).toBeTruthy();
      expect(retrievedData?.address).toBe(samplePoolData.address);
      expect(retrievedData?.tokenA.mint).toBe(samplePoolData.tokenA.mint);
    });

    test('should handle duplicate pool data gracefully', async () => {
      // Store the same pool data twice
      await storage.storePoolData(samplePoolData);
      await storage.storePoolData(samplePoolData);

      // Verify only one document was stored (or two with different IDs)
      const count = await collections.poolData.countDocuments({ address: samplePoolData.address });
      expect(count).toBeGreaterThanOrEqual(1);
    });

    test('should retrieve raw pool data within time range', async () => {
      const now = Math.floor(Date.now() / 1000);
      
      // Create multiple data points with different timestamps
      const dataPoint1 = { ...samplePoolData, timestamp: now - 3600 }; // 1 hour ago
      const dataPoint2 = { ...samplePoolData, timestamp: now - 1800 }; // 30 minutes ago
      const dataPoint3 = { ...samplePoolData, timestamp: now - 900 };  // 15 minutes ago
      const dataPoint4 = { ...samplePoolData, timestamp: now };        // now
      
      await storage.storePoolData(dataPoint1);
      await storage.storePoolData(dataPoint2);
      await storage.storePoolData(dataPoint3);
      await storage.storePoolData(dataPoint4);
      
      // Retrieve data within a specific time range
      const data = await storage.getRawPoolData(
        samplePoolData.address,
        now - 2000,  // Between dataPoint2 and dataPoint3
        now - 800    // After dataPoint3, before dataPoint4
      );
      
      expect(data.length).toBe(1);
      expect(data[0].timestamp).toBe(dataPoint3.timestamp);
    });
  });

  describe('Pool Metadata', () => {
    test('should store and update pool metadata', async () => {
      const poolAddress = 'pool123';
      const metadata = { name: 'Test Pool', description: 'A test pool' };
      
      // Store metadata
      await storage.storePoolMetadata(poolAddress, metadata);
      
      // Verify data was stored
      const storedData = await collections.poolMetadata.findOne({ poolAddress });
      expect(storedData).toBeTruthy();
      expect(storedData?.name).toBe(metadata.name);
      expect(storedData?.description).toBe(metadata.description);
      
      // Update metadata
      const updatedMetadata = { name: 'Updated Pool', description: 'An updated test pool' };
      await storage.storePoolMetadata(poolAddress, updatedMetadata);
      
      // Verify data was updated
      const updatedData = await collections.poolMetadata.findOne({ poolAddress });
      expect(updatedData).toBeTruthy();
      expect(updatedData?.name).toBe(updatedMetadata.name);
      expect(updatedData?.description).toBe(updatedMetadata.description);
    });
  });

  describe('Events', () => {
    const sampleEvent: PoolEvent = {
      id: 'event123',
      poolAddress: 'pool123',
      type: EventType.SWAP,
      signature: 'sig123',
      blockTime: Math.floor(Date.now() / 1000),
      slot: 12345,
      data: { amount: 1000 }
    };

    test('should store and retrieve events', async () => {
      // Store event
      await storage.storeEvent(sampleEvent);
      
      // Verify data was stored
      const storedData = await collections.events.findOne({ eventId: sampleEvent.id });
      expect(storedData).toBeTruthy();
      expect(storedData?.poolAddress).toBe(sampleEvent.poolAddress);
      expect(storedData?.type).toBe(sampleEvent.type);
    });
  });

  describe('Token Prices', () => {
    test('should store and retrieve token prices', async () => {
      const tokenMint = 'token123';
      const priceData = {
        [tokenMint]: { price: 1.23, source: 'jupiter' }
      };
      const timestamp = Math.floor(Date.now() / 1000);
      
      // Store price data
      await storage.storeTokenPrices(priceData, timestamp);
      
      // Verify data was stored
      const storedData = await collections.tokenPrices.findOne({ tokenMint });
      expect(storedData).toBeTruthy();
      expect(storedData?.price).toBe(priceData[tokenMint].price);
      expect(storedData?.source).toBe(priceData[tokenMint].source);
      
      // Retrieve latest price
      const latestPrice = await storage.getLatestTokenPrice(tokenMint);
      expect(latestPrice).toBeTruthy();
      expect(latestPrice?.price).toBe(priceData[tokenMint].price);
      expect(latestPrice?.source).toBe(priceData[tokenMint].source);
    });
  });

  describe('Token Metadata', () => {
    test('should store and update token metadata', async () => {
      const tokenMint = 'token123';
      const metadata = { symbol: 'TKN', name: 'Test Token' };
      
      // Store metadata
      await storage.storeTokenMetadata(tokenMint, metadata);
      
      // Verify data was stored
      const storedData = await collections.tokenMetadata.findOne({ tokenMint });
      expect(storedData).toBeTruthy();
      expect(storedData?.symbol).toBe(metadata.symbol);
      expect(storedData?.name).toBe(metadata.name);
      
      // Update metadata
      const updatedMetadata = { symbol: 'UTKN', name: 'Updated Test Token' };
      await storage.storeTokenMetadata(tokenMint, updatedMetadata);
      
      // Verify data was updated
      const updatedData = await collections.tokenMetadata.findOne({ tokenMint });
      expect(updatedData).toBeTruthy();
      expect(updatedData?.symbol).toBe(updatedMetadata.symbol);
      expect(updatedData?.name).toBe(updatedMetadata.name);
    });
  });

  describe('Whale Activities', () => {
    const sampleActivity: WhaleActivity = {
      id: 'activity123',
      poolAddress: 'pool123',
      type: EventType.SWAP,
      signature: 'sig123',
      blockTime: Math.floor(Date.now() / 1000),
      slot: 12345,
      tokenA: {
        mint: 'tokenA123',
        amount: '1000000000',
        usdValue: 1000
      },
      tokenB: {
        mint: 'tokenB456',
        amount: '500000000',
        usdValue: 1000
      },
      totalUsdValue: 2000,
      walletAddress: 'wallet123'
    };

    test('should store and retrieve whale activities', async () => {
      // Store activity
      await storage.storeWhaleActivity(sampleActivity);
      
      // Verify data was stored
      const storedData = await collections.whaleActivities.findOne({ activityId: sampleActivity.id });
      expect(storedData).toBeTruthy();
      expect(storedData?.poolAddress).toBe(sampleActivity.poolAddress);
      expect(storedData?.type).toBe(sampleActivity.type);
      expect(storedData?.walletAddress).toBe(sampleActivity.walletAddress);
      
      // Retrieve whale activities
      const activities = await storage.getWhaleActivities(sampleActivity.poolAddress);
      expect(activities.length).toBe(1);
      expect(activities[0].id).toBe(sampleActivity.id);
      expect(activities[0].walletAddress).toBe(sampleActivity.walletAddress);
    });

    test('should filter whale activities by time range', async () => {
      const now = Math.floor(Date.now() / 1000);
      
      // Create multiple activities with different timestamps
      const activity1 = { ...sampleActivity, id: 'activity1', blockTime: now - 3600 }; // 1 hour ago
      const activity2 = { ...sampleActivity, id: 'activity2', blockTime: now - 1800 }; // 30 minutes ago
      const activity3 = { ...sampleActivity, id: 'activity3', blockTime: now - 900 };  // 15 minutes ago
      const activity4 = { ...sampleActivity, id: 'activity4', blockTime: now };        // now
      
      await storage.storeWhaleActivity(activity1);
      await storage.storeWhaleActivity(activity2);
      await storage.storeWhaleActivity(activity3);
      await storage.storeWhaleActivity(activity4);
      
      // Retrieve activities within a specific time range
      const activities = await storage.getWhaleActivities(
        sampleActivity.poolAddress,
        now - 2000,  // Between activity2 and activity3
        now - 800    // After activity3, before activity4
      );
      
      expect(activities.length).toBe(1);
      expect(activities[0].id).toBe(activity3.id);
    });
  });

  describe('Storage Stats', () => {
    test('should return storage statistics', async () => {
      // Add some data to get non-zero stats
      await storage.storePoolData({
        address: 'pool123',
        tokenA: {
          mint: 'tokenA123',
          decimals: 9,
          reserve: BigInt(1000000000)
        },
        tokenB: {
          mint: 'tokenB456',
          decimals: 6,
          reserve: BigInt(500000000)
        },
        fee: 0.003,
        tickSpacing: 10,
        liquidity: BigInt(2000000000),
        sqrtPrice: BigInt(1500000000),
        currentTick: 100,
        feeGrowthGlobalA: BigInt(5000),
        feeGrowthGlobalB: BigInt(3000),
        timestamp: Math.floor(Date.now() / 1000),
        slot: 12345
      });
      
      await storage.storePoolMetadata('pool123', { name: 'Test Pool' });
      
      // Get stats
      const stats = await storage.getStats();
      
      // Verify stats
      expect(stats).toBeTruthy();
      expect(stats.poolData).toBe(1);
      expect(stats.poolMetadata).toBe(1);
      expect(stats.pools).toBe(1);
    });
  });
}); 