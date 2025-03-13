/**
 * Time Period for aggregation
 */
export declare enum TimePeriod {
    MINUTE_1 = "1m",
    MINUTE_5 = "5m",
    MINUTE_15 = "15m",
    MINUTE_30 = "30m",
    HOUR_1 = "1h",
    HOUR_4 = "4h",
    HOUR_12 = "12h",
    DAY_1 = "1d",
    WEEK_1 = "1w"
}
/**
 * Pool Data Point Interface
 */
export interface PoolDataPoint {
    poolAddress: string;
    timestamp: number;
    price: number;
    volume: number;
    liquidity: number;
    fees: number;
    binCount: number;
    activePositions: number;
    tokenXReserve: number;
    tokenYReserve: number;
    [key: string]: any;
}
/**
 * Aggregated Pool Data Interface
 */
export interface AggregatedPoolData {
    poolAddress: string;
    period: TimePeriod;
    startTime: number;
    endTime: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    volumeChange: number;
    liquidityAvg: number;
    liquidityChange: number;
    fees: number;
    binCountAvg: number;
    activePositionsAvg: number;
    tokenXReserveAvg: number;
    tokenYReserveAvg: number;
    dataPoints: number;
    [key: string]: any;
}
/**
 * Data Aggregator
 * Responsible for aggregating and normalizing market data
 */
export declare class DataAggregator {
    private poolData;
    private aggregatedData;
    private maxDataPoints;
    /**
     * Create a new Data Aggregator
     */
    constructor();
    /**
     * Add a data point for a pool
     * @param dataPoint Pool data point
     */
    addDataPoint(dataPoint: PoolDataPoint): void;
    /**
     * Aggregate data for a pool
     * @param poolAddress Pool address
     * @param period Time period
     * @param count Number of periods to aggregate (default: 1)
     * @returns Aggregated data
     */
    aggregateData(poolAddress: string, period: TimePeriod, count?: number): AggregatedPoolData[];
    /**
     * Calculate average value for a property
     * @param dataPoints Data points
     * @param property Property name
     * @returns Average value
     */
    private calculateAverage;
    /**
     * Get aggregated data for a pool
     * @param poolAddress Pool address
     * @param period Time period
     * @param count Number of periods to get (default: 1)
     * @returns Aggregated data
     */
    getAggregatedData(poolAddress: string, period: TimePeriod, count?: number): AggregatedPoolData[];
    /**
     * Get raw data points for a pool
     * @param poolAddress Pool address
     * @param startTime Start time in milliseconds
     * @param endTime End time in milliseconds
     * @returns Raw data points
     */
    getRawData(poolAddress: string, startTime: number, endTime: number): PoolDataPoint[];
    /**
     * Get the latest data point for a pool
     * @param poolAddress Pool address
     * @returns Latest data point or null if not found
     */
    getLatestDataPoint(poolAddress: string): PoolDataPoint | null;
    /**
     * Clear data for a pool
     * @param poolAddress Pool address
     */
    clearPoolData(poolAddress: string): void;
    /**
     * Set the maximum number of data points to store per pool
     * @param maxDataPoints Maximum number of data points
     */
    setMaxDataPoints(maxDataPoints: number): void;
}
