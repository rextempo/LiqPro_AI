import { createLogger } from '@liqpro/monitoring';
import { MongoClient, Collection, Db, ObjectId } from 'mongodb';
import { DataStorage } from './data-storage';
import { PoolData, PoolEvent, WhaleActivity } from '../../types/data-types';

const logger = createLogger('data-service:mongodb-storage');

/**
 * Configuration for MongoDB storage
 */
export interface MongoDBStorageConfig {
  uri: string;
  dbName: string;
  collections: {
    poolData: string;
    poolMetadata: string;
    events: string;
    tokenPrices: string;
    tokenMetadata: string;
    whaleActivities: string;
  };
  indexes?: {
    enabled: boolean;
    ttl?: {
      poolData?: number; // in seconds
      events?: number; // in seconds
      tokenPrices?: number; // in seconds
    };
  };
}

/**
 * MongoDB implementation of DataStorage
 */
export class MongoDBStorage implements DataStorage {
  private client: MongoClient;
  private db: Db | null = null;
  private collections: {
    poolData: Collection | null;
    poolMetadata: Collection | null;
    events: Collection | null;
    tokenPrices: Collection | null;
    tokenMetadata: Collection | null;
    whaleActivities: Collection | null;
  } = {
    poolData: null,
    poolMetadata: null,
    events: null,
    tokenPrices: null,
    tokenMetadata: null,
    whaleActivities: null,
  };
  private config: MongoDBStorageConfig;
  private isConnected: boolean = false;

  /**
   * Create a new MongoDB storage
   * @param config Storage configuration
   */
  constructor(config: MongoDBStorageConfig) {
    this.config = config;
    this.client = new MongoClient(config.uri);

    logger.info('MongoDB storage initialized', {
      uri: config.uri,
      dbName: config.dbName,
    });
  }

  /**
   * Connect to MongoDB
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      logger.info('Already connected to MongoDB');
      return;
    }

    try {
      logger.info('Connecting to MongoDB...');

      await this.client.connect();
      this.db = this.client.db(this.config.dbName);

      // Initialize collections
      this.collections.poolData = this.db.collection(this.config.collections.poolData);
      this.collections.poolMetadata = this.db.collection(this.config.collections.poolMetadata);
      this.collections.events = this.db.collection(this.config.collections.events);
      this.collections.tokenPrices = this.db.collection(this.config.collections.tokenPrices);
      this.collections.tokenMetadata = this.db.collection(this.config.collections.tokenMetadata);
      this.collections.whaleActivities = this.db.collection(
        this.config.collections.whaleActivities
      );

      // Create indexes if enabled
      if (this.config.indexes?.enabled) {
        await this.createIndexes();
      }

      this.isConnected = true;
      logger.info('Connected to MongoDB');
    } catch (error: any) {
      logger.error('Failed to connect to MongoDB', { error });
      throw new Error(`Failed to connect to MongoDB: ${error.message}`);
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect(): Promise<void> {
    if (!this.isConnected) {
      logger.info('Not connected to MongoDB');
      return;
    }

    try {
      logger.info('Disconnecting from MongoDB...');

      await this.client.close();

      this.isConnected = false;
      this.db = null;
      this.collections.poolData = null;
      this.collections.poolMetadata = null;
      this.collections.events = null;
      this.collections.tokenPrices = null;
      this.collections.tokenMetadata = null;
      this.collections.whaleActivities = null;

      logger.info('Disconnected from MongoDB');
    } catch (error: any) {
      logger.error('Failed to disconnect from MongoDB', { error });
      throw new Error(`Failed to disconnect from MongoDB: ${error.message}`);
    }
  }

  /**
   * Store pool data
   * @param data Pool data
   */
  async storePoolData(data: PoolData): Promise<void> {
    await this.ensureConnected();

    try {
      const collection = this.collections.poolData!;

      // Add timestamp if not present
      const timestamp = data.timestamp || Math.floor(Date.now() / 1000);
      const documentId = `${data.address}-${timestamp}`;

      // Create document without _id field, MongoDB will generate it
      const document = {
        ...data,
        timestamp,
        documentId, // Store the original ID as a field
      };

      await collection.insertOne(document);

      logger.debug(`Stored pool data for ${data.address}`);
    } catch (error: any) {
      // Ignore duplicate key errors (can happen with rapid updates)
      if (error.code === 11000) {
        logger.debug(`Duplicate pool data for ${data.address}, skipping`);
        return;
      }

      logger.error(`Failed to store pool data for ${data.address}`, { error });
      throw new Error(`Failed to store pool data: ${error.message}`);
    }
  }

  /**
   * Store pool metadata
   * @param poolAddress Pool address
   * @param metadata Pool metadata
   */
  async storePoolMetadata(
    poolAddress: string,
    metadata: { name?: string; description?: string }
  ): Promise<void> {
    await this.ensureConnected();

    try {
      const collection = this.collections.poolMetadata!;

      const document = {
        poolAddress,
        ...metadata,
        updatedAt: new Date(),
      };

      await collection.updateOne({ poolAddress }, { $set: document }, { upsert: true });

      logger.debug(`Stored metadata for pool ${poolAddress}`);
    } catch (error: any) {
      logger.error(`Failed to store metadata for pool ${poolAddress}`, { error });
      throw new Error(`Failed to store pool metadata: ${error.message}`);
    }
  }

  /**
   * Store event data
   * @param event Event data
   */
  async storeEvent(event: PoolEvent): Promise<void> {
    await this.ensureConnected();

    try {
      const collection = this.collections.events!;

      const document = {
        ...event,
        eventId: event.id, // Store the original ID as a field
        timestamp: event.blockTime,
      };

      await collection.insertOne(document);

      logger.debug(`Stored event ${event.id} for pool ${event.poolAddress}`);
    } catch (error: any) {
      // Ignore duplicate key errors
      if (error.code === 11000) {
        logger.debug(`Duplicate event ${event.id}, skipping`);
        return;
      }

      logger.error(`Failed to store event ${event.id}`, { error });
      throw new Error(`Failed to store event: ${error.message}`);
    }
  }

  /**
   * Store token prices
   * @param priceData Token price data
   * @param timestamp Timestamp
   */
  async storeTokenPrices(
    priceData: Record<string, { price: number; source: string }>,
    timestamp: number
  ): Promise<void> {
    await this.ensureConnected();

    try {
      const collection = this.collections.tokenPrices!;

      const documents = Object.entries(priceData).map(([tokenMint, data]) => ({
        tokenMint,
        price: data.price,
        source: data.source,
        timestamp,
        documentId: `${tokenMint}-${timestamp}`, // Store as a field, not as _id
      }));

      if (documents.length === 0) {
        return;
      }

      await collection.insertMany(documents);

      logger.debug(`Stored prices for ${documents.length} tokens`);
    } catch (error: any) {
      // Ignore duplicate key errors
      if (error.code === 11000) {
        logger.debug('Duplicate token prices, skipping');
        return;
      }

      logger.error('Failed to store token prices', { error });
      throw new Error(`Failed to store token prices: ${error.message}`);
    }
  }

  /**
   * Store token metadata
   * @param tokenMint Token mint address
   * @param metadata Token metadata
   */
  async storeTokenMetadata(
    tokenMint: string,
    metadata: { symbol?: string; name?: string }
  ): Promise<void> {
    await this.ensureConnected();

    try {
      const collection = this.collections.tokenMetadata!;

      const document = {
        tokenMint,
        ...metadata,
        updatedAt: new Date(),
      };

      await collection.updateOne({ tokenMint }, { $set: document }, { upsert: true });

      logger.debug(`Stored metadata for token ${tokenMint}`);
    } catch (error: any) {
      logger.error(`Failed to store metadata for token ${tokenMint}`, { error });
      throw new Error(`Failed to store token metadata: ${error.message}`);
    }
  }

  /**
   * Store whale activity
   * @param activity Whale activity
   */
  async storeWhaleActivity(activity: WhaleActivity): Promise<void> {
    await this.ensureConnected();

    try {
      const collection = this.collections.whaleActivities!;

      const document = {
        ...activity,
        activityId: activity.id, // Store the original ID as a field
        timestamp: activity.blockTime,
      };

      await collection.insertOne(document);

      logger.debug(`Stored whale activity ${activity.id} for pool ${activity.poolAddress}`);
    } catch (error: any) {
      // Ignore duplicate key errors
      if (error.code === 11000) {
        logger.debug(`Duplicate whale activity ${activity.id}, skipping`);
        return;
      }

      logger.error(`Failed to store whale activity ${activity.id}`, { error });
      throw new Error(`Failed to store whale activity: ${error.message}`);
    }
  }

  /**
   * Get latest pool data
   * @param poolAddress Pool address
   * @returns Latest pool data or null if not found
   */
  async getLatestPoolData(poolAddress: string): Promise<PoolData | null> {
    await this.ensureConnected();

    try {
      const collection = this.collections.poolData!;

      const result = await collection
        .find({ address: poolAddress })
        .sort({ timestamp: -1 })
        .limit(1)
        .toArray();

      if (result.length === 0) {
        return null;
      }

      // Remove MongoDB-specific fields
      const { _id, documentId, ...poolData } = result[0];

      return poolData as PoolData;
    } catch (error: any) {
      logger.error(`Failed to get latest data for pool ${poolAddress}`, { error });
      throw new Error(`Failed to get latest pool data: ${error.message}`);
    }
  }

  /**
   * Get latest token price
   * @param tokenMint Token mint address
   * @returns Latest token price data or null if not found
   */
  async getLatestTokenPrice(
    tokenMint: string
  ): Promise<{ price: number; source: string; timestamp: number } | null> {
    await this.ensureConnected();

    try {
      const collection = this.collections.tokenPrices!;

      const result = await collection
        .find({ tokenMint })
        .sort({ timestamp: -1 })
        .limit(1)
        .toArray();

      if (result.length === 0) {
        return null;
      }

      const { _id, tokenMint: _, documentId, ...priceData } = result[0];

      return priceData as { price: number; source: string; timestamp: number };
    } catch (error: any) {
      logger.error(`Failed to get latest price for token ${tokenMint}`, { error });
      throw new Error(`Failed to get latest token price: ${error.message}`);
    }
  }

  /**
   * Get raw pool data
   * @param poolAddress Pool address
   * @param startTime Start time in seconds
   * @param endTime End time in seconds
   * @returns Array of pool data points
   */
  async getRawPoolData(
    poolAddress: string,
    startTime: number,
    endTime: number
  ): Promise<PoolData[]> {
    await this.ensureConnected();

    try {
      const collection = this.collections.poolData!;

      const result = await collection
        .find({
          address: poolAddress,
          timestamp: { $gte: startTime, $lte: endTime },
        })
        .sort({ timestamp: 1 })
        .toArray();

      // Remove MongoDB-specific fields
      return result.map(({ _id, documentId, ...poolData }) => poolData as PoolData);
    } catch (error: any) {
      logger.error(`Failed to get raw data for pool ${poolAddress}`, { error });
      throw new Error(`Failed to get raw pool data: ${error.message}`);
    }
  }

  /**
   * Get aggregated pool data
   * @param poolAddress Pool address
   * @param timeframe Timeframe in seconds
   * @returns Aggregated pool data
   */
  async getAggregatedPoolData(poolAddress: string, timeframe: number): Promise<any> {
    await this.ensureConnected();

    try {
      const collection = this.collections.poolData!;

      // Calculate start time
      const endTime = Math.floor(Date.now() / 1000);
      const startTime = endTime - timeframe;

      // Get raw data
      const rawData = await this.getRawPoolData(poolAddress, startTime, endTime);

      if (rawData.length === 0) {
        return {
          poolAddress,
          timeframe,
          dataPoints: 0,
          startTime,
          endTime,
          data: {},
        };
      }

      // Calculate aggregated metrics
      const firstData = rawData[0];
      const lastData = rawData[rawData.length - 1];

      // Calculate liquidity change
      const liquidityStart = firstData.liquidity;
      const liquidityEnd = lastData.liquidity;
      const liquidityChange = Number(
        ((Number(liquidityEnd) - Number(liquidityStart)) / Number(liquidityStart)) * 100
      );

      // Calculate price change
      const priceStart = Number(firstData.sqrtPrice) ** 2;
      const priceEnd = Number(lastData.sqrtPrice) ** 2;
      const priceChange = ((priceEnd - priceStart) / priceStart) * 100;

      // Calculate token reserves change
      const tokenAReserveStart = Number(firstData.tokenA.reserve);
      const tokenAReserveEnd = Number(lastData.tokenA.reserve);
      const tokenAReserveChange =
        ((tokenAReserveEnd - tokenAReserveStart) / tokenAReserveStart) * 100;

      const tokenBReserveStart = Number(firstData.tokenB.reserve);
      const tokenBReserveEnd = Number(lastData.tokenB.reserve);
      const tokenBReserveChange =
        ((tokenBReserveEnd - tokenBReserveStart) / tokenBReserveStart) * 100;

      return {
        poolAddress,
        timeframe,
        dataPoints: rawData.length,
        startTime,
        endTime,
        data: {
          liquidity: {
            start: liquidityStart.toString(),
            end: liquidityEnd.toString(),
            change: liquidityChange,
          },
          price: {
            start: priceStart,
            end: priceEnd,
            change: priceChange,
          },
          tokenA: {
            mint: firstData.tokenA.mint,
            decimals: firstData.tokenA.decimals,
            reserve: {
              start: firstData.tokenA.reserve.toString(),
              end: lastData.tokenA.reserve.toString(),
              change: tokenAReserveChange,
            },
          },
          tokenB: {
            mint: firstData.tokenB.mint,
            decimals: firstData.tokenB.decimals,
            reserve: {
              start: firstData.tokenB.reserve.toString(),
              end: lastData.tokenB.reserve.toString(),
              change: tokenBReserveChange,
            },
          },
        },
      };
    } catch (error: any) {
      logger.error(`Failed to get aggregated data for pool ${poolAddress}`, { error });
      throw new Error(`Failed to get aggregated pool data: ${error.message}`);
    }
  }

  /**
   * Get whale activities
   * @param poolAddress Optional pool address to filter by
   * @param startTime Optional start time in seconds
   * @param endTime Optional end time in seconds
   * @returns Array of whale activities
   */
  async getWhaleActivities(
    poolAddress?: string,
    startTime?: number,
    endTime?: number
  ): Promise<WhaleActivity[]> {
    await this.ensureConnected();

    try {
      const collection = this.collections.whaleActivities!;

      // Build query
      const query: any = {};

      if (poolAddress) {
        query.poolAddress = poolAddress;
      }

      if (startTime || endTime) {
        query.blockTime = {};

        if (startTime) {
          query.blockTime.$gte = startTime;
        }

        if (endTime) {
          query.blockTime.$lte = endTime;
        }
      }

      const result = await collection
        .find(query)
        .sort({ blockTime: -1 })
        .limit(100) // Limit to 100 activities
        .toArray();

      // Remove MongoDB-specific fields
      return result.map(({ _id, activityId, ...activity }) => {
        // Restore the original id
        return { ...activity, id: activityId } as WhaleActivity;
      });
    } catch (error: any) {
      logger.error('Failed to get whale activities', { error, poolAddress, startTime, endTime });
      throw new Error(`Failed to get whale activities: ${error.message}`);
    }
  }

  /**
   * Get storage statistics
   * @returns Storage statistics
   */
  async getStats(): Promise<any> {
    await this.ensureConnected();

    try {
      const stats = {
        poolData: await this.collections.poolData!.countDocuments(),
        poolMetadata: await this.collections.poolMetadata!.countDocuments(),
        events: await this.collections.events!.countDocuments(),
        tokenPrices: await this.collections.tokenPrices!.countDocuments(),
        tokenMetadata: await this.collections.tokenMetadata!.countDocuments(),
        whaleActivities: await this.collections.whaleActivities!.countDocuments(),
        pools: await this.collections.poolMetadata!.countDocuments(),
        tokens: await this.collections.tokenMetadata!.countDocuments(),
        hotDataSize: 0,
        warmDataSize: 0,
        coldDataSize: 0,
      };

      return stats;
    } catch (error: any) {
      logger.error('Failed to get storage statistics', { error });
      throw new Error(`Failed to get storage statistics: ${error.message}`);
    }
  }

  /**
   * Create indexes for collections
   */
  private async createIndexes(): Promise<void> {
    try {
      logger.info('Creating indexes...');

      // Pool data indexes
      await this.collections.poolData!.createIndex({ address: 1, timestamp: -1 });
      await this.collections.poolData!.createIndex({ timestamp: 1 });
      await this.collections.poolData!.createIndex({ documentId: 1 }, { unique: true });

      // Events indexes
      await this.collections.events!.createIndex({ poolAddress: 1, blockTime: -1 });
      await this.collections.events!.createIndex({ type: 1, blockTime: -1 });
      await this.collections.events!.createIndex({ blockTime: 1 });
      await this.collections.events!.createIndex({ eventId: 1 }, { unique: true });

      // Token prices indexes
      await this.collections.tokenPrices!.createIndex({ tokenMint: 1, timestamp: -1 });
      await this.collections.tokenPrices!.createIndex({ timestamp: 1 });
      await this.collections.tokenPrices!.createIndex({ documentId: 1 }, { unique: true });

      // Token metadata indexes
      await this.collections.tokenMetadata!.createIndex({ tokenMint: 1 }, { unique: true });

      // Pool metadata indexes
      await this.collections.poolMetadata!.createIndex({ poolAddress: 1 }, { unique: true });

      // Whale activities indexes
      await this.collections.whaleActivities!.createIndex({ poolAddress: 1, blockTime: -1 });
      await this.collections.whaleActivities!.createIndex({ walletAddress: 1, blockTime: -1 });
      await this.collections.whaleActivities!.createIndex({ blockTime: 1 });
      await this.collections.whaleActivities!.createIndex({ activityId: 1 }, { unique: true });

      // TTL indexes if configured
      if (this.config.indexes?.ttl) {
        const ttl = this.config.indexes.ttl;

        if (ttl.poolData) {
          await this.collections.poolData!.createIndex(
            { timestamp: 1 },
            { expireAfterSeconds: ttl.poolData }
          );
          logger.info(`Created TTL index for pool data (${ttl.poolData} seconds)`);
        }

        if (ttl.events) {
          await this.collections.events!.createIndex(
            { blockTime: 1 },
            { expireAfterSeconds: ttl.events }
          );
          logger.info(`Created TTL index for events (${ttl.events} seconds)`);
        }

        if (ttl.tokenPrices) {
          await this.collections.tokenPrices!.createIndex(
            { timestamp: 1 },
            { expireAfterSeconds: ttl.tokenPrices }
          );
          logger.info(`Created TTL index for token prices (${ttl.tokenPrices} seconds)`);
        }
      }

      logger.info('Indexes created');
    } catch (error: any) {
      logger.error('Failed to create indexes', { error });
      throw new Error(`Failed to create indexes: ${error.message}`);
    }
  }

  /**
   * Ensure connection to MongoDB
   */
  private async ensureConnected(): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }
  }
}
