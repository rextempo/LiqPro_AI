import { Finality } from '@solana/web3.js';
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
    rpcBackupEndpoint?: string;
    rpcCommitment: Finality;
    interval: number;
    onData: (data: PoolData) => void;
    meteoraProgramId: string;
}
/**
 * Pool Data Collector
 * Responsible for collecting data from liquidity pools
 */
export declare class PoolDataCollector {
    private connection;
    private config;
    private pollingTimer;
    private isRunning;
    private trackedPools;
    private subscriptions;
    /**
     * Create a new Pool Data Collector
     * @param config Collector configuration
     */
    constructor(config: PoolDataCollectorConfig);
    /**
     * Start collecting pool data
     */
    start(): Promise<void>;
    /**
     * Stop collecting pool data
     */
    stop(): void;
    /**
     * Track a pool for data collection
     * @param poolAddress Pool address
     */
    trackPool(poolAddress: string): Promise<void>;
    /**
     * Stop tracking a pool
     * @param poolAddress Pool address
     */
    untrackPool(poolAddress: string): void;
    /**
     * Get all tracked pools
     * @returns Array of tracked pool addresses
     */
    getTrackedPools(): string[];
    /**
     * Collect data for all tracked pools
     */
    private collectPoolData;
    /**
     * Collect data for a specific pool
     * @param poolAddress Pool address
     */
    private collectPoolDataForAddress;
    /**
     * Decode pool data from account data
     * @param poolAddress Pool address
     * @param data Account data buffer
     * @returns Decoded pool data or null if decoding fails
     */
    private decodePoolData;
    /**
     * Read a 128-bit unsigned integer from a DataView
     * @param view DataView to read from
     * @param offset Offset to read from
     * @returns 128-bit unsigned integer as a BigInt
     */
    private readBigUint128;
    /**
     * Handle account change event
     * @param poolAddress Pool address
     * @param accountInfo Account information
     * @param context Context information
     */
    private handleAccountChange;
}
