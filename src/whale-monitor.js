"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhaleMonitor = exports.WhaleActivityType = void 0;
const web3_js_1 = require("@solana/web3.js");
const monitoring_1 = require("@liqpro/monitoring");
const pool_events_1 = require("./pool-events");
const logger = (0, monitoring_1.createLogger)('data-service:whale-monitor');
/**
 * Whale Activity Type
 */
var WhaleActivityType;
(function (WhaleActivityType) {
    WhaleActivityType["LARGE_DEPOSIT"] = "large_deposit";
    WhaleActivityType["LARGE_WITHDRAWAL"] = "large_withdrawal";
    WhaleActivityType["POSITION_CHANGE"] = "position_change";
    WhaleActivityType["MULTIPLE_POOL_ACTION"] = "multiple_pool_action";
})(WhaleActivityType || (exports.WhaleActivityType = WhaleActivityType = {}));
/**
 * Whale Monitor
 * Responsible for monitoring large liquidity providers (whales) in Meteora pools
 */
class WhaleMonitor {
    /**
     * Create a new Whale Monitor
     * @param rpcEndpoint Solana RPC endpoint
     * @param config Whale monitor configuration
     */
    constructor(rpcEndpoint, config = {}) {
        this.whaleActivities = [];
        this.walletActivities = new Map();
        this.callbacks = [];
        this.connection = new web3_js_1.Connection(rpcEndpoint);
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
    processPoolEvent(event, poolLiquidityUSD, tokenPrices) {
        try {
            // Only process deposit, withdraw, and position events
            if (![
                pool_events_1.PoolEventType.DEPOSIT,
                pool_events_1.PoolEventType.WITHDRAW,
                pool_events_1.PoolEventType.POSITION_CREATED,
                pool_events_1.PoolEventType.POSITION_MODIFIED,
                pool_events_1.PoolEventType.POSITION_CLOSED,
            ].includes(event.type)) {
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
                let activityType;
                switch (event.type) {
                    case pool_events_1.PoolEventType.DEPOSIT:
                    case pool_events_1.PoolEventType.POSITION_CREATED:
                        activityType = WhaleActivityType.LARGE_DEPOSIT;
                        break;
                    case pool_events_1.PoolEventType.WITHDRAW:
                    case pool_events_1.PoolEventType.POSITION_CLOSED:
                        activityType = WhaleActivityType.LARGE_WITHDRAWAL;
                        break;
                    default:
                        activityType = WhaleActivityType.POSITION_CHANGE;
                }
                // Record whale activity
                const activity = {
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
        }
        catch (error) {
            logger.error('Error processing event for whale activity', { error, event });
        }
    }
    /**
     * Extract wallet address from event data
     * @param event Pool event
     * @returns Wallet address or null if not found
     */
    extractWalletAddress(event) {
        try {
            // This is a simplified implementation
            // In a real implementation, you would need to analyze the transaction data
            // to extract the wallet address that initiated the action
            // For now, we'll assume the wallet address is in the event data
            if (event.data?.tokenBalances?.pre?.[0]?.owner) {
                return event.data.tokenBalances.pre[0].owner;
            }
            return null;
        }
        catch (error) {
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
    calculateEventValueUSD(event, tokenPrices) {
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
                    const postBalance = post.find((b) => b.mint === preBalance.mint);
                    if (postBalance) {
                        const tokenMint = preBalance.mint;
                        const tokenPrice = tokenPrices[tokenMint] || 0;
                        // Calculate token amount change
                        const preAmount = parseInt(preBalance.uiTokenAmount.amount) / 10 ** preBalance.uiTokenAmount.decimals;
                        const postAmount = parseInt(postBalance.uiTokenAmount.amount) / 10 ** postBalance.uiTokenAmount.decimals;
                        const amountChange = Math.abs(postAmount - preAmount);
                        // Calculate value in USD
                        const valueUSD = amountChange * tokenPrice;
                        totalValueUSD += valueUSD;
                    }
                }
            }
            return totalValueUSD;
        }
        catch (error) {
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
    updateWalletActivities(walletAddress, poolAddress, timestamp) {
        // Get or create wallet activity
        if (!this.walletActivities.has(walletAddress)) {
            this.walletActivities.set(walletAddress, {
                timestamp,
                pools: new Set([poolAddress]),
            });
        }
        else {
            const activity = this.walletActivities.get(walletAddress);
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
    checkMultiPoolActivity(walletAddress) {
        const activity = this.walletActivities.get(walletAddress);
        if (!activity) {
            return;
        }
        // Check if the wallet has activity in multiple pools
        if (activity.pools.size >= this.config.minPoolCount) {
            // Get recent whale activities for this wallet
            const now = Date.now();
            const timeWindow = this.config.multiPoolTimeWindow;
            const recentActivities = this.whaleActivities.filter(a => a.walletAddress === walletAddress && now - a.timestamp <= timeWindow);
            // Calculate total value
            const totalValueUSD = recentActivities.reduce((sum, a) => sum + a.totalValueUSD, 0);
            // Create multi-pool activity
            const multiPoolActivity = {
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
    onWhaleActivity(callback) {
        this.callbacks.push(callback);
        logger.info('Registered whale activity callback');
    }
    /**
     * Notify all callbacks about a whale activity
     * @param activity Whale activity
     */
    notifyCallbacks(activity) {
        for (const callback of this.callbacks) {
            try {
                callback(activity);
            }
            catch (error) {
                logger.error('Error in whale activity callback', { error });
            }
        }
    }
    /**
     * Get recent whale activities
     * @param timeWindowMs Time window in milliseconds (default: 24 hours)
     * @returns Array of recent whale activities
     */
    getRecentActivities(timeWindowMs = 24 * 60 * 60 * 1000) {
        const now = Date.now();
        return this.whaleActivities.filter(activity => now - activity.timestamp <= timeWindowMs);
    }
    /**
     * Get whale activities for a specific wallet
     * @param walletAddress Wallet address
     * @param timeWindowMs Time window in milliseconds (default: 7 days)
     * @returns Array of whale activities for the wallet
     */
    getWalletActivities(walletAddress, timeWindowMs = 7 * 24 * 60 * 60 * 1000) {
        const now = Date.now();
        return this.whaleActivities.filter(activity => activity.walletAddress === walletAddress && now - activity.timestamp <= timeWindowMs);
    }
    /**
     * Get whale activities for a specific pool
     * @param poolAddress Pool address
     * @param timeWindowMs Time window in milliseconds (default: 7 days)
     * @returns Array of whale activities for the pool
     */
    getPoolActivities(poolAddress, timeWindowMs = 7 * 24 * 60 * 60 * 1000) {
        const now = Date.now();
        return this.whaleActivities.filter(activity => activity.poolAddresses.includes(poolAddress) && now - activity.timestamp <= timeWindowMs);
    }
    /**
     * Update whale monitor configuration
     * @param config New configuration (partial)
     */
    updateConfig(config) {
        this.config = {
            ...this.config,
            ...config,
        };
        logger.info('Updated whale monitor configuration', { config: this.config });
    }
}
exports.WhaleMonitor = WhaleMonitor;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2hhbGUtbW9uaXRvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9tb2R1bGVzL2NvbGxlY3RvcnMvd2hhbGUtbW9uaXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw2Q0FBd0Q7QUFDeEQsbURBQWtEO0FBQ2xELCtDQUF5RDtBQUV6RCxNQUFNLE1BQU0sR0FBRyxJQUFBLHlCQUFZLEVBQUMsNEJBQTRCLENBQUMsQ0FBQztBQUUxRDs7R0FFRztBQUNILElBQVksaUJBS1g7QUFMRCxXQUFZLGlCQUFpQjtJQUMzQixvREFBK0IsQ0FBQTtJQUMvQiwwREFBcUMsQ0FBQTtJQUNyQyx3REFBbUMsQ0FBQTtJQUNuQyxrRUFBNkMsQ0FBQTtBQUMvQyxDQUFDLEVBTFcsaUJBQWlCLGlDQUFqQixpQkFBaUIsUUFLNUI7QUE0QkQ7OztHQUdHO0FBQ0gsTUFBYSxZQUFZO0lBT3ZCOzs7O09BSUc7SUFDSCxZQUFZLFdBQW1CLEVBQUUsU0FBc0MsRUFBRTtRQVRqRSxvQkFBZSxHQUFvQixFQUFFLENBQUM7UUFDdEMscUJBQWdCLEdBQTJELElBQUksR0FBRyxFQUFFLENBQUM7UUFDckYsY0FBUyxHQUEwQyxFQUFFLENBQUM7UUFRNUQsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLG9CQUFVLENBQUMsV0FBVyxDQUFDLENBQUM7UUFFOUMsd0JBQXdCO1FBQ3hCLElBQUksQ0FBQyxNQUFNLEdBQUc7WUFDWixXQUFXLEVBQUUsS0FBSyxFQUFFLFVBQVU7WUFDOUIsaUJBQWlCLEVBQUUsQ0FBQyxFQUFFLHVCQUF1QjtZQUM3QyxtQkFBbUIsRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLElBQUksRUFBRSxTQUFTO1lBQzlDLFlBQVksRUFBRSxDQUFDLEVBQUUsVUFBVTtZQUMzQixHQUFHLE1BQU07U0FDVixDQUFDO1FBRUYsTUFBTSxDQUFDLElBQUksQ0FBQywyQkFBMkIsRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFB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O0lBQ0gsbUJBQW1CLENBQ2pCLGFBQXFCLEVBQ3JCLGVBQXVCLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxJQUFJO1FBRTlDLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUN2QixPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUNoQyxRQUFRLENBQUMsRUFBRSxDQUNULFFBQVEsQ0FBQyxhQUFhLEtBQUssYUFBYSxJQUFJLEdBQUcsR0FBRyxRQUFRLENBQUMsU0FBUyxJQUFJLFlBQVksQ0FDdkYsQ0FBQztJQUNKLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNILGlCQUFpQixDQUNmLFdBQW1CLEVBQ25CLGVBQXVCLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxJQUFJO1FBRTlDLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUN2QixPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUNoQyxRQUFRLENBQUMsRUFBRSxDQUNULFFBQVEsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEdBQUcsR0FBRyxRQUFRLENBQUMsU0FBUyxJQUFJLFlBQVksQ0FDM0YsQ0FBQztJQUNKLENBQUM7SUFFRDs7O09BR0c7SUFDSCxZQUFZLENBQUMsTUFBbUM7UUFDOUMsSUFBSSxDQUFDLE1BQU0sR0FBRztZQUNaLEdBQUcsSUFBSSxDQUFDLE1BQU07WUFDZCxHQUFHLE1BQU07U0FDVixDQUFDO1FBRUYsTUFBTSxDQUFDLElBQUksQ0FBQyxxQ0FBcUMsRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztJQUM5RSxDQUFDO0NBQ0Y7QUEzV0Qsb0NBMldDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29ubmVjdGlvbiwgUHVibGljS2V5IH0gZnJvbSAnQHNvbGFuYS93ZWIzLmpzJztcbmltcG9ydCB7IGNyZWF0ZUxvZ2dlciB9IGZyb20gJ0BsaXFwcm8vbW9uaXRvcmluZyc7XG5pbXBvcnQgeyBQb29sRXZlbnQsIFBvb2xFdmVudFR5cGUgfSBmcm9tICcuL3Bvb2wtZXZlbnRzJztcblxuY29uc3QgbG9nZ2VyID0gY3JlYXRlTG9nZ2VyKCdkYXRhLXNlcnZpY2U6d2hhbGUtbW9uaXRvcicpO1xuXG4vKipcbiAqIFdoYWxlIEFjdGl2aXR5IFR5cGVcbiAqL1xuZXhwb3J0IGVudW0gV2hhbGVBY3Rpdml0eVR5cGUge1xuICBMQVJHRV9ERVBPU0lUID0gJ2xhcmdlX2RlcG9zaXQnLFxuICBMQVJHRV9XSVRIRFJBV0FMID0gJ2xhcmdlX3dpdGhkcmF3YWwnLFxuICBQT1NJVElPTl9DSEFOR0UgPSAncG9zaXRpb25fY2hhbmdlJyxcbiAgTVVMVElQTEVfUE9PTF9BQ1RJT04gPSAnbXVsdGlwbGVfcG9vbF9hY3Rpb24nLFxufVxuXG4vKipcbiAqIFdoYWxlIEFjdGl2aXR5IEludGVyZmFjZVxuICovXG5leHBvcnQgaW50ZXJmYWNlIFdoYWxlQWN0aXZpdHkge1xuICB0eXBlOiBXaGFsZUFjdGl2aXR5VHlwZTtcbiAgd2FsbGV0QWRkcmVzczogc3RyaW5nO1xuICBwb29sQWRkcmVzc2VzOiBzdHJpbmdbXTtcbiAgdGltZXN0YW1wOiBudW1iZXI7XG4gIHRvdGFsVmFsdWVVU0Q6IG51bWJlcjtcbiAgZGV0YWlsczogYW55O1xufVxuXG4vKipcbiAqIFdoYWxlIE1vbml0b3IgQ29uZmlndXJhdGlvblxuICovXG5leHBvcnQgaW50ZXJmYWNlIFdoYWxlTW9uaXRvckNvbmZpZyB7XG4gIC8vIE1pbmltdW0gVVNEIHZhbHVlIHRvIGNvbnNpZGVyIGFzIGEgd2hhbGUgYWN0aXZpdHlcbiAgbWluVmFsdWVVU0Q6IG51bWJlcjtcbiAgLy8gTWluaW11bSBwZXJjZW50YWdlIG9mIHBvb2wgbGlxdWlkaXR5IHRvIGNvbnNpZGVyIGFzIHNpZ25pZmljYW50XG4gIG1pblBvb2xQZXJjZW50YWdlOiBudW1iZXI7XG4gIC8vIFRpbWUgd2luZG93IHRvIGRldGVjdCBtdWx0aXBsZSBwb29sIGFjdGlvbnMgKGluIG1pbGxpc2Vjb25kcylcbiAgbXVsdGlQb29sVGltZVdpbmRvdzogbnVtYmVyO1xuICAvLyBNaW5pbXVtIG51bWJlciBvZiBwb29scyBmb3IgbXVsdGlwbGUgcG9vbCBhY3Rpb24gZGV0ZWN0aW9uXG4gIG1pblBvb2xDb3VudDogbnVtYmVyO1xufVxuXG4vKipcbiAqIFdoYWxlIE1vbml0b3JcbiAqIFJlc3BvbnNpYmxlIGZvciBtb25pdG9yaW5nIGxhcmdlIGxpcXVpZGl0eSBwcm92aWRlcnMgKHdoYWxlcykgaW4gTWV0ZW9yYSBwb29sc1xuICovXG5leHBvcnQgY2xhc3MgV2hhbGVNb25pdG9yIHtcbiAgcHJpdmF0ZSBjb25uZWN0aW9uOiBDb25uZWN0aW9uO1xuICBwcml2YXRlIGNvbmZpZzogV2hhbGVNb25pdG9yQ29uZmlnO1xuICBwcml2YXRlIHdoYWxlQWN0aXZpdGllczogV2hhbGVBY3Rpdml0eVtdID0gW107XG4gIHByaXZhdGUgd2FsbGV0QWN0aXZpdGllczogTWFwPHN0cmluZywgeyB0aW1lc3RhbXA6IG51bWJlcjsgcG9vbHM6IFNldDxzdHJpbmc+IH0+ID0gbmV3IE1hcCgpO1xuICBwcml2YXRlIGNhbGxiYWNrczogKChhY3Rpdml0eTogV2hhbGVBY3Rpdml0eSkgPT4gdm9pZClbXSA9IFtdO1xuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSBuZXcgV2hhbGUgTW9uaXRvclxuICAgKiBAcGFyYW0gcnBjRW5kcG9pbnQgU29sYW5hIFJQQyBlbmRwb2ludFxuICAgKiBAcGFyYW0gY29uZmlnIFdoYWxlIG1vbml0b3IgY29uZmlndXJhdGlvblxuICAgKi9cbiAgY29uc3RydWN0b3IocnBjRW5kcG9pbnQ6IHN0cmluZywgY29uZmlnOiBQYXJ0aWFsPFdoYWxlTW9uaXRvckNvbmZpZz4gPSB7fSkge1xuICAgIHRoaXMuY29ubmVjdGlvbiA9IG5ldyBDb25uZWN0aW9uKHJwY0VuZHBvaW50KTtcblxuICAgIC8vIERlZmF1bHQgY29uZmlndXJhdGlvblxuICAgIHRoaXMuY29uZmlnID0ge1xuICAgICAgbWluVmFsdWVVU0Q6IDUwMDAwLCAvLyAkNTAsMDAwXG4gICAgICBtaW5Qb29sUGVyY2VudGFnZTogNSwgLy8gNSUgb2YgcG9vbCBsaXF1aWRpdHlcbiAgICAgIG11bHRpUG9vbFRpbWVXaW5kb3c6IDYwICogNjAgKiAxMDAwLCAvLyAxIGhvdXJcbiAgICAgIG1pblBvb2xDb3VudDogMywgLy8gMyBwb29sc1xuICAgICAgLi4uY29uZmlnLFxuICAgIH07XG5cbiAgICBsb2dnZXIuaW5mbygnV2hhbGUgTW9uaXRvciBpbml0aWFsaXplZCcsIHsgY29uZmlnOiB0aGlzLmNvbmZpZyB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQcm9jZXNzIGEgcG9vbCBldmVudCB0byBkZXRlY3Qgd2hhbGUgYWN0aXZpdHlcbiAgICogQHBhcmFtIGV2ZW50IFBvb2wgZXZlbnRcbiAgICogQHBhcmFtIHBvb2xMaXF1aWRpdHlVU0QgVG90YWwgcG9vbCBsaXF1aWRpdHkgaW4gVVNEXG4gICAqIEBwYXJhbSB0b2tlblByaWNlcyBUb2tlbiBwcmljZXMgaW4gVVNEXG4gICAqL1xuICBwcm9jZXNzUG9vbEV2ZW50KFxuICAgIGV2ZW50OiBQb29sRXZlbnQsXG4gICAgcG9vbExpcXVpZGl0eVVTRDogbnVtYmVyLFxuICAgIHRva2VuUHJpY2VzOiBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+XG4gICk6IHZvaWQge1xuICAgIHRyeSB7XG4gICAgICAvLyBPbmx5IHByb2Nlc3MgZGVwb3NpdCwgd2l0aGRyYXcsIGFuZCBwb3NpdGlvbiBldmVudHNcbiAgICAgIGlmIChcbiAgICAgICAgIVtcbiAgICAgICAgICBQb29sRXZlbnRUeXBlLkRFUE9TSVQsXG4gICAgICAgICAgUG9vbEV2ZW50VHlwZS5XSVRIRFJBVyxcbiAgICAgICAgICBQb29sRXZlbnRUeXBlLlBPU0lUSU9OX0NSRUFURUQsXG4gICAgICAgICAgUG9vbEV2ZW50VHlwZS5QT1NJVElPTl9NT0RJRklFRCxcbiAgICAgICAgICBQb29sRXZlbnRUeXBlLlBPU0lUSU9OX0NMT1NFRCxcbiAgICAgICAgXS5pbmNsdWRlcyhldmVudC50eXBlKVxuICAgICAgKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gRXh0cmFjdCB3YWxsZXQgYWRkcmVzcyBmcm9tIGV2ZW50IGRhdGFcbiAgICAgIGNvbnN0IHdhbGxldEFkZHJlc3MgPSB0aGlzLmV4dHJhY3RXYWxsZXRBZGRyZXNzKGV2ZW50KTtcbiAgICAgIGlmICghd2FsbGV0QWRkcmVzcykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIENhbGN1bGF0ZSB0b3RhbCB2YWx1ZSBpbiBVU0RcbiAgICAgIGNvbnN0IHZhbHVlVVNEID0gdGhpcy5jYWxjdWxhdGVFdmVudFZhbHVlVVNEKGV2ZW50LCB0b2tlblByaWNlcyk7XG4gICAgICBpZiAodmFsdWVVU0QgPT09IDApIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBDaGVjayBpZiB0aGlzIGlzIGEgd2hhbGUgYWN0aXZpdHkgYmFzZWQgb24gYWJzb2x1dGUgdmFsdWVcbiAgICAgIGNvbnN0IGlzV2hhbGVCeVZhbHVlID0gdmFsdWVVU0QgPj0gdGhpcy5jb25maWcubWluVmFsdWVVU0Q7XG5cbiAgICAgIC8vIENoZWNrIGlmIHRoaXMgaXMgYSB3aGFsZSBhY3Rpdml0eSBiYXNlZCBvbiBwb29sIHBlcmNlbnRhZ2VcbiAgICAgIGNvbnN0IHBvb2xQZXJjZW50YWdlID0gKHZhbHVlVVNEIC8gcG9vbExpcXVpZGl0eVVTRCkgKiAxMDA7XG4gICAgICBjb25zdCBpc1doYWxlQnlQZXJjZW50YWdlID0gcG9vbFBlcmNlbnRhZ2UgPj0gdGhpcy5jb25maWcubWluUG9vbFBlcmNlbnRhZ2U7XG5cbiAgICAgIC8vIElmIHRoaXMgaXMgYSB3aGFsZSBhY3Rpdml0eSwgcmVjb3JkIGl0XG4gICAgICBpZiAoaXNXaGFsZUJ5VmFsdWUgfHwgaXNXaGFsZUJ5UGVyY2VudGFnZSkge1xuICAgICAgICBsZXQgYWN0aXZpdHlUeXBlOiBXaGFsZUFjdGl2aXR5VHlwZTtcblxuICAgICAgICBzd2l0Y2ggKGV2ZW50LnR5cGUpIHtcbiAgICAgICAgICBjYXNlIFBvb2xFdmVudFR5cGUuREVQT1NJVDpcbiAgICAgICAgICBjYXNlIFBvb2xFdmVudFR5cGUuUE9TSVRJT05fQ1JFQVRFRDpcbiAgICAgICAgICAgIGFjdGl2aXR5VHlwZSA9IFdoYWxlQWN0aXZpdHlUeXBlLkxBUkdFX0RFUE9TSVQ7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlIFBvb2xFdmVudFR5cGUuV0lUSERSQVc6XG4gICAgICAgICAgY2FzZSBQb29sRXZlbnRUeXBlLlBPU0lUSU9OX0NMT1NFRDpcbiAgICAgICAgICAgIGFjdGl2aXR5VHlwZSA9IFdoYWxlQWN0aXZpdHlUeXBlLkxBUkdFX1dJVEhEUkFXQUw7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgYWN0aXZpdHlUeXBlID0gV2hhbGVBY3Rpdml0eVR5cGUuUE9TSVRJT05fQ0hBTkdFO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmVjb3JkIHdoYWxlIGFjdGl2aXR5XG4gICAgICAgIGNvbnN0IGFjdGl2aXR5OiBXaGFsZUFjdGl2aXR5ID0ge1xuICAgICAgICAgIHR5cGU6IGFjdGl2aXR5VHlwZSxcbiAgICAgICAgICB3YWxsZXRBZGRyZXNzLFxuICAgICAgICAgIHBvb2xBZGRyZXNzZXM6IFtldmVudC5wb29sQWRkcmVzc10sXG4gICAgICAgICAgdGltZXN0YW1wOiBldmVudC5ibG9ja1RpbWUgKiAxMDAwLCAvLyBDb252ZXJ0IHRvIG1pbGxpc2Vjb25kc1xuICAgICAgICAgIHRvdGFsVmFsdWVVU0Q6IHZhbHVlVVNELFxuICAgICAgICAgIGRldGFpbHM6IHtcbiAgICAgICAgICAgIGV2ZW50VHlwZTogZXZlbnQudHlwZSxcbiAgICAgICAgICAgIHNpZ25hdHVyZTogZXZlbnQuc2lnbmF0dXJlLFxuICAgICAgICAgICAgcG9vbFBlcmNlbnRhZ2UsXG4gICAgICAgICAgICBpc1doYWxlQnlWYWx1ZSxcbiAgICAgICAgICAgIGlzV2hhbGVCeVBlcmNlbnRhZ2UsXG4gICAgICAgICAgICBldmVudERhdGE6IGV2ZW50LmRhdGEsXG4gICAgICAgICAgfSxcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLndoYWxlQWN0aXZpdGllcy5wdXNoKGFjdGl2aXR5KTtcblxuICAgICAgICAvLyBOb3RpZnkgY2FsbGJhY2tzXG4gICAgICAgIHRoaXMubm90aWZ5Q2FsbGJhY2tzKGFjdGl2aXR5KTtcblxuICAgICAgICAvLyBVcGRhdGUgd2FsbGV0IGFjdGl2aXRpZXMgZm9yIG11bHRpLXBvb2wgZGV0ZWN0aW9uXG4gICAgICAgIHRoaXMudXBkYXRlV2FsbGV0QWN0aXZpdGllcyh3YWxsZXRBZGRyZXNzLCBldmVudC5wb29sQWRkcmVzcywgZXZlbnQuYmxvY2tUaW1lICogMTAwMCk7XG5cbiAgICAgICAgLy8gQ2hlY2sgZm9yIG11bHRpLXBvb2wgYWN0aXZpdHlcbiAgICAgICAgdGhpcy5jaGVja011bHRpUG9vbEFjdGl2aXR5KHdhbGxldEFkZHJlc3MpO1xuXG4gICAgICAgIGxvZ2dlci5pbmZvKGBEZXRlY3RlZCB3aGFsZSBhY3Rpdml0eTogJHthY3Rpdml0eVR5cGV9YCwge1xuICAgICAgICAgIHdhbGxldEFkZHJlc3MsXG4gICAgICAgICAgcG9vbEFkZHJlc3M6IGV2ZW50LnBvb2xBZGRyZXNzLFxuICAgICAgICAgIHZhbHVlVVNELFxuICAgICAgICAgIHBvb2xQZXJjZW50YWdlLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgbG9nZ2VyLmVycm9yKCdFcnJvciBwcm9jZXNzaW5nIGV2ZW50IGZvciB3aGFsZSBhY3Rpdml0eScsIHsgZXJyb3IsIGV2ZW50IH0pO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBFeHRyYWN0IHdhbGxldCBhZGRyZXNzIGZyb20gZXZlbnQgZGF0YVxuICAgKiBAcGFyYW0gZXZlbnQgUG9vbCBldmVudFxuICAgKiBAcmV0dXJucyBXYWxsZXQgYWRkcmVzcyBvciBudWxsIGlmIG5vdCBmb3VuZFxuICAgKi9cbiAgcHJpdmF0ZSBleHRyYWN0V2FsbGV0QWRkcmVzcyhldmVudDogUG9vbEV2ZW50KTogc3RyaW5nIHwgbnVsbCB7XG4gICAgdHJ5IHtcbiAgICAgIC8vIFRoaXMgaXMgYSBzaW1wbGlmaWVkIGltcGxlbWVudGF0aW9uXG4gICAgICAvLyBJbiBhIHJlYWwgaW1wbGVtZW50YXRpb24sIHlvdSB3b3VsZCBuZWVkIHRvIGFuYWx5emUgdGhlIHRyYW5zYWN0aW9uIGRhdGFcbiAgICAgIC8vIHRvIGV4dHJhY3QgdGhlIHdhbGxldCBhZGRyZXNzIHRoYXQgaW5pdGlhdGVkIHRoZSBhY3Rpb25cblxuICAgICAgLy8gRm9yIG5vdywgd2UnbGwgYXNzdW1lIHRoZSB3YWxsZXQgYWRkcmVzcyBpcyBpbiB0aGUgZXZlbnQgZGF0YVxuICAgICAgaWYgKGV2ZW50LmRhdGE/LnRva2VuQmFsYW5jZXM/LnByZT8uWzBdPy5vd25lcikge1xuICAgICAgICByZXR1cm4gZXZlbnQuZGF0YS50b2tlbkJhbGFuY2VzLnByZVswXS5vd25lcjtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGxvZ2dlci5lcnJvcignRXJyb3IgZXh0cmFjdGluZyB3YWxsZXQgYWRkcmVzcycsIHsgZXJyb3IsIGV2ZW50IH0pO1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENhbGN1bGF0ZSBldmVudCB2YWx1ZSBpbiBVU0RcbiAgICogQHBhcmFtIGV2ZW50IFBvb2wgZXZlbnRcbiAgICogQHBhcmFtIHRva2VuUHJpY2VzIFRva2VuIHByaWNlcyBpbiBVU0RcbiAgICogQHJldHVybnMgVG90YWwgdmFsdWUgaW4gVVNEXG4gICAqL1xuICBwcml2YXRlIGNhbGN1bGF0ZUV2ZW50VmFsdWVVU0QoZXZlbnQ6IFBvb2xFdmVudCwgdG9rZW5QcmljZXM6IFJlY29yZDxzdHJpbmcsIG51bWJlcj4pOiBudW1iZXIge1xuICAgIHRyeSB7XG4gICAgICAvLyBUaGlzIGlzIGEgc2ltcGxpZmllZCBpbXBsZW1lbnRhdGlvblxuICAgICAgLy8gSW4gYSByZWFsIGltcGxlbWVudGF0aW9uLCB5b3Ugd291bGQgbmVlZCB0byBhbmFseXplIHRoZSB0cmFuc2FjdGlvbiBkYXRhXG4gICAgICAvLyB0byBjYWxjdWxhdGUgdGhlIGV4YWN0IHZhbHVlIG9mIHRoZSBhY3Rpb24gaW4gVVNEXG5cbiAgICAgIGxldCB0b3RhbFZhbHVlVVNEID0gMDtcblxuICAgICAgLy8gQ2FsY3VsYXRlIHZhbHVlIGJhc2VkIG9uIHRva2VuIGJhbGFuY2VzXG4gICAgICBpZiAoZXZlbnQuZGF0YT8udG9rZW5CYWxhbmNlcykge1xuICAgICAgICBjb25zdCB7IHByZSwgcG9zdCB9ID0gZXZlbnQuZGF0YS50b2tlbkJhbGFuY2VzO1xuXG4gICAgICAgIC8vIENhbGN1bGF0ZSB2YWx1ZSBmb3IgZWFjaCB0b2tlblxuICAgICAgICBmb3IgKGNvbnN0IHByZUJhbGFuY2Ugb2YgcHJlKSB7XG4gICAgICAgICAgY29uc3QgcG9zdEJhbGFuY2UgPSBwb3N0LmZpbmQoKGI6IGFueSkgPT4gYi5taW50ID09PSBwcmVCYWxhbmNlLm1pbnQpO1xuXG4gICAgICAgICAgaWYgKHBvc3RCYWxhbmNlKSB7XG4gICAgICAgICAgICBjb25zdCB0b2tlbk1pbnQgPSBwcmVCYWxhbmNlLm1pbnQ7XG4gICAgICAgICAgICBjb25zdCB0b2tlblByaWNlID0gdG9rZW5QcmljZXNbdG9rZW5NaW50XSB8fCAwO1xuXG4gICAgICAgICAgICAvLyBDYWxjdWxhdGUgdG9rZW4gYW1vdW50IGNoYW5nZVxuICAgICAgICAgICAgY29uc3QgcHJlQW1vdW50ID1cbiAgICAgICAgICAgICAgcGFyc2VJbnQocHJlQmFsYW5jZS51aVRva2VuQW1vdW50LmFtb3VudCkgLyAxMCAqKiBwcmVCYWxhbmNlLnVpVG9rZW5BbW91bnQuZGVjaW1hbHM7XG4gICAgICAgICAgICBjb25zdCBwb3N0QW1vdW50ID1cbiAgICAgICAgICAgICAgcGFyc2VJbnQocG9zdEJhbGFuY2UudWlUb2tlbkFtb3VudC5hbW91bnQpIC8gMTAgKiogcG9zdEJhbGFuY2UudWlUb2tlbkFtb3VudC5kZWNpbWFscztcbiAgICAgICAgICAgIGNvbnN0IGFtb3VudENoYW5nZSA9IE1hdGguYWJzKHBvc3RBbW91bnQgLSBwcmVBbW91bnQpO1xuXG4gICAgICAgICAgICAvLyBDYWxjdWxhdGUgdmFsdWUgaW4gVVNEXG4gICAgICAgICAgICBjb25zdCB2YWx1ZVVTRCA9IGFtb3VudENoYW5nZSAqIHRva2VuUHJpY2U7XG4gICAgICAgICAgICB0b3RhbFZhbHVlVVNEICs9IHZhbHVlVVNEO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gdG90YWxWYWx1ZVVTRDtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgbG9nZ2VyLmVycm9yKCdFcnJvciBjYWxjdWxhdGluZyBldmVudCB2YWx1ZScsIHsgZXJyb3IsIGV2ZW50IH0pO1xuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFVwZGF0ZSB3YWxsZXQgYWN0aXZpdGllcyBmb3IgbXVsdGktcG9vbCBkZXRlY3Rpb25cbiAgICogQHBhcmFtIHdhbGxldEFkZHJlc3MgV2FsbGV0IGFkZHJlc3NcbiAgICogQHBhcmFtIHBvb2xBZGRyZXNzIFBvb2wgYWRkcmVzc1xuICAgKiBAcGFyYW0gdGltZXN0YW1wIEFjdGl2aXR5IHRpbWVzdGFtcFxuICAgKi9cbiAgcHJpdmF0ZSB1cGRhdGVXYWxsZXRBY3Rpdml0aWVzKFxuICAgIHdhbGxldEFkZHJlc3M6IHN0cmluZyxcbiAgICBwb29sQWRkcmVzczogc3RyaW5nLFxuICAgIHRpbWVzdGFtcDogbnVtYmVyXG4gICk6IHZvaWQge1xuICAgIC8vIEdldCBvciBjcmVhdGUgd2FsbGV0IGFjdGl2aXR5XG4gICAgaWYgKCF0aGlzLndhbGxldEFjdGl2aXRpZXMuaGFzKHdhbGxldEFkZHJlc3MpKSB7XG4gICAgICB0aGlzLndhbGxldEFjdGl2aXRpZXMuc2V0KHdhbGxldEFkZHJlc3MsIHtcbiAgICAgICAgdGltZXN0YW1wLFxuICAgICAgICBwb29sczogbmV3IFNldChbcG9vbEFkZHJlc3NdKSxcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBhY3Rpdml0eSA9IHRoaXMud2FsbGV0QWN0aXZpdGllcy5nZXQod2FsbGV0QWRkcmVzcykhO1xuXG4gICAgICAvLyBVcGRhdGUgdGltZXN0YW1wIHRvIHRoZSBtb3N0IHJlY2VudCBhY3Rpdml0eVxuICAgICAgYWN0aXZpdHkudGltZXN0YW1wID0gTWF0aC5tYXgoYWN0aXZpdHkudGltZXN0YW1wLCB0aW1lc3RhbXApO1xuXG4gICAgICAvLyBBZGQgcG9vbCB0byB0aGUgc2V0XG4gICAgICBhY3Rpdml0eS5wb29scy5hZGQocG9vbEFkZHJlc3MpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVjayBmb3IgbXVsdGktcG9vbCBhY3Rpdml0eVxuICAgKiBAcGFyYW0gd2FsbGV0QWRkcmVzcyBXYWxsZXQgYWRkcmVzc1xuICAgKi9cbiAgcHJpdmF0ZSBjaGVja011bHRpUG9vbEFjdGl2aXR5KHdhbGxldEFkZHJlc3M6IHN0cmluZyk6IHZvaWQge1xuICAgIGNvbnN0IGFjdGl2aXR5ID0gdGhpcy53YWxsZXRBY3Rpdml0aWVzLmdldCh3YWxsZXRBZGRyZXNzKTtcbiAgICBpZiAoIWFjdGl2aXR5KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgaWYgdGhlIHdhbGxldCBoYXMgYWN0aXZpdHkgaW4gbXVsdGlwbGUgcG9vbHNcbiAgICBpZiAoYWN0aXZpdHkucG9vbHMuc2l6ZSA+PSB0aGlzLmNvbmZpZy5taW5Qb29sQ291bnQpIHtcbiAgICAgIC8vIEdldCByZWNlbnQgd2hhbGUgYWN0aXZpdGllcyBmb3IgdGhpcyB3YWxsZXRcbiAgICAgIGNvbnN0IG5vdyA9IERhdGUubm93KCk7XG4gICAgICBjb25zdCB0aW1lV2luZG93ID0gdGhpcy5jb25maWcubXVsdGlQb29sVGltZVdpbmRvdztcbiAgICAgIGNvbnN0IHJlY2VudEFjdGl2aXRpZXMgPSB0aGlzLndoYWxlQWN0aXZpdGllcy5maWx0ZXIoXG4gICAgICAgIGEgPT4gYS53YWxsZXRBZGRyZXNzID09PSB3YWxsZXRBZGRyZXNzICYmIG5vdyAtIGEudGltZXN0YW1wIDw9IHRpbWVXaW5kb3dcbiAgICAgICk7XG5cbiAgICAgIC8vIENhbGN1bGF0ZSB0b3RhbCB2YWx1ZVxuICAgICAgY29uc3QgdG90YWxWYWx1ZVVTRCA9IHJlY2VudEFjdGl2aXRpZXMucmVkdWNlKChzdW0sIGEpID0+IHN1bSArIGEudG90YWxWYWx1ZVVTRCwgMCk7XG5cbiAgICAgIC8vIENyZWF0ZSBtdWx0aS1wb29sIGFjdGl2aXR5XG4gICAgICBjb25zdCBtdWx0aVBvb2xBY3Rpdml0eTogV2hhbGVBY3Rpdml0eSA9IHtcbiAgICAgICAgdHlwZTogV2hhbGVBY3Rpdml0eVR5cGUuTVVMVElQTEVfUE9PTF9BQ1RJT04sXG4gICAgICAgIHdhbGxldEFkZHJlc3MsXG4gICAgICAgIHBvb2xBZGRyZXNzZXM6IEFycmF5LmZyb20oYWN0aXZpdHkucG9vbHMpLFxuICAgICAgICB0aW1lc3RhbXA6IGFjdGl2aXR5LnRpbWVzdGFtcCxcbiAgICAgICAgdG90YWxWYWx1ZVVTRCxcbiAgICAgICAgZGV0YWlsczoge1xuICAgICAgICAgIHBvb2xDb3VudDogYWN0aXZpdHkucG9vbHMuc2l6ZSxcbiAgICAgICAgICB0aW1lV2luZG93LFxuICAgICAgICAgIHJlY2VudEFjdGl2aXRpZXM6IHJlY2VudEFjdGl2aXRpZXMubWFwKGEgPT4gKHtcbiAgICAgICAgICAgIHR5cGU6IGEudHlwZSxcbiAgICAgICAgICAgIHBvb2xBZGRyZXNzOiBhLnBvb2xBZGRyZXNzZXNbMF0sXG4gICAgICAgICAgICB0aW1lc3RhbXA6IGEudGltZXN0YW1wLFxuICAgICAgICAgICAgdmFsdWVVU0Q6IGEudG90YWxWYWx1ZVVTRCxcbiAgICAgICAgICB9KSksXG4gICAgICAgIH0sXG4gICAgICB9O1xuXG4gICAgICAvLyBBZGQgdG8gd2hhbGUgYWN0aXZpdGllc1xuICAgICAgdGhpcy53aGFsZUFjdGl2aXRpZXMucHVzaChtdWx0aVBvb2xBY3Rpdml0eSk7XG5cbiAgICAgIC8vIE5vdGlmeSBjYWxsYmFja3NcbiAgICAgIHRoaXMubm90aWZ5Q2FsbGJhY2tzKG11bHRpUG9vbEFjdGl2aXR5KTtcblxuICAgICAgbG9nZ2VyLmluZm8oYERldGVjdGVkIG11bHRpLXBvb2wgd2hhbGUgYWN0aXZpdHlgLCB7XG4gICAgICAgIHdhbGxldEFkZHJlc3MsXG4gICAgICAgIHBvb2xDb3VudDogYWN0aXZpdHkucG9vbHMuc2l6ZSxcbiAgICAgICAgdG90YWxWYWx1ZVVTRCxcbiAgICAgIH0pO1xuXG4gICAgICAvLyBSZXNldCBwb29scyBmb3IgdGhpcyB3YWxsZXQgdG8gYXZvaWQgZHVwbGljYXRlIGFsZXJ0c1xuICAgICAgYWN0aXZpdHkucG9vbHMuY2xlYXIoKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUmVnaXN0ZXIgYSBjYWxsYmFjayBmb3Igd2hhbGUgYWN0aXZpdHkgbm90aWZpY2F0aW9uc1xuICAgKiBAcGFyYW0gY2FsbGJhY2sgQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICovXG4gIG9uV2hhbGVBY3Rpdml0eShjYWxsYmFjazogKGFjdGl2aXR5OiBXaGFsZUFjdGl2aXR5KSA9PiB2b2lkKTogdm9pZCB7XG4gICAgdGhpcy5jYWxsYmFja3MucHVzaChjYWxsYmFjayk7XG4gICAgbG9nZ2VyLmluZm8oJ1JlZ2lzdGVyZWQgd2hhbGUgYWN0aXZpdHkgY2FsbGJhY2snKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBOb3RpZnkgYWxsIGNhbGxiYWNrcyBhYm91dCBhIHdoYWxlIGFjdGl2aXR5XG4gICAqIEBwYXJhbSBhY3Rpdml0eSBXaGFsZSBhY3Rpdml0eVxuICAgKi9cbiAgcHJpdmF0ZSBub3RpZnlDYWxsYmFja3MoYWN0aXZpdHk6IFdoYWxlQWN0aXZpdHkpOiB2b2lkIHtcbiAgICBmb3IgKGNvbnN0IGNhbGxiYWNrIG9mIHRoaXMuY2FsbGJhY2tzKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjYWxsYmFjayhhY3Rpdml0eSk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBsb2dnZXIuZXJyb3IoJ0Vycm9yIGluIHdoYWxlIGFjdGl2aXR5IGNhbGxiYWNrJywgeyBlcnJvciB9KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogR2V0IHJlY2VudCB3aGFsZSBhY3Rpdml0aWVzXG4gICAqIEBwYXJhbSB0aW1lV2luZG93TXMgVGltZSB3aW5kb3cgaW4gbWlsbGlzZWNvbmRzIChkZWZhdWx0OiAyNCBob3VycylcbiAgICogQHJldHVybnMgQXJyYXkgb2YgcmVjZW50IHdoYWxlIGFjdGl2aXRpZXNcbiAgICovXG4gIGdldFJlY2VudEFjdGl2aXRpZXModGltZVdpbmRvd01zOiBudW1iZXIgPSAyNCAqIDYwICogNjAgKiAxMDAwKTogV2hhbGVBY3Rpdml0eVtdIHtcbiAgICBjb25zdCBub3cgPSBEYXRlLm5vdygpO1xuICAgIHJldHVybiB0aGlzLndoYWxlQWN0aXZpdGllcy5maWx0ZXIoYWN0aXZpdHkgPT4gbm93IC0gYWN0aXZpdHkudGltZXN0YW1wIDw9IHRpbWVXaW5kb3dNcyk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHdoYWxlIGFjdGl2aXRpZXMgZm9yIGEgc3BlY2lmaWMgd2FsbGV0XG4gICAqIEBwYXJhbSB3YWxsZXRBZGRyZXNzIFdhbGxldCBhZGRyZXNzXG4gICAqIEBwYXJhbSB0aW1lV2luZG93TXMgVGltZSB3aW5kb3cgaW4gbWlsbGlzZWNvbmRzIChkZWZhdWx0OiA3IGRheXMpXG4gICAqIEByZXR1cm5zIEFycmF5IG9mIHdoYWxlIGFjdGl2aXRpZXMgZm9yIHRoZSB3YWxsZXRcbiAgICovXG4gIGdldFdhbGxldEFjdGl2aXRpZXMoXG4gICAgd2FsbGV0QWRkcmVzczogc3RyaW5nLFxuICAgIHRpbWVXaW5kb3dNczogbnVtYmVyID0gNyAqIDI0ICogNjAgKiA2MCAqIDEwMDBcbiAgKTogV2hhbGVBY3Rpdml0eVtdIHtcbiAgICBjb25zdCBub3cgPSBEYXRlLm5vdygpO1xuICAgIHJldHVybiB0aGlzLndoYWxlQWN0aXZpdGllcy5maWx0ZXIoXG4gICAgICBhY3Rpdml0eSA9PlxuICAgICAgICBhY3Rpdml0eS53YWxsZXRBZGRyZXNzID09PSB3YWxsZXRBZGRyZXNzICYmIG5vdyAtIGFjdGl2aXR5LnRpbWVzdGFtcCA8PSB0aW1lV2luZG93TXNcbiAgICApO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB3aGFsZSBhY3Rpdml0aWVzIGZvciBhIHNwZWNpZmljIHBvb2xcbiAgICogQHBhcmFtIHBvb2xBZGRyZXNzIFBvb2wgYWRkcmVzc1xuICAgKiBAcGFyYW0gdGltZVdpbmRvd01zIFRpbWUgd2luZG93IGluIG1pbGxpc2Vjb25kcyAoZGVmYXVsdDogNyBkYXlzKVxuICAgKiBAcmV0dXJucyBBcnJheSBvZiB3aGFsZSBhY3Rpdml0aWVzIGZvciB0aGUgcG9vbFxuICAgKi9cbiAgZ2V0UG9vbEFjdGl2aXRpZXMoXG4gICAgcG9vbEFkZHJlc3M6IHN0cmluZyxcbiAgICB0aW1lV2luZG93TXM6IG51bWJlciA9IDcgKiAyNCAqIDYwICogNjAgKiAxMDAwXG4gICk6IFdoYWxlQWN0aXZpdHlbXSB7XG4gICAgY29uc3Qgbm93ID0gRGF0ZS5ub3coKTtcbiAgICByZXR1cm4gdGhpcy53aGFsZUFjdGl2aXRpZXMuZmlsdGVyKFxuICAgICAgYWN0aXZpdHkgPT5cbiAgICAgICAgYWN0aXZpdHkucG9vbEFkZHJlc3Nlcy5pbmNsdWRlcyhwb29sQWRkcmVzcykgJiYgbm93IC0gYWN0aXZpdHkudGltZXN0YW1wIDw9IHRpbWVXaW5kb3dNc1xuICAgICk7XG4gIH1cblxuICAvKipcbiAgICogVXBkYXRlIHdoYWxlIG1vbml0b3IgY29uZmlndXJhdGlvblxuICAgKiBAcGFyYW0gY29uZmlnIE5ldyBjb25maWd1cmF0aW9uIChwYXJ0aWFsKVxuICAgKi9cbiAgdXBkYXRlQ29uZmlnKGNvbmZpZzogUGFydGlhbDxXaGFsZU1vbml0b3JDb25maWc+KTogdm9pZCB7XG4gICAgdGhpcy5jb25maWcgPSB7XG4gICAgICAuLi50aGlzLmNvbmZpZyxcbiAgICAgIC4uLmNvbmZpZyxcbiAgICB9O1xuXG4gICAgbG9nZ2VyLmluZm8oJ1VwZGF0ZWQgd2hhbGUgbW9uaXRvciBjb25maWd1cmF0aW9uJywgeyBjb25maWc6IHRoaXMuY29uZmlnIH0pO1xuICB9XG59XG4iXX0=