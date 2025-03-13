"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventCollector = exports.EventType = void 0;
const monitoring_1 = require("@liqpro/monitoring");
const web3_js_1 = require("@solana/web3.js");
const logger = (0, monitoring_1.createLogger)('data-service:event-collector');
/**
 * Event types that can be monitored
 */
var EventType;
(function (EventType) {
    EventType["SWAP"] = "swap";
    EventType["DEPOSIT"] = "deposit";
    EventType["WITHDRAW"] = "withdraw";
    EventType["POSITION_OPEN"] = "position_open";
    EventType["POSITION_CLOSE"] = "position_close";
    EventType["POSITION_UPDATE"] = "position_update";
})(EventType || (exports.EventType = EventType = {}));
/**
 * Event Collector
 * Responsible for collecting events from liquidity pools
 */
class EventCollector {
    /**
     * Create a new Event Collector
     * @param config Collector configuration
     */
    constructor(config) {
        this.pollingTimer = null;
        this.isRunning = false;
        this.trackedPools = new Map();
        this.subscriptions = new Map();
        this.config = config;
        this.connection = new web3_js_1.Connection(config.rpcEndpoint, config.rpcCommitment);
        logger.info('Event Collector initialized', {
            rpcEndpoint: config.rpcEndpoint,
            interval: config.interval,
        });
    }
    /**
     * Start collecting events
     */
    async start() {
        if (this.isRunning) {
            logger.info('Event Collector is already running');
            return;
        }
        logger.info('Starting Event Collector');
        // Start polling timer
        this.pollingTimer = setInterval(() => {
            this.pollEvents();
        }, this.config.interval);
        // Poll events immediately
        await this.pollEvents();
        this.isRunning = true;
        logger.info('Event Collector started');
    }
    /**
     * Stop collecting events
     */
    stop() {
        if (!this.isRunning) {
            logger.info('Event Collector is not running');
            return;
        }
        logger.info('Stopping Event Collector');
        // Clear polling timer
        if (this.pollingTimer) {
            clearInterval(this.pollingTimer);
            this.pollingTimer = null;
        }
        // Unsubscribe from all WebSocket subscriptions
        for (const [poolAddress, subscriptionId] of this.subscriptions.entries()) {
            this.connection.removeAccountChangeListener(subscriptionId);
            logger.info(`Unsubscribed from pool ${poolAddress}`);
        }
        this.subscriptions.clear();
        this.isRunning = false;
        logger.info('Event Collector stopped');
    }
    /**
     * Track events for a pool
     * @param poolAddress Pool address
     */
    async trackPool(poolAddress) {
        if (this.trackedPools.has(poolAddress)) {
            logger.info(`Pool ${poolAddress} is already being tracked for events`);
            return;
        }
        try {
            // Add to tracked pools
            this.trackedPools.set(poolAddress, {});
            // Subscribe to account changes
            const publicKey = new web3_js_1.PublicKey(poolAddress);
            const subscriptionId = this.connection.onAccountChange(publicKey, (accountInfo, context) => {
                this.handleAccountChange(poolAddress, accountInfo, context);
            }, this.config.rpcCommitment);
            this.subscriptions.set(poolAddress, subscriptionId);
            // Get recent transactions to establish a baseline
            await this.getRecentTransactions(poolAddress);
            logger.info(`Started tracking events for pool ${poolAddress}`);
        }
        catch (error) {
            logger.error(`Failed to track events for pool ${poolAddress}`, { error });
            throw new Error(`Failed to track events: ${error.message}`);
        }
    }
    /**
     * Stop tracking events for a pool
     * @param poolAddress Pool address
     */
    untrackPool(poolAddress) {
        if (!this.trackedPools.has(poolAddress)) {
            logger.info(`Pool ${poolAddress} is not being tracked for events`);
            return;
        }
        // Unsubscribe from account changes
        const subscriptionId = this.subscriptions.get(poolAddress);
        if (subscriptionId !== undefined) {
            this.connection.removeAccountChangeListener(subscriptionId);
            this.subscriptions.delete(poolAddress);
        }
        this.trackedPools.delete(poolAddress);
        logger.info(`Stopped tracking events for pool ${poolAddress}`);
    }
    /**
     * Poll for events for all tracked pools
     */
    async pollEvents() {
        logger.debug('Polling events for all tracked pools');
        const promises = Array.from(this.trackedPools.keys()).map(poolAddress => this.getRecentTransactions(poolAddress).catch(error => {
            logger.error(`Error polling events for pool ${poolAddress}`, { error });
        }));
        await Promise.all(promises);
    }
    /**
     * Get recent transactions for a pool
     * @param poolAddress Pool address
     */
    async getRecentTransactions(poolAddress) {
        try {
            const poolData = this.trackedPools.get(poolAddress);
            if (!poolData)
                return;
            const publicKey = new web3_js_1.PublicKey(poolAddress);
            // Get recent transactions
            const signatures = await this.connection.getSignaturesForAddress(publicKey, { limit: 10 }, this.config.rpcCommitment);
            // If we have no signatures, return
            if (signatures.length === 0) {
                return;
            }
            // If we have a last signature, only process newer transactions
            const lastSignature = poolData.lastSignature;
            const newSignatures = lastSignature
                ? signatures.filter(sig => sig.signature !== lastSignature)
                : signatures;
            // Process new transactions
            for (const sigInfo of newSignatures.reverse()) {
                try {
                    const transaction = await this.connection.getTransaction(sigInfo.signature, {
                        commitment: this.config.rpcCommitment,
                    });
                    if (!transaction)
                        continue;
                    // Process transaction
                    const events = this.processTransaction(poolAddress, transaction, sigInfo);
                    // Emit events
                    for (const event of events) {
                        this.config.onEvent(event);
                    }
                }
                catch (error) {
                    logger.error(`Error processing transaction ${sigInfo.signature}`, { error });
                }
            }
            // Update last signature
            if (signatures.length > 0) {
                poolData.lastSignature = signatures[0].signature;
                this.trackedPools.set(poolAddress, poolData);
            }
        }
        catch (error) {
            logger.error(`Error getting recent transactions for pool ${poolAddress}`, { error });
            throw error;
        }
    }
    /**
     * Process a transaction to extract events
     * @param poolAddress Pool address
     * @param transaction Transaction data
     * @param signatureInfo Signature information
     * @returns Array of events
     */
    processTransaction(poolAddress, transaction, signatureInfo) {
        const events = [];
        try {
            // Skip if no instructions
            if (!transaction.meta || !transaction.transaction || !transaction.transaction.message) {
                return events;
            }
            // Get transaction data
            const message = transaction.transaction.message;
            const instructions = message.instructions || [];
            // Process each instruction
            for (let i = 0; i < instructions.length; i++) {
                const instruction = instructions[i];
                // Skip if not a program instruction
                if (!instruction.programId)
                    continue;
                // Determine event type based on instruction data
                const eventType = this.determineEventType(instruction, transaction);
                if (!eventType)
                    continue;
                // Create event
                const event = {
                    id: `${signatureInfo.signature}-${i}`,
                    poolAddress,
                    type: eventType,
                    signature: signatureInfo.signature,
                    blockTime: transaction.blockTime || 0,
                    slot: transaction.slot || 0,
                    data: {
                        instruction: i,
                        accounts: instruction.accounts,
                        data: instruction.data,
                        programId: instruction.programId,
                        logMessages: transaction.meta.logMessages || [],
                    },
                };
                events.push(event);
                logger.debug(`Detected ${eventType} event in pool ${poolAddress}`, {
                    signature: signatureInfo.signature,
                    slot: transaction.slot,
                });
            }
        }
        catch (error) {
            logger.error(`Error processing transaction for pool ${poolAddress}`, { error });
        }
        return events;
    }
    /**
     * Determine the event type based on instruction data
     * @param instruction Instruction data
     * @param transaction Transaction data
     * @returns Event type or null if not recognized
     */
    determineEventType(instruction, transaction) {
        try {
            // This is a simplified implementation
            // In a real implementation, you would need to decode the instruction data
            // and match it against known instruction layouts for the Meteora program
            // For now, we'll use a simple heuristic based on log messages
            const logMessages = transaction.meta.logMessages || [];
            const logs = logMessages.join('\n');
            if (logs.includes('Instruction: Swap')) {
                return EventType.SWAP;
            }
            else if (logs.includes('Instruction: Deposit')) {
                return EventType.DEPOSIT;
            }
            else if (logs.includes('Instruction: Withdraw')) {
                return EventType.WITHDRAW;
            }
            else if (logs.includes('Instruction: OpenPosition')) {
                return EventType.POSITION_OPEN;
            }
            else if (logs.includes('Instruction: ClosePosition')) {
                return EventType.POSITION_CLOSE;
            }
            else if (logs.includes('Instruction: UpdatePosition')) {
                return EventType.POSITION_UPDATE;
            }
            return null;
        }
        catch (error) {
            logger.error('Error determining event type', { error });
            return null;
        }
    }
    /**
     * Handle account change event
     * @param poolAddress Pool address
     * @param accountInfo Account information
     * @param context Context information
     */
    handleAccountChange(poolAddress, accountInfo, context) {
        logger.debug(`Account change detected for pool ${poolAddress}`, {
            slot: context.slot,
        });
        // In a real implementation, you would decode the account data
        // and emit events based on the changes
        // For now, we'll just trigger a poll for recent transactions
        this.getRecentTransactions(poolAddress).catch(error => {
            logger.error(`Error handling account change for pool ${poolAddress}`, { error });
        });
    }
}
exports.EventCollector = EventCollector;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnQtY29sbGVjdG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL21vZHVsZXMvY29sbGVjdG9ycy9ldmVudC1jb2xsZWN0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbURBQWtEO0FBQ2xELDZDQUFrRTtBQUVsRSxNQUFNLE1BQU0sR0FBRyxJQUFBLHlCQUFZLEVBQUMsOEJBQThCLENBQUMsQ0FBQztBQUU1RDs7R0FFRztBQUNILElBQVksU0FPWDtBQVBELFdBQVksU0FBUztJQUNuQiwwQkFBYSxDQUFBO0lBQ2IsZ0NBQW1CLENBQUE7SUFDbkIsa0NBQXFCLENBQUE7SUFDckIsNENBQStCLENBQUE7SUFDL0IsOENBQWlDLENBQUE7SUFDakMsZ0RBQW1DLENBQUE7QUFDckMsQ0FBQyxFQVBXLFNBQVMseUJBQVQsU0FBUyxRQU9wQjtBQTBCRDs7O0dBR0c7QUFDSCxNQUFhLGNBQWM7SUFRekI7OztPQUdHO0lBQ0gsWUFBWSxNQUE0QjtRQVRoQyxpQkFBWSxHQUEwQixJQUFJLENBQUM7UUFDM0MsY0FBUyxHQUFZLEtBQUssQ0FBQztRQUMzQixpQkFBWSxHQUE0QyxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ2xFLGtCQUFhLEdBQXdCLElBQUksR0FBRyxFQUFFLENBQUM7UUFPckQsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFDckIsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLG9CQUFVLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUM7UUFFM0UsTUFBTSxDQUFDLElBQUksQ0FBQyw2QkFBNkIsRUFBRTtZQUN6QyxXQUFXLEVBQUUsTUFBTSxDQUFDLFdBQVc7WUFDL0IsUUFBUSxFQUFFLE1BQU0sQ0FBQyxRQUFRO1NBQzFCLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxLQUFLO1FBQ1QsSUFBSSxJQUFJLENBQUMs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QUFLLEVBQUUsQ0FBQyxDQUFDO1FBQ25GLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBdlVELHdDQXVVQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGNyZWF0ZUxvZ2dlciB9IGZyb20gJ0BsaXFwcm8vbW9uaXRvcmluZyc7XG5pbXBvcnQgeyBDb25uZWN0aW9uLCBQdWJsaWNLZXksIEZpbmFsaXR5IH0gZnJvbSAnQHNvbGFuYS93ZWIzLmpzJztcblxuY29uc3QgbG9nZ2VyID0gY3JlYXRlTG9nZ2VyKCdkYXRhLXNlcnZpY2U6ZXZlbnQtY29sbGVjdG9yJyk7XG5cbi8qKlxuICogRXZlbnQgdHlwZXMgdGhhdCBjYW4gYmUgbW9uaXRvcmVkXG4gKi9cbmV4cG9ydCBlbnVtIEV2ZW50VHlwZSB7XG4gIFNXQVAgPSAnc3dhcCcsXG4gIERFUE9TSVQgPSAnZGVwb3NpdCcsXG4gIFdJVEhEUkFXID0gJ3dpdGhkcmF3JyxcbiAgUE9TSVRJT05fT1BFTiA9ICdwb3NpdGlvbl9vcGVuJyxcbiAgUE9TSVRJT05fQ0xPU0UgPSAncG9zaXRpb25fY2xvc2UnLFxuICBQT1NJVElPTl9VUERBVEUgPSAncG9zaXRpb25fdXBkYXRlJyxcbn1cblxuLyoqXG4gKiBFdmVudCBkYXRhIHN0cnVjdHVyZVxuICovXG5leHBvcnQgaW50ZXJmYWNlIFBvb2xFdmVudCB7XG4gIGlkOiBzdHJpbmc7XG4gIHBvb2xBZGRyZXNzOiBzdHJpbmc7XG4gIHR5cGU6IEV2ZW50VHlwZTtcbiAgc2lnbmF0dXJlOiBzdHJpbmc7XG4gIGJsb2NrVGltZTogbnVtYmVyO1xuICBzbG90OiBudW1iZXI7XG4gIGRhdGE6IGFueTtcbn1cblxuLyoqXG4gKiBDb25maWd1cmF0aW9uIGZvciB0aGUgRXZlbnRDb2xsZWN0b3JcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBFdmVudENvbGxlY3RvckNvbmZpZyB7XG4gIHJwY0VuZHBvaW50OiBzdHJpbmc7XG4gIHJwY0JhY2t1cEVuZHBvaW50Pzogc3RyaW5nO1xuICBycGNDb21taXRtZW50OiBGaW5hbGl0eTtcbiAgaW50ZXJ2YWw6IG51bWJlcjtcbiAgb25FdmVudDogKGV2ZW50OiBQb29sRXZlbnQpID0+IHZvaWQ7XG59XG5cbi8qKlxuICogRXZlbnQgQ29sbGVjdG9yXG4gKiBSZXNwb25zaWJsZSBmb3IgY29sbGVjdGluZyBldmVudHMgZnJvbSBsaXF1aWRpdHkgcG9vbHNcbiAqL1xuZXhwb3J0IGNsYXNzIEV2ZW50Q29sbGVjdG9yIHtcbiAgcHJpdmF0ZSBjb25uZWN0aW9uOiBDb25uZWN0aW9uO1xuICBwcml2YXRlIGNvbmZpZzogRXZlbnRDb2xsZWN0b3JDb25maWc7XG4gIHByaXZhdGUgcG9sbGluZ1RpbWVyOiBOb2RlSlMuVGltZW91dCB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIGlzUnVubmluZzogYm9vbGVhbiA9IGZhbHNlO1xuICBwcml2YXRlIHRyYWNrZWRQb29sczogTWFwPHN0cmluZywgeyBsYXN0U2lnbmF0dXJlPzogc3RyaW5nIH0+ID0gbmV3IE1hcCgpO1xuICBwcml2YXRlIHN1YnNjcmlwdGlvbnM6IE1hcDxzdHJpbmcsIG51bWJlcj4gPSBuZXcgTWFwKCk7XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIG5ldyBFdmVudCBDb2xsZWN0b3JcbiAgICogQHBhcmFtIGNvbmZpZyBDb2xsZWN0b3IgY29uZmlndXJhdGlvblxuICAgKi9cbiAgY29uc3RydWN0b3IoY29uZmlnOiBFdmVudENvbGxlY3RvckNvbmZpZykge1xuICAgIHRoaXMuY29uZmlnID0gY29uZmlnO1xuICAgIHRoaXMuY29ubmVjdGlvbiA9IG5ldyBDb25uZWN0aW9uKGNvbmZpZy5ycGNFbmRwb2ludCwgY29uZmlnLnJwY0NvbW1pdG1lbnQpO1xuXG4gICAgbG9nZ2VyLmluZm8oJ0V2ZW50IENvbGxlY3RvciBpbml0aWFsaXplZCcsIHtcbiAgICAgIHJwY0VuZHBvaW50OiBjb25maWcucnBjRW5kcG9pbnQsXG4gICAgICBpbnRlcnZhbDogY29uZmlnLmludGVydmFsLFxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFN0YXJ0IGNvbGxlY3RpbmcgZXZlbnRzXG4gICAqL1xuICBhc3luYyBzdGFydCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAodGhpcy5pc1J1bm5pbmcpIHtcbiAgICAgIGxvZ2dlci5pbmZvKCdFdmVudCBDb2xsZWN0b3IgaXMgYWxyZWFkeSBydW5uaW5nJyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgbG9nZ2VyLmluZm8oJ1N0YXJ0aW5nIEV2ZW50IENvbGxlY3RvcicpO1xuXG4gICAgLy8gU3RhcnQgcG9sbGluZyB0aW1lclxuICAgIHRoaXMucG9sbGluZ1RpbWVyID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgdGhpcy5wb2xsRXZlbnRzKCk7XG4gICAgfSwgdGhpcy5jb25maWcuaW50ZXJ2YWwpO1xuXG4gICAgLy8gUG9sbCBldmVudHMgaW1tZWRpYXRlbHlcbiAgICBhd2FpdCB0aGlzLnBvbGxFdmVudHMoKTtcblxuICAgIHRoaXMuaXNSdW5uaW5nID0gdHJ1ZTtcbiAgICBsb2dnZXIuaW5mbygnRXZlbnQgQ29sbGVjdG9yIHN0YXJ0ZWQnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTdG9wIGNvbGxlY3RpbmcgZXZlbnRzXG4gICAqL1xuICBzdG9wKCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5pc1J1bm5pbmcpIHtcbiAgICAgIGxvZ2dlci5pbmZvKCdFdmVudCBDb2xsZWN0b3IgaXMgbm90IHJ1bm5pbmcnKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBsb2dnZXIuaW5mbygnU3RvcHBpbmcgRXZlbnQgQ29sbGVjdG9yJyk7XG5cbiAgICAvLyBDbGVhciBwb2xsaW5nIHRpbWVyXG4gICAgaWYgKHRoaXMucG9sbGluZ1RpbWVyKSB7XG4gICAgICBjbGVhckludGVydmFsKHRoaXMucG9sbGluZ1RpbWVyKTtcbiAgICAgIHRoaXMucG9sbGluZ1RpbWVyID0gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBVbnN1YnNjcmliZSBmcm9tIGFsbCBXZWJTb2NrZXQgc3Vic2NyaXB0aW9uc1xuICAgIGZvciAoY29uc3QgW3Bvb2xBZGRyZXNzLCBzdWJzY3JpcHRpb25JZF0gb2YgdGhpcy5zdWJzY3JpcHRpb25zLmVudHJpZXMoKSkge1xuICAgICAgdGhpcy5jb25uZWN0aW9uLnJlbW92ZUFjY291bnRDaGFuZ2VMaXN0ZW5lcihzdWJzY3JpcHRpb25JZCk7XG4gICAgICBsb2dnZXIuaW5mbyhgVW5zdWJzY3JpYmVkIGZyb20gcG9vbCAke3Bvb2xBZGRyZXNzfWApO1xuICAgIH1cblxuICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5jbGVhcigpO1xuICAgIHRoaXMuaXNSdW5uaW5nID0gZmFsc2U7XG4gICAgbG9nZ2VyLmluZm8oJ0V2ZW50IENvbGxlY3RvciBzdG9wcGVkJyk7XG4gIH1cblxuICAvKipcbiAgICogVHJhY2sgZXZlbnRzIGZvciBhIHBvb2xcbiAgICogQHBhcmFtIHBvb2xBZGRyZXNzIFBvb2wgYWRkcmVzc1xuICAgKi9cbiAgYXN5bmMgdHJhY2tQb29sKHBvb2xBZGRyZXNzOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAodGhpcy50cmFja2VkUG9vbHMuaGFzKHBvb2xBZGRyZXNzKSkge1xuICAgICAgbG9nZ2VyLmluZm8oYFBvb2wgJHtwb29sQWRkcmVzc30gaXMgYWxyZWFkeSBiZWluZyB0cmFja2VkIGZvciBldmVudHNgKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgLy8gQWRkIHRvIHRyYWNrZWQgcG9vbHNcbiAgICAgIHRoaXMudHJhY2tlZFBvb2xzLnNldChwb29sQWRkcmVzcywge30pO1xuXG4gICAgICAvLyBTdWJzY3JpYmUgdG8gYWNjb3VudCBjaGFuZ2VzXG4gICAgICBjb25zdCBwdWJsaWNLZXkgPSBuZXcgUHVibGljS2V5KHBvb2xBZGRyZXNzKTtcbiAgICAgIGNvbnN0IHN1YnNjcmlwdGlvbklkID0gdGhpcy5jb25uZWN0aW9uLm9uQWNjb3VudENoYW5nZShcbiAgICAgICAgcHVibGljS2V5LFxuICAgICAgICAoYWNjb3VudEluZm8sIGNvbnRleHQpID0+IHtcbiAgICAgICAgICB0aGlzLmhhbmRsZUFjY291bnRDaGFuZ2UocG9vbEFkZHJlc3MsIGFjY291bnRJbmZvLCBjb250ZXh0KTtcbiAgICAgICAgfSxcbiAgICAgICAgdGhpcy5jb25maWcucnBjQ29tbWl0bWVudFxuICAgICAgKTtcblxuICAgICAgdGhpcy5zdWJzY3JpcHRpb25zLnNldChwb29sQWRkcmVzcywgc3Vic2NyaXB0aW9uSWQpO1xuXG4gICAgICAvLyBHZXQgcmVjZW50IHRyYW5zYWN0aW9ucyB0byBlc3RhYmxpc2ggYSBiYXNlbGluZVxuICAgICAgYXdhaXQgdGhpcy5nZXRSZWNlbnRUcmFuc2FjdGlvbnMocG9vbEFkZHJlc3MpO1xuXG4gICAgICBsb2dnZXIuaW5mbyhgU3RhcnRlZCB0cmFja2luZyBldmVudHMgZm9yIHBvb2wgJHtwb29sQWRkcmVzc31gKTtcbiAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICBsb2dnZXIuZXJyb3IoYEZhaWxlZCB0byB0cmFjayBldmVudHMgZm9yIHBvb2wgJHtwb29sQWRkcmVzc31gLCB7IGVycm9yIH0pO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gdHJhY2sgZXZlbnRzOiAke2Vycm9yLm1lc3NhZ2V9YCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFN0b3AgdHJhY2tpbmcgZXZlbnRzIGZvciBhIHBvb2xcbiAgICogQHBhcmFtIHBvb2xBZGRyZXNzIFBvb2wgYWRkcmVzc1xuICAgKi9cbiAgdW50cmFja1Bvb2wocG9vbEFkZHJlc3M6IHN0cmluZyk6IHZvaWQge1xuICAgIGlmICghdGhpcy50cmFja2VkUG9vbHMuaGFzKHBvb2xBZGRyZXNzKSkge1xuICAgICAgbG9nZ2VyLmluZm8oYFBvb2wgJHtwb29sQWRkcmVzc30gaXMgbm90IGJlaW5nIHRyYWNrZWQgZm9yIGV2ZW50c2ApO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIFVuc3Vic2NyaWJlIGZyb20gYWNjb3VudCBjaGFuZ2VzXG4gICAgY29uc3Qgc3Vic2NyaXB0aW9uSWQgPSB0aGlzLnN1YnNjcmlwdGlvbnMuZ2V0KHBvb2xBZGRyZXNzKTtcbiAgICBpZiAoc3Vic2NyaXB0aW9uSWQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5jb25uZWN0aW9uLnJlbW92ZUFjY291bnRDaGFuZ2VMaXN0ZW5lcihzdWJzY3JpcHRpb25JZCk7XG4gICAgICB0aGlzLnN1YnNjcmlwdGlvbnMuZGVsZXRlKHBvb2xBZGRyZXNzKTtcbiAgICB9XG5cbiAgICB0aGlzLnRyYWNrZWRQb29scy5kZWxldGUocG9vbEFkZHJlc3MpO1xuICAgIGxvZ2dlci5pbmZvKGBTdG9wcGVkIHRyYWNraW5nIGV2ZW50cyBmb3IgcG9vbCAke3Bvb2xBZGRyZXNzfWApO1xuICB9XG5cbiAgLyoqXG4gICAqIFBvbGwgZm9yIGV2ZW50cyBmb3IgYWxsIHRyYWNrZWQgcG9vbHNcbiAgICovXG4gIHByaXZhdGUgYXN5bmMgcG9sbEV2ZW50cygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBsb2dnZXIuZGVidWcoJ1BvbGxpbmcgZXZlbnRzIGZvciBhbGwgdHJhY2tlZCBwb29scycpO1xuXG4gICAgY29uc3QgcHJvbWlzZXMgPSBBcnJheS5mcm9tKHRoaXMudHJhY2tlZFBvb2xzLmtleXMoKSkubWFwKHBvb2xBZGRyZXNzID0+XG4gICAgICB0aGlzLmdldFJlY2VudFRyYW5zYWN0aW9ucyhwb29sQWRkcmVzcykuY2F0Y2goZXJyb3IgPT4ge1xuICAgICAgICBsb2dnZXIuZXJyb3IoYEVycm9yIHBvbGxpbmcgZXZlbnRzIGZvciBwb29sICR7cG9vbEFkZHJlc3N9YCwgeyBlcnJvciB9KTtcbiAgICAgIH0pXG4gICAgKTtcblxuICAgIGF3YWl0IFByb21pc2UuYWxsKHByb21pc2VzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgcmVjZW50IHRyYW5zYWN0aW9ucyBmb3IgYSBwb29sXG4gICAqIEBwYXJhbSBwb29sQWRkcmVzcyBQb29sIGFkZHJlc3NcbiAgICovXG4gIHByaXZhdGUgYXN5bmMgZ2V0UmVjZW50VHJhbnNhY3Rpb25zKHBvb2xBZGRyZXNzOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgcG9vbERhdGEgPSB0aGlzLnRyYWNrZWRQb29scy5nZXQocG9vbEFkZHJlc3MpO1xuICAgICAgaWYgKCFwb29sRGF0YSkgcmV0dXJuO1xuXG4gICAgICBjb25zdCBwdWJsaWNLZXkgPSBuZXcgUHVibGljS2V5KHBvb2xBZGRyZXNzKTtcblxuICAgICAgLy8gR2V0IHJlY2VudCB0cmFuc2FjdGlvbnNcbiAgICAgIGNvbnN0IHNpZ25hdHVyZXMgPSBhd2FpdCB0aGlzLmNvbm5lY3Rpb24uZ2V0U2lnbmF0dXJlc0ZvckFkZHJlc3MoXG4gICAgICAgIHB1YmxpY0tleSxcbiAgICAgICAgeyBsaW1pdDogMTAgfSxcbiAgICAgICAgdGhpcy5jb25maWcucnBjQ29tbWl0bWVudFxuICAgICAgKTtcblxuICAgICAgLy8gSWYgd2UgaGF2ZSBubyBzaWduYXR1cmVzLCByZXR1cm5cbiAgICAgIGlmIChzaWduYXR1cmVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIElmIHdlIGhhdmUgYSBsYXN0IHNpZ25hdHVyZSwgb25seSBwcm9jZXNzIG5ld2VyIHRyYW5zYWN0aW9uc1xuICAgICAgY29uc3QgbGFzdFNpZ25hdHVyZSA9IHBvb2xEYXRhLmxhc3RTaWduYXR1cmU7XG4gICAgICBjb25zdCBuZXdTaWduYXR1cmVzID0gbGFzdFNpZ25hdHVyZVxuICAgICAgICA/IHNpZ25hdHVyZXMuZmlsdGVyKHNpZyA9PiBzaWcuc2lnbmF0dXJlICE9PSBsYXN0U2lnbmF0dXJlKVxuICAgICAgICA6IHNpZ25hdHVyZXM7XG5cbiAgICAgIC8vIFByb2Nlc3MgbmV3IHRyYW5zYWN0aW9uc1xuICAgICAgZm9yIChjb25zdCBzaWdJbmZvIG9mIG5ld1NpZ25hdHVyZXMucmV2ZXJzZSgpKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY29uc3QgdHJhbnNhY3Rpb24gPSBhd2FpdCB0aGlzLmNvbm5lY3Rpb24uZ2V0VHJhbnNhY3Rpb24oc2lnSW5mby5zaWduYXR1cmUsIHtcbiAgICAgICAgICAgIGNvbW1pdG1lbnQ6IHRoaXMuY29uZmlnLnJwY0NvbW1pdG1lbnQsXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICBpZiAoIXRyYW5zYWN0aW9uKSBjb250aW51ZTtcblxuICAgICAgICAgIC8vIFByb2Nlc3MgdHJhbnNhY3Rpb25cbiAgICAgICAgICBjb25zdCBldmVudHMgPSB0aGlzLnByb2Nlc3NUcmFuc2FjdGlvbihwb29sQWRkcmVzcywgdHJhbnNhY3Rpb24sIHNpZ0luZm8pO1xuXG4gICAgICAgICAgLy8gRW1pdCBldmVudHNcbiAgICAgICAgICBmb3IgKGNvbnN0IGV2ZW50IG9mIGV2ZW50cykge1xuICAgICAgICAgICAgdGhpcy5jb25maWcub25FdmVudChldmVudCk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgbG9nZ2VyLmVycm9yKGBFcnJvciBwcm9jZXNzaW5nIHRyYW5zYWN0aW9uICR7c2lnSW5mby5zaWduYXR1cmV9YCwgeyBlcnJvciB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBVcGRhdGUgbGFzdCBzaWduYXR1cmVcbiAgICAgIGlmIChzaWduYXR1cmVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgcG9vbERhdGEubGFzdFNpZ25hdHVyZSA9IHNpZ25hdHVyZXNbMF0uc2lnbmF0dXJlO1xuICAgICAgICB0aGlzLnRyYWNrZWRQb29scy5zZXQocG9vbEFkZHJlc3MsIHBvb2xEYXRhKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICBsb2dnZXIuZXJyb3IoYEVycm9yIGdldHRpbmcgcmVjZW50IHRyYW5zYWN0aW9ucyBmb3IgcG9vbCAke3Bvb2xBZGRyZXNzfWAsIHsgZXJyb3IgfSk7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUHJvY2VzcyBhIHRyYW5zYWN0aW9uIHRvIGV4dHJhY3QgZXZlbnRzXG4gICAqIEBwYXJhbSBwb29sQWRkcmVzcyBQb29sIGFkZHJlc3NcbiAgICogQHBhcmFtIHRyYW5zYWN0aW9uIFRyYW5zYWN0aW9uIGRhdGFcbiAgICogQHBhcmFtIHNpZ25hdHVyZUluZm8gU2lnbmF0dXJlIGluZm9ybWF0aW9uXG4gICAqIEByZXR1cm5zIEFycmF5IG9mIGV2ZW50c1xuICAgKi9cbiAgcHJpdmF0ZSBwcm9jZXNzVHJhbnNhY3Rpb24oXG4gICAgcG9vbEFkZHJlc3M6IHN0cmluZyxcbiAgICB0cmFuc2FjdGlvbjogYW55LFxuICAgIHNpZ25hdHVyZUluZm86IGFueVxuICApOiBQb29sRXZlbnRbXSB7XG4gICAgY29uc3QgZXZlbnRzOiBQb29sRXZlbnRbXSA9IFtdO1xuXG4gICAgdHJ5IHtcbiAgICAgIC8vIFNraXAgaWYgbm8gaW5zdHJ1Y3Rpb25zXG4gICAgICBpZiAoIXRyYW5zYWN0aW9uLm1ldGEgfHwgIXRyYW5zYWN0aW9uLnRyYW5zYWN0aW9uIHx8ICF0cmFuc2FjdGlvbi50cmFuc2FjdGlvbi5tZXNzYWdlKSB7XG4gICAgICAgIHJldHVybiBldmVudHM7XG4gICAgICB9XG5cbiAgICAgIC8vIEdldCB0cmFuc2FjdGlvbiBkYXRhXG4gICAgICBjb25zdCBtZXNzYWdlID0gdHJhbnNhY3Rpb24udHJhbnNhY3Rpb24ubWVzc2FnZTtcbiAgICAgIGNvbnN0IGluc3RydWN0aW9ucyA9IG1lc3NhZ2UuaW5zdHJ1Y3Rpb25zIHx8IFtdO1xuXG4gICAgICAvLyBQcm9jZXNzIGVhY2ggaW5zdHJ1Y3Rpb25cbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaW5zdHJ1Y3Rpb25zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IGluc3RydWN0aW9uID0gaW5zdHJ1Y3Rpb25zW2ldO1xuXG4gICAgICAgIC8vIFNraXAgaWYgbm90IGEgcHJvZ3JhbSBpbnN0cnVjdGlvblxuICAgICAgICBpZiAoIWluc3RydWN0aW9uLnByb2dyYW1JZCkgY29udGludWU7XG5cbiAgICAgICAgLy8gRGV0ZXJtaW5lIGV2ZW50IHR5cGUgYmFzZWQgb24gaW5zdHJ1Y3Rpb24gZGF0YVxuICAgICAgICBjb25zdCBldmVudFR5cGUgPSB0aGlzLmRldGVybWluZUV2ZW50VHlwZShpbnN0cnVjdGlvbiwgdHJhbnNhY3Rpb24pO1xuICAgICAgICBpZiAoIWV2ZW50VHlwZSkgY29udGludWU7XG5cbiAgICAgICAgLy8gQ3JlYXRlIGV2ZW50XG4gICAgICAgIGNvbnN0IGV2ZW50OiBQb29sRXZlbnQgPSB7XG4gICAgICAgICAgaWQ6IGAke3NpZ25hdHVyZUluZm8uc2lnbmF0dXJlfS0ke2l9YCxcbiAgICAgICAgICBwb29sQWRkcmVzcyxcbiAgICAgICAgICB0eXBlOiBldmVudFR5cGUsXG4gICAgICAgICAgc2lnbmF0dXJlOiBzaWduYXR1cmVJbmZvLnNpZ25hdHVyZSxcbiAgICAgICAgICBibG9ja1RpbWU6IHRyYW5zYWN0aW9uLmJsb2NrVGltZSB8fCAwLFxuICAgICAgICAgIHNsb3Q6IHRyYW5zYWN0aW9uLnNsb3QgfHwgMCxcbiAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICBpbnN0cnVjdGlvbjogaSxcbiAgICAgICAgICAgIGFjY291bnRzOiBpbnN0cnVjdGlvbi5hY2NvdW50cyxcbiAgICAgICAgICAgIGRhdGE6IGluc3RydWN0aW9uLmRhdGEsXG4gICAgICAgICAgICBwcm9ncmFtSWQ6IGluc3RydWN0aW9uLnByb2dyYW1JZCxcbiAgICAgICAgICAgIGxvZ01lc3NhZ2VzOiB0cmFuc2FjdGlvbi5tZXRhLmxvZ01lc3NhZ2VzIHx8IFtdLFxuICAgICAgICAgIH0sXG4gICAgICAgIH07XG5cbiAgICAgICAgZXZlbnRzLnB1c2goZXZlbnQpO1xuICAgICAgICBsb2dnZXIuZGVidWcoYERldGVjdGVkICR7ZXZlbnRUeXBlfSBldmVudCBpbiBwb29sICR7cG9vbEFkZHJlc3N9YCwge1xuICAgICAgICAgIHNpZ25hdHVyZTogc2lnbmF0dXJlSW5mby5zaWduYXR1cmUsXG4gICAgICAgICAgc2xvdDogdHJhbnNhY3Rpb24uc2xvdCxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgbG9nZ2VyLmVycm9yKGBFcnJvciBwcm9jZXNzaW5nIHRyYW5zYWN0aW9uIGZvciBwb29sICR7cG9vbEFkZHJlc3N9YCwgeyBlcnJvciB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gZXZlbnRzO1xuICB9XG5cbiAgLyoqXG4gICAqIERldGVybWluZSB0aGUgZXZlbnQgdHlwZSBiYXNlZCBvbiBpbnN0cnVjdGlvbiBkYXRhXG4gICAqIEBwYXJhbSBpbnN0cnVjdGlvbiBJbnN0cnVjdGlvbiBkYXRhXG4gICAqIEBwYXJhbSB0cmFuc2FjdGlvbiBUcmFuc2FjdGlvbiBkYXRhXG4gICAqIEByZXR1cm5zIEV2ZW50IHR5cGUgb3IgbnVsbCBpZiBub3QgcmVjb2duaXplZFxuICAgKi9cbiAgcHJpdmF0ZSBkZXRlcm1pbmVFdmVudFR5cGUoaW5zdHJ1Y3Rpb246IGFueSwgdHJhbnNhY3Rpb246IGFueSk6IEV2ZW50VHlwZSB8IG51bGwge1xuICAgIHRyeSB7XG4gICAgICAvLyBUaGlzIGlzIGEgc2ltcGxpZmllZCBpbXBsZW1lbnRhdGlvblxuICAgICAgLy8gSW4gYSByZWFsIGltcGxlbWVudGF0aW9uLCB5b3Ugd291bGQgbmVlZCB0byBkZWNvZGUgdGhlIGluc3RydWN0aW9uIGRhdGFcbiAgICAgIC8vIGFuZCBtYXRjaCBpdCBhZ2FpbnN0IGtub3duIGluc3RydWN0aW9uIGxheW91dHMgZm9yIHRoZSBNZXRlb3JhIHByb2dyYW1cblxuICAgICAgLy8gRm9yIG5vdywgd2UnbGwgdXNlIGEgc2ltcGxlIGhldXJpc3RpYyBiYXNlZCBvbiBsb2cgbWVzc2FnZXNcbiAgICAgIGNvbnN0IGxvZ01lc3NhZ2VzID0gdHJhbnNhY3Rpb24ubWV0YS5sb2dNZXNzYWdlcyB8fCBbXTtcbiAgICAgIGNvbnN0IGxvZ3MgPSBsb2dNZXNzYWdlcy5qb2luKCdcXG4nKTtcblxuICAgICAgaWYgKGxvZ3MuaW5jbHVkZXMoJ0luc3RydWN0aW9uOiBTd2FwJykpIHtcbiAgICAgICAgcmV0dXJuIEV2ZW50VHlwZS5TV0FQO1xuICAgICAgfSBlbHNlIGlmIChsb2dzLmluY2x1ZGVzKCdJbnN0cnVjdGlvbjogRGVwb3NpdCcpKSB7XG4gICAgICAgIHJldHVybiBFdmVudFR5cGUuREVQT1NJVDtcbiAgICAgIH0gZWxzZSBpZiAobG9ncy5pbmNsdWRlcygnSW5zdHJ1Y3Rpb246IFdpdGhkcmF3JykpIHtcbiAgICAgICAgcmV0dXJuIEV2ZW50VHlwZS5XSVRIRFJBVztcbiAgICAgIH0gZWxzZSBpZiAobG9ncy5pbmNsdWRlcygnSW5zdHJ1Y3Rpb246IE9wZW5Qb3NpdGlvbicpKSB7XG4gICAgICAgIHJldHVybiBFdmVudFR5cGUuUE9TSVRJT05fT1BFTjtcbiAgICAgIH0gZWxzZSBpZiAobG9ncy5pbmNsdWRlcygnSW5zdHJ1Y3Rpb246IENsb3NlUG9zaXRpb24nKSkge1xuICAgICAgICByZXR1cm4gRXZlbnRUeXBlLlBPU0lUSU9OX0NMT1NFO1xuICAgICAgfSBlbHNlIGlmIChsb2dzLmluY2x1ZGVzKCdJbnN0cnVjdGlvbjogVXBkYXRlUG9zaXRpb24nKSkge1xuICAgICAgICByZXR1cm4gRXZlbnRUeXBlLlBPU0lUSU9OX1VQREFURTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgbG9nZ2VyLmVycm9yKCdFcnJvciBkZXRlcm1pbmluZyBldmVudCB0eXBlJywgeyBlcnJvciB9KTtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBIYW5kbGUgYWNjb3VudCBjaGFuZ2UgZXZlbnRcbiAgICogQHBhcmFtIHBvb2xBZGRyZXNzIFBvb2wgYWRkcmVzc1xuICAgKiBAcGFyYW0gYWNjb3VudEluZm8gQWNjb3VudCBpbmZvcm1hdGlvblxuICAgKiBAcGFyYW0gY29udGV4dCBDb250ZXh0IGluZm9ybWF0aW9uXG4gICAqL1xuICBwcml2YXRlIGhhbmRsZUFjY291bnRDaGFuZ2UocG9vbEFkZHJlc3M6IHN0cmluZywgYWNjb3VudEluZm86IGFueSwgY29udGV4dDogYW55KTogdm9pZCB7XG4gICAgbG9nZ2VyLmRlYnVnKGBBY2NvdW50IGNoYW5nZSBkZXRlY3RlZCBmb3IgcG9vbCAke3Bvb2xBZGRyZXNzfWAsIHtcbiAgICAgIHNsb3Q6IGNvbnRleHQuc2xvdCxcbiAgICB9KTtcblxuICAgIC8vIEluIGEgcmVhbCBpbXBsZW1lbnRhdGlvbiwgeW91IHdvdWxkIGRlY29kZSB0aGUgYWNjb3VudCBkYXRhXG4gICAgLy8gYW5kIGVtaXQgZXZlbnRzIGJhc2VkIG9uIHRoZSBjaGFuZ2VzXG5cbiAgICAvLyBGb3Igbm93LCB3ZSdsbCBqdXN0IHRyaWdnZXIgYSBwb2xsIGZvciByZWNlbnQgdHJhbnNhY3Rpb25zXG4gICAgdGhpcy5nZXRSZWNlbnRUcmFuc2FjdGlvbnMocG9vbEFkZHJlc3MpLmNhdGNoKGVycm9yID0+IHtcbiAgICAgIGxvZ2dlci5lcnJvcihgRXJyb3IgaGFuZGxpbmcgYWNjb3VudCBjaGFuZ2UgZm9yIHBvb2wgJHtwb29sQWRkcmVzc31gLCB7IGVycm9yIH0pO1xuICAgIH0pO1xuICB9XG59XG4iXX0=