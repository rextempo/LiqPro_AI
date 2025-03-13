import { Connection, PublicKey } from '@solana/web3.js';
import { DLMM, DLMMPoolInfo } from '@meteora-ag/dlmm';
import { createLogger } from '../../utils/logger';

const logger = createLogger('data-service:meteora-collector');

/**
 * Meteora DLMM Pool Collector
 * Responsible for fetching data from Meteora DLMM pools
 */
export class MeteoraPoolCollector {
  private connection: Connection;
  private dlmm: DLMM;
  private poolCache: Map<string, DLMMPoolInfo> = new Map();
  private lastUpdateTime: Map<string, number> = new Map();
  private updateInterval: number = 60 * 1000; // 1 minute in milliseconds

  /**
   * Create a new Meteora Pool Collector
   * @param rpcEndpoint Solana RPC endpoint
   * @param commitment Commitment level
   */
  constructor(
    rpcEndpoint: string,
    commitment: 'processed' | 'confirmed' | 'finalized' = 'confirmed'
  ) {
    this.connection = new Connection(rpcEndpoint, commitment);
    this.dlmm = new DLMM(this.connection);
    logger.info('Meteora Pool Collector initialized');
  }

  /**
   * Fetch pool information for a specific pool
   * @param poolAddress Pool address
   * @param forceRefresh Force refresh the data even if cache is valid
   * @returns Pool information
   */
  async getPoolInfo(poolAddress: string, forceRefresh: boolean = false): Promise<DLMMPoolInfo> {
    const now = Date.now();
    const lastUpdate = this.lastUpdateTime.get(poolAddress) || 0;

    // Check if we need to refresh the data
    if (
      forceRefresh ||
      !this.poolCache.has(poolAddress) ||
      now - lastUpdate > this.updateInterval
    ) {
      try {
        logger.info(`Fetching pool info for ${poolAddress}`);
        const poolInfo = await this.dlmm.getPoolInfo(new PublicKey(poolAddress));

        // Update cache
        this.poolCache.set(poolAddress, poolInfo);
        this.lastUpdateTime.set(poolAddress, now);

        return poolInfo;
      } catch (error) {
        logger.error(`Error fetching pool info for ${poolAddress}`, { error });

        // Return cached data if available, otherwise rethrow
        if (this.poolCache.has(poolAddress)) {
          logger.info(`Returning cached data for ${poolAddress}`);
          return this.poolCache.get(poolAddress)!;
        }

        throw error;
      }
    }

    // Return cached data
    return this.poolCache.get(poolAddress)!;
  }

  /**
   * Fetch all pools for a specific token pair
   * @param tokenX Token X address
   * @param tokenY Token Y address
   * @returns Array of pool addresses
   */
  async getPoolsForTokenPair(tokenX: string, tokenY: string): Promise<string[]> {
    try {
      logger.info(`Fetching pools for token pair ${tokenX}/${tokenY}`);
      const pools = await this.dlmm.getAllPools(new PublicKey(tokenX), new PublicKey(tokenY));

      return pools.map(pool => pool.toString());
    } catch (error) {
      logger.error(`Error fetching pools for token pair ${tokenX}/${tokenY}`, { error });
      throw error;
    }
  }

  /**
   * Fetch liquidity distribution for a pool
   * @param poolAddress Pool address
   * @returns Liquidity distribution data
   */
  async getLiquidityDistribution(poolAddress: string): Promise<any> {
    try {
      const poolInfo = await this.getPoolInfo(poolAddress);
      const binArrays = await this.dlmm.getBinArrays(new PublicKey(poolAddress));

      // Process bin data to get liquidity distribution
      const liquidityDistribution = binArrays.map(binArray => {
        return {
          binId: binArray.publicKey.toString(),
          bins: binArray.bins.map(bin => ({
            index: bin.index,
            price: this.calculateBinPrice(bin.index, poolInfo),
            liquidityX: bin.amountX.toString(),
            liquidityY: bin.amountY.toString(),
            totalLiquidity: bin.liquiditySupply.toString(),
          })),
        };
      });

      return liquidityDistribution;
    } catch (error) {
      logger.error(`Error fetching liquidity distribution for ${poolAddress}`, { error });
      throw error;
    }
  }

  /**
   * Calculate the price for a specific bin
   * @param binIndex Bin index
   * @param poolInfo Pool information
   * @returns Price at the bin
   */
  private calculateBinPrice(binIndex: number, poolInfo: DLMMPoolInfo): number {
    const binStep = poolInfo.binStep;
    const basePrice = poolInfo.price;

    // Calculate price based on bin index and bin step
    // Price = basePrice * (1 + binStep/10000)^binIndex
    return basePrice * Math.pow(1 + binStep / 10000, binIndex);
  }

  /**
   * Monitor large LP removals
   * @param poolAddress Pool address
   * @param thresholdPercentage Threshold percentage (0-100) to consider as large removal
   * @returns Object with removal data if detected, null otherwise
   */
  async monitorLargeRemovals(
    poolAddress: string,
    thresholdPercentage: number = 10
  ): Promise<any | null> {
    try {
      // Get current pool info
      const currentPoolInfo = await this.getPoolInfo(poolAddress, true);

      // Get previous pool info from cache (before the refresh)
      const previousPoolInfo = this.poolCache.get(poolAddress);

      if (!previousPoolInfo) {
        return null; // No previous data to compare
      }

      // Calculate total liquidity change
      const previousLiquidity = previousPoolInfo.totalLiquidity.toNumber();
      const currentLiquidity = currentPoolInfo.totalLiquidity.toNumber();

      const liquidityChange = previousLiquidity - currentLiquidity;
      const changePercentage = (liquidityChange / previousLiquidity) * 100;

      // Check if the change exceeds the threshold
      if (changePercentage >= thresholdPercentage) {
        logger.warn(`Large LP removal detected in pool ${poolAddress}`, {
          previousLiquidity,
          currentLiquidity,
          liquidityChange,
          changePercentage,
        });

        return {
          poolAddress,
          previousLiquidity,
          currentLiquidity,
          liquidityChange,
          changePercentage,
          timestamp: Date.now(),
        };
      }

      return null;
    } catch (error) {
      logger.error(`Error monitoring large removals for ${poolAddress}`, { error });
      return null;
    }
  }

  /**
   * Set the cache update interval
   * @param intervalMs Interval in milliseconds
   */
  setUpdateInterval(intervalMs: number): void {
    this.updateInterval = intervalMs;
    logger.info(`Update interval set to ${intervalMs}ms`);
  }

  /**
   * Clear the cache for a specific pool or all pools
   * @param poolAddress Optional pool address to clear specific cache
   */
  clearCache(poolAddress?: string): void {
    if (poolAddress) {
      this.poolCache.delete(poolAddress);
      this.lastUpdateTime.delete(poolAddress);
      logger.info(`Cache cleared for pool ${poolAddress}`);
    } else {
      this.poolCache.clear();
      this.lastUpdateTime.clear();
      logger.info('All pool cache cleared');
    }
  }
}
