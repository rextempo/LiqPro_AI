import { PoolData, PoolEvent, WhaleActivity, StorageStats } from '../../types/data-types';

/**
 * Data Storage interface
 * Defines the contract for storing and retrieving data
 */
export interface DataStorage {
  /**
   * Store pool data
   * @param data Pool data
   */
  storePoolData(data: PoolData): Promise<void>;

  /**
   * Store pool metadata
   * @param poolAddress Pool address
   * @param metadata Pool metadata
   */
  storePoolMetadata(poolAddress: string, metadata: { name?: string; description?: string }): Promise<void>;

  /**
   * Store event data
   * @param event Event data
   */
  storeEvent(event: PoolEvent): Promise<void>;

  /**
   * Store token prices
   * @param priceData Token price data
   * @param timestamp Timestamp
   */
  storeTokenPrices(priceData: Record<string, { price: number; source: string }>, timestamp: number): Promise<void>;

  /**
   * Store token metadata
   * @param tokenMint Token mint address
   * @param metadata Token metadata
   */
  storeTokenMetadata(tokenMint: string, metadata: { symbol?: string; name?: string }): Promise<void>;

  /**
   * Store whale activity
   * @param activity Whale activity
   */
  storeWhaleActivity(activity: WhaleActivity): Promise<void>;

  /**
   * Get latest pool data
   * @param poolAddress Pool address
   * @returns Latest pool data or null if not found
   */
  getLatestPoolData(poolAddress: string): Promise<PoolData | null>;

  /**
   * Get latest token price
   * @param tokenMint Token mint address
   * @returns Latest token price data or null if not found
   */
  getLatestTokenPrice(tokenMint: string): Promise<{ price: number; source: string; timestamp: number } | null>;

  /**
   * Get raw pool data
   * @param poolAddress Pool address
   * @param startTime Start time in seconds
   * @param endTime End time in seconds
   * @returns Array of pool data points
   */
  getRawPoolData(poolAddress: string, startTime: number, endTime: number): Promise<PoolData[]>;

  /**
   * Get aggregated pool data
   * @param poolAddress Pool address
   * @param timeframe Timeframe in seconds
   * @returns Aggregated pool data
   */
  getAggregatedPoolData(poolAddress: string, timeframe: number): Promise<any>;

  /**
   * Get whale activities
   * @param poolAddress Optional pool address to filter by
   * @param startTime Optional start time in seconds
   * @param endTime Optional end time in seconds
   * @returns Array of whale activities
   */
  getWhaleActivities(poolAddress?: string, startTime?: number, endTime?: number): Promise<WhaleActivity[]>;

  /**
   * Get storage statistics
   * @returns Storage statistics
   */
  getStats(): Promise<StorageStats>;
} 