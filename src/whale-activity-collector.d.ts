import { EventType } from './event-collector';
import { Finality } from '@solana/web3.js';
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
export declare class WhaleActivityCollector {
    private eventCollector;
    private config;
    private connection;
    private isRunning;
    private trackedPools;
    /**
     * Create a new Whale Activity Collector
     * @param config Collector configuration
     */
    constructor(config: WhaleActivityCollectorConfig);
    /**
     * Start monitoring whale activity
     */
    start(): Promise<void>;
    /**
     * Stop monitoring whale activity
     */
    stop(): void;
    /**
     * Track a pool for whale activity
     * @param poolAddress Pool address
     */
    trackPool(poolAddress: string): Promise<void>;
    /**
     * Stop tracking a pool for whale activity
     * @param poolAddress Pool address
     */
    untrackPool(poolAddress: string): void;
    /**
     * Get all tracked pools
     * @returns Array of tracked pool addresses
     */
    getTrackedPools(): string[];
    /**
     * Handle an event from the event collector
     * @param event Pool event
     */
    private handleEvent;
    /**
     * Parse event data to extract token amounts and wallet address
     * @param event Pool event
     * @returns Parsed event data
     */
    private parseEventData;
    /**
     * Check if an event is a whale activity based on thresholds
     * @param eventType Event type
     * @param usdValue USD value of the transaction
     * @returns Whether this is a whale activity
     */
    private isWhaleActivity;
}
