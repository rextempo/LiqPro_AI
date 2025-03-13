"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PoolEventsCollector = exports.PoolEventType = void 0;
const web3_js_1 = require("@solana/web3.js");
const monitoring_1 = require("@liqpro/monitoring");
const logger = (0, monitoring_1.createLogger)('data-service:pool-events-collector');
/**
 * Pool Event Types
 */
var PoolEventType;
(function (PoolEventType) {
    PoolEventType["SWAP"] = "swap";
    PoolEventType["DEPOSIT"] = "deposit";
    PoolEventType["WITHDRAW"] = "withdraw";
    PoolEventType["POSITION_CREATED"] = "position_created";
    PoolEventType["POSITION_MODIFIED"] = "position_modified";
    PoolEventType["POSITION_CLOSED"] = "position_closed";
    PoolEventType["FEE_COLLECTION"] = "fee_collection";
    PoolEventType["UNKNOWN"] = "unknown";
})(PoolEventType || (exports.PoolEventType = PoolEventType = {}));
/**
 * Meteora Pool Events Collector
 * Responsible for monitoring events in Meteora DLMM pools
 */
class PoolEventsCollector {
    /**
     * Create a new Pool Events Collector
     * @param rpcEndpoint Solana RPC endpoint
     * @param commitment Commitment level
     */
    constructor(rpcEndpoint, commitment = 'confirmed') {
        this.eventListeners = new Map();
        this.eventCallbacks = new Map();
        this.lastSignatures = new Map();
        this.pollingInterval = 10000; // 10 seconds in milliseconds
        this.isPolling = new Map();
        this.connection = new web3_js_1.Connection(rpcEndpoint, commitment);
        logger.info('Pool Events Collector initialized');
    }
    /**
     * Start monitoring events for a specific pool
     * @param poolAddress Pool address
     * @param callback Callback function to handle events
     * @returns Subscription ID
     */
    startMonitoring(poolAddress, callback) {
        const subscriptionId = Date.now();
        const key = `${poolAddress}:${subscriptionId}`;
        // Store callback
        if (!this.eventCallbacks.has(poolAddress)) {
            this.eventCallbacks.set(poolAddress, []);
        }
        this.eventCallbacks.get(poolAddress).push(callback);
        // Store subscription
        this.eventListeners.set(key, subscriptionId);
        // Start polling if not already polling for this pool
        if (!this.isPolling.get(poolAddress)) {
            this.startPolling(poolAddress);
        }
        logger.info(`Started monitoring events for pool ${poolAddress} with subscription ${subscriptionId}`);
        return subscriptionId;
    }
    /**
     * Stop monitoring events for a specific subscription
     * @param poolAddress Pool address
     * @param subscriptionId Subscription ID
     */
    stopMonitoring(poolAddress, subscriptionId) {
        const key = `${poolAddress}:${subscriptionId}`;
        // Remove subscription
        this.eventListeners.delete(key);
        // Check if there are any remaining subscriptions for this pool
        let hasRemainingSubscriptions = false;
        for (const k of this.eventListeners.keys()) {
            if (k.startsWith(`${poolAddress}:`)) {
                hasRemainingSubscriptions = true;
                break;
            }
        }
        // If no remaining subscriptions, stop polling
        if (!hasRemainingSubscriptions) {
            this.isPolling.set(poolAddress, false);
            // Remove callbacks
            this.eventCallbacks.delete(poolAddress);
        }
        logger.info(`Stopped monitoring events for pool ${poolAddress} with subscription ${subscriptionId}`);
    }
    /**
     * Start polling for events
     * @param poolAddress Pool address
     */
    async startPolling(poolAddress) {
        this.isPolling.set(poolAddress, true);
        // Get initial signatures
        try {
            const signatures = await this.connection.getSignaturesForAddress(new web3_js_1.PublicKey(poolAddress), {
                limit: 1,
            });
            if (signatures.length > 0) {
                this.lastSignatures.set(poolAddress, signatures[0].signature);
            }
        }
        catch (error) {
            logger.error(`Error getting initial signatures for pool ${poolAddress}`, { error });
        }
        // Start polling loop
        this.poll(poolAddress);
    }
    /**
     * Poll for new events
     * @param poolAddress Pool address
     */
    async poll(poolAddress) {
        if (!this.isPolling.get(poolAddress)) {
            return;
        }
        try {
            // Get last processed signature
            const lastSignature = this.lastSignatures.get(poolAddress);
            // Get new signatures
            const options = { limit: 10 };
            if (lastSignature) {
                options.until = lastSignature;
            }
            const signatures = await this.connection.getSignaturesForAddress(new web3_js_1.PublicKey(poolAddress), options);
            // Process new signatures (in reverse order to process oldest first)
            for (let i = signatures.length - 1; i >= 0; i--) {
                const signature = signatures[i];
                // Skip already processed signatures
                if (signature.signature === lastSignature) {
                    continue;
                }
                // Process transaction
                await this.processTransaction(poolAddress, signature);
            }
            // Update last signature
            if (signatures.length > 0) {
                this.lastSignatures.set(poolAddress, signatures[0].signature);
            }
        }
        catch (error) {
            logger.error(`Error polling events for pool ${poolAddress}`, { error });
        }
        // Schedule next poll
        setTimeout(() => this.poll(poolAddress), this.pollingInterval);
    }
    /**
     * Process a transaction
     * @param poolAddress Pool address
     * @param signature Signature info
     */
    async processTransaction(poolAddress, signature) {
        try {
            // Get transaction details
            const transaction = await this.connection.getTransaction(signature.signature, {
                maxSupportedTransactionVersion: 0,
            });
            if (!transaction) {
                return;
            }
            // Determine event type based on transaction data
            const eventType = this.determineEventType(transaction);
            // Create event object
            const event = {
                type: eventType,
                signature: signature.signature,
                poolAddress,
                blockTime: transaction.blockTime || 0,
                slot: transaction.slot,
                data: this.extractEventData(transaction, eventType),
            };
            // Notify callbacks
            const callbacks = this.eventCallbacks.get(poolAddress) || [];
            for (const callback of callbacks) {
                try {
                    callback(event);
                }
                catch (error) {
                    logger.error(`Error in event callback for pool ${poolAddress}`, { error });
                }
            }
            logger.info(`Processed ${eventType} event for pool ${poolAddress}`, {
                signature: signature.signature,
                slot: transaction.slot,
            });
        }
        catch (error) {
            logger.error(`Error processing transaction ${signature.signature} for pool ${poolAddress}`, {
                error,
            });
        }
    }
    /**
     * Determine event type based on transaction data
     * @param transaction Transaction data
     * @returns Event type
     */
    determineEventType(transaction) {
        // This is a simplified implementation
        // In a real implementation, you would need to analyze the transaction logs
        // and instruction data to determine the exact event type
        // For now, we'll use a simple heuristic based on the program ID and instruction data
        try {
            const logMessages = transaction.meta?.logMessages || [];
            // Check for specific log messages
            for (const message of logMessages) {
                if (message.includes('Instruction: Swap')) {
                    return PoolEventType.SWAP;
                }
                else if (message.includes('Instruction: Deposit')) {
                    return PoolEventType.DEPOSIT;
                }
                else if (message.includes('Instruction: Withdraw')) {
                    return PoolEventType.WITHDRAW;
                }
                else if (message.includes('Instruction: OpenPosition')) {
                    return PoolEventType.POSITION_CREATED;
                }
                else if (message.includes('Instruction: ModifyPosition')) {
                    return PoolEventType.POSITION_MODIFIED;
                }
                else if (message.includes('Instruction: ClosePosition')) {
                    return PoolEventType.POSITION_CLOSED;
                }
                else if (message.includes('Instruction: CollectFees')) {
                    return PoolEventType.FEE_COLLECTION;
                }
            }
        }
        catch (error) {
            logger.error('Error determining event type', { error });
        }
        return PoolEventType.UNKNOWN;
    }
    /**
     * Extract event data from transaction
     * @param transaction Transaction data
     * @param eventType Event type
     * @returns Event data
     */
    extractEventData(transaction, eventType) {
        // This is a simplified implementation
        // In a real implementation, you would need to decode the instruction data
        // and extract relevant information based on the event type
        try {
            const logMessages = transaction.meta?.logMessages || [];
            const postTokenBalances = transaction.meta?.postTokenBalances || [];
            const preTokenBalances = transaction.meta?.preTokenBalances || [];
            // Basic data extraction based on event type
            switch (eventType) {
                case PoolEventType.SWAP:
                    return {
                        tokenBalances: {
                            pre: preTokenBalances,
                            post: postTokenBalances,
                        },
                        logs: logMessages,
                    };
                case PoolEventType.DEPOSIT:
                case PoolEventType.WITHDRAW:
                    return {
                        tokenBalances: {
                            pre: preTokenBalances,
                            post: postTokenBalances,
                        },
                        logs: logMessages,
                    };
                case PoolEventType.POSITION_CREATED:
                case PoolEventType.POSITION_MODIFIED:
                case PoolEventType.POSITION_CLOSED:
                    return {
                        tokenBalances: {
                            pre: preTokenBalances,
                            post: postTokenBalances,
                        },
                        logs: logMessages,
                    };
                case PoolEventType.FEE_COLLECTION:
                    return {
                        tokenBalances: {
                            pre: preTokenBalances,
                            post: postTokenBalances,
                        },
                        logs: logMessages,
                    };
                default:
                    return {
                        logs: logMessages,
                    };
            }
        }
        catch (error) {
            logger.error('Error extracting event data', { error });
            return {};
        }
    }
    /**
     * Set the polling interval
     * @param intervalMs Interval in milliseconds
     */
    setPollingInterval(intervalMs) {
        this.pollingInterval = intervalMs;
        logger.info(`Polling interval set to ${intervalMs}ms`);
    }
}
exports.PoolEventsCollector = PoolEventsCollector;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9vbC1ldmVudHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvbW9kdWxlcy9jb2xsZWN0b3JzL3Bvb2wtZXZlbnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDZDQUFnRjtBQUNoRixtREFBa0Q7QUFFbEQsTUFBTSxNQUFNLEdBQUcsSUFBQSx5QkFBWSxFQUFDLG9DQUFvQyxDQUFDLENBQUM7QUFFbEU7O0dBRUc7QUFDSCxJQUFZLGFBU1g7QUFURCxXQUFZLGFBQWE7SUFDdkIsOEJBQWEsQ0FBQTtJQUNiLG9DQUFtQixDQUFBO0lBQ25CLHNDQUFxQixDQUFBO0lBQ3JCLHNEQUFxQyxDQUFBO0lBQ3JDLHdEQUF1QyxDQUFBO0lBQ3ZDLG9EQUFtQyxDQUFBO0lBQ25DLGtEQUFpQyxDQUFBO0lBQ2pDLG9DQUFtQixDQUFBO0FBQ3JCLENBQUMsRUFUVyxhQUFhLDZCQUFiLGFBQWEsUUFTeEI7QUFjRDs7O0dBR0c7QUFDSCxNQUFhLG1CQUFtQjtJQVE5Qjs7OztPQUlHO0lBQ0gsWUFDRSxXQUFtQixFQUNuQixhQUFzRCxXQUFXO1FBYjNELG1CQUFjLEdBQXdCLElBQUksR0FBRyxFQUFFLENBQUM7UUFDaEQsbUJBQWMsR0FBZ0QsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUN4RSxtQkFBYyxHQUF3QixJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ2hELG9CQUFlLEdBQVcsS0FBSyxDQUFDLENBQUMsNkJBQTZCO1FBQzlELGNBQVMsR0FBeUIsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQVdsRCxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksb0JBQVUsQ0FBQyxXQUFXLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDMUQsTUFBTSxDQUFDLElBQUksQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDO0lBQ25ELENBQUM7SUFFRDs7Ozs7T0FLRztJQUNILGVBQWUsQ0FBQyxXQUFtQixFQUFFLFFBQW9DO1FBQ3ZFLE1BQU0sY0FBYyxHQUFHLElBQUks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QUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNmLE1BQU0sQ0FBQyxLQUFLLENBQUMsNkJBQTZCLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1lBQ3ZELE9BQU8sRUFBRSxDQUFDO1FBQ1osQ0FBQztJQUNILENBQUM7SUFFRDs7O09BR0c7SUFDSCxrQkFBa0IsQ0FBQyxVQUFrQjtRQUNuQyxJQUFJLENBQUMsZUFBZSxHQUFHLFVBQVUsQ0FBQztRQUNsQyxNQUFNLENBQUMsSUFBSSxDQUFDLDJCQUEyQixVQUFVLElBQUksQ0FBQyxDQUFDO0lBQ3pELENBQUM7Q0FDRjtBQXJVRCxrREFxVUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDb25uZWN0aW9uLCBQdWJsaWNLZXksIENvbmZpcm1lZFNpZ25hdHVyZUluZm8gfSBmcm9tICdAc29sYW5hL3dlYjMuanMnO1xuaW1wb3J0IHsgY3JlYXRlTG9nZ2VyIH0gZnJvbSAnQGxpcXByby9tb25pdG9yaW5nJztcblxuY29uc3QgbG9nZ2VyID0gY3JlYXRlTG9nZ2VyKCdkYXRhLXNlcnZpY2U6cG9vbC1ldmVudHMtY29sbGVjdG9yJyk7XG5cbi8qKlxuICogUG9vbCBFdmVudCBUeXBlc1xuICovXG5leHBvcnQgZW51bSBQb29sRXZlbnRUeXBlIHtcbiAgU1dBUCA9ICdzd2FwJyxcbiAgREVQT1NJVCA9ICdkZXBvc2l0JyxcbiAgV0lUSERSQVcgPSAnd2l0aGRyYXcnLFxuICBQT1NJVElPTl9DUkVBVEVEID0gJ3Bvc2l0aW9uX2NyZWF0ZWQnLFxuICBQT1NJVElPTl9NT0RJRklFRCA9ICdwb3NpdGlvbl9tb2RpZmllZCcsXG4gIFBPU0lUSU9OX0NMT1NFRCA9ICdwb3NpdGlvbl9jbG9zZWQnLFxuICBGRUVfQ09MTEVDVElPTiA9ICdmZWVfY29sbGVjdGlvbicsXG4gIFVOS05PV04gPSAndW5rbm93bicsXG59XG5cbi8qKlxuICogUG9vbCBFdmVudCBJbnRlcmZhY2VcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBQb29sRXZlbnQge1xuICB0eXBlOiBQb29sRXZlbnRUeXBlO1xuICBzaWduYXR1cmU6IHN0cmluZztcbiAgcG9vbEFkZHJlc3M6IHN0cmluZztcbiAgYmxvY2tUaW1lOiBudW1iZXI7XG4gIHNsb3Q6IG51bWJlcjtcbiAgZGF0YT86IGFueTtcbn1cblxuLyoqXG4gKiBNZXRlb3JhIFBvb2wgRXZlbnRzIENvbGxlY3RvclxuICogUmVzcG9uc2libGUgZm9yIG1vbml0b3JpbmcgZXZlbnRzIGluIE1ldGVvcmEgRExNTSBwb29sc1xuICovXG5leHBvcnQgY2xhc3MgUG9vbEV2ZW50c0NvbGxlY3RvciB7XG4gIHByaXZhdGUgY29ubmVjdGlvbjogQ29ubmVjdGlvbjtcbiAgcHJpdmF0ZSBldmVudExpc3RlbmVyczogTWFwPHN0cmluZywgbnVtYmVyPiA9IG5ldyBNYXAoKTtcbiAgcHJpdmF0ZSBldmVudENhbGxiYWNrczogTWFwPHN0cmluZywgKChldmVudDogUG9vbEV2ZW50KSA9PiB2b2lkKVtdPiA9IG5ldyBNYXAoKTtcbiAgcHJpdmF0ZSBsYXN0U2lnbmF0dXJlczogTWFwPHN0cmluZywgc3RyaW5nPiA9IG5ldyBNYXAoKTtcbiAgcHJpdmF0ZSBwb2xsaW5nSW50ZXJ2YWw6IG51bWJlciA9IDEwMDAwOyAvLyAxMCBzZWNvbmRzIGluIG1pbGxpc2Vjb25kc1xuICBwcml2YXRlIGlzUG9sbGluZzogTWFwPHN0cmluZywgYm9vbGVhbj4gPSBuZXcgTWFwKCk7XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIG5ldyBQb29sIEV2ZW50cyBDb2xsZWN0b3JcbiAgICogQHBhcmFtIHJwY0VuZHBvaW50IFNvbGFuYSBSUEMgZW5kcG9pbnRcbiAgICogQHBhcmFtIGNvbW1pdG1lbnQgQ29tbWl0bWVudCBsZXZlbFxuICAgKi9cbiAgY29uc3RydWN0b3IoXG4gICAgcnBjRW5kcG9pbnQ6IHN0cmluZyxcbiAgICBjb21taXRtZW50OiAncHJvY2Vzc2VkJyB8ICdjb25maXJtZWQnIHwgJ2ZpbmFsaXplZCcgPSAnY29uZmlybWVkJ1xuICApIHtcbiAgICB0aGlzLmNvbm5lY3Rpb24gPSBuZXcgQ29ubmVjdGlvbihycGNFbmRwb2ludCwgY29tbWl0bWVudCk7XG4gICAgbG9nZ2VyLmluZm8oJ1Bvb2wgRXZlbnRzIENvbGxlY3RvciBpbml0aWFsaXplZCcpO1xuICB9XG5cbiAgLyoqXG4gICAqIFN0YXJ0IG1vbml0b3JpbmcgZXZlbnRzIGZvciBhIHNwZWNpZmljIHBvb2xcbiAgICogQHBhcmFtIHBvb2xBZGRyZXNzIFBvb2wgYWRkcmVzc1xuICAgKiBAcGFyYW0gY2FsbGJhY2sgQ2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIGV2ZW50c1xuICAgKiBAcmV0dXJucyBTdWJzY3JpcHRpb24gSURcbiAgICovXG4gIHN0YXJ0TW9uaXRvcmluZyhwb29sQWRkcmVzczogc3RyaW5nLCBjYWxsYmFjazogKGV2ZW50OiBQb29sRXZlbnQpID0+IHZvaWQpOiBudW1iZXIge1xuICAgIGNvbnN0IHN1YnNjcmlwdGlvbklkID0gRGF0ZS5ub3coKTtcbiAgICBjb25zdCBrZXkgPSBgJHtwb29sQWRkcmVzc306JHtzdWJzY3JpcHRpb25JZH1gO1xuXG4gICAgLy8gU3RvcmUgY2FsbGJhY2tcbiAgICBpZiAoIXRoaXMuZXZlbnRDYWxsYmFja3MuaGFzKHBvb2xBZGRyZXNzKSkge1xuICAgICAgdGhpcy5ldmVudENhbGxiYWNrcy5zZXQocG9vbEFkZHJlc3MsIFtdKTtcbiAgICB9XG4gICAgdGhpcy5ldmVudENhbGxiYWNrcy5nZXQocG9vbEFkZHJlc3MpIS5wdXNoKGNhbGxiYWNrKTtcblxuICAgIC8vIFN0b3JlIHN1YnNjcmlwdGlvblxuICAgIHRoaXMuZXZlbnRMaXN0ZW5lcnMuc2V0KGtleSwgc3Vic2NyaXB0aW9uSWQpO1xuXG4gICAgLy8gU3RhcnQgcG9sbGluZyBpZiBub3QgYWxyZWFkeSBwb2xsaW5nIGZvciB0aGlzIHBvb2xcbiAgICBpZiAoIXRoaXMuaXNQb2xsaW5nLmdldChwb29sQWRkcmVzcykpIHtcbiAgICAgIHRoaXMuc3RhcnRQb2xsaW5nKHBvb2xBZGRyZXNzKTtcbiAgICB9XG5cbiAgICBsb2dnZXIuaW5mbyhcbiAgICAgIGBTdGFydGVkIG1vbml0b3JpbmcgZXZlbnRzIGZvciBwb29sICR7cG9vbEFkZHJlc3N9IHdpdGggc3Vic2NyaXB0aW9uICR7c3Vic2NyaXB0aW9uSWR9YFxuICAgICk7XG4gICAgcmV0dXJuIHN1YnNjcmlwdGlvbklkO1xuICB9XG5cbiAgLyoqXG4gICAqIFN0b3AgbW9uaXRvcmluZyBldmVudHMgZm9yIGEgc3BlY2lmaWMgc3Vic2NyaXB0aW9uXG4gICAqIEBwYXJhbSBwb29sQWRkcmVzcyBQb29sIGFkZHJlc3NcbiAgICogQHBhcmFtIHN1YnNjcmlwdGlvbklkIFN1YnNjcmlwdGlvbiBJRFxuICAgKi9cbiAgc3RvcE1vbml0b3JpbmcocG9vbEFkZHJlc3M6IHN0cmluZywgc3Vic2NyaXB0aW9uSWQ6IG51bWJlcik6IHZvaWQge1xuICAgIGNvbnN0IGtleSA9IGAke3Bvb2xBZGRyZXNzfToke3N1YnNjcmlwdGlvbklkfWA7XG5cbiAgICAvLyBSZW1vdmUgc3Vic2NyaXB0aW9uXG4gICAgdGhpcy5ldmVudExpc3RlbmVycy5kZWxldGUoa2V5KTtcblxuICAgIC8vIENoZWNrIGlmIHRoZXJlIGFyZSBhbnkgcmVtYWluaW5nIHN1YnNjcmlwdGlvbnMgZm9yIHRoaXMgcG9vbFxuICAgIGxldCBoYXNSZW1haW5pbmdTdWJzY3JpcHRpb25zID0gZmFsc2U7XG4gICAgZm9yIChjb25zdCBrIG9mIHRoaXMuZXZlbnRMaXN0ZW5lcnMua2V5cygpKSB7XG4gICAgICBpZiAoay5zdGFydHNXaXRoKGAke3Bvb2xBZGRyZXNzfTpgKSkge1xuICAgICAgICBoYXNSZW1haW5pbmdTdWJzY3JpcHRpb25zID0gdHJ1ZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gSWYgbm8gcmVtYWluaW5nIHN1YnNjcmlwdGlvbnMsIHN0b3AgcG9sbGluZ1xuICAgIGlmICghaGFzUmVtYWluaW5nU3Vic2NyaXB0aW9ucykge1xuICAgICAgdGhpcy5pc1BvbGxpbmcuc2V0KHBvb2xBZGRyZXNzLCBmYWxzZSk7XG5cbiAgICAgIC8vIFJlbW92ZSBjYWxsYmFja3NcbiAgICAgIHRoaXMuZXZlbnRDYWxsYmFja3MuZGVsZXRlKHBvb2xBZGRyZXNzKTtcbiAgICB9XG5cbiAgICBsb2dnZXIuaW5mbyhcbiAgICAgIGBTdG9wcGVkIG1vbml0b3JpbmcgZXZlbnRzIGZvciBwb29sICR7cG9vbEFkZHJlc3N9IHdpdGggc3Vic2NyaXB0aW9uICR7c3Vic2NyaXB0aW9uSWR9YFxuICAgICk7XG4gIH1cblxuICAvKipcbiAgICogU3RhcnQgcG9sbGluZyBmb3IgZXZlbnRzXG4gICAqIEBwYXJhbSBwb29sQWRkcmVzcyBQb29sIGFkZHJlc3NcbiAgICovXG4gIHByaXZhdGUgYXN5bmMgc3RhcnRQb2xsaW5nKHBvb2xBZGRyZXNzOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0aGlzLmlzUG9sbGluZy5zZXQocG9vbEFkZHJlc3MsIHRydWUpO1xuXG4gICAgLy8gR2V0IGluaXRpYWwgc2lnbmF0dXJlc1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBzaWduYXR1cmVzID0gYXdhaXQgdGhpcy5jb25uZWN0aW9uLmdldFNpZ25hdHVyZXNGb3JBZGRyZXNzKG5ldyBQdWJsaWNLZXkocG9vbEFkZHJlc3MpLCB7XG4gICAgICAgIGxpbWl0OiAxLFxuICAgICAgfSk7XG5cbiAgICAgIGlmIChzaWduYXR1cmVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdGhpcy5sYXN0U2lnbmF0dXJlcy5zZXQocG9vbEFkZHJlc3MsIHNpZ25hdHVyZXNbMF0uc2lnbmF0dXJlKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgbG9nZ2VyLmVycm9yKGBFcnJvciBnZXR0aW5nIGluaXRpYWwgc2lnbmF0dXJlcyBmb3IgcG9vbCAke3Bvb2xBZGRyZXNzfWAsIHsgZXJyb3IgfSk7XG4gICAgfVxuXG4gICAgLy8gU3RhcnQgcG9sbGluZyBsb29wXG4gICAgdGhpcy5wb2xsKHBvb2xBZGRyZXNzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQb2xsIGZvciBuZXcgZXZlbnRzXG4gICAqIEBwYXJhbSBwb29sQWRkcmVzcyBQb29sIGFkZHJlc3NcbiAgICovXG4gIHByaXZhdGUgYXN5bmMgcG9sbChwb29sQWRkcmVzczogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKCF0aGlzLmlzUG9sbGluZy5nZXQocG9vbEFkZHJlc3MpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIC8vIEdldCBsYXN0IHByb2Nlc3NlZCBzaWduYXR1cmVcbiAgICAgIGNvbnN0IGxhc3RTaWduYXR1cmUgPSB0aGlzLmxhc3RTaWduYXR1cmVzLmdldChwb29sQWRkcmVzcyk7XG5cbiAgICAgIC8vIEdldCBuZXcgc2lnbmF0dXJlc1xuICAgICAgY29uc3Qgb3B0aW9uczogYW55ID0geyBsaW1pdDogMTAgfTtcbiAgICAgIGlmIChsYXN0U2lnbmF0dXJlKSB7XG4gICAgICAgIG9wdGlvbnMudW50aWwgPSBsYXN0U2lnbmF0dXJlO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBzaWduYXR1cmVzID0gYXdhaXQgdGhpcy5jb25uZWN0aW9uLmdldFNpZ25hdHVyZXNGb3JBZGRyZXNzKFxuICAgICAgICBuZXcgUHVibGljS2V5KHBvb2xBZGRyZXNzKSxcbiAgICAgICAgb3B0aW9uc1xuICAgICAgKTtcblxuICAgICAgLy8gUHJvY2VzcyBuZXcgc2lnbmF0dXJlcyAoaW4gcmV2ZXJzZSBvcmRlciB0byBwcm9jZXNzIG9sZGVzdCBmaXJzdClcbiAgICAgIGZvciAobGV0IGkgPSBzaWduYXR1cmVzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgIGNvbnN0IHNpZ25hdHVyZSA9IHNpZ25hdHVyZXNbaV07XG5cbiAgICAgICAgLy8gU2tpcCBhbHJlYWR5IHByb2Nlc3NlZCBzaWduYXR1cmVzXG4gICAgICAgIGlmIChzaWduYXR1cmUuc2lnbmF0dXJlID09PSBsYXN0U2lnbmF0dXJlKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBQcm9jZXNzIHRyYW5zYWN0aW9uXG4gICAgICAgIGF3YWl0IHRoaXMucHJvY2Vzc1RyYW5zYWN0aW9uKHBvb2xBZGRyZXNzLCBzaWduYXR1cmUpO1xuICAgICAgfVxuXG4gICAgICAvLyBVcGRhdGUgbGFzdCBzaWduYXR1cmVcbiAgICAgIGlmIChzaWduYXR1cmVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdGhpcy5sYXN0U2lnbmF0dXJlcy5zZXQocG9vbEFkZHJlc3MsIHNpZ25hdHVyZXNbMF0uc2lnbmF0dXJlKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgbG9nZ2VyLmVycm9yKGBFcnJvciBwb2xsaW5nIGV2ZW50cyBmb3IgcG9vbCAke3Bvb2xBZGRyZXNzfWAsIHsgZXJyb3IgfSk7XG4gICAgfVxuXG4gICAgLy8gU2NoZWR1bGUgbmV4dCBwb2xsXG4gICAgc2V0VGltZW91dCgoKSA9PiB0aGlzLnBvbGwocG9vbEFkZHJlc3MpLCB0aGlzLnBvbGxpbmdJbnRlcnZhbCk7XG4gIH1cblxuICAvKipcbiAgICogUHJvY2VzcyBhIHRyYW5zYWN0aW9uXG4gICAqIEBwYXJhbSBwb29sQWRkcmVzcyBQb29sIGFkZHJlc3NcbiAgICogQHBhcmFtIHNpZ25hdHVyZSBTaWduYXR1cmUgaW5mb1xuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyBwcm9jZXNzVHJhbnNhY3Rpb24oXG4gICAgcG9vbEFkZHJlc3M6IHN0cmluZyxcbiAgICBzaWduYXR1cmU6IENvbmZpcm1lZFNpZ25hdHVyZUluZm9cbiAgKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdHJ5IHtcbiAgICAgIC8vIEdldCB0cmFuc2FjdGlvbiBkZXRhaWxzXG4gICAgICBjb25zdCB0cmFuc2FjdGlvbiA9IGF3YWl0IHRoaXMuY29ubmVjdGlvbi5nZXRUcmFuc2FjdGlvbihzaWduYXR1cmUuc2lnbmF0dXJlLCB7XG4gICAgICAgIG1heFN1cHBvcnRlZFRyYW5zYWN0aW9uVmVyc2lvbjogMCxcbiAgICAgIH0pO1xuXG4gICAgICBpZiAoIXRyYW5zYWN0aW9uKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gRGV0ZXJtaW5lIGV2ZW50IHR5cGUgYmFzZWQgb24gdHJhbnNhY3Rpb24gZGF0YVxuICAgICAgY29uc3QgZXZlbnRUeXBlID0gdGhpcy5kZXRlcm1pbmVFdmVudFR5cGUodHJhbnNhY3Rpb24pO1xuXG4gICAgICAvLyBDcmVhdGUgZXZlbnQgb2JqZWN0XG4gICAgICBjb25zdCBldmVudDogUG9vbEV2ZW50ID0ge1xuICAgICAgICB0eXBlOiBldmVudFR5cGUsXG4gICAgICAgIHNpZ25hdHVyZTogc2lnbmF0dXJlLnNpZ25hdHVyZSxcbiAgICAgICAgcG9vbEFkZHJlc3MsXG4gICAgICAgIGJsb2NrVGltZTogdHJhbnNhY3Rpb24uYmxvY2tUaW1lIHx8IDAsXG4gICAgICAgIHNsb3Q6IHRyYW5zYWN0aW9uLnNsb3QsXG4gICAgICAgIGRhdGE6IHRoaXMuZXh0cmFjdEV2ZW50RGF0YSh0cmFuc2FjdGlvbiwgZXZlbnRUeXBlKSxcbiAgICAgIH07XG5cbiAgICAgIC8vIE5vdGlmeSBjYWxsYmFja3NcbiAgICAgIGNvbnN0IGNhbGxiYWNrcyA9IHRoaXMuZXZlbnRDYWxsYmFja3MuZ2V0KHBvb2xBZGRyZXNzKSB8fCBbXTtcbiAgICAgIGZvciAoY29uc3QgY2FsbGJhY2sgb2YgY2FsbGJhY2tzKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY2FsbGJhY2soZXZlbnQpO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgIGxvZ2dlci5lcnJvcihgRXJyb3IgaW4gZXZlbnQgY2FsbGJhY2sgZm9yIHBvb2wgJHtwb29sQWRkcmVzc31gLCB7IGVycm9yIH0pO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGxvZ2dlci5pbmZvKGBQcm9jZXNzZWQgJHtldmVudFR5cGV9IGV2ZW50IGZvciBwb29sICR7cG9vbEFkZHJlc3N9YCwge1xuICAgICAgICBzaWduYXR1cmU6IHNpZ25hdHVyZS5zaWduYXR1cmUsXG4gICAgICAgIHNsb3Q6IHRyYW5zYWN0aW9uLnNsb3QsXG4gICAgICB9KTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgbG9nZ2VyLmVycm9yKGBFcnJvciBwcm9jZXNzaW5nIHRyYW5zYWN0aW9uICR7c2lnbmF0dXJlLnNpZ25hdHVyZX0gZm9yIHBvb2wgJHtwb29sQWRkcmVzc31gLCB7XG4gICAgICAgIGVycm9yLFxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIERldGVybWluZSBldmVudCB0eXBlIGJhc2VkIG9uIHRyYW5zYWN0aW9uIGRhdGFcbiAgICogQHBhcmFtIHRyYW5zYWN0aW9uIFRyYW5zYWN0aW9uIGRhdGFcbiAgICogQHJldHVybnMgRXZlbnQgdHlwZVxuICAgKi9cbiAgcHJpdmF0ZSBkZXRlcm1pbmVFdmVudFR5cGUodHJhbnNhY3Rpb246IGFueSk6IFBvb2xFdmVudFR5cGUge1xuICAgIC8vIFRoaXMgaXMgYSBzaW1wbGlmaWVkIGltcGxlbWVudGF0aW9uXG4gICAgLy8gSW4gYSByZWFsIGltcGxlbWVudGF0aW9uLCB5b3Ugd291bGQgbmVlZCB0byBhbmFseXplIHRoZSB0cmFuc2FjdGlvbiBsb2dzXG4gICAgLy8gYW5kIGluc3RydWN0aW9uIGRhdGEgdG8gZGV0ZXJtaW5lIHRoZSBleGFjdCBldmVudCB0eXBlXG5cbiAgICAvLyBGb3Igbm93LCB3ZSdsbCB1c2UgYSBzaW1wbGUgaGV1cmlzdGljIGJhc2VkIG9uIHRoZSBwcm9ncmFtIElEIGFuZCBpbnN0cnVjdGlvbiBkYXRhXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGxvZ01lc3NhZ2VzID0gdHJhbnNhY3Rpb24ubWV0YT8ubG9nTWVzc2FnZXMgfHwgW107XG5cbiAgICAgIC8vIENoZWNrIGZvciBzcGVjaWZpYyBsb2cgbWVzc2FnZXNcbiAgICAgIGZvciAoY29uc3QgbWVzc2FnZSBvZiBsb2dNZXNzYWdlcykge1xuICAgICAgICBpZiAobWVzc2FnZS5pbmNsdWRlcygnSW5zdHJ1Y3Rpb246IFN3YXAnKSkge1xuICAgICAgICAgIHJldHVybiBQb29sRXZlbnRUeXBlLlNXQVA7XG4gICAgICAgIH0gZWxzZSBpZiAobWVzc2FnZS5pbmNsdWRlcygnSW5zdHJ1Y3Rpb246IERlcG9zaXQnKSkge1xuICAgICAgICAgIHJldHVybiBQb29sRXZlbnRUeXBlLkRFUE9TSVQ7XG4gICAgICAgIH0gZWxzZSBpZiAobWVzc2FnZS5pbmNsdWRlcygnSW5zdHJ1Y3Rpb246IFdpdGhkcmF3JykpIHtcbiAgICAgICAgICByZXR1cm4gUG9vbEV2ZW50VHlwZS5XSVRIRFJBVztcbiAgICAgICAgfSBlbHNlIGlmIChtZXNzYWdlLmluY2x1ZGVzKCdJbnN0cnVjdGlvbjogT3BlblBvc2l0aW9uJykpIHtcbiAgICAgICAgICByZXR1cm4gUG9vbEV2ZW50VHlwZS5QT1NJVElPTl9DUkVBVEVEO1xuICAgICAgICB9IGVsc2UgaWYgKG1lc3NhZ2UuaW5jbHVkZXMoJ0luc3RydWN0aW9uOiBNb2RpZnlQb3NpdGlvbicpKSB7XG4gICAgICAgICAgcmV0dXJuIFBvb2xFdmVudFR5cGUuUE9TSVRJT05fTU9ESUZJRUQ7XG4gICAgICAgIH0gZWxzZSBpZiAobWVzc2FnZS5pbmNsdWRlcygnSW5zdHJ1Y3Rpb246IENsb3NlUG9zaXRpb24nKSkge1xuICAgICAgICAgIHJldHVybiBQb29sRXZlbnRUeXBlLlBPU0lUSU9OX0NMT1NFRDtcbiAgICAgICAgfSBlbHNlIGlmIChtZXNzYWdlLmluY2x1ZGVzKCdJbnN0cnVjdGlvbjogQ29sbGVjdEZlZXMnKSkge1xuICAgICAgICAgIHJldHVybiBQb29sRXZlbnRUeXBlLkZFRV9DT0xMRUNUSU9OO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGxvZ2dlci5lcnJvcignRXJyb3IgZGV0ZXJtaW5pbmcgZXZlbnQgdHlwZScsIHsgZXJyb3IgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIFBvb2xFdmVudFR5cGUuVU5LTk9XTjtcbiAgfVxuXG4gIC8qKlxuICAgKiBFeHRyYWN0IGV2ZW50IGRhdGEgZnJvbSB0cmFuc2FjdGlvblxuICAgKiBAcGFyYW0gdHJhbnNhY3Rpb24gVHJhbnNhY3Rpb24gZGF0YVxuICAgKiBAcGFyYW0gZXZlbnRUeXBlIEV2ZW50IHR5cGVcbiAgICogQHJldHVybnMgRXZlbnQgZGF0YVxuICAgKi9cbiAgcHJpdmF0ZSBleHRyYWN0RXZlbnREYXRhKHRyYW5zYWN0aW9uOiBhbnksIGV2ZW50VHlwZTogUG9vbEV2ZW50VHlwZSk6IGFueSB7XG4gICAgLy8gVGhpcyBpcyBhIHNpbXBsaWZpZWQgaW1wbGVtZW50YXRpb25cbiAgICAvLyBJbiBhIHJlYWwgaW1wbGVtZW50YXRpb24sIHlvdSB3b3VsZCBuZWVkIHRvIGRlY29kZSB0aGUgaW5zdHJ1Y3Rpb24gZGF0YVxuICAgIC8vIGFuZCBleHRyYWN0IHJlbGV2YW50IGluZm9ybWF0aW9uIGJhc2VkIG9uIHRoZSBldmVudCB0eXBlXG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgbG9nTWVzc2FnZXMgPSB0cmFuc2FjdGlvbi5tZXRhPy5sb2dNZXNzYWdlcyB8fCBbXTtcbiAgICAgIGNvbnN0IHBvc3RUb2tlbkJhbGFuY2VzID0gdHJhbnNhY3Rpb24ubWV0YT8ucG9zdFRva2VuQmFsYW5jZXMgfHwgW107XG4gICAgICBjb25zdCBwcmVUb2tlbkJhbGFuY2VzID0gdHJhbnNhY3Rpb24ubWV0YT8ucHJlVG9rZW5CYWxhbmNlcyB8fCBbXTtcblxuICAgICAgLy8gQmFzaWMgZGF0YSBleHRyYWN0aW9uIGJhc2VkIG9uIGV2ZW50IHR5cGVcbiAgICAgIHN3aXRjaCAoZXZlbnRUeXBlKSB7XG4gICAgICAgIGNhc2UgUG9vbEV2ZW50VHlwZS5TV0FQOlxuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0b2tlbkJhbGFuY2VzOiB7XG4gICAgICAgICAgICAgIHByZTogcHJlVG9rZW5CYWxhbmNlcyxcbiAgICAgICAgICAgICAgcG9zdDogcG9zdFRva2VuQmFsYW5jZXMsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbG9nczogbG9nTWVzc2FnZXMsXG4gICAgICAgICAgfTtcblxuICAgICAgICBjYXNlIFBvb2xFdmVudFR5cGUuREVQT1NJVDpcbiAgICAgICAgY2FzZSBQb29sRXZlbnRUeXBlLldJVEhEUkFXOlxuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0b2tlbkJhbGFuY2VzOiB7XG4gICAgICAgICAgICAgIHByZTogcHJlVG9rZW5CYWxhbmNlcyxcbiAgICAgICAgICAgICAgcG9zdDogcG9zdFRva2VuQmFsYW5jZXMsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbG9nczogbG9nTWVzc2FnZXMsXG4gICAgICAgICAgfTtcblxuICAgICAgICBjYXNlIFBvb2xFdmVudFR5cGUuUE9TSVRJT05fQ1JFQVRFRDpcbiAgICAgICAgY2FzZSBQb29sRXZlbnRUeXBlLlBPU0lUSU9OX01PRElGSUVEOlxuICAgICAgICBjYXNlIFBvb2xFdmVudFR5cGUuUE9TSVRJT05fQ0xPU0VEOlxuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0b2tlbkJhbGFuY2VzOiB7XG4gICAgICAgICAgICAgIHByZTogcHJlVG9rZW5CYWxhbmNlcyxcbiAgICAgICAgICAgICAgcG9zdDogcG9zdFRva2VuQmFsYW5jZXMsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbG9nczogbG9nTWVzc2FnZXMsXG4gICAgICAgICAgfTtcblxuICAgICAgICBjYXNlIFBvb2xFdmVudFR5cGUuRkVFX0NPTExFQ1RJT046XG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHRva2VuQmFsYW5jZXM6IHtcbiAgICAgICAgICAgICAgcHJlOiBwcmVUb2tlbkJhbGFuY2VzLFxuICAgICAgICAgICAgICBwb3N0OiBwb3N0VG9rZW5CYWxhbmNlcyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBsb2dzOiBsb2dNZXNzYWdlcyxcbiAgICAgICAgICB9O1xuXG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGxvZ3M6IGxvZ01lc3NhZ2VzLFxuICAgICAgICAgIH07XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGxvZ2dlci5lcnJvcignRXJyb3IgZXh0cmFjdGluZyBldmVudCBkYXRhJywgeyBlcnJvciB9KTtcbiAgICAgIHJldHVybiB7fTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU2V0IHRoZSBwb2xsaW5nIGludGVydmFsXG4gICAqIEBwYXJhbSBpbnRlcnZhbE1zIEludGVydmFsIGluIG1pbGxpc2Vjb25kc1xuICAgKi9cbiAgc2V0UG9sbGluZ0ludGVydmFsKGludGVydmFsTXM6IG51bWJlcik6IHZvaWQge1xuICAgIHRoaXMucG9sbGluZ0ludGVydmFsID0gaW50ZXJ2YWxNcztcbiAgICBsb2dnZXIuaW5mbyhgUG9sbGluZyBpbnRlcnZhbCBzZXQgdG8gJHtpbnRlcnZhbE1zfW1zYCk7XG4gIH1cbn1cbiJdfQ==