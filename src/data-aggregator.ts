import { createLogger } from '@liqpro/monitoring';

const logger = createLogger('data-service:data-aggregator');

/**
 * Time Period for aggregation
 */
export enum TimePeriod {
  MINUTE_1 = '1m',
  MINUTE_5 = '5m',
  MINUTE_15 = '15m',
  MINUTE_30 = '30m',
  HOUR_1 = '1h',
  HOUR_4 = '4h',
  HOUR_12 = '12h',
  DAY_1 = '1d',
  WEEK_1 = '1w',
}

/**
 * Time period in milliseconds
 */
const TIME_PERIOD_MS: Record<TimePeriod, number> = {
  [TimePeriod.MINUTE_1]: 60 * 1000,
  [TimePeriod.MINUTE_5]: 5 * 60 * 1000,
  [TimePeriod.MINUTE_15]: 15 * 60 * 1000,
  [TimePeriod.MINUTE_30]: 30 * 60 * 1000,
  [TimePeriod.HOUR_1]: 60 * 60 * 1000,
  [TimePeriod.HOUR_4]: 4 * 60 * 60 * 1000,
  [TimePeriod.HOUR_12]: 12 * 60 * 60 * 1000,
  [TimePeriod.DAY_1]: 24 * 60 * 60 * 1000,
  [TimePeriod.WEEK_1]: 7 * 24 * 60 * 60 * 1000,
};

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
  [key: string]: any; // Allow additional properties
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
  [key: string]: any; // Allow additional properties
}

/**
 * Data Aggregator
 * Responsible for aggregating and normalizing market data
 */
export class DataAggregator {
  private poolData: Map<string, PoolDataPoint[]> = new Map();
  private aggregatedData: Map<string, AggregatedPoolData[]> = new Map();
  private maxDataPoints: number = 10000; // Maximum number of data points to store per pool

  /**
   * Create a new Data Aggregator
   */
  constructor() {
    logger.info('Data Aggregator initialized');
  }

  /**
   * Add a data point for a pool
   * @param dataPoint Pool data point
   */
  addDataPoint(dataPoint: PoolDataPoint): void {
    const { poolAddress } = dataPoint;

    // Get or create pool data array
    if (!this.poolData.has(poolAddress)) {
      this.poolData.set(poolAddress, []);
    }

    const poolDataPoints = this.poolData.get(poolAddress)!;

    // Add data point
    poolDataPoints.push(dataPoint);

    // Sort by timestamp (newest first)
    poolDataPoints.sort((a, b) => b.timestamp - a.timestamp);

    // Limit the number of data points
    if (poolDataPoints.length > this.maxDataPoints) {
      poolDataPoints.length = this.maxDataPoints;
    }

    logger.debug(`Added data point for pool ${poolAddress}`, { timestamp: dataPoint.timestamp });
  }

  /**
   * Aggregate data for a pool
   * @param poolAddress Pool address
   * @param period Time period
   * @param count Number of periods to aggregate (default: 1)
   * @returns Aggregated data
   */
  aggregateData(poolAddress: string, period: TimePeriod, count: number = 1): AggregatedPoolData[] {
    try {
      const poolDataPoints = this.poolData.get(poolAddress) || [];

      if (poolDataPoints.length === 0) {
        return [];
      }

      const periodMs = TIME_PERIOD_MS[period];
      const now = Date.now();
      const result: AggregatedPoolData[] = [];

      // Aggregate data for each period
      for (let i = 0; i < count; i++) {
        const endTime = now - i * periodMs;
        const startTime = endTime - periodMs;

        // Filter data points for this period
        const periodDataPoints = poolDataPoints.filter(
          dp => dp.timestamp >= startTime && dp.timestamp < endTime
        );

        if (periodDataPoints.length === 0) {
          continue;
        }

        // Calculate aggregated values
        const firstPoint = periodDataPoints[periodDataPoints.length - 1]; // Oldest in period
        const lastPoint = periodDataPoints[0]; // Newest in period

        // Find high and low prices
        const highPrice = Math.max(...periodDataPoints.map(dp => dp.price));
        const lowPrice = Math.min(...periodDataPoints.map(dp => dp.price));

        // Calculate averages
        const liquidityAvg = this.calculateAverage(periodDataPoints, 'liquidity');
        const binCountAvg = this.calculateAverage(periodDataPoints, 'binCount');
        const activePositionsAvg = this.calculateAverage(periodDataPoints, 'activePositions');
        const tokenXReserveAvg = this.calculateAverage(periodDataPoints, 'tokenXReserve');
        const tokenYReserveAvg = this.calculateAverage(periodDataPoints, 'tokenYReserve');

        // Calculate total volume and fees
        const volume = periodDataPoints.reduce((sum, dp) => sum + dp.volume, 0);
        const fees = periodDataPoints.reduce((sum, dp) => sum + dp.fees, 0);

        // Calculate changes
        const previousPeriodEnd = startTime;
        const previousPeriodStart = previousPeriodEnd - periodMs;

        const previousPeriodDataPoints = poolDataPoints.filter(
          dp => dp.timestamp >= previousPeriodStart && dp.timestamp < previousPeriodEnd
        );

        let volumeChange = 0;
        let liquidityChange = 0;

        if (previousPeriodDataPoints.length > 0) {
          const previousVolume = previousPeriodDataPoints.reduce((sum, dp) => sum + dp.volume, 0);
          volumeChange =
            previousVolume > 0 ? ((volume - previousVolume) / previousVolume) * 100 : 0;

          const previousLiquidityAvg = this.calculateAverage(previousPeriodDataPoints, 'liquidity');
          liquidityChange =
            previousLiquidityAvg > 0
              ? ((liquidityAvg - previousLiquidityAvg) / previousLiquidityAvg) * 100
              : 0;
        }

        // Create aggregated data
        const aggregatedData: AggregatedPoolData = {
          poolAddress,
          period,
          startTime,
          endTime,
          open: firstPoint.price,
          high: highPrice,
          low: lowPrice,
          close: lastPoint.price,
          volume,
          volumeChange,
          liquidityAvg,
          liquidityChange,
          fees,
          binCountAvg,
          activePositionsAvg,
          tokenXReserveAvg,
          tokenYReserveAvg,
          dataPoints: periodDataPoints.length,
        };

        result.push(aggregatedData);
      }

      // Store aggregated data
      const key = `${poolAddress}:${period}`;
      this.aggregatedData.set(key, result);

      return result;
    } catch (error) {
      logger.error(`Error aggregating data for pool ${poolAddress}`, { error, period, count });
      return [];
    }
  }

  /**
   * Calculate average value for a property
   * @param dataPoints Data points
   * @param property Property name
   * @returns Average value
   */
  private calculateAverage(dataPoints: PoolDataPoint[], property: string): number {
    if (dataPoints.length === 0) {
      return 0;
    }

    const sum = dataPoints.reduce((sum, dp) => sum + dp[property], 0);
    return sum / dataPoints.length;
  }

  /**
   * Get aggregated data for a pool
   * @param poolAddress Pool address
   * @param period Time period
   * @param count Number of periods to get (default: 1)
   * @returns Aggregated data
   */
  getAggregatedData(
    poolAddress: string,
    period: TimePeriod,
    count: number = 1
  ): AggregatedPoolData[] {
    const key = `${poolAddress}:${period}`;
    const cachedData = this.aggregatedData.get(key) || [];

    // If we have enough cached data, return it
    if (cachedData.length >= count) {
      return cachedData.slice(0, count);
    }

    // Otherwise, aggregate new data
    return this.aggregateData(poolAddress, period, count);
  }

  /**
   * Get raw data points for a pool
   * @param poolAddress Pool address
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @returns Raw data points
   */
  getRawData(poolAddress: string, startTime: number, endTime: number): PoolDataPoint[] {
    const poolDataPoints = this.poolData.get(poolAddress) || [];

    return poolDataPoints
      .filter(dp => dp.timestamp >= startTime && dp.timestamp <= endTime)
      .sort((a, b) => a.timestamp - b.timestamp); // Sort by timestamp (oldest first)
  }

  /**
   * Get the latest data point for a pool
   * @param poolAddress Pool address
   * @returns Latest data point or null if not found
   */
  getLatestDataPoint(poolAddress: string): PoolDataPoint | null {
    const poolDataPoints = this.poolData.get(poolAddress) || [];

    if (poolDataPoints.length === 0) {
      return null;
    }

    return poolDataPoints[0]; // Newest data point
  }

  /**
   * Clear data for a pool
   * @param poolAddress Pool address
   */
  clearPoolData(poolAddress: string): void {
    this.poolData.delete(poolAddress);

    // Clear aggregated data for this pool
    for (const key of this.aggregatedData.keys()) {
      if (key.startsWith(`${poolAddress}:`)) {
        this.aggregatedData.delete(key);
      }
    }

    logger.info(`Cleared data for pool ${poolAddress}`);
  }

  /**
   * Set the maximum number of data points to store per pool
   * @param maxDataPoints Maximum number of data points
   */
  setMaxDataPoints(maxDataPoints: number): void {
    this.maxDataPoints = maxDataPoints;

    // Trim existing data
    for (const [poolAddress, dataPoints] of this.poolData.entries()) {
      if (dataPoints.length > maxDataPoints) {
        dataPoints.length = maxDataPoints;
        logger.info(`Trimmed data points for pool ${poolAddress} to ${maxDataPoints}`);
      }
    }

    logger.info(`Set max data points to ${maxDataPoints}`);
  }
}
