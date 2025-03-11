/**
 * Cache Service
 * Provides caching functionality for the signal service using Redis and in-memory LRU cache
 */
import { createClient, RedisClientType } from 'redis';
import LRUCache from 'lru-cache';
import { logger } from '../utils/logger';
import { config } from '../config';
import { Signal, MarketAnalysis, PoolData } from '../types';

/**
 * Cache options interface
 */
interface CacheOptions {
  ttl: number;
  maxSize?: number;
}

/**
 * Cache Service class
 */
export class CacheService {
  private redisClient: RedisClientType | null = null;
  private lruCache: LRUCache<string, any>;
  private cacheEnabled: boolean;
  private metrics = {
    hits: 0,
    misses: 0,
    errors: 0
  };

  /**
   * Constructor
   * @param options Cache options
   */
  constructor(options: CacheOptions = { ttl: 300000, maxSize: 1000 }) {
    this.cacheEnabled = config.cacheEnabled;
    
    // Initialize LRU cache
    this.lruCache = new LRUCache({
      max: options.maxSize || 1000,
      ttl: options.ttl,
      updateAgeOnGet: true,
      allowStale: false
    });

    // Initialize Redis client if enabled
    if (this.cacheEnabled && config.redisUrl) {
      this.initRedisClient();
    } else {
      logger.info('Redis caching is disabled');
    }

    logger.info('Cache service initialized', { 
      enabled: this.cacheEnabled,
      redisEnabled: !!config.redisUrl,
      lruMaxSize: options.maxSize,
      ttl: options.ttl
    });
  }

  /**
   * Initialize Redis client
   */
  private async initRedisClient(): Promise<void> {
    try {
      this.redisClient = createClient({
        url: config.redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              logger.error('Redis connection failed after multiple retries, giving up');
              return new Error('Redis connection failed after multiple retries');
            }
            return Math.min(retries * 100, 3000);
          }
        }
      });

      this.redisClient.on('error', (err) => {
        logger.error('Redis client error', { error: err.message });
        this.metrics.errors++;
      });

      this.redisClient.on('connect', () => {
        logger.info('Redis client connected');
      });

      this.redisClient.on('reconnecting', () => {
        logger.warn('Redis client reconnecting');
      });

      await this.redisClient.connect();
    } catch (error) {
      logger.error('Failed to initialize Redis client', { error });
      this.redisClient = null;
    }
  }

  /**
   * Get item from cache
   * @param key Cache key
   * @param source 'redis' or 'lru'
   * @returns Cached item or null
   */
  async get<T>(key: string, source: 'redis' | 'lru' = 'lru'): Promise<T | null> {
    if (!this.cacheEnabled) {
      return null;
    }

    try {
      if (source === 'redis' && this.redisClient) {
        const data = await this.redisClient.get(key);
        if (data) {
          this.metrics.hits++;
          return JSON.parse(data) as T;
        }
      } else {
        const data = this.lruCache.get(key) as T;
        if (data) {
          this.metrics.hits++;
          return data;
        }
      }
      
      this.metrics.misses++;
      return null;
    } catch (error) {
      logger.error('Cache get error', { key, source, error });
      this.metrics.errors++;
      return null;
    }
  }

  /**
   * Set item in cache
   * @param key Cache key
   * @param value Value to cache
   * @param ttl Time to live in ms (optional, overrides default)
   * @param source 'redis' or 'lru'
   * @returns Success status
   */
  async set<T>(key: string, value: T, ttl?: number, source: 'redis' | 'lru' = 'lru'): Promise<boolean> {
    if (!this.cacheEnabled) {
      return false;
    }

    try {
      if (source === 'redis' && this.redisClient) {
        await this.redisClient.set(key, JSON.stringify(value), {
          EX: Math.floor((ttl || config.cacheExpiry) / 1000)
        });
      } else {
        this.lruCache.set(key, value, { ttl: ttl });
      }
      return true;
    } catch (error) {
      logger.error('Cache set error', { key, source, error });
      this.metrics.errors++;
      return false;
    }
  }

  /**
   * Delete item from cache
   * @param key Cache key
   * @param source 'redis' or 'lru'
   * @returns Success status
   */
  async delete(key: string, source: 'redis' | 'lru' = 'lru'): Promise<boolean> {
    if (!this.cacheEnabled) {
      return false;
    }

    try {
      if (source === 'redis' && this.redisClient) {
        await this.redisClient.del(key);
      } else {
        this.lruCache.delete(key);
      }
      return true;
    } catch (error) {
      logger.error('Cache delete error', { key, source, error });
      this.metrics.errors++;
      return false;
    }
  }

  /**
   * Clear all cache
   * @param source 'redis', 'lru', or 'all'
   * @returns Success status
   */
  async clear(source: 'redis' | 'lru' | 'all' = 'all'): Promise<boolean> {
    if (!this.cacheEnabled) {
      return false;
    }

    try {
      if ((source === 'redis' || source === 'all') && this.redisClient) {
        await this.redisClient.flushAll();
      }
      
      if (source === 'lru' || source === 'all') {
        this.lruCache.clear();
      }
      
      return true;
    } catch (error) {
      logger.error('Cache clear error', { source, error });
      this.metrics.errors++;
      return false;
    }
  }

  /**
   * Get cache metrics
   * @returns Cache metrics
   */
  getMetrics(): { hits: number; misses: number; errors: number; hitRatio: number } {
    const total = this.metrics.hits + this.metrics.misses;
    const hitRatio = total > 0 ? this.metrics.hits / total : 0;
    
    return {
      ...this.metrics,
      hitRatio
    };
  }

  /**
   * Reset cache metrics
   */
  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      errors: 0
    };
  }

  /**
   * Cache market analysis data
   * @param poolAddress Pool address
   * @param analysis Market analysis data
   * @returns Success status
   */
  async cacheMarketAnalysis(poolAddress: string, analysis: MarketAnalysis): Promise<boolean> {
    const key = `market:analysis:${poolAddress}`;
    return this.set(key, analysis, undefined, 'redis');
  }

  /**
   * Get cached market analysis data
   * @param poolAddress Pool address
   * @returns Cached market analysis or null
   */
  async getMarketAnalysis(poolAddress: string): Promise<MarketAnalysis | null> {
    const key = `market:analysis:${poolAddress}`;
    return this.get<MarketAnalysis>(key, 'redis');
  }

  /**
   * Cache pool data
   * @param pools Pool data array
   * @returns Success status
   */
  async cachePoolData(pools: PoolData[]): Promise<boolean> {
    const key = 'pools:active';
    return this.set(key, pools, undefined, 'redis');
  }

  /**
   * Get cached pool data
   * @returns Cached pool data or null
   */
  async getPoolData(): Promise<PoolData[] | null> {
    const key = 'pools:active';
    return this.get<PoolData[]>(key, 'redis');
  }

  /**
   * Cache signals
   * @param signals Signal array
   * @returns Success status
   */
  async cacheSignals(signals: Signal[]): Promise<boolean> {
    const key = 'signals:latest';
    return this.set(key, signals, undefined, 'redis');
  }

  /**
   * Get cached signals
   * @returns Cached signals or null
   */
  async getSignals(): Promise<Signal[] | null> {
    const key = 'signals:latest';
    return this.get<Signal[]>(key, 'redis');
  }

  /**
   * Warm up cache with initial data
   * @param initialData Object containing initial data to cache
   */
  async warmUp(initialData: {
    pools?: PoolData[];
    signals?: Signal[];
    marketAnalyses?: Map<string, MarketAnalysis>;
  }): Promise<void> {
    logger.info('Warming up cache');
    
    try {
      if (initialData.pools) {
        await this.cachePoolData(initialData.pools);
      }
      
      if (initialData.signals) {
        await this.cacheSignals(initialData.signals);
      }
      
      if (initialData.marketAnalyses) {
        for (const [poolAddress, analysis] of initialData.marketAnalyses.entries()) {
          await this.cacheMarketAnalysis(poolAddress, analysis);
        }
      }
      
      logger.info('Cache warm-up completed');
    } catch (error) {
      logger.error('Cache warm-up failed', { error });
    }
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.quit();
      this.redisClient = null;
    }
    
    this.lruCache.clear();
    logger.info('Cache service closed');
  }
} 