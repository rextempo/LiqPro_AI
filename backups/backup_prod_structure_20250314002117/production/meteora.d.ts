import { DLMMPoolInfo } from '@meteora-ag/dlmm';
/**
 * Meteora DLMM Pool Collector
 * Responsible for fetching data from Meteora DLMM pools
 */
export declare class MeteoraPoolCollector {
    private connection;
    private dlmm;
    private poolCache;
    private lastUpdateTime;
    private updateInterval;
    /**
     * Create a new Meteora Pool Collector
     * @param rpcEndpoint Solana RPC endpoint
     * @param commitment Commitment level
     */
    constructor(rpcEndpoint: string, commitment?: 'processed' | 'confirmed' | 'finalized');
    /**
     * Fetch pool information for a specific pool
     * @param poolAddress Pool address
     * @param forceRefresh Force refresh the data even if cache is valid
     * @returns Pool information
     */
    getPoolInfo(poolAddress: string, forceRefresh?: boolean): Promise<DLMMPoolInfo>;
    /**
     * Fetch all pools for a specific token pair
     * @param tokenX Token X address
     * @param tokenY Token Y address
     * @returns Array of pool addresses
     */
    getPoolsForTokenPair(tokenX: string, tokenY: string): Promise<string[]>;
    /**
     * Fetch liquidity distribution for a pool
     * @param poolAddress Pool address
     * @returns Liquidity distribution data
     */
    getLiquidityDistribution(poolAddress: string): Promise<any>;
    /**
     * Calculate the price for a specific bin
     * @param binIndex Bin index
     * @param poolInfo Pool information
     * @returns Price at the bin
     */
    private calculateBinPrice;
    /**
     * Monitor large LP removals
     * @param poolAddress Pool address
     * @param thresholdPercentage Threshold percentage (0-100) to consider as large removal
     * @returns Object with removal data if detected, null otherwise
     */
    monitorLargeRemovals(poolAddress: string, thresholdPercentage?: number): Promise<any | null>;
    /**
     * Set the cache update interval
     * @param intervalMs Interval in milliseconds
     */
    setUpdateInterval(intervalMs: number): void;
    /**
     * Clear the cache for a specific pool or all pools
     * @param poolAddress Optional pool address to clear specific cache
     */
    clearCache(poolAddress?: string): void;
}
