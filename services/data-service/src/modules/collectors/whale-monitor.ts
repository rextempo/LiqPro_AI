import { Connection, PublicKey } from '@solana/web3.js';
import { createLogger } from '@liqpro/monitoring';
import { PoolEvent, PoolEventType } from './pool-events';

const logger = createLogger('data-service:whale-monitor');

/**
 * Whale Activity Type
 */
export enum WhaleActivityType {
  LARGE_DEPOSIT = 'large_deposit',
  LARGE_WITHDRAWAL = 'large_withdrawal',
  POSITION_CHANGE = 'position_change',
  MULTIPLE_POOL_ACTION = 'multiple_pool_action',
}

/**
 * Whale Activity Interface
 */
export interface WhaleActivity {
  type: WhaleActivityType;
  walletAddress: string;
  poolAddresses: string[];
  timestamp: number;
  totalValueUSD: number;
  details: any;
}

/**
 * Whale Monitor Configuration
 */
export interface WhaleMonitorConfig {
  // Minimum USD value to consider as a whale activity
  minValueUSD: number;
  // Minimum percentage of pool liquidity to consider as significant
  minPoolPercentage: number;
  // Time window to detect multiple pool actions (in milliseconds)
  multiPoolTimeWindow: number;
  // Minimum number of pools for multiple pool action detection
  minPoolCount: number;
}

/**
 * Whale Monitor
 * Responsible for monitoring large liquidity providers (whales) in Meteora pools
 */
export class WhaleMonitor {
  private connection: Connection;
  private config: WhaleMonitorConfig;
  private whaleActivities: WhaleActivity[] = [];
  private walletActivities: Map<string, { timestamp: number; pools: Set<string> }> = new Map();
  private callbacks: ((activity: WhaleActivity) => void)[] = [];

  /**
   * Create a new Whale Monitor
   * @param rpcEndpoint Solana RPC endpoint
   * @param config Whale monitor configuration
   */
  constructor(rpcEndpoint: string, config: Partial<WhaleMonitorConfig> = {}) {
    this.connection = new Connection(rpcEndpoint);

    // Default configuration
    this.config = {
      minValueUSD: 50000, // $50,000
      minPoolPercentage: 5, // 5% of pool liquidity
      multiPoolTimeWindow: 60 * 60 * 1000, // 1 hour
      minPoolCount: 3, // 3 pools
      ...config,
    };

    logger.info('Whale Monitor initialized', { config: this.config });
  }

  /**
   * Process a pool event to detect whale activity
   * @param event Pool event
   * @param poolLiquidityUSD Total pool liquidity in USD
   * @param tokenPrices Token prices in USD
   */
  processPoolEvent(
    event: PoolEvent,
    poolLiquidityUSD: number,
    tokenPrices: Record<string, number>
  ): void {
    try {
      // Only process deposit, withdraw, and position events
      if (
        ![
          PoolEventType.DEPOSIT,
          PoolEventType.WITHDRAW,
          PoolEventType.POSITION_CREATED,
          PoolEventType.POSITION_MODIFIED,
          PoolEventType.POSITION_CLOSED,
        ].includes(event.type)
      ) {
        return;
      }

      // Extract wallet address from event data
      const walletAddress = this.extractWalletAddress(event);
      if (!walletAddress) {
        return;
      }

      // Calculate total value in USD
      const valueUSD = this.calculateEventValueUSD(event, tokenPrices);
      if (valueUSD === 0) {
        return;
      }

      // Check if this is a whale activity based on absolute value
      const isWhaleByValue = valueUSD >= this.config.minValueUSD;

      // Check if this is a whale activity based on pool percentage
      const poolPercentage = (valueUSD / poolLiquidityUSD) * 100;
      const isWhaleByPercentage = poolPercentage >= this.config.minPoolPercentage;

      // If this is a whale activity, record it
      if (isWhaleByValue || isWhaleByPercentage) {
        let activityType: WhaleActivityType;

        switch (event.type) {
          case PoolEventType.DEPOSIT:
          case PoolEventType.POSITION_CREATED:
            activityType = WhaleActivityType.LARGE_DEPOSIT;
            break;
          case PoolEventType.WITHDRAW:
          case PoolEventType.POSITION_CLOSED:
            activityType = WhaleActivityType.LARGE_WITHDRAWAL;
            break;
          default:
            activityType = WhaleActivityType.POSITION_CHANGE;
        }

        // Record whale activity
        const activity: WhaleActivity = {
          type: activityType,
          walletAddress,
          poolAddresses: [event.poolAddress],
          timestamp: event.blockTime * 1000, // Convert to milliseconds
          totalValueUSD: valueUSD,
          details: {
            eventType: event.type,
            signature: event.signature,
            poolPercentage,
            isWhaleByValue,
            isWhaleByPercentage,
            eventData: event.data,
          },
        };

        this.whaleActivities.push(activity);

        // Notify callbacks
        this.notifyCallbacks(activity);

        // Update wallet activities for multi-pool detection
        this.updateWalletActivities(walletAddress, event.poolAddress, event.blockTime * 1000);

        // Check for multi-pool activity
        this.checkMultiPoolActivity(walletAddress);

        logger.info(`Detected whale activity: ${activityType}`, {
          walletAddress,
          poolAddress: event.poolAddress,
          valueUSD,
          poolPercentage,
        });
      }
    } catch (error) {
      logger.error('Error processing event for whale activity', { error, event });
    }
  }

  /**
   * Extract wallet address from event data
   * @param event Pool event
   * @returns Wallet address or null if not found
   */
  private extractWalletAddress(event: PoolEvent): string | null {
    try {
      // This is a simplified implementation
      // In a real implementation, you would need to analyze the transaction data
      // to extract the wallet address that initiated the action

      // For now, we'll assume the wallet address is in the event data
      if (event.data?.tokenBalances?.pre?.[0]?.owner) {
        return event.data.tokenBalances.pre[0].owner;
      }

      return null;
    } catch (error) {
      logger.error('Error extracting wallet address', { error, event });
      return null;
    }
  }

  /**
   * Calculate event value in USD
   * @param event Pool event
   * @param tokenPrices Token prices in USD
   * @returns Total value in USD
   */
  private calculateEventValueUSD(event: PoolEvent, tokenPrices: Record<string, number>): number {
    try {
      // This is a simplified implementation
      // In a real implementation, you would need to analyze the transaction data
      // to calculate the exact value of the action in USD

      let totalValueUSD = 0;

      // Calculate value based on token balances
      if (event.data?.tokenBalances) {
        const { pre, post } = event.data.tokenBalances;

        // Calculate value for each token
        for (const preBalance of pre) {
          const postBalance = post.find((b: any) => b.mint === preBalance.mint);

          if (postBalance) {
            const tokenMint = preBalance.mint;
            const tokenPrice = tokenPrices[tokenMint] || 0;

            // Calculate token amount change
            const preAmount =
              parseInt(preBalance.uiTokenAmount.amount) / 10 ** preBalance.uiTokenAmount.decimals;
            const postAmount =
              parseInt(postBalance.uiTokenAmount.amount) / 10 ** postBalance.uiTokenAmount.decimals;
            const amountChange = Math.abs(postAmount - preAmount);

            // Calculate value in USD
            const valueUSD = amountChange * tokenPrice;
            totalValueUSD += valueUSD;
          }
        }
      }

      return totalValueUSD;
    } catch (error) {
      logger.error('Error calculating event value', { error, event });
      return 0;
    }
  }

  /**
   * Update wallet activities for multi-pool detection
   * @param walletAddress Wallet address
   * @param poolAddress Pool address
   * @param timestamp Activity timestamp
   */
  private updateWalletActivities(
    walletAddress: string,
    poolAddress: string,
    timestamp: number
  ): void {
    // Get or create wallet activity
    if (!this.walletActivities.has(walletAddress)) {
      this.walletActivities.set(walletAddress, {
        timestamp,
        pools: new Set([poolAddress]),
      });
    } else {
      const activity = this.walletActivities.get(walletAddress)!;

      // Update timestamp to the most recent activity
      activity.timestamp = Math.max(activity.timestamp, timestamp);

      // Add pool to the set
      activity.pools.add(poolAddress);
    }
  }

  /**
   * Check for multi-pool activity
   * @param walletAddress Wallet address
   */
  private checkMultiPoolActivity(walletAddress: string): void {
    const activity = this.walletActivities.get(walletAddress);
    if (!activity) {
      return;
    }

    // Check if the wallet has activity in multiple pools
    if (activity.pools.size >= this.config.minPoolCount) {
      // Get recent whale activities for this wallet
      const now = Date.now();
      const timeWindow = this.config.multiPoolTimeWindow;
      const recentActivities = this.whaleActivities.filter(
        a => a.walletAddress === walletAddress && now - a.timestamp <= timeWindow
      );

      // Calculate total value
      const totalValueUSD = recentActivities.reduce((sum, a) => sum + a.totalValueUSD, 0);

      // Create multi-pool activity
      const multiPoolActivity: WhaleActivity = {
        type: WhaleActivityType.MULTIPLE_POOL_ACTION,
        walletAddress,
        poolAddresses: Array.from(activity.pools),
        timestamp: activity.timestamp,
        totalValueUSD,
        details: {
          poolCount: activity.pools.size,
          timeWindow,
          recentActivities: recentActivities.map(a => ({
            type: a.type,
            poolAddress: a.poolAddresses[0],
            timestamp: a.timestamp,
            valueUSD: a.totalValueUSD,
          })),
        },
      };

      // Add to whale activities
      this.whaleActivities.push(multiPoolActivity);

      // Notify callbacks
      this.notifyCallbacks(multiPoolActivity);

      logger.info(`Detected multi-pool whale activity`, {
        walletAddress,
        poolCount: activity.pools.size,
        totalValueUSD,
      });

      // Reset pools for this wallet to avoid duplicate alerts
      activity.pools.clear();
    }
  }

  /**
   * Register a callback for whale activity notifications
   * @param callback Callback function
   */
  onWhaleActivity(callback: (activity: WhaleActivity) => void): void {
    this.callbacks.push(callback);
    logger.info('Registered whale activity callback');
  }

  /**
   * Notify all callbacks about a whale activity
   * @param activity Whale activity
   */
  private notifyCallbacks(activity: WhaleActivity): void {
    for (const callback of this.callbacks) {
      try {
        callback(activity);
      } catch (error) {
        logger.error('Error in whale activity callback', { error });
      }
    }
  }

  /**
   * Get recent whale activities
   * @param timeWindowMs Time window in milliseconds (default: 24 hours)
   * @returns Array of recent whale activities
   */
  getRecentActivities(timeWindowMs: number = 24 * 60 * 60 * 1000): WhaleActivity[] {
    const now = Date.now();
    return this.whaleActivities.filter(activity => now - activity.timestamp <= timeWindowMs);
  }

  /**
   * Get whale activities for a specific wallet
   * @param walletAddress Wallet address
   * @param timeWindowMs Time window in milliseconds (default: 7 days)
   * @returns Array of whale activities for the wallet
   */
  getWalletActivities(
    walletAddress: string,
    timeWindowMs: number = 7 * 24 * 60 * 60 * 1000
  ): WhaleActivity[] {
    const now = Date.now();
    return this.whaleActivities.filter(
      activity =>
        activity.walletAddress === walletAddress && now - activity.timestamp <= timeWindowMs
    );
  }

  /**
   * Get whale activities for a specific pool
   * @param poolAddress Pool address
   * @param timeWindowMs Time window in milliseconds (default: 7 days)
   * @returns Array of whale activities for the pool
   */
  getPoolActivities(
    poolAddress: string,
    timeWindowMs: number = 7 * 24 * 60 * 60 * 1000
  ): WhaleActivity[] {
    const now = Date.now();
    return this.whaleActivities.filter(
      activity =>
        activity.poolAddresses.includes(poolAddress) && now - activity.timestamp <= timeWindowMs
    );
  }

  /**
   * Update whale monitor configuration
   * @param config New configuration (partial)
   */
  updateConfig(config: Partial<WhaleMonitorConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };

    logger.info('Updated whale monitor configuration', { config: this.config });
  }
}
