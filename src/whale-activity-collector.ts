import { createLogger } from '@liqpro/monitoring';
import { EventCollector, EventType, PoolEvent } from './event-collector';
import { Connection, Finality } from '@solana/web3.js';

const logger = createLogger('data-service:whale-activity-collector');

/**
 * Whale activity data structure
 */
export interface WhaleActivity {
  id: string;
  poolAddress: string;
  type: EventType;
  signature: string;
  blockTime: number;
  slot: number;
  tokenA: {
    mint: string;
    amount: string;
    usdValue?: number;
  };
  tokenB: {
    mint: string;
    amount: string;
    usdValue?: number;
  };
  totalUsdValue?: number;
  walletAddress: string;
}

/**
 * Configuration for the WhaleActivityCollector
 */
export interface WhaleActivityCollectorConfig {
  rpcEndpoint: string;
  rpcBackupEndpoint?: string;
  rpcCommitment: Finality;
  interval: number;
  onActivity: (activity: WhaleActivity) => void;
  thresholds: {
    swapUsdValue: number;
    depositUsdValue: number;
    withdrawUsdValue: number;
  };
  getPriceForToken: (tokenMint: string) => Promise<number | undefined>;
}

/**
 * Whale Activity Collector
 * Responsible for monitoring and detecting large transactions in liquidity pools
 */
export class WhaleActivityCollector {
  private eventCollector: EventCollector;
  private config: WhaleActivityCollectorConfig;
  private connection: Connection;
  private isRunning: boolean = false;
  private trackedPools: Set<string> = new Set();

  /**
   * Create a new Whale Activity Collector
   * @param config Collector configuration
   */
  constructor(config: WhaleActivityCollectorConfig) {
    this.config = config;
    this.connection = new Connection(config.rpcEndpoint, config.rpcCommitment);

    // Initialize event collector
    this.eventCollector = new EventCollector({
      rpcEndpoint: config.rpcEndpoint,
      rpcCommitment: config.rpcCommitment,
      interval: config.interval,
      onEvent: this.handleEvent.bind(this),
    });

    logger.info('Whale Activity Collector initialized', {
      rpcEndpoint: config.rpcEndpoint,
      interval: config.interval,
      thresholds: config.thresholds,
    });
  }

  /**
   * Start monitoring whale activity
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.info('Whale Activity Collector is already running');
      return;
    }

    logger.info('Starting Whale Activity Collector');

    // Start event collector
    await this.eventCollector.start();

    this.isRunning = true;
    logger.info('Whale Activity Collector started');
  }

  /**
   * Stop monitoring whale activity
   */
  stop(): void {
    if (!this.isRunning) {
      logger.info('Whale Activity Collector is not running');
      return;
    }

    logger.info('Stopping Whale Activity Collector');

    // Stop event collector
    this.eventCollector.stop();

    this.isRunning = false;
    logger.info('Whale Activity Collector stopped');
  }

  /**
   * Track a pool for whale activity
   * @param poolAddress Pool address
   */
  async trackPool(poolAddress: string): Promise<void> {
    if (this.trackedPools.has(poolAddress)) {
      logger.info(`Pool ${poolAddress} is already being tracked for whale activity`);
      return;
    }

    try {
      // Add to tracked pools
      this.trackedPools.add(poolAddress);

      // Start tracking events for this pool
      await this.eventCollector.trackPool(poolAddress);

      logger.info(`Started tracking whale activity for pool ${poolAddress}`);
    } catch (error: any) {
      logger.error(`Failed to track whale activity for pool ${poolAddress}`, { error });
      throw new Error(`Failed to track whale activity: ${error.message}`);
    }
  }

  /**
   * Stop tracking a pool for whale activity
   * @param poolAddress Pool address
   */
  untrackPool(poolAddress: string): void {
    if (!this.trackedPools.has(poolAddress)) {
      logger.info(`Pool ${poolAddress} is not being tracked for whale activity`);
      return;
    }

    // Stop tracking events for this pool
    this.eventCollector.untrackPool(poolAddress);

    this.trackedPools.delete(poolAddress);
    logger.info(`Stopped tracking whale activity for pool ${poolAddress}`);
  }

  /**
   * Get all tracked pools
   * @returns Array of tracked pool addresses
   */
  getTrackedPools(): string[] {
    return Array.from(this.trackedPools);
  }

  /**
   * Handle an event from the event collector
   * @param event Pool event
   */
  private async handleEvent(event: PoolEvent): Promise<void> {
    try {
      // Only process swap, deposit, and withdraw events
      if (![EventType.SWAP, EventType.DEPOSIT, EventType.WITHDRAW].includes(event.type)) {
        return;
      }

      // Parse event data to extract token amounts and wallet address
      const { tokenAMint, tokenBMint, tokenAAmount, tokenBAmount, walletAddress } =
        await this.parseEventData(event);

      if (!tokenAMint || !tokenBMint || !tokenAAmount || !tokenBAmount || !walletAddress) {
        logger.debug(`Skipping event ${event.id} due to missing data`);
        return;
      }

      // Get token prices
      const tokenAPrice = await this.config.getPriceForToken(tokenAMint);
      const tokenBPrice = await this.config.getPriceForToken(tokenBMint);

      // Calculate USD values
      const tokenAUsdValue = tokenAPrice ? parseFloat(tokenAAmount) * tokenAPrice : undefined;
      const tokenBUsdValue = tokenBPrice ? parseFloat(tokenBAmount) * tokenBPrice : undefined;

      // Calculate total USD value
      const totalUsdValue = (tokenAUsdValue || 0) + (tokenBUsdValue || 0);

      // Check if this is a whale activity based on thresholds
      const isWhaleActivity = this.isWhaleActivity(event.type, totalUsdValue);

      if (!isWhaleActivity) {
        return;
      }

      // Create whale activity object
      const whaleActivity: WhaleActivity = {
        id: event.id,
        poolAddress: event.poolAddress,
        type: event.type,
        signature: event.signature,
        blockTime: event.blockTime,
        slot: event.slot,
        tokenA: {
          mint: tokenAMint,
          amount: tokenAAmount,
          usdValue: tokenAUsdValue,
        },
        tokenB: {
          mint: tokenBMint,
          amount: tokenBAmount,
          usdValue: tokenBUsdValue,
        },
        totalUsdValue,
        walletAddress,
      };

      // Emit whale activity
      this.config.onActivity(whaleActivity);

      logger.info(`Detected whale activity in pool ${event.poolAddress}`, {
        type: event.type,
        signature: event.signature,
        totalUsdValue,
        walletAddress,
      });
    } catch (error: any) {
      logger.error(`Error handling event ${event.id}`, { error });
    }
  }

  /**
   * Parse event data to extract token amounts and wallet address
   * @param event Pool event
   * @returns Parsed event data
   */
  private async parseEventData(event: PoolEvent): Promise<{
    tokenAMint?: string;
    tokenBMint?: string;
    tokenAAmount?: string;
    tokenBAmount?: string;
    walletAddress?: string;
  }> {
    try {
      // This is a simplified implementation
      // In a real implementation, you would need to decode the transaction data
      // and extract the token amounts and wallet address

      // For demonstration purposes, we'll use a mock implementation
      // that extracts some basic information from the event data

      // Get transaction details
      const txDetails = await this.connection.getTransaction(event.signature, {
        commitment: this.config.rpcCommitment,
      });

      if (!txDetails) {
        logger.error(`Transaction ${event.signature} not found`);
        return {};
      }

      // Extract wallet address (simplified)
      // In a real implementation, you would need to identify the wallet address
      // based on the transaction data and program knowledge
      const walletAddress = txDetails.transaction.message.accountKeys[0].toString();

      // Extract token mints and amounts (simplified)
      // In a real implementation, you would need to decode the instruction data
      // and extract the token mints and amounts based on the program knowledge

      // For now, we'll use a mock implementation
      // that extracts some basic information from the log messages
      const logMessages = txDetails.meta?.logMessages || [];
      const logs = logMessages.join('\n');

      // Extract token mints (simplified)
      const tokenAMintMatch = logs.match(/Token A: ([a-zA-Z0-9]{32,44})/);
      const tokenBMintMatch = logs.match(/Token B: ([a-zA-Z0-9]{32,44})/);

      const tokenAMint = tokenAMintMatch ? tokenAMintMatch[1] : undefined;
      const tokenBMint = tokenBMintMatch ? tokenBMintMatch[1] : undefined;

      // Extract token amounts (simplified)
      const tokenAAmountMatch = logs.match(/Amount A: ([0-9.]+)/);
      const tokenBAmountMatch = logs.match(/Amount B: ([0-9.]+)/);

      const tokenAAmount = tokenAAmountMatch ? tokenAAmountMatch[1] : undefined;
      const tokenBAmount = tokenBAmountMatch ? tokenBAmountMatch[1] : undefined;

      return {
        tokenAMint,
        tokenBMint,
        tokenAAmount,
        tokenBAmount,
        walletAddress,
      };
    } catch (error: any) {
      logger.error(`Error parsing event data for ${event.id}`, { error });
      return {};
    }
  }

  /**
   * Check if an event is a whale activity based on thresholds
   * @param eventType Event type
   * @param usdValue USD value of the transaction
   * @returns Whether this is a whale activity
   */
  private isWhaleActivity(eventType: EventType, usdValue: number): boolean {
    if (!usdValue) return false;

    switch (eventType) {
      case EventType.SWAP:
        return usdValue >= this.config.thresholds.swapUsdValue;
      case EventType.DEPOSIT:
        return usdValue >= this.config.thresholds.depositUsdValue;
      case EventType.WITHDRAW:
        return usdValue >= this.config.thresholds.withdrawUsdValue;
      default:
        return false;
    }
  }
}
