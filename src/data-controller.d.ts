export interface DataControllerConfig {
    rpcEndpoint: string;
    rpcCommitment: 'processed' | 'confirmed' | 'finalized';
    apiKeys: {
        coingecko?: string;
        coinmarketcap?: string;
        jupiter?: string;
    };
    poolDataInterval: number;
    marketPriceInterval: number;
    eventPollingInterval: number;
    storage: {
        hotDataThreshold: number;
        warmDataThreshold: number;
        maxHotDataPoints: number;
        compressWarmData: boolean;
        compressColdData: boolean;
        enableAutoArchiving: boolean;
        archiveInterval: number;
    };
    whaleMonitoring: {
        minValueUSD: number;
        minPoolPercentage: number;
    };
}
export interface PoolData {
    poolAddress: string;
    timestamp: number;
    tokenX: {
        mint: string;
        symbol: string;
        decimals: number;
        price: number;
        reserve: number;
    };
    tokenY: {
        mint: string;
        symbol: string;
        decimals: number;
        price: number;
        reserve: number;
    };
    liquidity: number;
    volume24h: number;
    fees24h: number;
    apy: number;
    tvl: number;
    priceRatio: number;
}
export interface WhaleActivity {
    id: string;
    poolAddress: string;
    timestamp: number;
    type: 'swap' | 'deposit' | 'withdraw';
    tokenX: {
        mint: string;
        symbol: string;
        amount: number;
        valueUSD: number;
    };
    tokenY: {
        mint: string;
        symbol: string;
        amount: number;
        valueUSD: number;
    };
    totalValueUSD: number;
    percentOfPool: number;
    walletAddress: string;
}
export interface StorageStats {
    hotDataSize: number;
    warmDataSize: number;
    coldDataSize: number;
    totalDataPoints: number;
    poolCount: number;
    oldestDataTimestamp: number;
    newestDataTimestamp: number;
}
export interface PoolSubscription {
    unsubscribe: () => void;
}
export declare enum TimePeriod {
    HOUR_1 = "1h",
    HOUR_4 = "4h",
    HOUR_12 = "12h",
    DAY_1 = "1d",
    WEEK_1 = "1w",
    MONTH_1 = "1m"
}
export declare class DataController {
    private config;
    private isRunning;
    private poolSubscriptions;
    private trackedPools;
    private poolData;
    private whaleActivities;
    constructor(config: DataControllerConfig);
    /**
     * Start all data collection and processing
     */
    start(): Promise<void>;
    /**
     * Stop all data collection and processing
     */
    stop(): void;
    /**
     * Start tracking a specific liquidity pool
     */
    trackPool(poolAddress: string, name?: string, description?: string): Promise<void>;
    /**
     * Stop tracking a specific liquidity pool
     */
    untrackPool(poolAddress: string): Promise<void>;
    /**
     * Get list of all tracked pools
     */
    getTrackedPools(): Promise<any[]>;
    /**
     * Get aggregated data for a specific pool
     */
    getAggregatedData(poolAddress: string, timeframe: string, resolution: string): Promise<any[]>;
    /**
     * Get raw data points for a specific pool
     */
    getRawData(poolAddress: string, startTime?: number, endTime?: number, limit?: number): Promise<PoolData[]>;
    /**
     * Get the latest data point for a specific pool
     */
    getLatestDataPoint(poolAddress: string): Promise<PoolData | null>;
    /**
     * Get whale activities based on filters
     */
    getWhaleActivities(poolAddress?: string, startTime?: number, endTime?: number, limit?: number): Promise<WhaleActivity[]>;
    /**
     * Get storage statistics
     */
    getStorageStats(): Promise<StorageStats>;
    /**
     * Subscribe to real-time updates for a specific pool
     */
    subscribeToPoolUpdates(poolAddress: string, callback: (data: any) => void): PoolSubscription;
    private notifyPoolSubscribers;
}
