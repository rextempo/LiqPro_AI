/**
 * Pool Event Types
 */
export declare enum PoolEventType {
    SWAP = "swap",
    DEPOSIT = "deposit",
    WITHDRAW = "withdraw",
    POSITION_CREATED = "position_created",
    POSITION_MODIFIED = "position_modified",
    POSITION_CLOSED = "position_closed",
    FEE_COLLECTION = "fee_collection",
    UNKNOWN = "unknown"
}
/**
 * Pool Event Interface
 */
export interface PoolEvent {
    type: PoolEventType;
    signature: string;
    poolAddress: string;
    blockTime: number;
    slot: number;
    data?: any;
}
/**
 * Meteora Pool Events Collector
 * Responsible for monitoring events in Meteora DLMM pools
 */
export declare class PoolEventsCollector {
    private connection;
    private eventListeners;
    private eventCallbacks;
    private lastSignatures;
    private pollingInterval;
    private isPolling;
    /**
     * Create a new Pool Events Collector
     * @param rpcEndpoint Solana RPC endpoint
     * @param commitment Commitment level
     */
    constructor(rpcEndpoint: string, commitment?: 'processed' | 'confirmed' | 'finalized');
    /**
     * Start monitoring events for a specific pool
     * @param poolAddress Pool address
     * @param callback Callback function to handle events
     * @returns Subscription ID
     */
    startMonitoring(poolAddress: string, callback: (event: PoolEvent) => void): number;
    /**
     * Stop monitoring events for a specific subscription
     * @param poolAddress Pool address
     * @param subscriptionId Subscription ID
     */
    stopMonitoring(poolAddress: string, subscriptionId: number): void;
    /**
     * Start polling for events
     * @param poolAddress Pool address
     */
    private startPolling;
    /**
     * Poll for new events
     * @param poolAddress Pool address
     */
    private poll;
    /**
     * Process a transaction
     * @param poolAddress Pool address
     * @param signature Signature info
     */
    private processTransaction;
    /**
     * Determine event type based on transaction data
     * @param transaction Transaction data
     * @returns Event type
     */
    private determineEventType;
    /**
     * Extract event data from transaction
     * @param transaction Transaction data
     * @param eventType Event type
     * @returns Event data
     */
    private extractEventData;
    /**
     * Set the polling interval
     * @param intervalMs Interval in milliseconds
     */
    setPollingInterval(intervalMs: number): void;
}
