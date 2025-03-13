"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PoolDataCollector = void 0;
const monitoring_1 = require("@liqpro/monitoring");
const web3_js_1 = require("@solana/web3.js");
const logger = (0, monitoring_1.createLogger)('data-service:pool-data-collector');
/**
 * Pool Data Collector
 * Responsible for collecting data from liquidity pools
 */
class PoolDataCollector {
    /**
     * Create a new Pool Data Collector
     * @param config Collector configuration
     */
    constructor(config) {
        this.pollingTimer = null;
        this.isRunning = false;
        this.trackedPools = new Set();
        this.subscriptions = new Map();
        this.config = config;
        this.connection = new web3_js_1.Connection(config.rpcEndpoint, config.rpcCommitment);
        logger.info('Pool Data Collector initialized', {
            rpcEndpoint: config.rpcEndpoint,
            interval: config.interval,
            meteoraProgramId: config.meteoraProgramId,
        });
    }
    /**
     * Start collecting pool data
     */
    async start() {
        if (this.isRunning) {
            logger.info('Pool Data Collector is already running');
            return;
        }
        logger.info('Starting Pool Data Collector');
        // Start polling timer
        this.pollingTimer = setInterval(() => {
            this.collectPoolData();
        }, this.config.interval);
        // Collect data immediately
        await this.collectPoolData();
        this.isRunning = true;
        logger.info('Pool Data Collector started');
    }
    /**
     * Stop collecting pool data
     */
    stop() {
        if (!this.isRunning) {
            logger.info('Pool Data Collector is not running');
            return;
        }
        logger.info('Stopping Pool Data Collector');
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
        logger.info('Pool Data Collector stopped');
    }
    /**
     * Track a pool for data collection
     * @param poolAddress Pool address
     */
    async trackPool(poolAddress) {
        if (this.trackedPools.has(poolAddress)) {
            logger.info(`Pool ${poolAddress} is already being tracked`);
            return;
        }
        try {
            // Validate pool address
            const publicKey = new web3_js_1.PublicKey(poolAddress);
            // Verify this is a valid Meteora pool
            const accountInfo = await this.connection.getAccountInfo(publicKey);
            if (!accountInfo) {
                throw new Error(`Pool account ${poolAddress} not found`);
            }
            if (accountInfo.owner.toString() !== this.config.meteoraProgramId) {
                throw new Error(`Pool ${poolAddress} is not owned by Meteora program ${this.config.meteoraProgramId}`);
            }
            // Add to tracked pools
            this.trackedPools.add(poolAddress);
            // Subscribe to account changes
            const subscriptionId = this.connection.onAccountChange(publicKey, (accountInfo, context) => {
                this.handleAccountChange(poolAddress, accountInfo, context);
            }, this.config.rpcCommitment);
            this.subscriptions.set(poolAddress, subscriptionId);
            // Collect initial data
            await this.collectPoolDataForAddress(poolAddress);
            logger.info(`Started tracking pool ${poolAddress}`);
        }
        catch (error) {
            logger.error(`Failed to track pool ${poolAddress}`, { error });
            throw new Error(`Failed to track pool: ${error.message}`);
        }
    }
    /**
     * Stop tracking a pool
     * @param poolAddress Pool address
     */
    untrackPool(poolAddress) {
        if (!this.trackedPools.has(poolAddress)) {
            logger.info(`Pool ${poolAddress} is not being tracked`);
            return;
        }
        // Unsubscribe from account changes
        const subscriptionId = this.subscriptions.get(poolAddress);
        if (subscriptionId !== undefined) {
            this.connection.removeAccountChangeListener(subscriptionId);
            this.subscriptions.delete(poolAddress);
        }
        this.trackedPools.delete(poolAddress);
        logger.info(`Stopped tracking pool ${poolAddress}`);
    }
    /**
     * Get all tracked pools
     * @returns Array of tracked pool addresses
     */
    getTrackedPools() {
        return Array.from(this.trackedPools);
    }
    /**
     * Collect data for all tracked pools
     */
    async collectPoolData() {
        logger.debug(`Collecting data for ${this.trackedPools.size} pools`);
        const promises = Array.from(this.trackedPools).map(poolAddress => this.collectPoolDataForAddress(poolAddress).catch(error => {
            logger.error(`Error collecting data for pool ${poolAddress}`, { error });
        }));
        await Promise.all(promises);
    }
    /**
     * Collect data for a specific pool
     * @param poolAddress Pool address
     */
    async collectPoolDataForAddress(poolAddress) {
        try {
            const publicKey = new web3_js_1.PublicKey(poolAddress);
            const accountInfo = await this.connection.getAccountInfo(publicKey);
            if (!accountInfo) {
                logger.error(`Pool account ${poolAddress} not found`);
                return;
            }
            // Decode pool data
            const poolData = this.decodePoolData(poolAddress, accountInfo.data);
            if (poolData) {
                // Add timestamp and slot
                const slot = await this.connection.getSlot(this.config.rpcCommitment);
                const blockTime = await this.connection.getBlockTime(slot);
                poolData.timestamp = blockTime || Math.floor(Date.now() / 1000);
                poolData.slot = slot;
                // Emit data
                this.config.onData(poolData);
                logger.debug(`Collected data for pool ${poolAddress}`, {
                    tokenA: poolData.tokenA.mint,
                    tokenB: poolData.tokenB.mint,
                    liquidity: poolData.liquidity.toString(),
                    slot: poolData.slot,
                });
            }
        }
        catch (error) {
            logger.error(`Error collecting data for pool ${poolAddress}`, { error });
            throw error;
        }
    }
    /**
     * Decode pool data from account data
     * @param poolAddress Pool address
     * @param data Account data buffer
     * @returns Decoded pool data or null if decoding fails
     */
    decodePoolData(poolAddress, data) {
        try {
            // This is a simplified implementation
            // In a real implementation, you would need to use a proper decoder
            // that understands the Meteora pool account layout
            // For demonstration purposes, we'll create a mock decoder
            // that extracts some basic information from the buffer
            // In a real implementation, you would use a library like @project-serum/borsh
            // or a custom decoder that understands the Meteora pool account layout
            // Mock implementation - replace with actual decoding logic
            const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
            // Extract token mints (simplified - actual positions would depend on the layout)
            const tokenAMintOffset = 8; // Example offset
            const tokenBMintOffset = 40; // Example offset
            const tokenAMint = new web3_js_1.PublicKey(data.slice(tokenAMintOffset, tokenAMintOffset + 32)).toString();
            const tokenBMint = new web3_js_1.PublicKey(data.slice(tokenBMintOffset, tokenBMintOffset + 32)).toString();
            // Extract other data (simplified - actual positions would depend on the layout)
            const tokenADecimals = data[72]; // Example offset
            const tokenBDecimals = data[73]; // Example offset
            const fee = view.getUint16(74, true) / 10000; // Example offset, assuming fee is stored as basis points
            const tickSpacing = view.getInt16(76, true); // Example offset
            // Extract 128-bit values (simplified)
            const liquidityOffset = 80; // Example offset
            const sqrtPriceOffset = 96; // Example offset
            const tokenAReserveOffset = 112; // Example offset
            const tokenBReserveOffset = 128; // Example offset
            const feeGrowthGlobalAOffset = 144; // Example offset
            const feeGrowthGlobalBOffset = 160; // Example offset
            // Read 128-bit values as two 64-bit values and combine
            const liquidity = this.readBigUint128(view, liquidityOffset);
            const sqrtPrice = this.readBigUint128(view, sqrtPriceOffset);
            const tokenAReserve = this.readBigUint128(view, tokenAReserveOffset);
            const tokenBReserve = this.readBigUint128(view, tokenBReserveOffset);
            const feeGrowthGlobalA = this.readBigUint128(view, feeGrowthGlobalAOffset);
            const feeGrowthGlobalB = this.readBigUint128(view, feeGrowthGlobalBOffset);
            // Current tick (simplified)
            const currentTickOffset = 176; // Example offset
            const currentTick = view.getInt32(currentTickOffset, true);
            return {
                address: poolAddress,
                tokenA: {
                    mint: tokenAMint,
                    decimals: tokenADecimals,
                    reserve: tokenAReserve,
                },
                tokenB: {
                    mint: tokenBMint,
                    decimals: tokenBDecimals,
                    reserve: tokenBReserve,
                },
                fee,
                tickSpacing,
                liquidity,
                sqrtPrice,
                currentTick,
                feeGrowthGlobalA,
                feeGrowthGlobalB,
                timestamp: 0, // Will be filled in later
                slot: 0, // Will be filled in later
            };
        }
        catch (error) {
            logger.error(`Error decoding pool data for ${poolAddress}`, { error });
            return null;
        }
    }
    /**
     * Read a 128-bit unsigned integer from a DataView
     * @param view DataView to read from
     * @param offset Offset to read from
     * @returns 128-bit unsigned integer as a BigInt
     */
    readBigUint128(view, offset) {
        const lo = view.getBigUint64(offset, true);
        const hi = view.getBigUint64(offset + 8, true);
        return (hi << 64n) | lo;
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
        // Decode and emit updated pool data
        const poolData = this.decodePoolData(poolAddress, accountInfo.data);
        if (poolData) {
            // Add timestamp and slot
            poolData.timestamp = Math.floor(Date.now() / 1000);
            poolData.slot = context.slot;
            // Emit data
            this.config.onData(poolData);
            logger.debug(`Updated data for pool ${poolAddress} from account change`, {
                tokenA: poolData.tokenA.mint,
                tokenB: poolData.tokenB.mint,
                liquidity: poolData.liquidity.toString(),
                slot: poolData.slot,
            });
        }
    }
}
exports.PoolDataCollector = PoolDataCollector;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9vbC1kYXRhLWNvbGxlY3Rvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9tb2R1bGVzL2NvbGxlY3RvcnMvcG9vbC1kYXRhLWNvbGxlY3Rvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtREFBa0Q7QUFDbEQsNkNBQWtFO0FBRWxFLE1BQU0sTUFBTSxHQUFHLElBQUEseUJBQVksRUFBQyxrQ0FBa0MsQ0FBQyxDQUFDO0FBd0NoRTs7O0dBR0c7QUFDSCxNQUFhLGlCQUFpQjtJQVE1Qjs7O09BR0c7SUFDSCxZQUFZLE1BQStCO1FBVG5DLGlCQUFZLEdBQTBCLElBQUksQ0FBQztRQUMzQyxjQUFTLEdBQVksS0FBSyxDQUFDO1FBQzNCLGlCQUFZLEdBQWdCLElBQUksR0FBRyxFQUFFLENBQUM7UUFDdEMsa0JBQWEsR0FBd0IsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQU9yRCxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUNyQixJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksb0JBQVUsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUUzRSxNQUFNLENBQUMsSUFBSSxDQUFDLGlDQUFpQyxFQUFFO1lBQzdDLFdBQVcsRUFBRSxNQUFNLENBQUMsV0FBVztZQUMvQixRQUFRLEVBQUUsTUFBTSxDQUFDLFFBQVE7WUFDekIsZ0JBQWdCLEVBQUUsTUFBTSxDQUFDLGdCQUFnQjtTQUMxQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsS0FBSztRQUNULElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ25CLE1BQU0sQ0FBQyxJQUFJLENBQUMsd0NBQXdDLENBQUMsQ0FBQztZQUN0RCxPQUFPO1FBQ1QsQ0FBQztRQUVELE1BQU0sQ0FBQyxJQUFJLENBQUMsOEJBQThCLENBQUMsQ0FBQztRQUU1QyxzQkFBc0I7UUFDdEIsSUFBSSxDQUFDLFlBQVksR0FBRyxXQUFXLENBQUMsR0FBRyxFQUFFO1lBQ25DLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztRQUN6QixDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUV6QiwyQkFBMkI7UUFDM0IsTUFBTSxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7UUFFN0IsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUM7UUFDdEIsTUFBTSxDQUFDLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO0lBQzdDLENBQUM7SUFFRDs7T0FFRztJQUNILElBQUk7UUFDRixJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3BCLE1BQU0sQ0FBQyxJQUFJLENBQUMsb0NBQW9DLENBQUMsQ0FBQztZQUNsRCxPQUFPO1FBQ1QsQ0FBQztRQUVELE1BQU0sQ0FBQyxJQUFJLENBQUMsOEJBQThCLENBQUMsQ0FBQztRQUU1QyxzQkFBc0I7UUFDdEIsSUFBSSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDdEIsYUFBYSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUNqQyxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQztRQUMzQixDQUFDO1FBRUQsK0NBQStDO1FBQy9DLEtBQUssTUFBTSxDQUFDLFdBQVcsRUFBRSxjQUFjLENBQUMsSUFBSSxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUM7WUFDekUsSUFBSSxDQUFDLFVBQVUsQ0FBQywyQkFBMkIsQ0FBQyxjQUFjLENBQUMsQ0FBQztZQUM1RCxNQUFNLENBQUMsSUFBSSxDQUFDLDBCQUEwQixXQUFXLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZELENBQUM7UUFFRCxJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQzNCLElBQUksQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDO1FBQ3ZCLE1BQU0sQ0FBQyxJQUFJLENBQUMsNkJBQTZCLENBQUMsQ0FBQztJQUM3QyxDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsS0FBSyxDQUFDLFNBQVMsQ0FBQyxXQUFtQjtRQUNqQyxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7WUFDdkMsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLFdBQVcsMkJBQTJCLENBQUMsQ0FBQztZQUM1RCxPQUFPO1FBQ1QsQ0FBQztRQUVELElBQUksQ0FBQztZQUNILHdCQUF3QjtZQUN4QixNQUFNLFNBQVMsR0FBRyxJQUFJLG1CQUFTLENBQUMsV0FBVyxDQUFDLENBQUM7WUFFN0Msc0NBQXNDO1lBQ3RDLE1BQU0sV0FBVyxHQUFHLE1BQU0sSUFBSSxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDcEUsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUNqQixNQUFNLElBQUksS0FBSyxDQUFDLGdCQUFnQixXQUFXLFlBQVksQ0FBQyxDQUFDO1lBQzNELENBQUM7WUFFRCxJQUFJLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEtBQUssSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO2dCQUNsRSxNQUFNLElBQUksS0FBSyxDQUNiLFFBQVEsV0FBVyxvQ0FBb0MsSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxDQUN0RixDQUFDO1lBQ0osQ0FBQztZQUVELHVCQUF1QjtZQUN2QixJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUVuQywrQkFBK0I7WUFDL0IsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQ3BELFNBQVMsRUFDVCxDQUFDLFdBQVcsRUFBRSxPQUFPLEVBQUUsRUFBRTtnQkFDdkIsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFdBQVcsRUFBRSxXQUFXLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDOUQsQ0FBQyxFQUNELElBQUksQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUMxQixDQUFDO1lBRUYsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLGNBQWMsQ0FBQyxDQUFDO1lBRXBELHVCQUF1QjtZQUN2QixNQUFNLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUVsRCxNQUFNLENBQUMsSUFBSSxDQUFDLHlCQUF5QixXQUFXLEVBQUUsQ0FBQyxDQUFDO1FBQ3RELENBQUM7UUFBQyxPQUFPLEtBQVUsRUFBRSxDQUFDO1lBQ3BCLE1BQU0sQ0FBQyxLQUFLLENBQUMsd0JBQXdCLFdBQVcsRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztZQUMvRCxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztRQUM1RCxDQUFDO0lBQ0gsQ0FBQztJQUVEOzs7T0FHRztJQUNILFdBQVcsQ0FBQyxXQUFtQjtRQUM3QixJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztZQUN4QyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsV0FBVyx1QkFBdUIsQ0FBQyxDQUFDO1lBQ3hELE9BQU87UUFDVCxDQUFDO1FBRUQsbUNBQW1DO1FBQ25DLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQzNELElBQUksY0FBYyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ2pDLElBQUksQ0FBQyxVQUFVLENBQUMsMkJBQTJCLENBQUMsY0FBYyxDQUFDLENBQUM7WUFDNUQsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDekMsQ0FBQztRQUVELElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ3RDLE1BQU0sQ0FBQyxJQUFJLENBQUMseUJBQXlCLFdBQVcsRUFBRSxDQUFDLENBQUM7SUFDdEQsQ0FBQztJQUVEOzs7T0FHRztJQUNILGVBQWU7UUFDYixPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQ3ZDLENBQUM7SUFFRDs7T0FFRztJQUNLLEtBQUssQ0FBQyxlQUFlO1FBQzNCLE1BQU0sQ0FBQyxLQUFLLENBQUMsdUJBQXVCLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQztRQUVwRSxNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FDL0QsSUFBSSxDQUFDLHlCQUF5QixDQUFDLFdBQVcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRTtZQUN4RCxNQUFNLENBQUMsS0FBSyxDQUFDLGtDQUFrQyxXQUFXLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7UUFDM0UsQ0FBQyxDQUFDLENBQ0gsQ0FBQztRQUVGLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUM5QixDQUFDO0lBRUQ7OztPQUdHO0lBQ0ssS0FBSyxDQUFDLHlCQUF5QixDQUFDLFdBQW1CO1FBQ3pELElBQUksQ0FBQztZQUNILE1BQU0sU0FBUyxHQUFHLElBQUksbUJBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUM3QyxNQUFNLFdBQVcsR0FBRyxNQUFNLElBQUksQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBRXBFLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztnQkFDakIsTUFBTSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsV0FBVyxZQUFZLENBQUMsQ0FBQztnQkFDdEQsT0FBTztZQUNULENBQUM7WUFFRCxtQkFBbUI7WUFDbkIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxXQUFXLEVBQUUsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBRXBFLElBQUksUUFBUSxFQUFFLENBQUM7Z0JBQ2IseUJBQXlCO2dCQUN6QixNQUFNLElBQUksR0FBRyxNQUFNLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUM7Z0JBQ3RFLE1BQU0sU0FBUyxHQUFHLE1BQU0sSUFBSSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBRTNELFFBQVEsQ0FBQyxTQUFTLEdBQUcsU0FBUyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO2dCQUNoRSxRQUFRLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztnQkFFckIsWUFBWTtnQkFDWixJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFFN0IsTUFBTSxDQUFDLEtBQUssQ0FBQywyQkFBMkIsV0FBVyxFQUFFLEVBQUU7b0JBQ3JELE1BQU0sRUFBRSxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUk7b0JBQzVCLE1BQU0sRUFBRSxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUk7b0JBQzVCLFNBQVMsRUFBRSxRQUFRLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRTtvQkFDeEMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxJQUFJO2lCQUNwQixDQUFDLENBQUM7WUFDTCxDQUFDO1FBQ0gsQ0FBQztRQUFDLE9BQU8sS0FBVSxFQUFFLENBQUM7WUFDcEIsTUFBTSxDQUFDLEtBQUssQ0FBQyxrQ0FBa0MsV0FBVyxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1lBQ3pFLE1BQU0sS0FBSyxDQUFDO1FBQ2QsQ0FBQztJQUNILENBQUM7SUFFRDs7Ozs7T0FLRztJQUNLLGNBQWMsQ0FBQyxXQUFtQixFQUFFLElBQVk7UUFDdEQsSUFBSSxDQUFDO1lBQ0gsc0NBQXNDO1lBQ3RDLG1FQUFtRTtZQUNuRSxtREFBbUQ7WUFFbkQsMERBQTBEO1lBQzFELHVEQUF1RDtZQUV2RCw4RUFBOEU7WUFDOUUsdUVBQXVFO1lBRXZFLDJEQUEyRDtZQUMzRCxNQUFNLElBQUksR0FBRyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBRXpFLGlGQUFpRjtZQUNqRixNQUFNLGdCQUFnQixHQUFHLENBQUMsQ0FBQyxDQUFDLGlCQUFpQjtZQUM3QyxNQUFNLGdCQUFnQixHQUFHLEVBQUUsQ0FBQyxDQUFDLGlCQUFpQjtZQUU5QyxNQUFNLFVBQVUsR0FBRyxJQUFJLG1CQUFTLENBQzlCLElBQUksQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsZ0JBQWdCLEdBQUcsRUFBRSxDQUFDLENBQ3BELENBQUMsUUFBUSxFQUFFLENBQUM7WUFDYixNQUFNLFVBQVUsR0FBRyxJQUFJLG1CQUFTLENBQzlCLElBQUksQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsZ0JBQWdCLEdBQUcsRUFBRSxDQUFDLENBQ3BELENBQUMsUUFBUSxFQUFFLENBQUM7WUFFYixnRkFBZ0Y7WUFDaEYsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsaUJBQWlCO1lBQ2xELE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLGlCQUFpQjtZQUNsRCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyx5REFBeUQ7WUFDdkcsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxpQkFBaUI7WUFFOUQsc0NBQXNDO1lBQ3RDLE1BQU0sZUFBZSxHQUFHLEVBQUUsQ0FBQyxDQUFDLGlCQUFpQjtZQUM3QyxNQUFNLGVBQWUsR0FBRyxFQUFFLENBQUMsQ0FBQyxpQkFBaUI7WUFDN0MsTUFBTSxtQkFBbUIsR0FBRyxHQUFHLENBQUMsQ0FBQyxpQkFBaUI7WUFDbEQsTUFBTSxtQkFBbUIsR0FBRyxHQUFHLENBQUMsQ0FBQyxpQkFBaUI7WUFDbEQsTUFBTSxzQkFBc0IsR0FBRyxHQUFHLENBQUMsQ0FBQyxpQkFBaUI7WUFDckQsTUFBTSxzQkFBc0IsR0FBRyxHQUFHLENBQUMsQ0FBQyxpQkFBaUI7WUFFckQsdURBQXVEO1lBQ3ZELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLGVBQWUsQ0FBQyxDQUFDO1lBQzdELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLGVBQWUsQ0FBQyxDQUFDO1lBQzdELE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLG1CQUFtQixDQUFDLENBQUM7WUFDckUsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztZQUNyRSxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLHNCQUFzQixDQUFDLENBQUM7WUFDM0UsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxzQkFBc0IsQ0FBQyxDQUFDO1lBRTNFLDRCQUE0QjtZQUM1QixNQUFNLGlCQUFpQixHQUFHLEdBQUcsQ0FBQyxDQUFDLGlCQUFpQjtZQUNoRCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGlCQUFpQixFQUFFLElBQUksQ0FBQyxDQUFDO1lBRTNELE9BQU87Z0JBQ0wsT0FBTyxFQUFFLFdBQVc7Z0JBQ3BCLE1BQU0sRUFBRTtvQkFDTixJQUFJLEVBQUUsVUFBVTtvQkFDaEIsUUFBUSxFQUFFLGNBQWM7b0JBQ3hCLE9BQU8sRUFBRSxhQUFhO2lCQUN2QjtnQkFDRCxNQUFNLEVBQUU7b0JBQ04sSUFBSSxFQUFFLFVBQVU7b0JBQ2hCLFFBQVEsRUFBRSxjQUFjO29CQUN4QixPQUFPLEVBQUUsYUFBYTtpQkFDdkI7Z0JBQ0QsR0FBRztnQkFDSCxXQUFXO2dCQUNYLFNBQVM7Z0JBQ1QsU0FBUztnQkFDVCxXQUFXO2dCQUNYLGdCQUFnQjtnQkFDaEIsZ0JBQWdCO2dCQUNoQixTQUFTLEVBQUUsQ0FBQyxFQUFFLDBCQUEwQjtnQkFDeEMsSUFBSSxFQUFFLENBQUMsRUFBRSwwQkFBMEI7YUFDcEMsQ0FBQztRQUNKLENBQUM7UUFBQyxPQUFPLEtBQVUsRUFBRSxDQUFDO1lBQ3BCLE1BQU0sQ0FBQyxLQUFLLENBQUMsZ0NBQWdDLFdBQVcsRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztZQUN2RSxPQUFPLElBQUksQ0FBQztRQUNkLENBQUM7SUFDSCxDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSyxjQUFjLENBQUMsSUFBYyxFQUFFLE1BQWM7UUFDbkQsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDM0MsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQy9DLE9BQU8sQ0FBQyxFQUFFLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBQzFCLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNLLG1CQUFtQixDQUFDLFdBQW1CLEVBQUUsV0FBZ0IsRUFBRSxPQUFZO1FBQzdFLE1BQU0sQ0FBQyxLQUFLLENBQUMsb0NBQW9DLFdBQVcsRUFBRSxFQUFFO1lBQzlELElBQUksRUFBRSxPQUFPLENBQUMsSUFBSTtTQUNuQixDQUFDLENBQUM7UUFFSCxvQ0FBb0M7UUFDcEMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxXQUFXLEVBQUUsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRXBFLElBQUksUUFBUSxFQUFFLENBQUM7WUFDYix5QkFBeUI7WUFDekIsUUFBUSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQztZQUNuRCxRQUFRLENBQUMsSUFBSSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUM7WUFFN0IsWUFBWTtZQUNaLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBRTdCLE1BQU0sQ0FBQyxLQUFLLENBQUMseUJBQXlCLFdBQVcsc0JBQXNCLEVBQUU7Z0JBQ3ZFLE1BQU0sRUFBRSxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUk7Z0JBQzVCLE1BQU0sRUFBRSxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUk7Z0JBQzVCLFNBQVMsRUFBRSxRQUFRLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRTtnQkFDeEMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxJQUFJO2FBQ3BCLENBQUMsQ0FBQztRQUNMLENBQUM7SUFDSCxDQUFDO0NBQ0Y7QUFqVkQsOENBaVZDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgY3JlYXRlTG9nZ2VyIH0gZnJvbSAnQGxpcXByby9tb25pdG9yaW5nJztcbmltcG9ydCB7IENvbm5lY3Rpb24sIFB1YmxpY0tleSwgRmluYWxpdHkgfSBmcm9tICdAc29sYW5hL3dlYjMuanMnO1xuXG5jb25zdCBsb2dnZXIgPSBjcmVhdGVMb2dnZXIoJ2RhdGEtc2VydmljZTpwb29sLWRhdGEtY29sbGVjdG9yJyk7XG5cbi8qKlxuICogUG9vbCBkYXRhIHN0cnVjdHVyZVxuICovXG5leHBvcnQgaW50ZXJmYWNlIFBvb2xEYXRhIHtcbiAgYWRkcmVzczogc3RyaW5nO1xuICB0b2tlbkE6IHtcbiAgICBtaW50OiBzdHJpbmc7XG4gICAgZGVjaW1hbHM6IG51bWJlcjtcbiAgICByZXNlcnZlOiBiaWdpbnQ7XG4gIH07XG4gIHRva2VuQjoge1xuICAgIG1pbnQ6IHN0cmluZztcbiAgICBkZWNpbWFsczogbnVtYmVyO1xuICAgIHJlc2VydmU6IGJpZ2ludDtcbiAgfTtcbiAgZmVlOiBudW1iZXI7XG4gIHRpY2tTcGFjaW5nOiBudW1iZXI7XG4gIGxpcXVpZGl0eTogYmlnaW50O1xuICBzcXJ0UHJpY2U6IGJpZ2ludDtcbiAgY3VycmVudFRpY2s6IG51bWJlcjtcbiAgZmVlR3Jvd3RoR2xvYmFsQTogYmlnaW50O1xuICBmZWVHcm93dGhHbG9iYWxCOiBiaWdpbnQ7XG4gIHRpbWVzdGFtcDogbnVtYmVyO1xuICBzbG90OiBudW1iZXI7XG59XG5cbi8qKlxuICogQ29uZmlndXJhdGlvbiBmb3IgdGhlIFBvb2xEYXRhQ29sbGVjdG9yXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUG9vbERhdGFDb2xsZWN0b3JDb25maWcge1xuICBycGNFbmRwb2ludDogc3RyaW5nO1xuICBycGNCYWNrdXBFbmRwb2ludD86IHN0cmluZztcbiAgcnBjQ29tbWl0bWVudDogRmluYWxpdHk7XG4gIGludGVydmFsOiBudW1iZXI7XG4gIG9uRGF0YTogKGRhdGE6IFBvb2xEYXRhKSA9PiB2b2lkO1xuICBtZXRlb3JhUHJvZ3JhbUlkOiBzdHJpbmc7XG59XG5cbi8qKlxuICogUG9vbCBEYXRhIENvbGxlY3RvclxuICogUmVzcG9uc2libGUgZm9yIGNvbGxlY3RpbmcgZGF0YSBmcm9tIGxpcXVpZGl0eSBwb29sc1xuICovXG5leHBvcnQgY2xhc3MgUG9vbERhdGFDb2xsZWN0b3Ige1xuICBwcml2YXRlIGNvbm5lY3Rpb246IENvbm5lY3Rpb247XG4gIHByaXZhdGUgY29uZmlnOiBQb29sRGF0YUNvbGxlY3RvckNvbmZpZztcbiAgcHJpdmF0ZSBwb2xsaW5nVGltZXI6IE5vZGVKUy5UaW1lb3V0IHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgaXNSdW5uaW5nOiBib29sZWFuID0gZmFsc2U7XG4gIHByaXZhdGUgdHJhY2tlZFBvb2xzOiBTZXQ8c3RyaW5nPiA9IG5ldyBTZXQoKTtcbiAgcHJpdmF0ZSBzdWJzY3JpcHRpb25zOiBNYXA8c3RyaW5nLCBudW1iZXI+ID0gbmV3IE1hcCgpO1xuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSBuZXcgUG9vbCBEYXRhIENvbGxlY3RvclxuICAgKiBAcGFyYW0gY29uZmlnIENvbGxlY3RvciBjb25maWd1cmF0aW9uXG4gICAqL1xuICBjb25zdHJ1Y3Rvcihjb25maWc6IFBvb2xEYXRhQ29sbGVjdG9yQ29uZmlnKSB7XG4gICAgdGhpcy5jb25maWcgPSBjb25maWc7XG4gICAgdGhpcy5jb25uZWN0aW9uID0gbmV3IENvbm5lY3Rpb24oY29uZmlnLnJwY0VuZHBvaW50LCBjb25maWcucnBjQ29tbWl0bWVudCk7XG5cbiAgICBsb2dnZXIuaW5mbygnUG9vbCBEYXRhIENvbGxlY3RvciBpbml0aWFsaXplZCcsIHtcbiAgICAgIHJwY0VuZHBvaW50OiBjb25maWcucnBjRW5kcG9pbnQsXG4gICAgICBpbnRlcnZhbDogY29uZmlnLmludGVydmFsLFxuICAgICAgbWV0ZW9yYVByb2dyYW1JZDogY29uZmlnLm1ldGVvcmFQcm9ncmFtSWQsXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogU3RhcnQgY29sbGVjdGluZyBwb29sIGRhdGFcbiAgICovXG4gIGFzeW5jIHN0YXJ0KCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICh0aGlzLmlzUnVubmluZykge1xuICAgICAgbG9nZ2VyLmluZm8oJ1Bvb2wgRGF0YSBDb2xsZWN0b3IgaXMgYWxyZWFkeSBydW5uaW5nJyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgbG9nZ2VyLmluZm8oJ1N0YXJ0aW5nIFBvb2wgRGF0YSBDb2xsZWN0b3InKTtcblxuICAgIC8vIFN0YXJ0IHBvbGxpbmcgdGltZXJcbiAgICB0aGlzLnBvbGxpbmdUaW1lciA9IHNldEludGVydmFsKCgpID0+IHtcbiAgICAgIHRoaXMuY29sbGVjdFBvb2xEYXRhKCk7XG4gICAgfSwgdGhpcy5jb25maWcuaW50ZXJ2YWwpO1xuXG4gICAgLy8gQ29sbGVjdCBkYXRhIGltbWVkaWF0ZWx5XG4gICAgYXdhaXQgdGhpcy5jb2xsZWN0UG9vbERhdGEoKTtcblxuICAgIHRoaXMuaXNSdW5uaW5nID0gdHJ1ZTtcbiAgICBsb2dnZXIuaW5mbygnUG9vbCBEYXRhIENvbGxlY3RvciBzdGFydGVkJyk7XG4gIH1cblxuICAvKipcbiAgICogU3RvcCBjb2xsZWN0aW5nIHBvb2wgZGF0YVxuICAgKi9cbiAgc3RvcCgpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuaXNSdW5uaW5nKSB7XG4gICAgICBsb2dnZXIuaW5mbygnUG9vbCBEYXRhIENvbGxlY3RvciBpcyBub3QgcnVubmluZycpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGxvZ2dlci5pbmZvKCdTdG9wcGluZyBQb29sIERhdGEgQ29sbGVjdG9yJyk7XG5cbiAgICAvLyBDbGVhciBwb2xsaW5nIHRpbWVyXG4gICAgaWYgKHRoaXMucG9sbGluZ1RpbWVyKSB7XG4gICAgICBjbGVhckludGVydmFsKHRoaXMucG9sbGluZ1RpbWVyKTtcbiAgICAgIHRoaXMucG9sbGluZ1RpbWVyID0gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBVbnN1YnNjcmliZSBmcm9tIGFsbCBXZWJTb2NrZXQgc3Vic2NyaXB0aW9uc1xuICAgIGZvciAoY29uc3QgW3Bvb2xBZGRyZXNzLCBzdWJzY3JpcHRpb25JZF0gb2YgdGhpcy5zdWJzY3JpcHRpb25zLmVudHJpZXMoKSkge1xuICAgICAgdGhpcy5jb25uZWN0aW9uLnJlbW92ZUFjY291bnRDaGFuZ2VMaXN0ZW5lcihzdWJzY3JpcHRpb25JZCk7XG4gICAgICBsb2dnZXIuaW5mbyhgVW5zdWJzY3JpYmVkIGZyb20gcG9vbCAke3Bvb2xBZGRyZXNzfWApO1xuICAgIH1cblxuICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5jbGVhcigpO1xuICAgIHRoaXMuaXNSdW5uaW5nID0gZmFsc2U7XG4gICAgbG9nZ2VyLmluZm8oJ1Bvb2wgRGF0YSBDb2xsZWN0b3Igc3RvcHBlZCcpO1xuICB9XG5cbiAgLyoqXG4gICAqIFRyYWNrIGEgcG9vbCBmb3IgZGF0YSBjb2xsZWN0aW9uXG4gICAqIEBwYXJhbSBwb29sQWRkcmVzcyBQb29sIGFkZHJlc3NcbiAgICovXG4gIGFzeW5jIHRyYWNrUG9vbChwb29sQWRkcmVzczogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKHRoaXMudHJhY2tlZFBvb2xzLmhhcyhwb29sQWRkcmVzcykpIHtcbiAgICAgIGxvZ2dlci5pbmZvKGBQb29sICR7cG9vbEFkZHJlc3N9IGlzIGFscmVhZHkgYmVpbmcgdHJhY2tlZGApO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICAvLyBWYWxpZGF0ZSBwb29sIGFkZHJlc3NcbiAgICAgIGNvbnN0IHB1YmxpY0tleSA9IG5ldyBQdWJsaWNLZXkocG9vbEFkZHJlc3MpO1xuXG4gICAgICAvLyBWZXJpZnkgdGhpcyBpcyBhIHZhbGlkIE1ldGVvcmEgcG9vbFxuICAgICAgY29uc3QgYWNjb3VudEluZm8gPSBhd2FpdCB0aGlzLmNvbm5lY3Rpb24uZ2V0QWNjb3VudEluZm8ocHVibGljS2V5KTtcbiAgICAgIGlmICghYWNjb3VudEluZm8pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBQb29sIGFjY291bnQgJHtwb29sQWRkcmVzc30gbm90IGZvdW5kYCk7XG4gICAgICB9XG5cbiAgICAgIGlmIChhY2NvdW50SW5mby5vd25lci50b1N0cmluZygpICE9PSB0aGlzLmNvbmZpZy5tZXRlb3JhUHJvZ3JhbUlkKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgUG9vbCAke3Bvb2xBZGRyZXNzfSBpcyBub3Qgb3duZWQgYnkgTWV0ZW9yYSBwcm9ncmFtICR7dGhpcy5jb25maWcubWV0ZW9yYVByb2dyYW1JZH1gXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIC8vIEFkZCB0byB0cmFja2VkIHBvb2xzXG4gICAgICB0aGlzLnRyYWNrZWRQb29scy5hZGQocG9vbEFkZHJlc3MpO1xuXG4gICAgICAvLyBTdWJzY3JpYmUgdG8gYWNjb3VudCBjaGFuZ2VzXG4gICAgICBjb25zdCBzdWJzY3JpcHRpb25JZCA9IHRoaXMuY29ubmVjdGlvbi5vbkFjY291bnRDaGFuZ2UoXG4gICAgICAgIHB1YmxpY0tleSxcbiAgICAgICAgKGFjY291bnRJbmZvLCBjb250ZXh0KSA9PiB7XG4gICAgICAgICAgdGhpcy5oYW5kbGVBY2NvdW50Q2hhbmdlKHBvb2xBZGRyZXNzLCBhY2NvdW50SW5mbywgY29udGV4dCk7XG4gICAgICAgIH0sXG4gICAgICAgIHRoaXMuY29uZmlnLnJwY0NvbW1pdG1lbnRcbiAgICAgICk7XG5cbiAgICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5zZXQocG9vbEFkZHJlc3MsIHN1YnNjcmlwdGlvbklkKTtcblxuICAgICAgLy8gQ29sbGVjdCBpbml0aWFsIGRhdGFcbiAgICAgIGF3YWl0IHRoaXMuY29sbGVjdFBvb2xEYXRhRm9yQWRkcmVzcyhwb29sQWRkcmVzcyk7XG5cbiAgICAgIGxvZ2dlci5pbmZvKGBTdGFydGVkIHRyYWNraW5nIHBvb2wgJHtwb29sQWRkcmVzc31gKTtcbiAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICBsb2dnZXIuZXJyb3IoYEZhaWxlZCB0byB0cmFjayBwb29sICR7cG9vbEFkZHJlc3N9YCwgeyBlcnJvciB9KTtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIHRyYWNrIHBvb2w6ICR7ZXJyb3IubWVzc2FnZX1gKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU3RvcCB0cmFja2luZyBhIHBvb2xcbiAgICogQHBhcmFtIHBvb2xBZGRyZXNzIFBvb2wgYWRkcmVzc1xuICAgKi9cbiAgdW50cmFja1Bvb2wocG9vbEFkZHJlc3M6IHN0cmluZyk6IHZvaWQge1xuICAgIGlmICghdGhpcy50cmFja2VkUG9vbHMuaGFzKHBvb2xBZGRyZXNzKSkge1xuICAgICAgbG9nZ2VyLmluZm8oYFBvb2wgJHtwb29sQWRkcmVzc30gaXMgbm90IGJlaW5nIHRyYWNrZWRgKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBVbnN1YnNjcmliZSBmcm9tIGFjY291bnQgY2hhbmdlc1xuICAgIGNvbnN0IHN1YnNjcmlwdGlvbklkID0gdGhpcy5zdWJzY3JpcHRpb25zLmdldChwb29sQWRkcmVzcyk7XG4gICAgaWYgKHN1YnNjcmlwdGlvbklkICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuY29ubmVjdGlvbi5yZW1vdmVBY2NvdW50Q2hhbmdlTGlzdGVuZXIoc3Vic2NyaXB0aW9uSWQpO1xuICAgICAgdGhpcy5zdWJzY3JpcHRpb25zLmRlbGV0ZShwb29sQWRkcmVzcyk7XG4gICAgfVxuXG4gICAgdGhpcy50cmFja2VkUG9vbHMuZGVsZXRlKHBvb2xBZGRyZXNzKTtcbiAgICBsb2dnZXIuaW5mbyhgU3RvcHBlZCB0cmFja2luZyBwb29sICR7cG9vbEFkZHJlc3N9YCk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IGFsbCB0cmFja2VkIHBvb2xzXG4gICAqIEByZXR1cm5zIEFycmF5IG9mIHRyYWNrZWQgcG9vbCBhZGRyZXNzZXNcbiAgICovXG4gIGdldFRyYWNrZWRQb29scygpOiBzdHJpbmdbXSB7XG4gICAgcmV0dXJuIEFycmF5LmZyb20odGhpcy50cmFja2VkUG9vbHMpO1xuICB9XG5cbiAgLyoqXG4gICAqIENvbGxlY3QgZGF0YSBmb3IgYWxsIHRyYWNrZWQgcG9vbHNcbiAgICovXG4gIHByaXZhdGUgYXN5bmMgY29sbGVjdFBvb2xEYXRhKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGxvZ2dlci5kZWJ1ZyhgQ29sbGVjdGluZyBkYXRhIGZvciAke3RoaXMudHJhY2tlZFBvb2xzLnNpemV9IHBvb2xzYCk7XG5cbiAgICBjb25zdCBwcm9taXNlcyA9IEFycmF5LmZyb20odGhpcy50cmFja2VkUG9vbHMpLm1hcChwb29sQWRkcmVzcyA9PlxuICAgICAgdGhpcy5jb2xsZWN0UG9vbERhdGFGb3JBZGRyZXNzKHBvb2xBZGRyZXNzKS5jYXRjaChlcnJvciA9PiB7XG4gICAgICAgIGxvZ2dlci5lcnJvcihgRXJyb3IgY29sbGVjdGluZyBkYXRhIGZvciBwb29sICR7cG9vbEFkZHJlc3N9YCwgeyBlcnJvciB9KTtcbiAgICAgIH0pXG4gICAgKTtcblxuICAgIGF3YWl0IFByb21pc2UuYWxsKHByb21pc2VzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb2xsZWN0IGRhdGEgZm9yIGEgc3BlY2lmaWMgcG9vbFxuICAgKiBAcGFyYW0gcG9vbEFkZHJlc3MgUG9vbCBhZGRyZXNzXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIGNvbGxlY3RQb29sRGF0YUZvckFkZHJlc3MocG9vbEFkZHJlc3M6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBwdWJsaWNLZXkgPSBuZXcgUHVibGljS2V5KHBvb2xBZGRyZXNzKTtcbiAgICAgIGNvbnN0IGFjY291bnRJbmZvID0gYXdhaXQgdGhpcy5jb25uZWN0aW9uLmdldEFjY291bnRJbmZvKHB1YmxpY0tleSk7XG5cbiAgICAgIGlmICghYWNjb3VudEluZm8pIHtcbiAgICAgICAgbG9nZ2VyLmVycm9yKGBQb29sIGFjY291bnQgJHtwb29sQWRkcmVzc30gbm90IGZvdW5kYCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gRGVjb2RlIHBvb2wgZGF0YVxuICAgICAgY29uc3QgcG9vbERhdGEgPSB0aGlzLmRlY29kZVBvb2xEYXRhKHBvb2xBZGRyZXNzLCBhY2NvdW50SW5mby5kYXRhKTtcblxuICAgICAgaWYgKHBvb2xEYXRhKSB7XG4gICAgICAgIC8vIEFkZCB0aW1lc3RhbXAgYW5kIHNsb3RcbiAgICAgICAgY29uc3Qgc2xvdCA9IGF3YWl0IHRoaXMuY29ubmVjdGlvbi5nZXRTbG90KHRoaXMuY29uZmlnLnJwY0NvbW1pdG1lbnQpO1xuICAgICAgICBjb25zdCBibG9ja1RpbWUgPSBhd2FpdCB0aGlzLmNvbm5lY3Rpb24uZ2V0QmxvY2tUaW1lKHNsb3QpO1xuXG4gICAgICAgIHBvb2xEYXRhLnRpbWVzdGFtcCA9IGJsb2NrVGltZSB8fCBNYXRoLmZsb29yKERhdGUubm93KCkgLyAxMDAwKTtcbiAgICAgICAgcG9vbERhdGEuc2xvdCA9IHNsb3Q7XG5cbiAgICAgICAgLy8gRW1pdCBkYXRhXG4gICAgICAgIHRoaXMuY29uZmlnLm9uRGF0YShwb29sRGF0YSk7XG5cbiAgICAgICAgbG9nZ2VyLmRlYnVnKGBDb2xsZWN0ZWQgZGF0YSBmb3IgcG9vbCAke3Bvb2xBZGRyZXNzfWAsIHtcbiAgICAgICAgICB0b2tlbkE6IHBvb2xEYXRhLnRva2VuQS5taW50LFxuICAgICAgICAgIHRva2VuQjogcG9vbERhdGEudG9rZW5CLm1pbnQsXG4gICAgICAgICAgbGlxdWlkaXR5OiBwb29sRGF0YS5saXF1aWRpdHkudG9TdHJpbmcoKSxcbiAgICAgICAgICBzbG90OiBwb29sRGF0YS5zbG90LFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICBsb2dnZXIuZXJyb3IoYEVycm9yIGNvbGxlY3RpbmcgZGF0YSBmb3IgcG9vbCAke3Bvb2xBZGRyZXNzfWAsIHsgZXJyb3IgfSk7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRGVjb2RlIHBvb2wgZGF0YSBmcm9tIGFjY291bnQgZGF0YVxuICAgKiBAcGFyYW0gcG9vbEFkZHJlc3MgUG9vbCBhZGRyZXNzXG4gICAqIEBwYXJhbSBkYXRhIEFjY291bnQgZGF0YSBidWZmZXJcbiAgICogQHJldHVybnMgRGVjb2RlZCBwb29sIGRhdGEgb3IgbnVsbCBpZiBkZWNvZGluZyBmYWlsc1xuICAgKi9cbiAgcHJpdmF0ZSBkZWNvZGVQb29sRGF0YShwb29sQWRkcmVzczogc3RyaW5nLCBkYXRhOiBCdWZmZXIpOiBQb29sRGF0YSB8IG51bGwge1xuICAgIHRyeSB7XG4gICAgICAvLyBUaGlzIGlzIGEgc2ltcGxpZmllZCBpbXBsZW1lbnRhdGlvblxuICAgICAgLy8gSW4gYSByZWFsIGltcGxlbWVudGF0aW9uLCB5b3Ugd291bGQgbmVlZCB0byB1c2UgYSBwcm9wZXIgZGVjb2RlclxuICAgICAgLy8gdGhhdCB1bmRlcnN0YW5kcyB0aGUgTWV0ZW9yYSBwb29sIGFjY291bnQgbGF5b3V0XG5cbiAgICAgIC8vIEZvciBkZW1vbnN0cmF0aW9uIHB1cnBvc2VzLCB3ZSdsbCBjcmVhdGUgYSBtb2NrIGRlY29kZXJcbiAgICAgIC8vIHRoYXQgZXh0cmFjdHMgc29tZSBiYXNpYyBpbmZvcm1hdGlvbiBmcm9tIHRoZSBidWZmZXJcblxuICAgICAgLy8gSW4gYSByZWFsIGltcGxlbWVudGF0aW9uLCB5b3Ugd291bGQgdXNlIGEgbGlicmFyeSBsaWtlIEBwcm9qZWN0LXNlcnVtL2JvcnNoXG4gICAgICAvLyBvciBhIGN1c3RvbSBkZWNvZGVyIHRoYXQgdW5kZXJzdGFuZHMgdGhlIE1ldGVvcmEgcG9vbCBhY2NvdW50IGxheW91dFxuXG4gICAgICAvLyBNb2NrIGltcGxlbWVudGF0aW9uIC0gcmVwbGFjZSB3aXRoIGFjdHVhbCBkZWNvZGluZyBsb2dpY1xuICAgICAgY29uc3QgdmlldyA9IG5ldyBEYXRhVmlldyhkYXRhLmJ1ZmZlciwgZGF0YS5ieXRlT2Zmc2V0LCBkYXRhLmJ5dGVMZW5ndGgpO1xuXG4gICAgICAvLyBFeHRyYWN0IHRva2VuIG1pbnRzIChzaW1wbGlmaWVkIC0gYWN0dWFsIHBvc2l0aW9ucyB3b3VsZCBkZXBlbmQgb24gdGhlIGxheW91dClcbiAgICAgIGNvbnN0IHRva2VuQU1pbnRPZmZzZXQgPSA4OyAvLyBFeGFtcGxlIG9mZnNldFxuICAgICAgY29uc3QgdG9rZW5CTWludE9mZnNldCA9IDQwOyAvLyBFeGFtcGxlIG9mZnNldFxuXG4gICAgICBjb25zdCB0b2tlbkFNaW50ID0gbmV3IFB1YmxpY0tleShcbiAgICAgICAgZGF0YS5zbGljZSh0b2tlbkFNaW50T2Zmc2V0LCB0b2tlbkFNaW50T2Zmc2V0ICsgMzIpXG4gICAgICApLnRvU3RyaW5nKCk7XG4gICAgICBjb25zdCB0b2tlbkJNaW50ID0gbmV3IFB1YmxpY0tleShcbiAgICAgICAgZGF0YS5zbGljZSh0b2tlbkJNaW50T2Zmc2V0LCB0b2tlbkJNaW50T2Zmc2V0ICsgMzIpXG4gICAgICApLnRvU3RyaW5nKCk7XG5cbiAgICAgIC8vIEV4dHJhY3Qgb3RoZXIgZGF0YSAoc2ltcGxpZmllZCAtIGFjdHVhbCBwb3NpdGlvbnMgd291bGQgZGVwZW5kIG9uIHRoZSBsYXlvdXQpXG4gICAgICBjb25zdCB0b2tlbkFEZWNpbWFscyA9IGRhdGFbNzJdOyAvLyBFeGFtcGxlIG9mZnNldFxuICAgICAgY29uc3QgdG9rZW5CRGVjaW1hbHMgPSBkYXRhWzczXTsgLy8gRXhhbXBsZSBvZmZzZXRcbiAgICAgIGNvbnN0IGZlZSA9IHZpZXcuZ2V0VWludDE2KDc0LCB0cnVlKSAvIDEwMDAwOyAvLyBFeGFtcGxlIG9mZnNldCwgYXNzdW1pbmcgZmVlIGlzIHN0b3JlZCBhcyBiYXNpcyBwb2ludHNcbiAgICAgIGNvbnN0IHRpY2tTcGFjaW5nID0gdmlldy5nZXRJbnQxNig3NiwgdHJ1ZSk7IC8vIEV4YW1wbGUgb2Zmc2V0XG5cbiAgICAgIC8vIEV4dHJhY3QgMTI4LWJpdCB2YWx1ZXMgKHNpbXBsaWZpZWQpXG4gICAgICBjb25zdCBsaXF1aWRpdHlPZmZzZXQgPSA4MDsgLy8gRXhhbXBsZSBvZmZzZXRcbiAgICAgIGNvbnN0IHNxcnRQcmljZU9mZnNldCA9IDk2OyAvLyBFeGFtcGxlIG9mZnNldFxuICAgICAgY29uc3QgdG9rZW5BUmVzZXJ2ZU9mZnNldCA9IDExMjsgLy8gRXhhbXBsZSBvZmZzZXRcbiAgICAgIGNvbnN0IHRva2VuQlJlc2VydmVPZmZzZXQgPSAxMjg7IC8vIEV4YW1wbGUgb2Zmc2V0XG4gICAgICBjb25zdCBmZWVHcm93dGhHbG9iYWxBT2Zmc2V0ID0gMTQ0OyAvLyBFeGFtcGxlIG9mZnNldFxuICAgICAgY29uc3QgZmVlR3Jvd3RoR2xvYmFsQk9mZnNldCA9IDE2MDsgLy8gRXhhbXBsZSBvZmZzZXRcblxuICAgICAgLy8gUmVhZCAxMjgtYml0IHZhbHVlcyBhcyB0d28gNjQtYml0IHZhbHVlcyBhbmQgY29tYmluZVxuICAgICAgY29uc3QgbGlxdWlkaXR5ID0gdGhpcy5yZWFkQmlnVWludDEyOCh2aWV3LCBsaXF1aWRpdHlPZmZzZXQpO1xuICAgICAgY29uc3Qgc3FydFByaWNlID0gdGhpcy5yZWFkQmlnVWludDEyOCh2aWV3LCBzcXJ0UHJpY2VPZmZzZXQpO1xuICAgICAgY29uc3QgdG9rZW5BUmVzZXJ2ZSA9IHRoaXMucmVhZEJpZ1VpbnQxMjgodmlldywgdG9rZW5BUmVzZXJ2ZU9mZnNldCk7XG4gICAgICBjb25zdCB0b2tlbkJSZXNlcnZlID0gdGhpcy5yZWFkQmlnVWludDEyOCh2aWV3LCB0b2tlbkJSZXNlcnZlT2Zmc2V0KTtcbiAgICAgIGNvbnN0IGZlZUdyb3d0aEdsb2JhbEEgPSB0aGlzLnJlYWRCaWdVaW50MTI4KHZpZXcsIGZlZUdyb3d0aEdsb2JhbEFPZmZzZXQpO1xuICAgICAgY29uc3QgZmVlR3Jvd3RoR2xvYmFsQiA9IHRoaXMucmVhZEJpZ1VpbnQxMjgodmlldywgZmVlR3Jvd3RoR2xvYmFsQk9mZnNldCk7XG5cbiAgICAgIC8vIEN1cnJlbnQgdGljayAoc2ltcGxpZmllZClcbiAgICAgIGNvbnN0IGN1cnJlbnRUaWNrT2Zmc2V0ID0gMTc2OyAvLyBFeGFtcGxlIG9mZnNldFxuICAgICAgY29uc3QgY3VycmVudFRpY2sgPSB2aWV3LmdldEludDMyKGN1cnJlbnRUaWNrT2Zmc2V0LCB0cnVlKTtcblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgYWRkcmVzczogcG9vbEFkZHJlc3MsXG4gICAgICAgIHRva2VuQToge1xuICAgICAgICAgIG1pbnQ6IHRva2VuQU1pbnQsXG4gICAgICAgICAgZGVjaW1hbHM6IHRva2VuQURlY2ltYWxzLFxuICAgICAgICAgIHJlc2VydmU6IHRva2VuQVJlc2VydmUsXG4gICAgICAgIH0sXG4gICAgICAgIHRva2VuQjoge1xuICAgICAgICAgIG1pbnQ6IHRva2VuQk1pbnQsXG4gICAgICAgICAgZGVjaW1hbHM6IHRva2VuQkRlY2ltYWxzLFxuICAgICAgICAgIHJlc2VydmU6IHRva2VuQlJlc2VydmUsXG4gICAgICAgIH0sXG4gICAgICAgIGZlZSxcbiAgICAgICAgdGlja1NwYWNpbmcsXG4gICAgICAgIGxpcXVpZGl0eSxcbiAgICAgICAgc3FydFByaWNlLFxuICAgICAgICBjdXJyZW50VGljayxcbiAgICAgICAgZmVlR3Jvd3RoR2xvYmFsQSxcbiAgICAgICAgZmVlR3Jvd3RoR2xvYmFsQixcbiAgICAgICAgdGltZXN0YW1wOiAwLCAvLyBXaWxsIGJlIGZpbGxlZCBpbiBsYXRlclxuICAgICAgICBzbG90OiAwLCAvLyBXaWxsIGJlIGZpbGxlZCBpbiBsYXRlclxuICAgICAgfTtcbiAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICBsb2dnZXIuZXJyb3IoYEVycm9yIGRlY29kaW5nIHBvb2wgZGF0YSBmb3IgJHtwb29sQWRkcmVzc31gLCB7IGVycm9yIH0pO1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJlYWQgYSAxMjgtYml0IHVuc2lnbmVkIGludGVnZXIgZnJvbSBhIERhdGFWaWV3XG4gICAqIEBwYXJhbSB2aWV3IERhdGFWaWV3IHRvIHJlYWQgZnJvbVxuICAgKiBAcGFyYW0gb2Zmc2V0IE9mZnNldCB0byByZWFkIGZyb21cbiAgICogQHJldHVybnMgMTI4LWJpdCB1bnNpZ25lZCBpbnRlZ2VyIGFzIGEgQmlnSW50XG4gICAqL1xuICBwcml2YXRlIHJlYWRCaWdVaW50MTI4KHZpZXc6IERhdGFWaWV3LCBvZmZzZXQ6IG51bWJlcik6IGJpZ2ludCB7XG4gICAgY29uc3QgbG8gPSB2aWV3LmdldEJpZ1VpbnQ2NChvZmZzZXQsIHRydWUpO1xuICAgIGNvbnN0IGhpID0gdmlldy5nZXRCaWdVaW50NjQob2Zmc2V0ICsgOCwgdHJ1ZSk7XG4gICAgcmV0dXJuIChoaSA8PCA2NG4pIHwgbG87XG4gIH1cblxuICAvKipcbiAgICogSGFuZGxlIGFjY291bnQgY2hhbmdlIGV2ZW50XG4gICAqIEBwYXJhbSBwb29sQWRkcmVzcyBQb29sIGFkZHJlc3NcbiAgICogQHBhcmFtIGFjY291bnRJbmZvIEFjY291bnQgaW5mb3JtYXRpb25cbiAgICogQHBhcmFtIGNvbnRleHQgQ29udGV4dCBpbmZvcm1hdGlvblxuICAgKi9cbiAgcHJpdmF0ZSBoYW5kbGVBY2NvdW50Q2hhbmdlKHBvb2xBZGRyZXNzOiBzdHJpbmcsIGFjY291bnRJbmZvOiBhbnksIGNvbnRleHQ6IGFueSk6IHZvaWQge1xuICAgIGxvZ2dlci5kZWJ1ZyhgQWNjb3VudCBjaGFuZ2UgZGV0ZWN0ZWQgZm9yIHBvb2wgJHtwb29sQWRkcmVzc31gLCB7XG4gICAgICBzbG90OiBjb250ZXh0LnNsb3QsXG4gICAgfSk7XG5cbiAgICAvLyBEZWNvZGUgYW5kIGVtaXQgdXBkYXRlZCBwb29sIGRhdGFcbiAgICBjb25zdCBwb29sRGF0YSA9IHRoaXMuZGVjb2RlUG9vbERhdGEocG9vbEFkZHJlc3MsIGFjY291bnRJbmZvLmRhdGEpO1xuXG4gICAgaWYgKHBvb2xEYXRhKSB7XG4gICAgICAvLyBBZGQgdGltZXN0YW1wIGFuZCBzbG90XG4gICAgICBwb29sRGF0YS50aW1lc3RhbXAgPSBNYXRoLmZsb29yKERhdGUubm93KCkgLyAxMDAwKTtcbiAgICAgIHBvb2xEYXRhLnNsb3QgPSBjb250ZXh0LnNsb3Q7XG5cbiAgICAgIC8vIEVtaXQgZGF0YVxuICAgICAgdGhpcy5jb25maWcub25EYXRhKHBvb2xEYXRhKTtcblxuICAgICAgbG9nZ2VyLmRlYnVnKGBVcGRhdGVkIGRhdGEgZm9yIHBvb2wgJHtwb29sQWRkcmVzc30gZnJvbSBhY2NvdW50IGNoYW5nZWAsIHtcbiAgICAgICAgdG9rZW5BOiBwb29sRGF0YS50b2tlbkEubWludCxcbiAgICAgICAgdG9rZW5COiBwb29sRGF0YS50b2tlbkIubWludCxcbiAgICAgICAgbGlxdWlkaXR5OiBwb29sRGF0YS5saXF1aWRpdHkudG9TdHJpbmcoKSxcbiAgICAgICAgc2xvdDogcG9vbERhdGEuc2xvdCxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxufVxuIl19