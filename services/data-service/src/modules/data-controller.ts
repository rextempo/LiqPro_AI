import { createLogger } from '@liqpro/monitoring';
import { PoolDataCollector, PoolData } from './collectors/pool-data-collector';
import { EventCollector, PoolEvent } from './collectors/event-collector';
import { MarketPriceCollector } from './collectors/market-price-collector';
import { WhaleActivityCollector, WhaleActivity } from './collectors/whale-activity-collector';
import { DataStorage } from './storage/data-storage';
import { Finality } from '@solana/web3.js';

const logger = createLogger('data-service:data-controller');

/**
 * Configuration for the DataController
 */
export interface DataControllerConfig {
  rpcEndpoint: string;
  rpcCommitment: Finality;
  meteoraProgramId: string;
  collectionIntervals: {
    poolData: number;
    events: number;
    marketPrices: number;
  };
  whaleThresholds: {
    swapUsdValue: number;
    depositUsdValue: number;
    withdrawUsdValue: number;
  };
  storage: DataStorage;
}

/**
 * Data Controller
 * Manages all data collectors and coordinates data flow
 */
export class DataController {
  private config: DataControllerConfig;
  private poolDataCollector: PoolDataCollector;
  private eventCollector: EventCollector;
  private marketPriceCollector: MarketPriceCollector;
  private whaleActivityCollector: WhaleActivityCollector;
  private storage: DataStorage;
  private isRunning: boolean = false;
  private tokenPrices: Map<string, number> = new Map();

  /**
   * Create a new Data Controller
   * @param config Controller configuration
   */
  constructor(config: DataControllerConfig) {
    this.config = config;
    this.storage = config.storage;
    
    // Initialize collectors
    this.poolDataCollector = new PoolDataCollector({
      rpcEndpoint: config.rpcEndpoint,
      rpcCommitment: config.rpcCommitment,
      interval: config.collectionIntervals.poolData,
      onData: this.handlePoolData.bind(this),
      meteoraProgramId: config.meteoraProgramId
    });
    
    this.eventCollector = new EventCollector({
      rpcEndpoint: config.rpcEndpoint,
      rpcCommitment: config.rpcCommitment,
      interval: config.collectionIntervals.events,
      onEvent: this.handleEvent.bind(this)
    });
    
    this.marketPriceCollector = new MarketPriceCollector({
      interval: config.collectionIntervals.marketPrices,
      onData: this.handleMarketPrices.bind(this),
      apiKeys: {
        coingecko: process.env.COINGECKO_API_KEY,
        coinmarketcap: process.env.COINMARKETCAP_API_KEY,
        jupiter: process.env.JUPITER_API_KEY
      }
    });
    
    this.whaleActivityCollector = new WhaleActivityCollector({
      rpcEndpoint: config.rpcEndpoint,
      rpcCommitment: config.rpcCommitment,
      interval: config.collectionIntervals.events,
      onActivity: this.handleWhaleActivity.bind(this),
      thresholds: config.whaleThresholds,
      getPriceForToken: this.getTokenPrice.bind(this)
    });
    
    logger.info('Data Controller initialized', {
      rpcEndpoint: config.rpcEndpoint,
      meteoraProgramId: config.meteoraProgramId
    });
  }

  /**
   * Start all data collectors
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.info('Data Controller is already running');
      return;
    }

    logger.info('Starting Data Controller');
    
    // Start collectors
    await this.marketPriceCollector.start();
    await this.poolDataCollector.start();
    await this.eventCollector.start();
    await this.whaleActivityCollector.start();
    
    this.isRunning = true;
    logger.info('Data Controller started');
  }

  /**
   * Stop all data collectors
   */
  stop(): void {
    if (!this.isRunning) {
      logger.info('Data Controller is not running');
      return;
    }

    logger.info('Stopping Data Controller');
    
    // Stop collectors
    this.whaleActivityCollector.stop();
    this.eventCollector.stop();
    this.poolDataCollector.stop();
    this.marketPriceCollector.stop();
    
    this.isRunning = false;
    logger.info('Data Controller stopped');
  }

  /**
   * Track a pool for data collection
   * @param poolAddress Pool address
   * @param metadata Optional metadata about the pool
   */
  async trackPool(poolAddress: string, metadata?: { name?: string; description?: string }): Promise<void> {
    logger.info(`Tracking pool ${poolAddress}`, { metadata });
    
    try {
      // Track pool in all collectors
      await this.poolDataCollector.trackPool(poolAddress);
      await this.eventCollector.trackPool(poolAddress);
      await this.whaleActivityCollector.trackPool(poolAddress);
      
      // Store pool metadata
      if (metadata) {
        await this.storage.storePoolMetadata(poolAddress, metadata);
      }
      
      logger.info(`Successfully tracking pool ${poolAddress}`);
    } catch (error: any) {
      logger.error(`Failed to track pool ${poolAddress}`, { error });
      throw new Error(`Failed to track pool: ${error.message}`);
    }
  }

  /**
   * Stop tracking a pool
   * @param poolAddress Pool address
   */
  async untrackPool(poolAddress: string): Promise<void> {
    logger.info(`Untracking pool ${poolAddress}`);
    
    // Untrack pool in all collectors
    this.poolDataCollector.untrackPool(poolAddress);
    this.eventCollector.untrackPool(poolAddress);
    this.whaleActivityCollector.untrackPool(poolAddress);
    
    logger.info(`Successfully untracked pool ${poolAddress}`);
  }

  /**
   * Get all tracked pools
   * @returns Array of tracked pool addresses
   */
  getTrackedPools(): string[] {
    return this.poolDataCollector.getTrackedPools();
  }

  /**
   * Track a token for market price collection
   * @param tokenMint Token mint address
   * @param metadata Optional metadata about the token
   */
  async trackToken(tokenMint: string, metadata?: { symbol?: string; name?: string }): Promise<void> {
    logger.info(`Tracking token ${tokenMint}`, { metadata });
    
    try {
      // Track token in market price collector
      await this.marketPriceCollector.addToken(tokenMint);
      
      // Store token metadata
      if (metadata) {
        await this.storage.storeTokenMetadata(tokenMint, metadata);
      }
      
      logger.info(`Successfully tracking token ${tokenMint}`);
    } catch (error: any) {
      logger.error(`Failed to track token ${tokenMint}`, { error });
      throw new Error(`Failed to track token: ${error.message}`);
    }
  }

  /**
   * Stop tracking a token
   * @param tokenMint Token mint address
   */
  untrackToken(tokenMint: string): void {
    logger.info(`Untracking token ${tokenMint}`);
    
    // Untrack token in market price collector
    this.marketPriceCollector.removeToken(tokenMint);
    
    logger.info(`Successfully untracked token ${tokenMint}`);
  }

  /**
   * Get all tracked tokens
   * @returns Array of tracked token mint addresses
   */
  getTrackedTokens(): string[] {
    return this.marketPriceCollector.getTrackedTokens();
  }

  /**
   * Get the latest price for a token
   * @param tokenMint Token mint address
   * @returns Token price in USD, or undefined if not available
   */
  async getTokenPrice(tokenMint: string): Promise<number | undefined> {
    // Check cache first
    const cachedPrice = this.tokenPrices.get(tokenMint);
    if (cachedPrice !== undefined) {
      return cachedPrice;
    }
    
    // If not in cache, try to get from storage
    try {
      const priceData = await this.storage.getLatestTokenPrice(tokenMint);
      if (priceData && priceData.price) {
        return priceData.price;
      }
    } catch (error: any) {
      logger.error(`Error getting token price for ${tokenMint}`, { error });
    }
    
    return undefined;
  }

  /**
   * Get aggregated data for a pool
   * @param poolAddress Pool address
   * @param timeframe Timeframe in seconds
   * @returns Aggregated pool data
   */
  async getAggregatedPoolData(poolAddress: string, timeframe: number): Promise<any> {
    try {
      return await this.storage.getAggregatedPoolData(poolAddress, timeframe);
    } catch (error: any) {
      logger.error(`Error getting aggregated data for pool ${poolAddress}`, { error });
      throw new Error(`Failed to get aggregated data: ${error.message}`);
    }
  }

  /**
   * Get raw data for a pool
   * @param poolAddress Pool address
   * @param startTime Start time in seconds
   * @param endTime End time in seconds
   * @returns Raw pool data
   */
  async getRawPoolData(poolAddress: string, startTime: number, endTime: number): Promise<PoolData[]> {
    try {
      return await this.storage.getRawPoolData(poolAddress, startTime, endTime);
    } catch (error: any) {
      logger.error(`Error getting raw data for pool ${poolAddress}`, { error });
      throw new Error(`Failed to get raw data: ${error.message}`);
    }
  }

  /**
   * Get the latest data point for a pool
   * @param poolAddress Pool address
   * @returns Latest pool data
   */
  async getLatestPoolData(poolAddress: string): Promise<PoolData | null> {
    try {
      return await this.storage.getLatestPoolData(poolAddress);
    } catch (error: any) {
      logger.error(`Error getting latest data for pool ${poolAddress}`, { error });
      throw new Error(`Failed to get latest data: ${error.message}`);
    }
  }

  /**
   * Get whale activities
   * @param poolAddress Optional pool address to filter by
   * @param startTime Optional start time in seconds
   * @param endTime Optional end time in seconds
   * @returns Whale activities
   */
  async getWhaleActivities(
    poolAddress?: string,
    startTime?: number,
    endTime?: number
  ): Promise<WhaleActivity[]> {
    try {
      return await this.storage.getWhaleActivities(poolAddress, startTime, endTime);
    } catch (error: any) {
      logger.error('Error getting whale activities', { error, poolAddress, startTime, endTime });
      throw new Error(`Failed to get whale activities: ${error.message}`);
    }
  }

  /**
   * Get storage statistics
   * @returns Storage statistics
   */
  async getStorageStats(): Promise<any> {
    try {
      return await this.storage.getStats();
    } catch (error: any) {
      logger.error('Error getting storage statistics', { error });
      throw new Error(`Failed to get storage statistics: ${error.message}`);
    }
  }

  /**
   * Handle pool data from the pool data collector
   * @param data Pool data
   */
  private async handlePoolData(data: PoolData): Promise<void> {
    try {
      // Store pool data
      await this.storage.storePoolData(data);
      
      logger.debug(`Stored data for pool ${data.address}`);
    } catch (error: any) {
      logger.error(`Error handling pool data for ${data.address}`, { error });
    }
  }

  /**
   * Handle event from the event collector
   * @param event Pool event
   */
  private async handleEvent(event: PoolEvent): Promise<void> {
    try {
      // Store event
      await this.storage.storeEvent(event);
      
      logger.debug(`Stored event ${event.id} for pool ${event.poolAddress}`);
    } catch (error: any) {
      logger.error(`Error handling event ${event.id}`, { error });
    }
  }

  /**
   * Handle market prices from the market price collector
   * @param priceData Market price data
   */
  private async handleMarketPrices(priceData: Record<string, { price: number; source: string }>): Promise<void> {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      
      // Update token price cache
      for (const [tokenMint, data] of Object.entries(priceData)) {
        this.tokenPrices.set(tokenMint, data.price);
      }
      
      // Store price data
      await this.storage.storeTokenPrices(priceData, timestamp);
      
      logger.debug(`Stored prices for ${Object.keys(priceData).length} tokens`);
    } catch (error: any) {
      logger.error('Error handling market prices', { error });
    }
  }

  /**
   * Handle whale activity from the whale activity collector
   * @param activity Whale activity
   */
  private async handleWhaleActivity(activity: WhaleActivity): Promise<void> {
    try {
      // Store whale activity
      await this.storage.storeWhaleActivity(activity);
      
      logger.info(`Stored whale activity ${activity.id} for pool ${activity.poolAddress}`);
    } catch (error: any) {
      logger.error(`Error handling whale activity ${activity.id}`, { error });
    }
  }
} 