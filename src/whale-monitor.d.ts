import { PoolEvent } from './pool-events';
/**
 * Whale Activity Type
 */
export declare enum WhaleActivityType {
    LARGE_DEPOSIT = "large_deposit",
    LARGE_WITHDRAWAL = "large_withdrawal",
    POSITION_CHANGE = "position_change",
    MULTIPLE_POOL_ACTION = "multiple_pool_action"
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
    minValueUSD: number;
    minPoolPercentage: number;
    multiPoolTimeWindow: number;
    minPoolCount: number;
}
/**
 * Whale Monitor
 * Responsible for monitoring large liquidity providers (whales) in Meteora pools
 */
export declare class WhaleMonitor {
    private connection;
    private config;
    private whaleActivities;
    private walletActivities;
    private callbacks;
    /**
     * Create a new Whale Monitor
     * @param rpcEndpoint Solana RPC endpoint
     * @param config Whale monitor configuration
     */
    constructor(rpcEndpoint: string, config?: Partial<WhaleMonitorConfig>);
    /**
     * Process a pool event to detect whale activity
     * @param event Pool event
     * @param poolLiquidityUSD Total pool liquidity in USD
     * @param tokenPrices Token prices in USD
     */
    processPoolEvent(event: PoolEvent, poolLiquidityUSD: number, tokenPrices: Record<string, number>): void;
    /**
     * Extract wallet address from event data
     * @param event Pool event
     * @returns Wallet address or null if not found
     */
    private extractWalletAddress;
    /**
     * Calculate event value in USD
     * @param event Pool event
     * @param tokenPrices Token prices in USD
     * @returns Total value in USD
     */
    private calculateEventValueUSD;
    /**
     * Update wallet activities for multi-pool detection
     * @param walletAddress Wallet address
     * @param poolAddress Pool address
     * @param timestamp Activity timestamp
     */
    private updateWalletActivities;
    /**
     * Check for multi-pool activity
     * @param walletAddress Wallet address
     */
    private checkMultiPoolActivity;
    /**
     * Register a callback for whale activity notifications
     * @param callback Callback function
     */
    onWhaleActivity(callback: (activity: WhaleActivity) => void): void;
    /**
     * Notify all callbacks about a whale activity
     * @param activity Whale activity
     */
    private notifyCallbacks;
    /**
     * Get recent whale activities
     * @param timeWindowMs Time window in milliseconds (default: 24 hours)
     * @returns Array of recent whale activities
     */
    getRecentActivities(timeWindowMs?: number): WhaleActivity[];
    /**
     * Get whale activities for a specific wallet
     * @param walletAddress Wallet address
     * @param timeWindowMs Time window in milliseconds (default: 7 days)
     * @returns Array of whale activities for the wallet
     */
    getWalletActivities(walletAddress: string, timeWindowMs?: number): WhaleActivity[];
    /**
     * Get whale activities for a specific pool
     * @param poolAddress Pool address
     * @param timeWindowMs Time window in milliseconds (default: 7 days)
     * @returns Array of whale activities for the pool
     */
    getPoolActivities(poolAddress: string, timeWindowMs?: number): WhaleActivity[];
    /**
     * Update whale monitor configuration
     * @param config New configuration (partial)
     */
    updateConfig(config: Partial<WhaleMonitorConfig>): void;
}
