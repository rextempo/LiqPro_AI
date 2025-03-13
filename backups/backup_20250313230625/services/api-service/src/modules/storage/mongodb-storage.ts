import mongoose from 'mongoose';
import { createLogger } from '@liqpro/monitoring';

const logger = createLogger({
  serviceName: 'api-service:mongodb-storage',
  level: 'info',
  console: true
});

export interface MongoDBStorageConfig {
  uri: string;
  dbName: string;
  collections: Record<string, string>;
  indexes?: {
    enabled: boolean;
    ttl?: Record<string, number>;
  };
}

export class MongoDBStorage {
  private config: MongoDBStorageConfig;
  private connection: mongoose.Connection | null = null;
  private collections: Map<string, mongoose.Collection> = new Map();

  constructor(config: MongoDBStorageConfig) {
    this.config = config;
  }

  /**
   * Connect to MongoDB
   */
  async connect(): Promise<void> {
    try {
      logger.info('Connecting to MongoDB...', { uri: this.config.uri });
      
      // Connect to MongoDB
      await mongoose.connect(this.config.uri, {
        dbName: this.config.dbName,
      });
      
      this.connection = mongoose.connection;
      
      // Setup collections
      for (const [key, name] of Object.entries(this.config.collections)) {
        this.collections.set(key, this.connection.collection(name));
        logger.debug(`Collection initialized: ${name}`);
      }
      
      // Setup indexes if enabled
      if (this.config.indexes?.enabled) {
        await this.setupIndexes();
      }
      
      logger.info('Connected to MongoDB');
    } catch (error) {
      logger.error('Failed to connect to MongoDB', { error });
      throw error;
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect(): Promise<void> {
    if (this.connection) {
      await mongoose.disconnect();
      this.connection = null;
      this.collections.clear();
      logger.info('Disconnected from MongoDB');
    }
  }

  /**
   * Setup indexes
   */
  private async setupIndexes(): Promise<void> {
    try {
      logger.info('Setting up indexes...');
      
      // Setup TTL indexes
      if (this.config.indexes?.ttl) {
        for (const [collectionKey, ttl] of Object.entries(this.config.indexes.ttl)) {
          const collection = this.collections.get(collectionKey);
          
          if (collection) {
            await collection.createIndex(
              { createdAt: 1 },
              { expireAfterSeconds: ttl }
            );
            
            logger.debug(`TTL index created for ${collectionKey} (${ttl}s)`);
          }
        }
      }
      
      logger.info('Indexes setup complete');
    } catch (error) {
      logger.error('Failed to setup indexes', { error });
      throw error;
    }
  }

  /**
   * Get a collection
   */
  getCollection<T extends mongoose.Document>(key: string): mongoose.Collection {
    const collection = this.collections.get(key);
    
    if (!collection) {
      throw new Error(`Collection not found: ${key}`);
    }
    
    return collection;
  }

  /**
   * Find documents
   */
  async find<T>(
    collectionKey: string,
    query: Record<string, any>,
    options: {
      limit?: number;
      skip?: number;
      sort?: Record<string, 1 | -1>;
      projection?: Record<string, 0 | 1>;
    } = {}
  ): Promise<T[]> {
    const collection = this.getCollection<T & mongoose.Document>(collectionKey);
    
    const result = await collection
      .find(query, { projection: options.projection })
      .limit(options.limit || 0)
      .skip(options.skip || 0)
      .sort(options.sort || {})
      .toArray();
      
    return result as unknown as T[];
  }

  /**
   * Find a document by ID
   */
  async findById<T>(
    collectionKey: string,
    id: string,
    options: {
      projection?: Record<string, 0 | 1>;
    } = {}
  ): Promise<T | null> {
    const collection = this.getCollection<T & mongoose.Document>(collectionKey);
    
    const result = await collection.findOne(
      { _id: new mongoose.Types.ObjectId(id) } as any,
      { projection: options.projection }
    );
    
    return result as unknown as T | null;
  }

  /**
   * Insert a document
   */
  async insertOne<T>(
    collectionKey: string,
    document: T
  ): Promise<T> {
    const collection = this.getCollection<T & mongoose.Document>(collectionKey);
    
    const result = await collection.insertOne({
      ...document,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    
    return { ...document, _id: result.insertedId } as T;
  }

  /**
   * Update a document
   */
  async updateOne<T>(
    collectionKey: string,
    id: string,
    update: Partial<T>
  ): Promise<boolean> {
    const collection = this.getCollection<T & mongoose.Document>(collectionKey);
    
    const result = await collection.updateOne(
      { _id: new mongoose.Types.ObjectId(id) } as any,
      {
        $set: {
          ...update,
          updatedAt: new Date(),
        } as any,
      }
    );
    
    return (result as any).modifiedCount > 0;
  }

  /**
   * Delete a document
   */
  async deleteOne(
    collectionKey: string,
    id: string
  ): Promise<boolean> {
    const collection = this.getCollection(collectionKey);
    
    const result = await collection.deleteOne({
      _id: new mongoose.Types.ObjectId(id),
    } as any);
    
    return (result as any).deletedCount > 0;
  }
} 