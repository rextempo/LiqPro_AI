import { createLogger } from '@liqpro/monitoring';
import { Connection, PublicKey, Finality } from '@solana/web3.js';

const logger = createLogger('data-service:pool-data-collector');

/**
 * Pool data structure
 */
export interface PoolData {
  address: string;
  tokenA: {
    mint: string;
    decimals: number;
    reserve: bigint;
  };
  tokenB: {
    mint: string;
    decimals: number;
    reserve: bigint;
  };
  fee: number;
  tickSpacing: number;
  liquidity: bigint;
  sqrtPrice: bigint;
  currentTick: number;
  feeGrowthGlobalA: bigint;
  feeGrowthGlobalB: bigint;
  timestamp: number;
  slot: number;
}

/**
 * Configuration for the PoolDataCollector
 */
export interface PoolDataCollectorConfig {
  rpcEndpoint: string;
  rpcCommitment: Finality;
  interval: number;
  onData: (data: PoolData) => void;
  meteoraProgramId: string;
}

/**
 * Pool Data Collector
 * Responsible for collecting data from liquidity pools
 */
export class PoolDataCollector {
  private connection: Connection;
  private config: PoolDataCollectorConfig;
  private pollingTimer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private trackedPools: Set<string> = new Set();
  private subscriptions: Map<string, number> = new Map();

  /**
   * Create a new Pool Data Collector
   * @param config Collector configuration
   */
  constructor(config: PoolDataCollectorConfig) {
    this.config = config;
    this.connection = new Connection(config.rpcEndpoint, config.rpcCommitment);
    
    logger.info('Pool Data Collector initialized', {
      rpcEndpoint: config.rpcEndpoint,
      interval: config.interval,
      meteoraProgramId: config.meteoraProgramId
    });
  }

  /**
   * Start collecting pool data
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.info('Pool Data Collector is already running');
      return;
    }

    logger.info('Starting Pool Data Collector');
    
    // Start polling timer
    this.pollingTimer = setInterval(() => {
      this.collectPoolData();
    }, this.config.interval);
    
    // Collect data immediately
    await this.collectPoolData();
    
    this.isRunning = true;
    logger.info('Pool Data Collector started');
  }

  /**
   * Stop collecting pool data
   */
  stop(): void {
    if (!this.isRunning) {
      logger.info('Pool Data Collector is not running');
      return;
    }

    logger.info('Stopping Pool Data Collector');
    
    // Clear polling timer
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
    
    // Unsubscribe from all WebSocket subscriptions
    for (const [poolAddress, subscriptionId] of this.subscriptions.entries()) {
      this.connection.removeAccountChangeListener(subscriptionId);
      logger.info(`Unsubscribed from pool ${poolAddress}`);
    }
    
    this.subscriptions.clear();
    this.isRunning = false;
    logger.info('Pool Data Collector stopped');
  }

  /**
   * Track a pool for data collection
   * @param poolAddress Pool address
   */
  async trackPool(poolAddress: string): Promise<void> {
    if (this.trackedPools.has(poolAddress)) {
      logger.info(`Pool ${poolAddress} is already being tracked`);
      return;
    }

    try {
      // Validate pool address
      const publicKey = new PublicKey(poolAddress);
      
      // Verify this is a valid Meteora pool
      const accountInfo = await this.connection.getAccountInfo(publicKey);
      if (!accountInfo) {
        throw new Error(`Pool account ${poolAddress} not found`);
      }
      
      if (accountInfo.owner.toString() !== this.config.meteoraProgramId) {
        throw new Error(`Pool ${poolAddress} is not owned by Meteora program ${this.config.meteoraProgramId}`);
      }
      
      // Add to tracked pools
      this.trackedPools.add(poolAddress);
      
      // Subscribe to account changes
      const subscriptionId = this.connection.onAccountChange(
        publicKey,
        (accountInfo, context) => {
          this.handleAccountChange(poolAddress, accountInfo, context);
        },
        this.config.rpcCommitment
      );
      
      this.subscriptions.set(poolAddress, subscriptionId);
      
      // Collect initial data
      await this.collectPoolDataForAddress(poolAddress);
      
      logger.info(`Started tracking pool ${poolAddress}`);
    } catch (error: any) {
      logger.error(`Failed to track pool ${poolAddress}`, { error });
      throw new Error(`Failed to track pool: ${error.message}`);
    }
  }

  /**
   * Stop tracking a pool
   * @param poolAddress Pool address
   */
  untrackPool(poolAddress: string): void {
    if (!this.trackedPools.has(poolAddress)) {
      logger.info(`Pool ${poolAddress} is not being tracked`);
      return;
    }

    // Unsubscribe from account changes
    const subscriptionId = this.subscriptions.get(poolAddress);
    if (subscriptionId !== undefined) {
      this.connection.removeAccountChangeListener(subscriptionId);
      this.subscriptions.delete(poolAddress);
    }
    
    this.trackedPools.delete(poolAddress);
    logger.info(`Stopped tracking pool ${poolAddress}`);
  }

  /**
   * Get all tracked pools
   * @returns Array of tracked pool addresses
   */
  getTrackedPools(): string[] {
    return Array.from(this.trackedPools);
  }

  /**
   * Collect data for all tracked pools
   */
  private async collectPoolData(): Promise<void> {
    logger.debug(`Collecting data for ${this.trackedPools.size} pools`);
    
    const promises = Array.from(this.trackedPools).map(poolAddress => 
      this.collectPoolDataForAddress(poolAddress).catch(error => {
        logger.error(`Error collecting data for pool ${poolAddress}`, { error });
      })
    );
    
    await Promise.all(promises);
  }

  /**
   * Collect data for a specific pool
   * @param poolAddress Pool address
   */
  private async collectPoolDataForAddress(poolAddress: string): Promise<void> {
    try {
      const publicKey = new PublicKey(poolAddress);
      const accountInfo = await this.connection.getAccountInfo(publicKey);
      
      if (!accountInfo) {
        logger.error(`Pool account ${poolAddress} not found`);
        return;
      }
      
      // Decode pool data
      const poolData = this.decodePoolData(poolAddress, accountInfo.data);
      
      if (poolData) {
        // Add timestamp and slot
        const slot = await this.connection.getSlot(this.config.rpcCommitment);
        const blockTime = await this.connection.getBlockTime(slot);
        
        poolData.timestamp = blockTime || Math.floor(Date.now() / 1000);
        poolData.slot = slot;
        
        // Emit data
        this.config.onData(poolData);
        
        logger.debug(`Collected data for pool ${poolAddress}`, {
          tokenA: poolData.tokenA.mint,
          tokenB: poolData.tokenB.mint,
          liquidity: poolData.liquidity.toString(),
          slot: poolData.slot
        });
      }
    } catch (error: any) {
      logger.error(`Error collecting data for pool ${poolAddress}`, { error });
      throw error;
    }
  }

  /**
   * Decode pool data from account data
   * @param poolAddress Pool address
   * @param data Account data buffer
   * @returns Decoded pool data or null if decoding fails
   */
  private decodePoolData(poolAddress: string, data: Buffer): PoolData | null {
    try {
      // This is a simplified implementation
      // In a real implementation, you would need to use a proper decoder
      // that understands the Meteora pool account layout
      
      // For demonstration purposes, we'll create a mock decoder
      // that extracts some basic information from the buffer
      
      // In a real implementation, you would use a library like @project-serum/borsh
      // or a custom decoder that understands the Meteora pool account layout
      
      // Mock implementation - replace with actual decoding logic
      const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
      
      // Extract token mints (simplified - actual positions would depend on the layout)
      const tokenAMintOffset = 8; // Example offset
      const tokenBMintOffset = 40; // Example offset
      
      const tokenAMint = new PublicKey(data.slice(tokenAMintOffset, tokenAMintOffset + 32)).toString();
      const tokenBMint = new PublicKey(data.slice(tokenBMintOffset, tokenBMintOffset + 32)).toString();
      
      // Extract other data (simplified - actual positions would depend on the layout)
      const tokenADecimals = data[72]; // Example offset
      const tokenBDecimals = data[73]; // Example offset
      const fee = view.getUint16(74, true) / 10000; // Example offset, assuming fee is stored as basis points
      const tickSpacing = view.getInt16(76, true); // Example offset
      
      // Extract 128-bit values (simplified)
      const liquidityOffset = 80; // Example offset
      const sqrtPriceOffset = 96; // Example offset
      const tokenAReserveOffset = 112; // Example offset
      const tokenBReserveOffset = 128; // Example offset
      const feeGrowthGlobalAOffset = 144; // Example offset
      const feeGrowthGlobalBOffset = 160; // Example offset
      
      // Read 128-bit values as two 64-bit values and combine
      const liquidity = this.readBigUint128(view, liquidityOffset);
      const sqrtPrice = this.readBigUint128(view, sqrtPriceOffset);
      const tokenAReserve = this.readBigUint128(view, tokenAReserveOffset);
      const tokenBReserve = this.readBigUint128(view, tokenBReserveOffset);
      const feeGrowthGlobalA = this.readBigUint128(view, feeGrowthGlobalAOffset);
      const feeGrowthGlobalB = this.readBigUint128(view, feeGrowthGlobalBOffset);
      
      // Current tick (simplified)
      const currentTickOffset = 176; // Example offset
      const currentTick = view.getInt32(currentTickOffset, true);
      
      return {
        address: poolAddress,
        tokenA: {
          mint: tokenAMint,
          decimals: tokenADecimals,
          reserve: tokenAReserve
        },
        tokenB: {
          mint: tokenBMint,
          decimals: tokenBDecimals,
          reserve: tokenBReserve
        },
        fee,
        tickSpacing,
        liquidity,
        sqrtPrice,
        currentTick,
        feeGrowthGlobalA,
        feeGrowthGlobalB,
        timestamp: 0, // Will be filled in later
        slot: 0 // Will be filled in later
      };
    } catch (error: any) {
      logger.error(`Error decoding pool data for ${poolAddress}`, { error });
      return null;
    }
  }

  /**
   * Read a 128-bit unsigned integer from a DataView
   * @param view DataView to read from
   * @param offset Offset to read from
   * @returns 128-bit unsigned integer as a BigInt
   */
  private readBigUint128(view: DataView, offset: number): bigint {
    const lo = view.getBigUint64(offset, true);
    const hi = view.getBigUint64(offset + 8, true);
    return (hi << 64n) | lo;
  }

  /**
   * Handle account change event
   * @param poolAddress Pool address
   * @param accountInfo Account information
   * @param context Context information
   */
  private handleAccountChange(poolAddress: string, accountInfo: any, context: any): void {
    logger.debug(`Account change detected for pool ${poolAddress}`, {
      slot: context.slot
    });
    
    // Decode and emit updated pool data
    const poolData = this.decodePoolData(poolAddress, accountInfo.data);
    
    if (poolData) {
      // Add timestamp and slot
      poolData.timestamp = Math.floor(Date.now() / 1000);
      poolData.slot = context.slot;
      
      // Emit data
      this.config.onData(poolData);
      
      logger.debug(`Updated data for pool ${poolAddress} from account change`, {
        tokenA: poolData.tokenA.mint,
        tokenB: poolData.tokenB.mint,
        liquidity: poolData.liquidity.toString(),
        slot: poolData.slot
      });
    }
  }
} 