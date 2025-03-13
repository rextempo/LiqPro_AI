"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeteoraPoolCollector = void 0;
const web3_js_1 = require("@solana/web3.js");
const dlmm_1 = require("@meteora-ag/dlmm");
const logger_1 = require("../../utils/logger");
const logger = (0, logger_1.createLogger)('data-service:meteora-collector');
/**
 * Meteora DLMM Pool Collector
 * Responsible for fetching data from Meteora DLMM pools
 */
class MeteoraPoolCollector {
    /**
     * Create a new Meteora Pool Collector
     * @param rpcEndpoint Solana RPC endpoint
     * @param commitment Commitment level
     */
    constructor(rpcEndpoint, commitment = 'confirmed') {
        this.poolCache = new Map();
        this.lastUpdateTime = new Map();
        this.updateInterval = 60 * 1000; // 1 minute in milliseconds
        this.connection = new web3_js_1.Connection(rpcEndpoint, commitment);
        this.dlmm = new dlmm_1.DLMM(this.connection);
        logger.info('Meteora Pool Collector initialized');
    }
    /**
     * Fetch pool information for a specific pool
     * @param poolAddress Pool address
     * @param forceRefresh Force refresh the data even if cache is valid
     * @returns Pool information
     */
    async getPoolInfo(poolAddress, forceRefresh = false) {
        const now = Date.now();
        const lastUpdate = this.lastUpdateTime.get(poolAddress) || 0;
        
        // Check if we need to refresh the data
        if (forceRefresh ||
            !this.poolCache.has(poolAddress) ||
            now - lastUpdate > this.updateInterval) {
            try {
                logger.info(`Fetching pool info for ${poolAddress}`);
                
                // First try to get detailed pool info from Meteora API
                try {
                    const response = await fetch(`https://dlmm-api.meteora.ag/pool/${poolAddress}`);
                    if (response.ok) {
                        const apiPoolData = await response.json();
                        logger.info(`Successfully fetched pool info from API for ${poolAddress}`);
                        
                        // Get token information
                        const tokenXMint = apiPoolData.mint_x || '';
                        const tokenYMint = apiPoolData.mint_y || '';
                        
                        // Get token symbol information
                        let tokenXSymbol = 'Unknown';
                        let tokenYSymbol = 'Unknown';
                        let tokenXDecimals = 0;
                        let tokenYDecimals = 0;
                        
                        // Try to get token details
                        try {
                            if (tokenXMint) {
                                const tokenXResponse = await fetch(`https://dlmm-api.meteora.ag/token/${tokenXMint}`);
                                if (tokenXResponse.ok) {
                                    const tokenXData = await tokenXResponse.json();
                                    tokenXSymbol = tokenXData.symbol || 'Unknown';
                                    tokenXDecimals = tokenXData.decimals || 0;
                                }
                            }
                            
                            if (tokenYMint) {
                                const tokenYResponse = await fetch(`https://dlmm-api.meteora.ag/token/${tokenYMint}`);
                                if (tokenYResponse.ok) {
                                    const tokenYData = await tokenYResponse.json();
                                    tokenYSymbol = tokenYData.symbol || 'Unknown';
                                    tokenYDecimals = tokenYData.decimals || 0;
                                }
                            }
                        } catch (tokenError) {
                            logger.warn(`Failed to fetch token details for pool ${poolAddress}`, { error: tokenError });
                        }
                        
                        // Get SDK pool info for additional data
                        const poolInfo = await this.dlmm.getPoolInfo(new web3_js_1.PublicKey(poolAddress));
                        
                        // Enhance pool info with token data from API
                        const enhancedPoolInfo = {
                            ...poolInfo,
                            tokenX: {
                                address: tokenXMint || poolInfo.tokenX?.toString() || 'unknown',
                                symbol: tokenXSymbol,
                                decimals: tokenXDecimals
                            },
                            tokenY: {
                                address: tokenYMint || poolInfo.tokenY?.toString() || 'unknown',
                                symbol: tokenYSymbol,
                                decimals: tokenYDecimals
                            },
                            name: `${tokenXSymbol}-${tokenYSymbol}`,
                            activeBin: apiPoolData.active_bin_id || null,
                            volume24h: apiPoolData.trade_volume_24h || 0,
                            fees24h: apiPoolData.fees_24h || 0,
                            liquidity: apiPoolData.liquidity || 0,
                            currentPrice: apiPoolData.current_price || 0,
                            priceChange24h: apiPoolData.price_change_24h || 0,
                            yield24h: apiPoolData.fee_tvl_ratio_24h || 0,
                            binStep: apiPoolData.bin_step || 0,
                            feeTier: apiPoolData.base_fee_percentage || 0.1,
                            creationTime: apiPoolData.created_at || null
                        };
                        
                        // Update cache
                        this.poolCache.set(poolAddress, enhancedPoolInfo);
                        this.lastUpdateTime.set(poolAddress, now);
                        
                        return enhancedPoolInfo;
                    }
                } catch (apiError) {
                    logger.warn(`Failed to fetch pool info from API for ${poolAddress}`, { error: apiError });
                }
                
                // Fallback to SDK only
                const poolInfo = await this.dlmm.getPoolInfo(new web3_js_1.PublicKey(poolAddress));
                
                // Try to get token information from on-chain data
                try {
                    const tokenXMint = poolInfo.tokenX;
                    const tokenYMint = poolInfo.tokenY;
                    
                    // Get token symbol information
                    let tokenXSymbol = 'Unknown';
                    let tokenYSymbol = 'Unknown';
                    let tokenXDecimals = 0;
                    let tokenYDecimals = 0;
                    
                    try {
                        if (tokenXMint) {
                            const tokenXResponse = await fetch(`https://dlmm-api.meteora.ag/token/${tokenXMint.toString()}`);
                            if (tokenXResponse.ok) {
                                const tokenXData = await tokenXResponse.json();
                                tokenXSymbol = tokenXData.symbol || 'Unknown';
                                tokenXDecimals = tokenXData.decimals || 0;
                            }
                        }
                        
                        if (tokenYMint) {
                            const tokenYResponse = await fetch(`https://dlmm-api.meteora.ag/token/${tokenYMint.toString()}`);
                            if (tokenYResponse.ok) {
                                const tokenYData = await tokenYResponse.json();
                                tokenYSymbol = tokenYData.symbol || 'Unknown';
                                tokenYDecimals = tokenYData.decimals || 0;
                            }
                        }
                    } catch (tokenError) {
                        logger.warn(`Failed to fetch token details for pool ${poolAddress}`, { error: tokenError });
                    }
                    
                    // Create enhanced pool info with default token data
                    const enhancedPoolInfo = {
                        ...poolInfo,
                        tokenX: {
                            address: tokenXMint.toString(),
                            symbol: tokenXSymbol,
                            decimals: tokenXDecimals
                        },
                        tokenY: {
                            address: tokenYMint.toString(),
                            symbol: tokenYSymbol,
                            decimals: tokenYDecimals
                        },
                        name: `${tokenXSymbol}-${tokenYSymbol}`,
                        volume24h: 0,
                        fees24h: 0,
                        yield24h: 0,
                        priceChange24h: 0
                    };
                    
                    // Update cache
                    this.poolCache.set(poolAddress, enhancedPoolInfo);
                    this.lastUpdateTime.set(poolAddress, now);
                    
                    return enhancedPoolInfo;
                } catch (tokenError) {
                    logger.warn(`Failed to get token info for ${poolAddress}`, { error: tokenError });
                    
                    // Update cache with basic pool info
                    this.poolCache.set(poolAddress, poolInfo);
                    this.lastUpdateTime.set(poolAddress, now);
                    
                    return poolInfo;
                }
            }
            catch (error) {
                logger.error(`Error fetching pool info for ${poolAddress}`, { error });
                // Return cached data if available, otherwise rethrow
                if (this.poolCache.has(poolAddress)) {
                    logger.info(`Returning cached data for ${poolAddress}`);
                    return this.poolCache.get(poolAddress);
                }
                throw error;
            }
        }
        
        // Return cached data
        return this.poolCache.get(poolAddress);
    }
    /**
     * Fetch all pools for a specific token pair
     * @param tokenX Token X address
     * @param tokenY Token Y address
     * @returns Array of pool addresses
     */
    async getPoolsForTokenPair(tokenX, tokenY) {
        try {
            logger.info(`Fetching pools for token pair ${tokenX}/${tokenY}`);
            const pools = await this.dlmm.getAllPools(new web3_js_1.PublicKey(tokenX), new web3_js_1.PublicKey(tokenY));
            return pools.map(pool => pool.toString());
        }
        catch (error) {
            logger.error(`Error fetching pools for token pair ${tokenX}/${tokenY}`, { error });
            throw error;
        }
    }
    /**
     * Fetch liquidity distribution for a pool
     * @param poolAddress Pool address
     * @returns Liquidity distribution data
     */
    async getLiquidityDistribution(poolAddress) {
        try {
            const poolInfo = await this.getPoolInfo(poolAddress);
            const binArrays = await this.dlmm.getBinArrays(new web3_js_1.PublicKey(poolAddress));
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
        }
        catch (error) {
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
    calculateBinPrice(binIndex, poolInfo) {
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
    async monitorLargeRemovals(poolAddress, thresholdPercentage = 10) {
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
        }
        catch (error) {
            logger.error(`Error monitoring large removals for ${poolAddress}`, { error });
            return null;
        }
    }
    /**
     * Set the cache update interval
     * @param intervalMs Interval in milliseconds
     */
    setUpdateInterval(intervalMs) {
        this.updateInterval = intervalMs;
        logger.info(`Update interval set to ${intervalMs}ms`);
    }
    /**
     * Clear the cache for a specific pool or all pools
     * @param poolAddress Optional pool address to clear specific cache
     */
    clearCache(poolAddress) {
        if (poolAddress) {
            this.poolCache.delete(poolAddress);
            this.lastUpdateTime.delete(poolAddress);
            logger.info(`Cache cleared for pool ${poolAddress}`);
        }
        else {
            this.poolCache.clear();
            this.lastUpdateTime.clear();
            logger.info('All pool cache cleared');
        }
    }
    /**
     * Get all high activity pools
     * @param limit Limit the number of returned pools
     * @returns High activity pools array
     */
    async getHighActivityPools(limit = 100) {
        try {
            logger.info(`Fetching high activity pools, limit: ${limit}`);
            
            // Fetch all pools data from Meteora API
            const response = await fetch('https://dlmm-api.meteora.ag/pair/all');
            if (!response.ok) {
                throw new Error(`Failed to fetch pools, status: ${response.status}`);
            }
            
            const allPools = await response.json();
            logger.info(`Fetched ${allPools.length} pools from API`);
            
            // Filter and process pool data
            const processedPools = allPools
                // Filter out pools with low liquidity or volume
                .filter(pool => 
                    (pool.liquidity || 0) > 100000 && 
                    (pool.trade_volume_24h || 0) > 0
                )
                // Sort by liquidity
                .sort((a, b) => (b.liquidity || 0) - (a.liquidity || 0))
                // Limit number of pools
                .slice(0, limit)
                // Map to required format
                .map(pool => ({
                    address: pool.address,
                    name: pool.name || 'Unknown-Unknown',
                    mint_x: pool.mint_x || '',
                    mint_y: pool.mint_y || '',
                    liquidity: pool.liquidity || 0,
                    volume24h: pool.trade_volume_24h || 0,
                    fees24h: pool.fees_24h || 0,
                    current_price: pool.current_price || 0,
                    price_change_24h: pool.price_change_24h || 0,
                    bin_step: pool.bin_step || 0,
                    base_fee_percentage: pool.base_fee_percentage || 0,
                    active_bin_id: pool.active_bin_id || 0,
                    created_at: pool.created_at || null
                }));
            
            logger.info(`Processed ${processedPools.length} high activity pools`);
            return processedPools;
        } catch (error) {
            logger.error('Error fetching high activity pools', { error });
            throw error;
        }
    }
}
exports.MeteoraPoolCollector = MeteoraPoolCollector;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWV0ZW9yYS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9tb2R1bGVzL2NvbGxlY3RvcnMvbWV0ZW9yYS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw2Q0FBd0Q7QUFDeEQsMkNBQXNEO0FBQ3RELCtDQUFrRDtBQUVsRCxNQUFNLE1BQU0sR0FBRyxJQUFBLHFCQUFZLEVBQUMsZ0NBQWdDLENBQUMsQ0FBQztBQUU5RDs7O0dBR0c7QUFDSCxNQUFhLG9CQUFvQjtJQU8vQjs7OztPQUlHO0lBQ0gsWUFDRSxXQUFtQixFQUNuQixhQUFzRCxXQUFXO1FBWDNELGNBQVMsR0FBOEIsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUNqRCxtQkFBYyxHQUF3QixJQUFJLENBQUMsV0FBVyxDQUFDO1FBQ2hELG1CQUFjLEdBQVcsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDLDJCQUEyQjtRQVdyRSxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksb0JBQVUsQ0FBQyxXQUFXLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDMUQsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLFdBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDdEMsTUFBTSxDQUFDLElBQUksQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDO0lBQ3BELENBQUM7SUFFRDs7Ozs7T0FLRztJQUNILEtBQUssQ0FBQyxXQUFXLENBQUMsV0FBbUIsRUFBRSxlQUF3QixLQUFLO1FBQ2xFLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUN2QixNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFN0QsdUNBQXVDO1FBQ3ZDLElBQ0UsWUFBWTtZQUNaLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDO1lBQ2hDLEdBQUcsR0FBRyxVQUFVLEdBQUcs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aUIsQ0FBQyxVQUFrQjtRQUNsQyxJQUFJLENBQUMsY0FBYyxHQUFHLFVBQVUsQ0FBQztRQUNqQyxNQUFNLENBQUMsSUFBSSxDQUFDLDBCQUEwQixVQUFVLElBQUksQ0FBQyxDQUFDO0lBQ3hELENBQUM7SUFFRDs7O09BR0c7SUFDSCxVQUFVLENBQUMsV0FBb0I7UUFDN0IsSUFBSSxXQUFXLEVBQUUsQ0FBQztZQUNoQixJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUNuQyxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUN4QyxNQUFNLENBQUMsSUFBSSxDQUFDLDBCQUEwQixXQUFXLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZELENBQUM7YUFBTSxDQUFDO1lBQ04sSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUN2QixJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQzVCLE1BQU0sQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsQ0FBQztRQUN4QyxDQUFDO0lBQ0gsQ0FBQztDQUNGO0FBN01ELG9EQTZNQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IENvbm5lY3Rpb24sIFB1YmxpY0tleSB9IGZyb20gJ0Bzb2xhbmEvd2ViMy5qcyc7XG5pbXBvcnQgeyBETE1NLCBETE1NUG9vbEluZm8gfSBmcm9tICdAbWV0ZW9yYS1hZy9kbG1tJztcbmltcG9ydCB7IGNyZWF0ZUxvZ2dlciB9IGZyb20gJy4uLy4uL3V0aWxzL2xvZ2dlcic7XG5cbmNvbnN0IGxvZ2dlciA9IGNyZWF0ZUxvZ2dlcignZGF0YS1zZXJ2aWNlOm1ldGVvcmEtY29sbGVjdG9yJyk7XG5cbi8qKlxuICogTWV0ZW9yYSBETE1NIFBvb2wgQ29sbGVjdG9yXG4gKiBSZXNwb25zaWJsZSBmb3IgZmV0Y2hpbmcgZGF0YSBmcm9tIE1ldGVvcmEgRExNTSBwb29sc1xuICovXG5leHBvcnQgY2xhc3MgTWV0ZW9yYVBvb2xDb2xsZWN0b3Ige1xuICBwcml2YXRlIGNvbm5lY3Rpb246IENvbm5lY3Rpb247XG4gIHByaXZhdGUgZGxtbTogRExNTTtcbiAgcHJpdmF0ZSBwb29sQ2FjaGU6IE1hcDxzdHJpbmcsIERMTU1Qb29sSW5mbz4gPSBuZXcgTWFwKCk7XG4gIHByaXZhdGUgbGFzdFVwZGF0ZVRpbWU6IE1hcDxzdHJpbmcsIG51bWJlcj4gPSBuZXcgTWFwKCk7XG4gIHByaXZhdGUgdXBkYXRlSW50ZXJ2YWw6IG51bWJlciA9IDYwICogMTAwMDsgLy8gMSBtaW51dGUgaW4gbWlsbGlzZWNvbmRzXG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIG5ldyBNZXRlb3JhIFBvb2wgQ29sbGVjdG9yXG4gICAqIEBwYXJhbSBycGNFbmRwb2ludCBTb2xhbmEgUlBDIGVuZHBvaW50XG4gICAqIEBwYXJhbSBjb21taXRtZW50IENvbW1pdG1lbnQgbGV2ZWxcbiAgICovXG4gIGNvbnN0cnVjdG9yKFxuICAgIHJwY0VuZHBvaW50OiBzdHJpbmcsXG4gICAgY29tbWl0bWVudDogJ3Byb2Nlc3NlZCcgfCAnY29uZmlybWVkJyB8ICdmaW5hbGl6ZWQnID0gJ2NvbmZpcm1lZCdcbiAgKSB7XG4gICAgdGhpcy5jb25uZWN0aW9uID0gbmV3IENvbm5lY3Rpb24ocnBjRW5kcG9pbnQsIGNvbW1pdG1lbnQpO1xuICAgIHRoaXMuZGxtbSA9IG5ldyBETE1NKHRoaXMuY29ubmVjdGlvbik7XG4gICAgbG9nZ2VyLmluZm8oJ01ldGVvcmEgUG9vbCBDb2xsZWN0b3IgaW5pdGlhbGl6ZWQnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBGZXRjaCBwb29sIGluZm9ybWF0aW9uIGZvciBhIHNwZWNpZmljIHBvb2xcbiAgICogQHBhcmFtIHBvb2xBZGRyZXNzIFBvb2wgYWRkcmVzc1xuICAgKiBAcGFyYW0gZm9yY2VSZWZyZXNoIEZvcmNlIHJlZnJlc2ggdGhlIGRhdGEgZXZlbiBpZiBjYWNoZSBpcyB2YWxpZFxuICAgKiBAcmV0dXJucyBQb29sIGluZm9ybWF0aW9uXG4gICAqL1xuICBhc3luYyBnZXRQb29sSW5mbyhwb29sQWRkcmVzczogc3RyaW5nLCBmb3JjZVJlZnJlc2g6IGJvb2xlYW4gPSBmYWxzZSk6IFByb21pc2U8RExNTVBvb2xJbmZvPiB7XG4gICAgY29uc3Qgbm93ID0gRGF0ZS5ub3coKTtcbiAgICBjb25zdCBsYXN0VXBkYXRlID0gdGhpcy5sYXN0VXBkYXRlVGltZS5nZXQocG9vbEFkZHJlc3MpIHx8IDA7XG5cbiAgICAvLyBDaGVjayBpZiB3ZSBuZWVkIHRvIHJlZnJlc2ggdGhlIGRhdGFcbiAgICBpZiAoXG4gICAgICBmb3JjZVJlZnJlc2ggfHxcbiAgICAgICF0aGlzLnBvb2xDYWNoZS5oYXMocG9vbEFkZHJlc3MpIHx8XG4gICAgICBub3cgLSBsYXN0VXBkYXRlID4gdGhpcy51cGRhdGVJbnRlcnZhbFxuICAgICkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgbG9nZ2VyLmluZm8oYEZldGNoaW5nIHBvb2wgaW5mbyBmb3IgJHtwb29sQWRkcmVzc31gKTtcbiAgICAgICAgY29uc3QgcG9vbEluZm8gPSBhd2FpdCB0aGlzLmRsbW0uZ2V0UG9vbEluZm8obmV3IFB1YmxpY0tleShwb29sQWRkcmVzcykpO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBjYWNoZVxuICAgICAgICB0aGlzLnBvb2xDYWNoZS5zZXQocG9vbEFkZHJlc3MsIHBvb2xJbmZvKTtcbiAgICAgICAgdGhpcy5sYXN0VXBkYXRlVGltZS5zZXQocG9vbEFkZHJlc3MsIG5vdyk7XG5cbiAgICAgICAgcmV0dXJuIHBvb2xJbmZvO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgbG9nZ2VyLmVycm9yKGBFcnJvciBmZXRjaGluZyBwb29sIGluZm8gZm9yICR7cG9vbEFkZHJlc3N9YCwgeyBlcnJvciB9KTtcblxuICAgICAgICAvLyBSZXR1cm4gY2FjaGVkIGRhdGEgaWYgYXZhaWxhYmxlLCBvdGhlcndpc2UgcmV0aHJvd1xuICAgICAgICBpZiAodGhpcy5wb29sQ2FjaGUuaGFzKHBvb2xBZGRyZXNzKSkge1xuICAgICAgICAgIGxvZ2dlci5pbmZvKGBSZXR1cm5pbmcgY2FjaGVkIGRhdGEgZm9yICR7cG9vbEFkZHJlc3N9YCk7XG4gICAgICAgICAgcmV0dXJuIHRoaXMucG9vbENhY2hlLmdldChwb29sQWRkcmVzcykhO1xuICAgICAgICB9XG4gICAgICAgIHRocm93IGVycm9yO1xuICAgICAgfVxuXG4gICAgfVxuXG4gIC8qKlxuICAgKiBGZXRjaCBhbGwgcG9vbHMgZm9yIGEgc3BlY2lmaWMgdG9rZW4gcGFpcnVcbiAgICogQHBhcmFtIHRva2VuWCBUT2tlbiBYIGFkZHJlc3NcbiAgICogQHBhcmFtIHRva2VuWSBUb2tlbiBZIGFkZHJlc3NcbiAgICogQHJldHVybnMgQXJyYXkgb2YgcG9vbCBhZGRyZXNzZXNcbiAgICovXG4gIGFzeW5jIGdldFBvb2xzRm9yVG9rZW5QYWlyKHRva2VuWDogc3RyaW5nLCB0b2tlblk6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nW10+IHtcbiAgICB0cnkge1xuICAgICAgbG9nZ2VyLmluZm8oYEZldGNoaW5nIHBvb2xzIGZvciB0b2tlbiBwYWlyICR7dG9rZW5YfS8ke3Rva2VuWX1gKTtcbiAgICAgIGNvbnN0IHBvb2xzID0gYXdhaXQgdGhpcy5kbG1tLmdldEFsbFBvb2xzKG5ldyBQdWJsaWNLZXkodG9rZW5YKSxuZXcgUHVibGljS2V5KHRva2VuWSkpO1xuXG4gICAgICByZXR1cm4gcG9vbHMubWFwKHBvb2wgPT4gcG9vbC50b1N0cmluZygpKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgbG9nZ2VyLmVycm9yKGBFcnJvciBmZXRjaGluZyBwb29scyBmb3IgdG9rZW4gcGFpciAke3Rva2VuWH0vJHt0b2tlbll9YCwgeyBlcnJvciB9KTtcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cblxuICB9XG5cbiAgLyoqXG4gICAqIEZldGNoIGxpcXVpZGl0eSBkaXN0cmlidXRpb24gZm9yIGEgcG9vbFxuICAgKiBAcGFyYW0gcG9vbEFkZHJlc3MgUG9vbCBhZGRyZXNzXG4gICAqIEByZXR1cm5zIExpcXVpZGl0eSBkaXN0cmlidXRpb24gZGF0YVxuICAgKi9cbiAgYXN5bmMgZ2V0TGlxdWlkaXR5RGlzdHJpYnV0aW9uKHBvb2xBZGRyZXNzOiBzdHJpbmcpOiBQcm9taXNlPGFueT4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBwb29sSW5mbyA9IGF3YWl0IHRoaXMuZ2V0UG9vbEluZm8ocG9vbEFkZHJlc3MpO1xuICAgICAgY29uc3QgYmluQXJyYXlzID0gYXdhaXQgdGhpcy5kbG1tLmdldEJpbkFycmF5cyhuZXcgUHVibGljS2V5KHBvb2xBZGRyZXNzKSk7XG5cbiAgICAgIC8vIFByb2Nlc3MgYmluIGRhdGEgdG8gZ2V0IGxpcXVpZGl0eSBkaXN0cmlidXRpb25cbiAgICAgIGNvbnN0IGxpcXVpZGl0eURpc3RyaWJ1dGlvbiA9IGJpbkFycmF5cy5tYXAoYmluQXJyYXkgPT4ge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIGJpbklkOiBiaW5BcnJheS5wdWJsaWNLZXkudG9TdHJpbmcoKSxcbiAgICAgICAgICBiaW5zOiBiaW5BcnJheS5iaW5zLm1hcChiaW4gPT4gKHtcbiAgICAgICAgICAgIGluZGV4OiBiaW4uaW5kZXgsXG4gICAgICAgICAgICBwcmljZTogdGhpcy5jYWxjdWxhdGVCaW5QcmljZShiaW4uaW5kZXgsIHBvb2xJbmZvKSxcbiAgICAgICAgICAgIGxpcXVpZGl0eVg6IGJpbi5hbW91bnRYLnRvU3RyaW5nKCksXG4gICAgICAgICAgICBsaXF1aWRpdHlZOiBiaW4uYW1vdW50WS50b1N0cmluZygpLFxuICAgICAgICAgICAgdG90YWxMaXF1aWRpdHk6IGJpbi5saXF1aWRpdHlTdXBwbHkudG9TdHJpbmcoKSxcbiAgICAgICAgICB9KSksXG4gICAgICAgIH07XG4gICAgICB9KTtcblxuICAgICByZXR1cm4gbGlxdWlkaXR5RGlzdHJpYnV0aW9uO1xuICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBsb2dnZXIuZXJyb3IoYEZldGNoaW5nIGxpcXVpZGl0eSBkaXN0cmlidXRpb24gZm9yICR7cG9vbEFkZHJlc3N9YCwgeyBlcnJvciB9KTtcbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxuXG4gIC9qKlxuICAgKiBDYWxjdWxhdGUgdGhlIHByaWNlIGZvciBhIHNwZWNpZmljIGJpblxuICAgKiBAcGFyYW0gYmluSW5kZXggQmluIGluZGV4XG4gICAqIEBwYXJhbSBwb29sSW5mbyBQb29sIGluZm9ybWF0aW9uXG4gICAqIEByZXR1cm5zIFByaWNlIGF0IHRoZSBiaW5cbiAgICovXG4gIHBhcml2YXRlIGNhbGN1bGF0ZUJpblByaWNlKGJpbkluZGV4OiBudW1iZXIsIHBvb2xJbmZvOiBETE1NUG9vbEluZm8pOiBudW1iZXIge1xuICAgY29uc3QgYmluU3RlcCA9IHBvb2xJbmZvLmJpblN0ZXA7XG4gICAgY29uc3QgYmFzZVByaWNlID0gcG9vbEluZm8ucHJpY2U7XG5cbiAgICAvLyBDYWxjdWxhdGUgcHJpY2UgYmFzZWQgb24gYmluIGluZGV4IGFuZCBiaW4gc3RlcFxuICAgIC8vIFByaWNlID0gYmFzZVByaWNlICogKDEgKyBiaW5TdGVwLzEwMDAwKXliaW5JbmRleFxuICAgIHJldHVybiBiYXNlUHJpY2UgKiBNYXRoLnBvdygxICsgYmluU3RlcCAvIDEwMDAwLCBiaW5JbmRleCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIE1vbml0b3IgbGFyZ2UgTFAgcmVtb3ZhbHNcbiAgICogQHBhcmFtIHBvb2xBZGRyZXNzIFBvb2wgYWRkcmVzc1xuICAgKiBAcGFyYW0gdGhyZXNob2xkUGVyY2VudGFnZSBUaHJlc2hvbGQgcGVyY2VudGFnZSAoMC0xMDApIHRvIGNvbnNpZGVyIGFzIGxhcmdlIHJlbW92YWxcbiAgICogQHJldHVybnMgT2JqZWN0IHdpdGggcmVtb3ZhbCBkYXRhIGlmIGRldGVjdGVkLCBudWxsIG90aGVyd2lzZVxuICAgKi9cbiAgYXN5bmMgbW9uaXRvckxhcmdlUmVtb3ZhbHMoXG4gICAgcG9vbEFkZHJlc3M6IHN0cmluZyxcbiAgICB0aHJlc2hvbGRQZXJjZW50YWdlOiBudW1iZXIgPSAxMFxuICApOiBQcm9taXNlPGFueSB8IG51bGw+IHtcbiAgICB0cnkge1xuICAgICAgLy8gR2V0IGN1cnJlbnQgcG9vbCBpbmZvXG4gICAgICBjb25zdCBjdXJyZW50UG9vbEluZm8gPSBhd2FpdCB0aGlzLmdldFBvb2xJbmZvKHBvb2xBZGRyZXNzLCB0cnVlKTtcblxuICAgICAgLy8gR2V0IHByZXZpb3VzIHBvb2wgaW5mbyBmcm9tIGNhY2hlIChiZWZvcmUgdGhlIHJlZnJlc2gpXG4gICAgICBjb25zdCBwcmV2aW91c1Bvb2xJbmZvID0gdGhpcy5wb29sQ2FjaGUuZ2V0KHBvb2xBZGRyZXNzKTtcblxuICAgICAgaWYgKCFwcmV2aW91c1Bvb2xJbmZvKSB7XG4gICAgICAgIHJldHVybiBudWxsOyAvLyBObyBwcmV2aW91cyBkYXRhIHRvIGNvbXBhcmVcbiAgICAgIH1cblxuICAgICAvLyBDYWxjdWxhdGUgdG90YWwgbGlxdWlkaXR5IGNoYW5nZVxuICAgICBjb25zdCBwcmV2aW91c0xpcXVpZGl0eSA9IHByZXZpb3VzUG9vbEluZm8udG90YWxMaXF1aWRpdHkudG9OdW1iZXIoKTtcbiAgICAgIGNvbnN0IGN1cnJlbnRMaXF1aWRpdHkgPSBjdXJyZW50UG9vbEluZm8udG90YWxMaXF1aWRpdHkudG9OdW1iZXIoKTtcbiAgICAgIGNvbnN0IGxpcXVpZGl0eUNoYW5nZSA9IHByZXZpb3VzTGlxdWlkaXR5IC0gY3VycmVudExpcXVpZGl0eTtcbiAgICAgIGNvbnN0IGNoYW5nZVBlcmNlbnRhZ2UgPSAobGlxdWlkaXR5Q2hhbmdlIC8gcHJldmlvdXNMaXF1aWRpdHkpICogMTAwO1xuICAgICAvLyBDaGVjayBpZiB0aGUgY2hhbmdlIGV4Y2VlZHMgdGhlIHRocmVzaG9sZFxuICAgICBpZiAoY2hhbmdlUGVyY2VudGFnZSA+PSB0aHJlc2hvbGRQZXJjZW50YWdlKSB7XG4gICAgICAgIGxvZ2dlci53YXJuKGBMYXJnZSBMUCByZW1vdmFsIGRldGVjdGVkIGluIHBvb2wgJHtwb29sQWRkcmVzc31gLCB7XG4gICAgICAgICAgcHJldmlvdXNMaXF1aWRpdHksXG4gICAgICAgICAgY3VycmVudExpcXVpZGl0eSxcbiAgICAgICAgICBsaXF1aWRpdHlDaGFuZ2UsXG4gICAgICAgICAgY2hhbmdlUGVyY2VudGFnZSxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgcG9vbEFkZHJlc3MsXG4gICAgICAgICAgcHJldmlvdXNMaXF1aWRpdHksXG4gICAgICAgICAgY3VycmVudExpcXVpZGl0eSxcbiAgICAgICAgICBsaXF1aWRpdHlDaGFuZ2UsXG4gICAgICAgICAgY2hhbmdlUGVyY2VudGFnZSxcbiAgICAgICAgICB0aW1lc3RhbXA6IERhdGUubm93KCksXG4gICAgICAgICB9O1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgbG9nZ2VyLmVycm9yKGBFcnJvciBtb25pdG9yaW5nIGxhcmdlIHJlbW92YWxzIGZvciAke3Bvb2xBZGRyZXNzfWAsIHsgZXJyb3IgfSk7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU2V0IHRoZSBjYWNoZSB1cGRhdGUgaW50ZXJ2YWxcbiAgICogQHBhcmFtIGludGVydmFsTXMgSW50ZXJ2YWwgaW4gbWlsbGlzZWNvbmRzXG4gICAqL1xuICBzZXRVcGRhdGVJbnRlcnZhbChpbnRlcnZhbE1zOiBudW1iZXIpOiB2b2lkIHtcbiAgICB0aGlzLnVwZGF0ZUludGVydmFsID0gaW50ZXJ2YWxNcztcbiAgICBsb2dnZXIuaW5mbyhgVXBkYXRlIGludGVydmFsIHNldCB0byAke2ludGVydmFsTXN9bXNgKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDbGVhciB0aGUgY2FjaGUgZm9yIGEgc3BlY2lmaWMgcG9vbCBvciBhbGwgcG9vbHNcbiAgICogQHBhcmFtIHBvb2xBZGRyZXNzIE9wdGlvbmFsIHBvb2wgYWRkcmVzcyB0byBjbGVhciBzcGVjaWZpYyBjYWNoZVxuICAgKi9cbiAgY2xlYXJDYWNoZShwb29sQWRkcmVzcz86IHN0cmluZyk6IHZvaWQge1xuICAgIGlmIChwb29sQWRkcmVzcykge1xuICAgICAgdGhpcy5wb29sQ2FjaGUuZGVsZXRlKHBvb2xBZGRyZXNzKTtcbiAgICAgIHRoaXMubGFzdFVwZGF0ZVRpbWUuZGVsZXRlKHBvb2xBZGRyZXNzKTtcbiAgICAgIGxvZ2dlci5pbmZvKGBDYWNoZSBjbGVhcmVkIGZvciBwb29sICR7cG9vbEFkZHJlc3N9YCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMucG9vbENhY2hlLmNsZWFyKCk7XG4gICAgICB0aGlzLmxhc3RVcGRhdGVUaW1lLmNsZWFyKCk7XG4gICAgICBsb2dnZXIuaW5mbygnQWxsIHBvb2wgY2FjaGUgY2xlYXJlZCcpO1xuICAgIH1cbiAgfVxufVxuIl19