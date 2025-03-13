"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataController = exports.TimePeriod = void 0;
const monitoring_1 = require("@liqpro/monitoring");
const logger = (0, monitoring_1.createLogger)('data-service:controller');
var TimePeriod;
(function (TimePeriod) {
    TimePeriod["HOUR_1"] = "1h";
    TimePeriod["HOUR_4"] = "4h";
    TimePeriod["HOUR_12"] = "12h";
    TimePeriod["DAY_1"] = "1d";
    TimePeriod["WEEK_1"] = "1w";
    TimePeriod["MONTH_1"] = "1m";
})(TimePeriod || (exports.TimePeriod = TimePeriod = {}));
class DataController {
    constructor(config) {
        this.config = config;
        this.isRunning = false;
        this.poolSubscriptions = new Map();
        this.trackedPools = new Map();
        this.poolData = new Map();
        this.whaleActivities = [];
        logger.info('DataController initialized with config', {
            rpcEndpoint: config.rpcEndpoint,
            poolDataInterval: config.poolDataInterval,
            marketPriceInterval: config.marketPriceInterval,
            eventPollingInterval: config.eventPollingInterval,
        });
    }
    /**
     * Start all data collection and processing
     */
    async start() {
        if (this.isRunning) {
            return;
        }
        logger.info('Starting data service');
        // In a real implementation, this would initialize connections to databases,
        // start data collectors, etc.
        this.isRunning = true;
        logger.info('Data service started');
    }
    /**
     * Stop all data collection and processing
     */
    stop() {
        if (!this.isRunning) {
            return;
        }
        logger.info('Stopping data service');
        // In a real implementation, this would stop data collectors,
        // close database connections, etc.
        this.isRunning = false;
        logger.info('Data service stopped');
    }
    /**
     * Start tracking a specific liquidity pool
     */
    async trackPool(poolAddress, name, description) {
        logger.info('Starting to track pool', { poolAddress, name });
        this.trackedPools.set(poolAddress, { name, description });
        // In a real implementation, this would start collecting data for the pool
    }
    /**
     * Stop tracking a specific liquidity pool
     */
    async untrackPool(poolAddress) {
        logger.info('Stopping tracking of pool', { poolAddress });
        this.trackedPools.delete(poolAddress);
        // In a real implementation, this would stop collecting data for the pool
    }
    /**
     * Get list of all tracked pools
     */
    async getTrackedPools() {
        return Array.from(this.trackedPools.entries()).map(([address, info]) => ({
            address,
            ...info,
        }));
    }
    /**
     * Get aggregated data for a specific pool
     */
    async getAggregatedData(poolAddress, timeframe, resolution) {
        logger.info('Getting aggregated data', { poolAddress, timeframe, resolution });
        // In a real implementation, this would retrieve and aggregate data from storage
        return [];
    }
    /**
     * Get raw data points for a specific pool
     */
    async getRawData(poolAddress, startTime, endTime, limit) {
        logger.info('Getting raw data', { poolAddress, startTime, endTime, limit });
        // In a real implementation, this would retrieve data from storage
        return this.poolData.get(poolAddress) || [];
    }
    /**
     * Get the latest data point for a specific pool
     */
    async getLatestDataPoint(poolAddress) {
        logger.info('Getting latest data point', { poolAddress });
        const poolDataPoints = this.poolData.get(poolAddress) || [];
        if (poolDataPoints.length === 0) {
            return null;
        }
        // Return the most recent data point
        return poolDataPoints[poolDataPoints.length - 1];
    }
    /**
     * Get whale activities based on filters
     */
    async getWhaleActivities(poolAddress, startTime, endTime, limit) {
        logger.info('Getting whale activities', { poolAddress, startTime, endTime, limit });
        let activities = this.whaleActivities;
        // Apply filters
        if (poolAddress) {
            activities = activities.filter(a => a.poolAddress === poolAddress);
        }
        if (startTime) {
            activities = activities.filter(a => a.timestamp >= startTime);
        }
        if (endTime) {
            activities = activities.filter(a => a.timestamp <= endTime);
        }
        // Apply limit
        if (limit && activities.length > limit) {
            activities = activities.slice(0, limit);
        }
        return activities;
    }
    /**
     * Get storage statistics
     */
    async getStorageStats() {
        logger.info('Getting storage stats');
        // In a real implementation, this would calculate storage statistics
        return {
            hotDataSize: 0,
            warmDataSize: 0,
            coldDataSize: 0,
            totalDataPoints: 0,
            poolCount: this.trackedPools.size,
            oldestDataTimestamp: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
            newestDataTimestamp: Date.now(),
        };
    }
    /**
     * Subscribe to real-time updates for a specific pool
     */
    subscribeToPoolUpdates(poolAddress, callback) {
        if (!this.poolSubscriptions.has(poolAddress)) {
            this.poolSubscriptions.set(poolAddress, new Set());
        }
        this.poolSubscriptions.get(poolAddress).add(callback);
        return {
            unsubscribe: () => {
                const callbacks = this.poolSubscriptions.get(poolAddress);
                if (callbacks) {
                    callbacks.delete(callback);
                    if (callbacks.size === 0) {
                        this.poolSubscriptions.delete(poolAddress);
                    }
                }
            },
        };
    }
    // Private helper method to notify subscribers
    notifyPoolSubscribers(poolAddress, data) {
        const subscribers = this.poolSubscriptions.get(poolAddress);
        if (subscribers) {
            for (const callback of subscribers) {
                try {
                    callback(data);
                }
                catch (error) {
                    logger.error('Error in pool subscriber callback', { error, poolAddress });
                }
            }
        }
    }
}
exports.DataController = DataController;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YS1jb250cm9sbGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2NvbnRyb2xsZXJzL2RhdGEtY29udHJvbGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtREFBa0Q7QUFFbEQsTUFBTSxNQUFNLEdBQUcsSUFBQSx5QkFBWSxFQUFDLHlCQUF5QixDQUFDLENBQUM7QUF5RnZELElBQVksVUFPWDtBQVBELFdBQVksVUFBVTtJQUNwQiwyQkFBYSxDQUFBO0lBQ2IsMkJBQWEsQ0FBQTtJQUNiLDZCQUFlLENBQUE7SUFDZiwwQkFBWSxDQUFBO0lBQ1osMkJBQWEsQ0FBQTtJQUNiLDRCQUFjLENBQUE7QUFDaEIsQ0FBQyxFQVBXLFVBQVUsMEJBQVYsVUFBVSxRQU9yQjtBQUVELE1BQWEsY0FBYztJQU96QixZQUFvQixNQUE0QjtRQUE1QixXQUFNLEdBQU4sTUFBTSxDQUFzQjtRQU54QyxjQUFTLEdBQVksS0FBSyxDQUFDO1FBQzNCLHNCQUFpQixHQUEwQyxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ3JFLGlCQUFZLEdBQXlELElBQUksR0FBRyxFQUFFLENBQUM7UUFDL0UsYUFBUSxHQUE0QixJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQzlDLG9CQUFlLEdBQW9CLEVBQUUsQ0FBQztRQUc1QyxNQUFNLENBQUMsSUFBSSxDQUFDLHdDQUF3QyxFQUFFO1lBQ3BELFdBQVcsRUFBRSxNQUFNLENBQUMsV0FBVztZQUMvQixnQkFBZ0IsRUFBRSxNQUFNLENBQUMsZ0JBQWdCO1lBQ3pDLG1CQUFtQixFQUFFLE1BQU0sQ0FBQyxtQkFBbUI7WUFDL0Msb0JBQW9CLEVBQUUsTUFBTSxDQUFDLG9CQUFvQjtTQUNsRCxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQ7O09BRUc7SUFDSSxLQUFLLENBQUMsS0FBSztRQUNoQixJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNuQixPQUFPO1FBQ1QsQ0FBQztRQUVELE1BQU0sQ0FB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QyxXQUFtQixFQUFFLElBQVM7UUFDMUQsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUM1RCxJQUFJLFdBQVcsRUFBRSxDQUFDO1lBQ2hCLEtBQUssTUFBTSxRQUFRLElBQUksV0FBVyxFQUFFLENBQUM7Z0JBQ25DLElBQUksQ0FBQztvQkFDSCxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ2pCLENBQUM7Z0JBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztvQkFDZixNQUFNLENBQUMsS0FBSyxDQUFDLG1DQUFtQyxFQUFFLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxDQUFDLENBQUM7Z0JBQzVFLENBQUM7WUFDSCxDQUFDO1FBQ0gsQ0FBQztJQUNILENBQUM7Q0FDRjtBQXZORCx3Q0F1TkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBjcmVhdGVMb2dnZXIgfSBmcm9tICdAbGlxcHJvL21vbml0b3JpbmcnO1xuXG5jb25zdCBsb2dnZXIgPSBjcmVhdGVMb2dnZXIoJ2RhdGEtc2VydmljZTpjb250cm9sbGVyJyk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgRGF0YUNvbnRyb2xsZXJDb25maWcge1xuICBycGNFbmRwb2ludDogc3RyaW5nO1xuICBycGNDb21taXRtZW50OiAncHJvY2Vzc2VkJyB8ICdjb25maXJtZWQnIHwgJ2ZpbmFsaXplZCc7XG4gIGFwaUtleXM6IHtcbiAgICBjb2luZ2Vja28/OiBzdHJpbmc7XG4gICAgY29pbm1hcmtldGNhcD86IHN0cmluZztcbiAgICBqdXBpdGVyPzogc3RyaW5nO1xuICB9O1xuICBwb29sRGF0YUludGVydmFsOiBudW1iZXI7XG4gIG1hcmtldFByaWNlSW50ZXJ2YWw6IG51bWJlcjtcbiAgZXZlbnRQb2xsaW5nSW50ZXJ2YWw6IG51bWJlcjtcbiAgc3RvcmFnZToge1xuICAgIGhvdERhdGFUaHJlc2hvbGQ6IG51bWJlcjtcbiAgICB3YXJtRGF0YVRocmVzaG9sZDogbnVtYmVyO1xuICAgIG1heEhvdERhdGFQb2ludHM6IG51bWJlcjtcbiAgICBjb21wcmVzc1dhcm1EYXRhOiBib29sZWFuO1xuICAgIGNvbXByZXNzQ29sZERhdGE6IGJvb2xlYW47XG4gICAgZW5hYmxlQXV0b0FyY2hpdmluZzogYm9vbGVhbjtcbiAgICBhcmNoaXZlSW50ZXJ2YWw6IG51bWJlcjtcbiAgfTtcbiAgd2hhbGVNb25pdG9yaW5nOiB7XG4gICAgbWluVmFsdWVVU0Q6IG51bWJlcjtcbiAgICBtaW5Qb29sUGVyY2VudGFnZTogbnVtYmVyO1xuICB9O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFBvb2xEYXRhIHtcbiAgcG9vbEFkZHJlc3M6IHN0cmluZztcbiAgdGltZXN0YW1wOiBudW1iZXI7XG4gIHRva2VuWDoge1xuICAgIG1pbnQ6IHN0cmluZztcbiAgICBzeW1ib2w6IHN0cmluZztcbiAgICBkZWNpbWFsczogbnVtYmVyO1xuICAgIHByaWNlOiBudW1iZXI7XG4gICAgcmVzZXJ2ZTogbnVtYmVyO1xuICB9O1xuICB0b2tlblk6IHtcbiAgICBtaW50OiBzdHJpbmc7XG4gICAgc3ltYm9sOiBzdHJpbmc7XG4gICAgZGVjaW1hbHM6IG51bWJlcjtcbiAgICBwcmljZTogbnVtYmVyO1xuICAgIHJlc2VydmU6IG51bWJlcjtcbiAgfTtcbiAgbGlxdWlkaXR5OiBudW1iZXI7XG4gIHZvbHVtZTI0aDogbnVtYmVyO1xuICBmZWVzMjRoOiBudW1iZXI7XG4gIGFweTogbnVtYmVyO1xuICB0dmw6IG51bWJlcjtcbiAgcHJpY2VSYXRpbzogbnVtYmVyO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFdoYWxlQWN0aXZpdHkge1xuICBpZDogc3RyaW5nO1xuICBwb29sQWRkcmVzczogc3RyaW5nO1xuICB0aW1lc3RhbXA6IG51bWJlcjtcbiAgdHlwZTogJ3N3YXAnIHwgJ2RlcG9zaXQnIHwgJ3dpdGhkcmF3JztcbiAgdG9rZW5YOiB7XG4gICAgbWludDogc3RyaW5nO1xuICAgIHN5bWJvbDogc3RyaW5nO1xuICAgIGFtb3VudDogbnVtYmVyO1xuICAgIHZhbHVlVVNEOiBudW1iZXI7XG4gIH07XG4gIHRva2VuWToge1xuICAgIG1pbnQ6IHN0cmluZztcbiAgICBzeW1ib2w6IHN0cmluZztcbiAgICBhbW91bnQ6IG51bWJlcjtcbiAgICB2YWx1ZVVTRDogbnVtYmVyO1xuICB9O1xuICB0b3RhbFZhbHVlVVNEOiBudW1iZXI7XG4gIHBlcmNlbnRPZlBvb2w6IG51bWJlcjtcbiAgd2FsbGV0QWRkcmVzczogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFN0b3JhZ2VTdGF0cyB7XG4gIGhvdERhdGFTaXplOiBudW1iZXI7XG4gIHdhcm1EYXRhU2l6ZTogbnVtYmVyO1xuICBjb2xkRGF0YVNpemU6IG51bWJlcjtcbiAgdG90YWxEYXRhUG9pbnRzOiBudW1iZXI7XG4gIHBvb2xDb3VudDogbnVtYmVyO1xuICBvbGRlc3REYXRhVGltZXN0YW1wOiBudW1iZXI7XG4gIG5ld2VzdERhdGFUaW1lc3RhbXA6IG51bWJlcjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQb29sU3Vic2NyaXB0aW9uIHtcbiAgdW5zdWJzY3JpYmU6ICgpID0+IHZvaWQ7XG59XG5cbmV4cG9ydCBlbnVtIFRpbWVQZXJpb2Qge1xuICBIT1VSXzEgPSAnMWgnLFxuICBIT1VSXzQgPSAnNGgnLFxuICBIT1VSXzEyID0gJzEyaCcsXG4gIERBWV8xID0gJzFkJyxcbiAgV0VFS18xID0gJzF3JyxcbiAgTU9OVEhfMSA9ICcxbScsXG59XG5cbmV4cG9ydCBjbGFzcyBEYXRhQ29udHJvbGxlciB7XG4gIHByaXZhdGUgaXNSdW5uaW5nOiBib29sZWFuID0gZmFsc2U7XG4gIHByaXZhdGUgcG9vbFN1YnNjcmlwdGlvbnM6IE1hcDxzdHJpbmcsIFNldDwoZGF0YTogYW55KSA9PiB2b2lkPj4gPSBuZXcgTWFwKCk7XG4gIHByaXZhdGUgdHJhY2tlZFBvb2xzOiBNYXA8c3RyaW5nLCB7IG5hbWU/OiBzdHJpbmc7IGRlc2NyaXB0aW9uPzogc3RyaW5nIH0+ID0gbmV3IE1hcCgpO1xuICBwcml2YXRlIHBvb2xEYXRhOiBNYXA8c3RyaW5nLCBQb29sRGF0YVtdPiA9IG5ldyBNYXAoKTtcbiAgcHJpdmF0ZSB3aGFsZUFjdGl2aXRpZXM6IFdoYWxlQWN0aXZpdHlbXSA9IFtdO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgY29uZmlnOiBEYXRhQ29udHJvbGxlckNvbmZpZykge1xuICAgIGxvZ2dlci5pbmZvKCdEYXRhQ29udHJvbGxlciBpbml0aWFsaXplZCB3aXRoIGNvbmZpZycsIHtcbiAgICAgIHJwY0VuZHBvaW50OiBjb25maWcucnBjRW5kcG9pbnQsXG4gICAgICBwb29sRGF0YUludGVydmFsOiBjb25maWcucG9vbERhdGFJbnRlcnZhbCxcbiAgICAgIG1hcmtldFByaWNlSW50ZXJ2YWw6IGNvbmZpZy5tYXJrZXRQcmljZUludGVydmFsLFxuICAgICAgZXZlbnRQb2xsaW5nSW50ZXJ2YWw6IGNvbmZpZy5ldmVudFBvbGxpbmdJbnRlcnZhbCxcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTdGFydCBhbGwgZGF0YSBjb2xsZWN0aW9uIGFuZCBwcm9jZXNzaW5nXG4gICAqL1xuICBwdWJsaWMgYXN5bmMgc3RhcnQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKHRoaXMuaXNSdW5uaW5nKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgbG9nZ2VyLmluZm8oJ1N0YXJ0aW5nIGRhdGEgc2VydmljZScpO1xuXG4gICAgLy8gSW4gYSByZWFsIGltcGxlbWVudGF0aW9uLCB0aGlzIHdvdWxkIGluaXRpYWxpemUgY29ubmVjdGlvbnMgdG8gZGF0YWJhc2VzLFxuICAgIC8vIHN0YXJ0IGRhdGEgY29sbGVjdG9ycywgZXRjLlxuXG4gICAgdGhpcy5pc1J1bm5pbmcgPSB0cnVlO1xuICAgIGxvZ2dlci5pbmZvKCdEYXRhIHNlcnZpY2Ugc3RhcnRlZCcpO1xuICB9XG5cbiAgLyoqXG4gICAqIFN0b3AgYWxsIGRhdGEgY29sbGVjdGlvbiBhbmQgcHJvY2Vzc2luZ1xuICAgKi9cbiAgcHVibGljIHN0b3AoKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLmlzUnVubmluZykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGxvZ2dlci5pbmZvKCdTdG9wcGluZyBkYXRhIHNlcnZpY2UnKTtcblxuICAgIC8vIEluIGEgcmVhbCBpbXBsZW1lbnRhdGlvbiwgdGhpcyB3b3VsZCBzdG9wIGRhdGEgY29sbGVjdG9ycyxcbiAgICAvLyBjbG9zZSBkYXRhYmFzZSBjb25uZWN0aW9ucywgZXRjLlxuXG4gICAgdGhpcy5pc1J1bm5pbmcgPSBmYWxzZTtcbiAgICBsb2dnZXIuaW5mbygnRGF0YSBzZXJ2aWNlIHN0b3BwZWQnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTdGFydCB0cmFja2luZyBhIHNwZWNpZmljIGxpcXVpZGl0eSBwb29sXG4gICAqL1xuICBwdWJsaWMgYXN5bmMgdHJhY2tQb29sKHBvb2xBZGRyZXNzOiBzdHJpbmcsIG5hbWU/OiBzdHJpbmcsIGRlc2NyaXB0aW9uPzogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgbG9nZ2VyLmluZm8oJ1N0YXJ0aW5nIHRvIHRyYWNrIHBvb2wnLCB7IHBvb2xBZGRyZXNzLCBuYW1lIH0pO1xuICAgIHRoaXMudHJhY2tlZFBvb2xzLnNldChwb29sQWRkcmVzcywgeyBuYW1lLCBkZXNjcmlwdGlvbiB9KTtcblxuICAgIC8vIEluIGEgcmVhbCBpbXBsZW1lbnRhdGlvbiwgdGhpcyB3b3VsZCBzdGFydCBjb2xsZWN0aW5nIGRhdGEgZm9yIHRoZSBwb29sXG4gIH1cblxuICAvKipcbiAgICogU3RvcCB0cmFja2luZyBhIHNwZWNpZmljIGxpcXVpZGl0eSBwb29sXG4gICAqL1xuICBwdWJsaWMgYXN5bmMgdW50cmFja1Bvb2wocG9vbEFkZHJlc3M6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGxvZ2dlci5pbmZvKCdTdG9wcGluZyB0cmFja2luZyBvZiBwb29sJywgeyBwb29sQWRkcmVzcyB9KTtcbiAgICB0aGlzLnRyYWNrZWRQb29scy5kZWxldGUocG9vbEFkZHJlc3MpO1xuXG4gICAgLy8gSW4gYSByZWFsIGltcGxlbWVudGF0aW9uLCB0aGlzIHdvdWxkIHN0b3AgY29sbGVjdGluZyBkYXRhIGZvciB0aGUgcG9vbFxuICB9XG5cbiAgLyoqXG4gICAqIEdldCBsaXN0IG9mIGFsbCB0cmFja2VkIHBvb2xzXG4gICAqL1xuICBwdWJsaWMgYXN5bmMgZ2V0VHJhY2tlZFBvb2xzKCk6IFByb21pc2U8YW55W10+IHtcbiAgICByZXR1cm4gQXJyYXkuZnJvbSh0aGlzLnRyYWNrZWRQb29scy5lbnRyaWVzKCkpLm1hcCgoW2FkZHJlc3MsIGluZm9dKSA9PiAoe1xuICAgICAgYWRkcmVzcyxcbiAgICAgIC4uLmluZm8sXG4gICAgfSkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBhZ2dyZWdhdGVkIGRhdGEgZm9yIGEgc3BlY2lmaWMgcG9vbFxuICAgKi9cbiAgcHVibGljIGFzeW5jIGdldEFnZ3JlZ2F0ZWREYXRhKFxuICAgIHBvb2xBZGRyZXNzOiBzdHJpbmcsXG4gICAgdGltZWZyYW1lOiBzdHJpbmcsXG4gICAgcmVzb2x1dGlvbjogc3RyaW5nXG4gICk6IFByb21pc2U8YW55W10+IHtcbiAgICBsb2dnZXIuaW5mbygnR2V0dGluZyBhZ2dyZWdhdGVkIGRhdGEnLCB7IHBvb2xBZGRyZXNzLCB0aW1lZnJhbWUsIHJlc29sdXRpb24gfSk7XG5cbiAgICAvLyBJbiBhIHJlYWwgaW1wbGVtZW50YXRpb24sIHRoaXMgd291bGQgcmV0cmlldmUgYW5kIGFnZ3JlZ2F0ZSBkYXRhIGZyb20gc3RvcmFnZVxuICAgIHJldHVybiBbXTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgcmF3IGRhdGEgcG9pbnRzIGZvciBhIHNwZWNpZmljIHBvb2xcbiAgICovXG4gIHB1YmxpYyBhc3luYyBnZXRSYXdEYXRhKFxuICAgIHBvb2xBZGRyZXNzOiBzdHJpbmcsXG4gICAgc3RhcnRUaW1lPzogbnVtYmVyLFxuICAgIGVuZFRpbWU/OiBudW1iZXIsXG4gICAgbGltaXQ/OiBudW1iZXJcbiAgKTogUHJvbWlzZTxQb29sRGF0YVtdPiB7XG4gICAgbG9nZ2VyLmluZm8oJ0dldHRpbmcgcmF3IGRhdGEnLCB7IHBvb2xBZGRyZXNzLCBzdGFydFRpbWUsIGVuZFRpbWUsIGxpbWl0IH0pO1xuXG4gICAgLy8gSW4gYSByZWFsIGltcGxlbWVudGF0aW9uLCB0aGlzIHdvdWxkIHJldHJpZXZlIGRhdGEgZnJvbSBzdG9yYWdlXG4gICAgcmV0dXJuIHRoaXMucG9vbERhdGEuZ2V0KHBvb2xBZGRyZXNzKSB8fCBbXTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIGxhdGVzdCBkYXRhIHBvaW50IGZvciBhIHNwZWNpZmljIHBvb2xcbiAgICovXG4gIHB1YmxpYyBhc3luYyBnZXRMYXRlc3REYXRhUG9pbnQocG9vbEFkZHJlc3M6IHN0cmluZyk6IFByb21pc2U8UG9vbERhdGEgfCBudWxsPiB7XG4gICAgbG9nZ2VyLmluZm8oJ0dldHRpbmcgbGF0ZXN0IGRhdGEgcG9pbnQnLCB7IHBvb2xBZGRyZXNzIH0pO1xuXG4gICAgY29uc3QgcG9vbERhdGFQb2ludHMgPSB0aGlzLnBvb2xEYXRhLmdldChwb29sQWRkcmVzcykgfHwgW107XG4gICAgaWYgKHBvb2xEYXRhUG9pbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gUmV0dXJuIHRoZSBtb3N0IHJlY2VudCBkYXRhIHBvaW50XG4gICAgcmV0dXJuIHBvb2xEYXRhUG9pbnRzW3Bvb2xEYXRhUG9pbnRzLmxlbmd0aCAtIDFdO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB3aGFsZSBhY3Rpdml0aWVzIGJhc2VkIG9uIGZpbHRlcnNcbiAgICovXG4gIHB1YmxpYyBhc3luYyBnZXRXaGFsZUFjdGl2aXRpZXMoXG4gICAgcG9vbEFkZHJlc3M/OiBzdHJpbmcsXG4gICAgc3RhcnRUaW1lPzogbnVtYmVyLFxuICAgIGVuZFRpbWU/OiBudW1iZXIsXG4gICAgbGltaXQ/OiBudW1iZXJcbiAgKTogUHJvbWlzZTxXaGFsZUFjdGl2aXR5W10+IHtcbiAgICBsb2dnZXIuaW5mbygnR2V0dGluZyB3aGFsZSBhY3Rpdml0aWVzJywgeyBwb29sQWRkcmVzcywgc3RhcnRUaW1lLCBlbmRUaW1lLCBsaW1pdCB9KTtcblxuICAgIGxldCBhY3Rpdml0aWVzID0gdGhpcy53aGFsZUFjdGl2aXRpZXM7XG5cbiAgICAvLyBBcHBseSBmaWx0ZXJzXG4gICAgaWYgKHBvb2xBZGRyZXNzKSB7XG4gICAgICBhY3Rpdml0aWVzID0gYWN0aXZpdGllcy5maWx0ZXIoYSA9PiBhLnBvb2xBZGRyZXNzID09PSBwb29sQWRkcmVzcyk7XG4gICAgfVxuXG4gICAgaWYgKHN0YXJ0VGltZSkge1xuICAgICAgYWN0aXZpdGllcyA9IGFjdGl2aXRpZXMuZmlsdGVyKGEgPT4gYS50aW1lc3RhbXAgPj0gc3RhcnRUaW1lKTtcbiAgICB9XG5cbiAgICBpZiAoZW5kVGltZSkge1xuICAgICAgYWN0aXZpdGllcyA9IGFjdGl2aXRpZXMuZmlsdGVyKGEgPT4gYS50aW1lc3RhbXAgPD0gZW5kVGltZSk7XG4gICAgfVxuXG4gICAgLy8gQXBwbHkgbGltaXRcbiAgICBpZiAobGltaXQgJiYgYWN0aXZpdGllcy5sZW5ndGggPiBsaW1pdCkge1xuICAgICAgYWN0aXZpdGllcyA9IGFjdGl2aXRpZXMuc2xpY2UoMCwgbGltaXQpO1xuICAgIH1cblxuICAgIHJldHVybiBhY3Rpdml0aWVzO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBzdG9yYWdlIHN0YXRpc3RpY3NcbiAgICovXG4gIHB1YmxpYyBhc3luYyBnZXRTdG9yYWdlU3RhdHMoKTogUHJvbWlzZTxTdG9yYWdlU3RhdHM+IHtcbiAgICBsb2dnZXIuaW5mbygnR2V0dGluZyBzdG9yYWdlIHN0YXRzJyk7XG5cbiAgICAvLyBJbiBhIHJlYWwgaW1wbGVtZW50YXRpb24sIHRoaXMgd291bGQgY2FsY3VsYXRlIHN0b3JhZ2Ugc3RhdGlzdGljc1xuICAgIHJldHVybiB7XG4gICAgICBob3REYXRhU2l6ZTogMCxcbiAgICAgIHdhcm1EYXRhU2l6ZTogMCxcbiAgICAgIGNvbGREYXRhU2l6ZTogMCxcbiAgICAgIHRvdGFsRGF0YVBvaW50czogMCxcbiAgICAgIHBvb2xDb3VudDogdGhpcy50cmFja2VkUG9vbHMuc2l6ZSxcbiAgICAgIG9sZGVzdERhdGFUaW1lc3RhbXA6IERhdGUubm93KCkgLSAzMCAqIDI0ICogNjAgKiA2MCAqIDEwMDAsIC8vIDMwIGRheXMgYWdvXG4gICAgICBuZXdlc3REYXRhVGltZXN0YW1wOiBEYXRlLm5vdygpLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogU3Vic2NyaWJlIHRvIHJlYWwtdGltZSB1cGRhdGVzIGZvciBhIHNwZWNpZmljIHBvb2xcbiAgICovXG4gIHB1YmxpYyBzdWJzY3JpYmVUb1Bvb2xVcGRhdGVzKFxuICAgIHBvb2xBZGRyZXNzOiBzdHJpbmcsXG4gICAgY2FsbGJhY2s6IChkYXRhOiBhbnkpID0+IHZvaWRcbiAgKTogUG9vbFN1YnNjcmlwdGlvbiB7XG4gICAgaWYgKCF0aGlzLnBvb2xTdWJzY3JpcHRpb25zLmhhcyhwb29sQWRkcmVzcykpIHtcbiAgICAgIHRoaXMucG9vbFN1YnNjcmlwdGlvbnMuc2V0KHBvb2xBZGRyZXNzLCBuZXcgU2V0KCkpO1xuICAgIH1cblxuICAgIHRoaXMucG9vbFN1YnNjcmlwdGlvbnMuZ2V0KHBvb2xBZGRyZXNzKSEuYWRkKGNhbGxiYWNrKTtcblxuICAgIHJldHVybiB7XG4gICAgICB1bnN1YnNjcmliZTogKCkgPT4ge1xuICAgICAgICBjb25zdCBjYWxsYmFja3MgPSB0aGlzLnBvb2xTdWJzY3JpcHRpb25zLmdldChwb29sQWRkcmVzcyk7XG4gICAgICAgIGlmIChjYWxsYmFja3MpIHtcbiAgICAgICAgICBjYWxsYmFja3MuZGVsZXRlKGNhbGxiYWNrKTtcbiAgICAgICAgICBpZiAoY2FsbGJhY2tzLnNpemUgPT09IDApIHtcbiAgICAgICAgICAgIHRoaXMucG9vbFN1YnNjcmlwdGlvbnMuZGVsZXRlKHBvb2xBZGRyZXNzKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgfTtcbiAgfVxuXG4gIC8vIFByaXZhdGUgaGVscGVyIG1ldGhvZCB0byBub3RpZnkgc3Vic2NyaWJlcnNcbiAgcHJpdmF0ZSBub3RpZnlQb29sU3Vic2NyaWJlcnMocG9vbEFkZHJlc3M6IHN0cmluZywgZGF0YTogYW55KTogdm9pZCB7XG4gICAgY29uc3Qgc3Vic2NyaWJlcnMgPSB0aGlzLnBvb2xTdWJzY3JpcHRpb25zLmdldChwb29sQWRkcmVzcyk7XG4gICAgaWYgKHN1YnNjcmliZXJzKSB7XG4gICAgICBmb3IgKGNvbnN0IGNhbGxiYWNrIG9mIHN1YnNjcmliZXJzKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY2FsbGJhY2soZGF0YSk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgbG9nZ2VyLmVycm9yKCdFcnJvciBpbiBwb29sIHN1YnNjcmliZXIgY2FsbGJhY2snLCB7IGVycm9yLCBwb29sQWRkcmVzcyB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuIl19