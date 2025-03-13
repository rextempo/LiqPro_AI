"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhaleActivityCollector = void 0;
const monitoring_1 = require("@liqpro/monitoring");
const event_collector_1 = require("./event-collector");
const web3_js_1 = require("@solana/web3.js");
const logger = (0, monitoring_1.createLogger)('data-service:whale-activity-collector');
/**
 * Whale Activity Collector
 * Responsible for monitoring and detecting large transactions in liquidity pools
 */
class WhaleActivityCollector {
    /**
     * Create a new Whale Activity Collector
     * @param config Collector configuration
     */
    constructor(config) {
        this.isRunning = false;
        this.trackedPools = new Set();
        this.config = config;
        this.connection = new web3_js_1.Connection(config.rpcEndpoint, config.rpcCommitment);
        // Initialize event collector
        this.eventCollector = new event_collector_1.EventCollector({
            rpcEndpoint: config.rpcEndpoint,
            rpcCommitment: config.rpcCommitment,
            interval: config.interval,
            onEvent: this.handleEvent.bind(this),
        });
        logger.info('Whale Activity Collector initialized', {
            rpcEndpoint: config.rpcEndpoint,
            interval: config.interval,
            thresholds: config.thresholds,
        });
    }
    /**
     * Start monitoring whale activity
     */
    async start() {
        if (this.isRunning) {
            logger.info('Whale Activity Collector is already running');
            return;
        }
        logger.info('Starting Whale Activity Collector');
        // Start event collector
        await this.eventCollector.start();
        this.isRunning = true;
        logger.info('Whale Activity Collector started');
    }
    /**
     * Stop monitoring whale activity
     */
    stop() {
        if (!this.isRunning) {
            logger.info('Whale Activity Collector is not running');
            return;
        }
        logger.info('Stopping Whale Activity Collector');
        // Stop event collector
        this.eventCollector.stop();
        this.isRunning = false;
        logger.info('Whale Activity Collector stopped');
    }
    /**
     * Track a pool for whale activity
     * @param poolAddress Pool address
     */
    async trackPool(poolAddress) {
        if (this.trackedPools.has(poolAddress)) {
            logger.info(`Pool ${poolAddress} is already being tracked for whale activity`);
            return;
        }
        try {
            // Add to tracked pools
            this.trackedPools.add(poolAddress);
            // Start tracking events for this pool
            await this.eventCollector.trackPool(poolAddress);
            logger.info(`Started tracking whale activity for pool ${poolAddress}`);
        }
        catch (error) {
            logger.error(`Failed to track whale activity for pool ${poolAddress}`, { error });
            throw new Error(`Failed to track whale activity: ${error.message}`);
        }
    }
    /**
     * Stop tracking a pool for whale activity
     * @param poolAddress Pool address
     */
    untrackPool(poolAddress) {
        if (!this.trackedPools.has(poolAddress)) {
            logger.info(`Pool ${poolAddress} is not being tracked for whale activity`);
            return;
        }
        // Stop tracking events for this pool
        this.eventCollector.untrackPool(poolAddress);
        this.trackedPools.delete(poolAddress);
        logger.info(`Stopped tracking whale activity for pool ${poolAddress}`);
    }
    /**
     * Get all tracked pools
     * @returns Array of tracked pool addresses
     */
    getTrackedPools() {
        return Array.from(this.trackedPools);
    }
    /**
     * Handle an event from the event collector
     * @param event Pool event
     */
    async handleEvent(event) {
        try {
            // Only process swap, deposit, and withdraw events
            if (![event_collector_1.EventType.SWAP, event_collector_1.EventType.DEPOSIT, event_collector_1.EventType.WITHDRAW].includes(event.type)) {
                return;
            }
            // Parse event data to extract token amounts and wallet address
            const { tokenAMint, tokenBMint, tokenAAmount, tokenBAmount, walletAddress } = await this.parseEventData(event);
            if (!tokenAMint || !tokenBMint || !tokenAAmount || !tokenBAmount || !walletAddress) {
                logger.debug(`Skipping event ${event.id} due to missing data`);
                return;
            }
            // Get token prices
            const tokenAPrice = await this.config.getPriceForToken(tokenAMint);
            const tokenBPrice = await this.config.getPriceForToken(tokenBMint);
            // Calculate USD values
            const tokenAUsdValue = tokenAPrice ? parseFloat(tokenAAmount) * tokenAPrice : undefined;
            const tokenBUsdValue = tokenBPrice ? parseFloat(tokenBAmount) * tokenBPrice : undefined;
            // Calculate total USD value
            const totalUsdValue = (tokenAUsdValue || 0) + (tokenBUsdValue || 0);
            // Check if this is a whale activity based on thresholds
            const isWhaleActivity = this.isWhaleActivity(event.type, totalUsdValue);
            if (!isWhaleActivity) {
                return;
            }
            // Create whale activity object
            const whaleActivity = {
                id: event.id,
                poolAddress: event.poolAddress,
                type: event.type,
                signature: event.signature,
                blockTime: event.blockTime,
                slot: event.slot,
                tokenA: {
                    mint: tokenAMint,
                    amount: tokenAAmount,
                    usdValue: tokenAUsdValue,
                },
                tokenB: {
                    mint: tokenBMint,
                    amount: tokenBAmount,
                    usdValue: tokenBUsdValue,
                },
                totalUsdValue,
                walletAddress,
            };
            // Emit whale activity
            this.config.onActivity(whaleActivity);
            logger.info(`Detected whale activity in pool ${event.poolAddress}`, {
                type: event.type,
                signature: event.signature,
                totalUsdValue,
                walletAddress,
            });
        }
        catch (error) {
            logger.error(`Error handling event ${event.id}`, { error });
        }
    }
    /**
     * Parse event data to extract token amounts and wallet address
     * @param event Pool event
     * @returns Parsed event data
     */
    async parseEventData(event) {
        try {
            // This is a simplified implementation
            // In a real implementation, you would need to decode the transaction data
            // and extract the token amounts and wallet address
            // For demonstration purposes, we'll use a mock implementation
            // that extracts some basic information from the event data
            // Get transaction details
            const txDetails = await this.connection.getTransaction(event.signature, {
                commitment: this.config.rpcCommitment,
            });
            if (!txDetails) {
                logger.error(`Transaction ${event.signature} not found`);
                return {};
            }
            // Extract wallet address (simplified)
            // In a real implementation, you would need to identify the wallet address
            // based on the transaction data and program knowledge
            const walletAddress = txDetails.transaction.message.accountKeys[0].toString();
            // Extract token mints and amounts (simplified)
            // In a real implementation, you would need to decode the instruction data
            // and extract the token mints and amounts based on the program knowledge
            // For now, we'll use a mock implementation
            // that extracts some basic information from the log messages
            const logMessages = txDetails.meta?.logMessages || [];
            const logs = logMessages.join('\n');
            // Extract token mints (simplified)
            const tokenAMintMatch = logs.match(/Token A: ([a-zA-Z0-9]{32,44})/);
            const tokenBMintMatch = logs.match(/Token B: ([a-zA-Z0-9]{32,44})/);
            const tokenAMint = tokenAMintMatch ? tokenAMintMatch[1] : undefined;
            const tokenBMint = tokenBMintMatch ? tokenBMintMatch[1] : undefined;
            // Extract token amounts (simplified)
            const tokenAAmountMatch = logs.match(/Amount A: ([0-9.]+)/);
            const tokenBAmountMatch = logs.match(/Amount B: ([0-9.]+)/);
            const tokenAAmount = tokenAAmountMatch ? tokenAAmountMatch[1] : undefined;
            const tokenBAmount = tokenBAmountMatch ? tokenBAmountMatch[1] : undefined;
            return {
                tokenAMint,
                tokenBMint,
                tokenAAmount,
                tokenBAmount,
                walletAddress,
            };
        }
        catch (error) {
            logger.error(`Error parsing event data for ${event.id}`, { error });
            return {};
        }
    }
    /**
     * Check if an event is a whale activity based on thresholds
     * @param eventType Event type
     * @param usdValue USD value of the transaction
     * @returns Whether this is a whale activity
     */
    isWhaleActivity(eventType, usdValue) {
        if (!usdValue)
            return false;
        switch (eventType) {
            case event_collector_1.EventType.SWAP:
                return usdValue >= this.config.thresholds.swapUsdValue;
            case event_collector_1.EventType.DEPOSIT:
                return usdValue >= this.config.thresholds.depositUsdValue;
            case event_collector_1.EventType.WITHDRAW:
                return usdValue >= this.config.thresholds.withdrawUsdValue;
            default:
                return false;
        }
    }
}
exports.WhaleActivityCollector = WhaleActivityCollector;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2hhbGUtYWN0aXZpdHktY29sbGVjdG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL21vZHVsZXMvY29sbGVjdG9ycy93aGFsZS1hY3Rpdml0eS1jb2xsZWN0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbURBQWtEO0FBQ2xELHVEQUF5RTtBQUN6RSw2Q0FBdUQ7QUFFdkQsTUFBTSxNQUFNLEdBQUcsSUFBQSx5QkFBWSxFQUFDLHVDQUF1QyxDQUFDLENBQUM7QUEyQ3JFOzs7R0FHRztBQUNILE1BQWEsc0JBQXNCO0lBT2pDOzs7T0FHRztJQUNILFlBQVksTUFBb0M7UUFQeEMsY0FBUyxHQUFZLEtBQUssQ0FBQztRQUMzQixpQkFBWSxHQUFnQixJQUFJLEdBQUcsRUFBRSxDQUFDO1FBTzVDLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxvQkFBVSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBRTNFLDZCQUE2QjtRQUM3QixJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksZ0NBQWMsQ0FBQztZQUN2QyxXQUFXLEVBQUUsTUFBTSxDQUFDLFdBQVc7WUFDL0IsYUFBYSxFQUFFLE1BQU0sQ0FBQyxhQUFhO1lBQ25DLFFBQVEsRUFBRSxNQUFNLENBQUMsUUFBUTtZQUN6QixPQUFPLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO1NBQ3JDLENBQUMsQ0FBQztRQUVILE1BQU0sQ0FBQyxJQUFJLENBQUMsc0NBQXNDLEVBQUU7WUFDbEQsV0FBVyxFQUFFLE1BQU0sQ0FBQyxXQUFXO1lBQy9CLFFBQVEsRUFBRSxNQUFNLENBQUMsUUFBUTtZQUN6QixVQUFVLEVBQUUsTUFBTSxDQUFDLFVBQVU7U0FDOUIsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FB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QkFBUyxDQUFDLFFBQVE7Z0JBQ3JCLE9BQU8sUUFBUSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDO1lBQzdEO2dCQUNFLE9BQU8sS0FBSyxDQUFDO1FBQ2pCLENBQUM7SUFDSCxDQUFDO0NBQ0Y7QUF4UkQsd0RBd1JDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgY3JlYXRlTG9nZ2VyIH0gZnJvbSAnQGxpcXByby9tb25pdG9yaW5nJztcbmltcG9ydCB7IEV2ZW50Q29sbGVjdG9yLCBFdmVudFR5cGUsIFBvb2xFdmVudCB9IGZyb20gJy4vZXZlbnQtY29sbGVjdG9yJztcbmltcG9ydCB7IENvbm5lY3Rpb24sIEZpbmFsaXR5IH0gZnJvbSAnQHNvbGFuYS93ZWIzLmpzJztcblxuY29uc3QgbG9nZ2VyID0gY3JlYXRlTG9nZ2VyKCdkYXRhLXNlcnZpY2U6d2hhbGUtYWN0aXZpdHktY29sbGVjdG9yJyk7XG5cbi8qKlxuICogV2hhbGUgYWN0aXZpdHkgZGF0YSBzdHJ1Y3R1cmVcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBXaGFsZUFjdGl2aXR5IHtcbiAgaWQ6IHN0cmluZztcbiAgcG9vbEFkZHJlc3M6IHN0cmluZztcbiAgdHlwZTogRXZlbnRUeXBlO1xuICBzaWduYXR1cmU6IHN0cmluZztcbiAgYmxvY2tUaW1lOiBudW1iZXI7XG4gIHNsb3Q6IG51bWJlcjtcbiAgdG9rZW5BOiB7XG4gICAgbWludDogc3RyaW5nO1xuICAgIGFtb3VudDogc3RyaW5nO1xuICAgIHVzZFZhbHVlPzogbnVtYmVyO1xuICB9O1xuICB0b2tlbkI6IHtcbiAgICBtaW50OiBzdHJpbmc7XG4gICAgYW1vdW50OiBzdHJpbmc7XG4gICAgdXNkVmFsdWU/OiBudW1iZXI7XG4gIH07XG4gIHRvdGFsVXNkVmFsdWU/OiBudW1iZXI7XG4gIHdhbGxldEFkZHJlc3M6IHN0cmluZztcbn1cblxuLyoqXG4gKiBDb25maWd1cmF0aW9uIGZvciB0aGUgV2hhbGVBY3Rpdml0eUNvbGxlY3RvclxuICovXG5leHBvcnQgaW50ZXJmYWNlIFdoYWxlQWN0aXZpdHlDb2xsZWN0b3JDb25maWcge1xuICBycGNFbmRwb2ludDogc3RyaW5nO1xuICBycGNCYWNrdXBFbmRwb2ludD86IHN0cmluZztcbiAgcnBjQ29tbWl0bWVudDogRmluYWxpdHk7XG4gIGludGVydmFsOiBudW1iZXI7XG4gIG9uQWN0aXZpdHk6IChhY3Rpdml0eTogV2hhbGVBY3Rpdml0eSkgPT4gdm9pZDtcbiAgdGhyZXNob2xkczoge1xuICAgIHN3YXBVc2RWYWx1ZTogbnVtYmVyO1xuICAgIGRlcG9zaXRVc2RWYWx1ZTogbnVtYmVyO1xuICAgIHdpdGhkcmF3VXNkVmFsdWU6IG51bWJlcjtcbiAgfTtcbiAgZ2V0UHJpY2VGb3JUb2tlbjogKHRva2VuTWludDogc3RyaW5nKSA9PiBQcm9taXNlPG51bWJlciB8IHVuZGVmaW5lZD47XG59XG5cbi8qKlxuICogV2hhbGUgQWN0aXZpdHkgQ29sbGVjdG9yXG4gKiBSZXNwb25zaWJsZSBmb3IgbW9uaXRvcmluZyBhbmQgZGV0ZWN0aW5nIGxhcmdlIHRyYW5zYWN0aW9ucyBpbiBsaXF1aWRpdHkgcG9vbHNcbiAqL1xuZXhwb3J0IGNsYXNzIFdoYWxlQWN0aXZpdHlDb2xsZWN0b3Ige1xuICBwcml2YXRlIGV2ZW50Q29sbGVjdG9yOiBFdmVudENvbGxlY3RvcjtcbiAgcHJpdmF0ZSBjb25maWc6IFdoYWxlQWN0aXZpdHlDb2xsZWN0b3JDb25maWc7XG4gIHByaXZhdGUgY29ubmVjdGlvbjogQ29ubmVjdGlvbjtcbiAgcHJpdmF0ZSBpc1J1bm5pbmc6IGJvb2xlYW4gPSBmYWxzZTtcbiAgcHJpdmF0ZSB0cmFja2VkUG9vbHM6IFNldDxzdHJpbmc+ID0gbmV3IFNldCgpO1xuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSBuZXcgV2hhbGUgQWN0aXZpdHkgQ29sbGVjdG9yXG4gICAqIEBwYXJhbSBjb25maWcgQ29sbGVjdG9yIGNvbmZpZ3VyYXRpb25cbiAgICovXG4gIGNvbnN0cnVjdG9yKGNvbmZpZzogV2hhbGVBY3Rpdml0eUNvbGxlY3RvckNvbmZpZykge1xuICAgIHRoaXMuY29uZmlnID0gY29uZmlnO1xuICAgIHRoaXMuY29ubmVjdGlvbiA9IG5ldyBDb25uZWN0aW9uKGNvbmZpZy5ycGNFbmRwb2ludCwgY29uZmlnLnJwY0NvbW1pdG1lbnQpO1xuXG4gICAgLy8gSW5pdGlhbGl6ZSBldmVudCBjb2xsZWN0b3JcbiAgICB0aGlzLmV2ZW50Q29sbGVjdG9yID0gbmV3IEV2ZW50Q29sbGVjdG9yKHtcbiAgICAgIHJwY0VuZHBvaW50OiBjb25maWcucnBjRW5kcG9pbnQsXG4gICAgICBycGNDb21taXRtZW50OiBjb25maWcucnBjQ29tbWl0bWVudCxcbiAgICAgIGludGVydmFsOiBjb25maWcuaW50ZXJ2YWwsXG4gICAgICBvbkV2ZW50OiB0aGlzLmhhbmRsZUV2ZW50LmJpbmQodGhpcyksXG4gICAgfSk7XG5cbiAgICBsb2dnZXIuaW5mbygnV2hhbGUgQWN0aXZpdHkgQ29sbGVjdG9yIGluaXRpYWxpemVkJywge1xuICAgICAgcnBjRW5kcG9pbnQ6IGNvbmZpZy5ycGNFbmRwb2ludCxcbiAgICAgIGludGVydmFsOiBjb25maWcuaW50ZXJ2YWwsXG4gICAgICB0aHJlc2hvbGRzOiBjb25maWcudGhyZXNob2xkcyxcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTdGFydCBtb25pdG9yaW5nIHdoYWxlIGFjdGl2aXR5XG4gICAqL1xuICBhc3luYyBzdGFydCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAodGhpcy5pc1J1bm5pbmcpIHtcbiAgICAgIGxvZ2dlci5pbmZvKCdXaGFsZSBBY3Rpdml0eSBDb2xsZWN0b3IgaXMgYWxyZWFkeSBydW5uaW5nJyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgbG9nZ2VyLmluZm8oJ1N0YXJ0aW5nIFdoYWxlIEFjdGl2aXR5IENvbGxlY3RvcicpO1xuXG4gICAgLy8gU3RhcnQgZXZlbnQgY29sbGVjdG9yXG4gICAgYXdhaXQgdGhpcy5ldmVudENvbGxlY3Rvci5zdGFydCgpO1xuXG4gICAgdGhpcy5pc1J1bm5pbmcgPSB0cnVlO1xuICAgIGxvZ2dlci5pbmZvKCdXaGFsZSBBY3Rpdml0eSBDb2xsZWN0b3Igc3RhcnRlZCcpO1xuICB9XG5cbiAgLyoqXG4gICAqIFN0b3AgbW9uaXRvcmluZyB3aGFsZSBhY3Rpdml0eVxuICAgKi9cbiAgc3RvcCgpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuaXNSdW5uaW5nKSB7XG4gICAgICBsb2dnZXIuaW5mbygnV2hhbGUgQWN0aXZpdHkgQ29sbGVjdG9yIGlzIG5vdCBydW5uaW5nJyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgbG9nZ2VyLmluZm8oJ1N0b3BwaW5nIFdoYWxlIEFjdGl2aXR5IENvbGxlY3RvcicpO1xuXG4gICAgLy8gU3RvcCBldmVudCBjb2xsZWN0b3JcbiAgICB0aGlzLmV2ZW50Q29sbGVjdG9yLnN0b3AoKTtcblxuICAgIHRoaXMuaXNSdW5uaW5nID0gZmFsc2U7XG4gICAgbG9nZ2VyLmluZm8oJ1doYWxlIEFjdGl2aXR5IENvbGxlY3RvciBzdG9wcGVkJyk7XG4gIH1cblxuICAvKipcbiAgICogVHJhY2sgYSBwb29sIGZvciB3aGFsZSBhY3Rpdml0eVxuICAgKiBAcGFyYW0gcG9vbEFkZHJlc3MgUG9vbCBhZGRyZXNzXG4gICAqL1xuICBhc3luYyB0cmFja1Bvb2wocG9vbEFkZHJlc3M6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICh0aGlzLnRyYWNrZWRQb29scy5oYXMocG9vbEFkZHJlc3MpKSB7XG4gICAgICBsb2dnZXIuaW5mbyhgUG9vbCAke3Bvb2xBZGRyZXNzfSBpcyBhbHJlYWR5IGJlaW5nIHRyYWNrZWQgZm9yIHdoYWxlIGFjdGl2aXR5YCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIC8vIEFkZCB0byB0cmFja2VkIHBvb2xzXG4gICAgICB0aGlzLnRyYWNrZWRQb29scy5hZGQocG9vbEFkZHJlc3MpO1xuXG4gICAgICAvLyBTdGFydCB0cmFja2luZyBldmVudHMgZm9yIHRoaXMgcG9vbFxuICAgICAgYXdhaXQgdGhpcy5ldmVudENvbGxlY3Rvci50cmFja1Bvb2wocG9vbEFkZHJlc3MpO1xuXG4gICAgICBsb2dnZXIuaW5mbyhgU3RhcnRlZCB0cmFja2luZyB3aGFsZSBhY3Rpdml0eSBmb3IgcG9vbCAke3Bvb2xBZGRyZXNzfWApO1xuICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgIGxvZ2dlci5lcnJvcihgRmFpbGVkIHRvIHRyYWNrIHdoYWxlIGFjdGl2aXR5IGZvciBwb29sICR7cG9vbEFkZHJlc3N9YCwgeyBlcnJvciB9KTtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIHRyYWNrIHdoYWxlIGFjdGl2aXR5OiAke2Vycm9yLm1lc3NhZ2V9YCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFN0b3AgdHJhY2tpbmcgYSBwb29sIGZvciB3aGFsZSBhY3Rpdml0eVxuICAgKiBAcGFyYW0gcG9vbEFkZHJlc3MgUG9vbCBhZGRyZXNzXG4gICAqL1xuICB1bnRyYWNrUG9vbChwb29sQWRkcmVzczogc3RyaW5nKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLnRyYWNrZWRQb29scy5oYXMocG9vbEFkZHJlc3MpKSB7XG4gICAgICBsb2dnZXIuaW5mbyhgUG9vbCAke3Bvb2xBZGRyZXNzfSBpcyBub3QgYmVpbmcgdHJhY2tlZCBmb3Igd2hhbGUgYWN0aXZpdHlgKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBTdG9wIHRyYWNraW5nIGV2ZW50cyBmb3IgdGhpcyBwb29sXG4gICAgdGhpcy5ldmVudENvbGxlY3Rvci51bnRyYWNrUG9vbChwb29sQWRkcmVzcyk7XG5cbiAgICB0aGlzLnRyYWNrZWRQb29scy5kZWxldGUocG9vbEFkZHJlc3MpO1xuICAgIGxvZ2dlci5pbmZvKGBTdG9wcGVkIHRyYWNraW5nIHdoYWxlIGFjdGl2aXR5IGZvciBwb29sICR7cG9vbEFkZHJlc3N9YCk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IGFsbCB0cmFja2VkIHBvb2xzXG4gICAqIEByZXR1cm5zIEFycmF5IG9mIHRyYWNrZWQgcG9vbCBhZGRyZXNzZXNcbiAgICovXG4gIGdldFRyYWNrZWRQb29scygpOiBzdHJpbmdbXSB7XG4gICAgcmV0dXJuIEFycmF5LmZyb20odGhpcy50cmFja2VkUG9vbHMpO1xuICB9XG5cbiAgLyoqXG4gICAqIEhhbmRsZSBhbiBldmVudCBmcm9tIHRoZSBldmVudCBjb2xsZWN0b3JcbiAgICogQHBhcmFtIGV2ZW50IFBvb2wgZXZlbnRcbiAgICovXG4gIHByaXZhdGUgYXN5bmMgaGFuZGxlRXZlbnQoZXZlbnQ6IFBvb2xFdmVudCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRyeSB7XG4gICAgICAvLyBPbmx5IHByb2Nlc3Mgc3dhcCwgZGVwb3NpdCwgYW5kIHdpdGhkcmF3IGV2ZW50c1xuICAgICAgaWYgKCFbRXZlbnRUeXBlLlNXQVAsIEV2ZW50VHlwZS5ERVBPU0lULCBFdmVudFR5cGUuV0lUSERSQVddLmluY2x1ZGVzKGV2ZW50LnR5cGUpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gUGFyc2UgZXZlbnQgZGF0YSB0byBleHRyYWN0IHRva2VuIGFtb3VudHMgYW5kIHdhbGxldCBhZGRyZXNzXG4gICAgICBjb25zdCB7IHRva2VuQU1pbnQsIHRva2VuQk1pbnQsIHRva2VuQUFtb3VudCwgdG9rZW5CQW1vdW50LCB3YWxsZXRBZGRyZXNzIH0gPVxuICAgICAgICBhd2FpdCB0aGlzLnBhcnNlRXZlbnREYXRhKGV2ZW50KTtcblxuICAgICAgaWYgKCF0b2tlbkFNaW50IHx8ICF0b2tlbkJNaW50IHx8ICF0b2tlbkFBbW91bnQgfHwgIXRva2VuQkFtb3VudCB8fCAhd2FsbGV0QWRkcmVzcykge1xuICAgICAgICBsb2dnZXIuZGVidWcoYFNraXBwaW5nIGV2ZW50ICR7ZXZlbnQuaWR9IGR1ZSB0byBtaXNzaW5nIGRhdGFgKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBHZXQgdG9rZW4gcHJpY2VzXG4gICAgICBjb25zdCB0b2tlbkFQcmljZSA9IGF3YWl0IHRoaXMuY29uZmlnLmdldFByaWNlRm9yVG9rZW4odG9rZW5BTWludCk7XG4gICAgICBjb25zdCB0b2tlbkJQcmljZSA9IGF3YWl0IHRoaXMuY29uZmlnLmdldFByaWNlRm9yVG9rZW4odG9rZW5CTWludCk7XG5cbiAgICAgIC8vIENhbGN1bGF0ZSBVU0QgdmFsdWVzXG4gICAgICBjb25zdCB0b2tlbkFVc2RWYWx1ZSA9IHRva2VuQVByaWNlID8gcGFyc2VGbG9hdCh0b2tlbkFBbW91bnQpICogdG9rZW5BUHJpY2UgOiB1bmRlZmluZWQ7XG4gICAgICBjb25zdCB0b2tlbkJVc2RWYWx1ZSA9IHRva2VuQlByaWNlID8gcGFyc2VGbG9hdCh0b2tlbkJBbW91bnQpICogdG9rZW5CUHJpY2UgOiB1bmRlZmluZWQ7XG5cbiAgICAgIC8vIENhbGN1bGF0ZSB0b3RhbCBVU0QgdmFsdWVcbiAgICAgIGNvbnN0IHRvdGFsVXNkVmFsdWUgPSAodG9rZW5BVXNkVmFsdWUgfHwgMCkgKyAodG9rZW5CVXNkVmFsdWUgfHwgMCk7XG5cbiAgICAgIC8vIENoZWNrIGlmIHRoaXMgaXMgYSB3aGFsZSBhY3Rpdml0eSBiYXNlZCBvbiB0aHJlc2hvbGRzXG4gICAgICBjb25zdCBpc1doYWxlQWN0aXZpdHkgPSB0aGlzLmlzV2hhbGVBY3Rpdml0eShldmVudC50eXBlLCB0b3RhbFVzZFZhbHVlKTtcblxuICAgICAgaWYgKCFpc1doYWxlQWN0aXZpdHkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBDcmVhdGUgd2hhbGUgYWN0aXZpdHkgb2JqZWN0XG4gICAgICBjb25zdCB3aGFsZUFjdGl2aXR5OiBXaGFsZUFjdGl2aXR5ID0ge1xuICAgICAgICBpZDogZXZlbnQuaWQsXG4gICAgICAgIHBvb2xBZGRyZXNzOiBldmVudC5wb29sQWRkcmVzcyxcbiAgICAgICAgdHlwZTogZXZlbnQudHlwZSxcbiAgICAgICAgc2lnbmF0dXJlOiBldmVudC5zaWduYXR1cmUsXG4gICAgICAgIGJsb2NrVGltZTogZXZlbnQuYmxvY2tUaW1lLFxuICAgICAgICBzbG90OiBldmVudC5zbG90LFxuICAgICAgICB0b2tlbkE6IHtcbiAgICAgICAgICBtaW50OiB0b2tlbkFNaW50LFxuICAgICAgICAgIGFtb3VudDogdG9rZW5BQW1vdW50LFxuICAgICAgICAgIHVzZFZhbHVlOiB0b2tlbkFVc2RWYWx1ZSxcbiAgICAgICAgfSxcbiAgICAgICAgdG9rZW5COiB7XG4gICAgICAgICAgbWludDogdG9rZW5CTWludCxcbiAgICAgICAgICBhbW91bnQ6IHRva2VuQkFtb3VudCxcbiAgICAgICAgICB1c2RWYWx1ZTogdG9rZW5CVXNkVmFsdWUsXG4gICAgICAgIH0sXG4gICAgICAgIHRvdGFsVXNkVmFsdWUsXG4gICAgICAgIHdhbGxldEFkZHJlc3MsXG4gICAgICB9O1xuXG4gICAgICAvLyBFbWl0IHdoYWxlIGFjdGl2aXR5XG4gICAgICB0aGlzLmNvbmZpZy5vbkFjdGl2aXR5KHdoYWxlQWN0aXZpdHkpO1xuXG4gICAgICBsb2dnZXIuaW5mbyhgRGV0ZWN0ZWQgd2hhbGUgYWN0aXZpdHkgaW4gcG9vbCAke2V2ZW50LnBvb2xBZGRyZXNzfWAsIHtcbiAgICAgICAgdHlwZTogZXZlbnQudHlwZSxcbiAgICAgICAgc2lnbmF0dXJlOiBldmVudC5zaWduYXR1cmUsXG4gICAgICAgIHRvdGFsVXNkVmFsdWUsXG4gICAgICAgIHdhbGxldEFkZHJlc3MsXG4gICAgICB9KTtcbiAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICBsb2dnZXIuZXJyb3IoYEVycm9yIGhhbmRsaW5nIGV2ZW50ICR7ZXZlbnQuaWR9YCwgeyBlcnJvciB9KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUGFyc2UgZXZlbnQgZGF0YSB0byBleHRyYWN0IHRva2VuIGFtb3VudHMgYW5kIHdhbGxldCBhZGRyZXNzXG4gICAqIEBwYXJhbSBldmVudCBQb29sIGV2ZW50XG4gICAqIEByZXR1cm5zIFBhcnNlZCBldmVudCBkYXRhXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIHBhcnNlRXZlbnREYXRhKGV2ZW50OiBQb29sRXZlbnQpOiBQcm9taXNlPHtcbiAgICB0b2tlbkFNaW50Pzogc3RyaW5nO1xuICAgIHRva2VuQk1pbnQ/OiBzdHJpbmc7XG4gICAgdG9rZW5BQW1vdW50Pzogc3RyaW5nO1xuICAgIHRva2VuQkFtb3VudD86IHN0cmluZztcbiAgICB3YWxsZXRBZGRyZXNzPzogc3RyaW5nO1xuICB9PiB7XG4gICAgdHJ5IHtcbiAgICAgIC8vIFRoaXMgaXMgYSBzaW1wbGlmaWVkIGltcGxlbWVudGF0aW9uXG4gICAgICAvLyBJbiBhIHJlYWwgaW1wbGVtZW50YXRpb24sIHlvdSB3b3VsZCBuZWVkIHRvIGRlY29kZSB0aGUgdHJhbnNhY3Rpb24gZGF0YVxuICAgICAgLy8gYW5kIGV4dHJhY3QgdGhlIHRva2VuIGFtb3VudHMgYW5kIHdhbGxldCBhZGRyZXNzXG5cbiAgICAgIC8vIEZvciBkZW1vbnN0cmF0aW9uIHB1cnBvc2VzLCB3ZSdsbCB1c2UgYSBtb2NrIGltcGxlbWVudGF0aW9uXG4gICAgICAvLyB0aGF0IGV4dHJhY3RzIHNvbWUgYmFzaWMgaW5mb3JtYXRpb24gZnJvbSB0aGUgZXZlbnQgZGF0YVxuXG4gICAgICAvLyBHZXQgdHJhbnNhY3Rpb24gZGV0YWlsc1xuICAgICAgY29uc3QgdHhEZXRhaWxzID0gYXdhaXQgdGhpcy5jb25uZWN0aW9uLmdldFRyYW5zYWN0aW9uKGV2ZW50LnNpZ25hdHVyZSwge1xuICAgICAgICBjb21taXRtZW50OiB0aGlzLmNvbmZpZy5ycGNDb21taXRtZW50LFxuICAgICAgfSk7XG5cbiAgICAgIGlmICghdHhEZXRhaWxzKSB7XG4gICAgICAgIGxvZ2dlci5lcnJvcihgVHJhbnNhY3Rpb24gJHtldmVudC5zaWduYXR1cmV9IG5vdCBmb3VuZGApO1xuICAgICAgICByZXR1cm4ge307XG4gICAgICB9XG5cbiAgICAgIC8vIEV4dHJhY3Qgd2FsbGV0IGFkZHJlc3MgKHNpbXBsaWZpZWQpXG4gICAgICAvLyBJbiBhIHJlYWwgaW1wbGVtZW50YXRpb24sIHlvdSB3b3VsZCBuZWVkIHRvIGlkZW50aWZ5IHRoZSB3YWxsZXQgYWRkcmVzc1xuICAgICAgLy8gYmFzZWQgb24gdGhlIHRyYW5zYWN0aW9uIGRhdGEgYW5kIHByb2dyYW0ga25vd2xlZGdlXG4gICAgICBjb25zdCB3YWxsZXRBZGRyZXNzID0gdHhEZXRhaWxzLnRyYW5zYWN0aW9uLm1lc3NhZ2UuYWNjb3VudEtleXNbMF0udG9TdHJpbmcoKTtcblxuICAgICAgLy8gRXh0cmFjdCB0b2tlbiBtaW50cyBhbmQgYW1vdW50cyAoc2ltcGxpZmllZClcbiAgICAgIC8vIEluIGEgcmVhbCBpbXBsZW1lbnRhdGlvbiwgeW91IHdvdWxkIG5lZWQgdG8gZGVjb2RlIHRoZSBpbnN0cnVjdGlvbiBkYXRhXG4gICAgICAvLyBhbmQgZXh0cmFjdCB0aGUgdG9rZW4gbWludHMgYW5kIGFtb3VudHMgYmFzZWQgb24gdGhlIHByb2dyYW0ga25vd2xlZGdlXG5cbiAgICAgIC8vIEZvciBub3csIHdlJ2xsIHVzZSBhIG1vY2sgaW1wbGVtZW50YXRpb25cbiAgICAgIC8vIHRoYXQgZXh0cmFjdHMgc29tZSBiYXNpYyBpbmZvcm1hdGlvbiBmcm9tIHRoZSBsb2cgbWVzc2FnZXNcbiAgICAgIGNvbnN0IGxvZ01lc3NhZ2VzID0gdHhEZXRhaWxzLm1ldGE/LmxvZ01lc3NhZ2VzIHx8IFtdO1xuICAgICAgY29uc3QgbG9ncyA9IGxvZ01lc3NhZ2VzLmpvaW4oJ1xcbicpO1xuXG4gICAgICAvLyBFeHRyYWN0IHRva2VuIG1pbnRzIChzaW1wbGlmaWVkKVxuICAgICAgY29uc3QgdG9rZW5BTWludE1hdGNoID0gbG9ncy5tYXRjaCgvVG9rZW4gQTogKFthLXpBLVowLTldezMyLDQ0fSkvKTtcbiAgICAgIGNvbnN0IHRva2VuQk1pbnRNYXRjaCA9IGxvZ3MubWF0Y2goL1Rva2VuIEI6IChbYS16QS1aMC05XXszMiw0NH0pLyk7XG5cbiAgICAgIGNvbnN0IHRva2VuQU1pbnQgPSB0b2tlbkFNaW50TWF0Y2ggPyB0b2tlbkFNaW50TWF0Y2hbMV0gOiB1bmRlZmluZWQ7XG4gICAgICBjb25zdCB0b2tlbkJNaW50ID0gdG9rZW5CTWludE1hdGNoID8gdG9rZW5CTWludE1hdGNoWzFdIDogdW5kZWZpbmVkO1xuXG4gICAgICAvLyBFeHRyYWN0IHRva2VuIGFtb3VudHMgKHNpbXBsaWZpZWQpXG4gICAgICBjb25zdCB0b2tlbkFBbW91bnRNYXRjaCA9IGxvZ3MubWF0Y2goL0Ftb3VudCBBOiAoWzAtOS5dKykvKTtcbiAgICAgIGNvbnN0IHRva2VuQkFtb3VudE1hdGNoID0gbG9ncy5tYXRjaCgvQW1vdW50IEI6IChbMC05Ll0rKS8pO1xuXG4gICAgICBjb25zdCB0b2tlbkFBbW91bnQgPSB0b2tlbkFBbW91bnRNYXRjaCA/IHRva2VuQUFtb3VudE1hdGNoWzFdIDogdW5kZWZpbmVkO1xuICAgICAgY29uc3QgdG9rZW5CQW1vdW50ID0gdG9rZW5CQW1vdW50TWF0Y2ggPyB0b2tlbkJBbW91bnRNYXRjaFsxXSA6IHVuZGVmaW5lZDtcblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdG9rZW5BTWludCxcbiAgICAgICAgdG9rZW5CTWludCxcbiAgICAgICAgdG9rZW5BQW1vdW50LFxuICAgICAgICB0b2tlbkJBbW91bnQsXG4gICAgICAgIHdhbGxldEFkZHJlc3MsXG4gICAgICB9O1xuICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgIGxvZ2dlci5lcnJvcihgRXJyb3IgcGFyc2luZyBldmVudCBkYXRhIGZvciAke2V2ZW50LmlkfWAsIHsgZXJyb3IgfSk7XG4gICAgICByZXR1cm4ge307XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrIGlmIGFuIGV2ZW50IGlzIGEgd2hhbGUgYWN0aXZpdHkgYmFzZWQgb24gdGhyZXNob2xkc1xuICAgKiBAcGFyYW0gZXZlbnRUeXBlIEV2ZW50IHR5cGVcbiAgICogQHBhcmFtIHVzZFZhbHVlIFVTRCB2YWx1ZSBvZiB0aGUgdHJhbnNhY3Rpb25cbiAgICogQHJldHVybnMgV2hldGhlciB0aGlzIGlzIGEgd2hhbGUgYWN0aXZpdHlcbiAgICovXG4gIHByaXZhdGUgaXNXaGFsZUFjdGl2aXR5KGV2ZW50VHlwZTogRXZlbnRUeXBlLCB1c2RWYWx1ZTogbnVtYmVyKTogYm9vbGVhbiB7XG4gICAgaWYgKCF1c2RWYWx1ZSkgcmV0dXJuIGZhbHNlO1xuXG4gICAgc3dpdGNoIChldmVudFR5cGUpIHtcbiAgICAgIGNhc2UgRXZlbnRUeXBlLlNXQVA6XG4gICAgICAgIHJldHVybiB1c2RWYWx1ZSA+PSB0aGlzLmNvbmZpZy50aHJlc2hvbGRzLnN3YXBVc2RWYWx1ZTtcbiAgICAgIGNhc2UgRXZlbnRUeXBlLkRFUE9TSVQ6XG4gICAgICAgIHJldHVybiB1c2RWYWx1ZSA+PSB0aGlzLmNvbmZpZy50aHJlc2hvbGRzLmRlcG9zaXRVc2RWYWx1ZTtcbiAgICAgIGNhc2UgRXZlbnRUeXBlLldJVEhEUkFXOlxuICAgICAgICByZXR1cm4gdXNkVmFsdWUgPj0gdGhpcy5jb25maWcudGhyZXNob2xkcy53aXRoZHJhd1VzZFZhbHVlO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxufVxuIl19