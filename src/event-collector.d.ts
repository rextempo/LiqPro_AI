import { Finality } from '@solana/web3.js';
/**
 * Event types that can be monitored
 */
export declare enum EventType {
    SWAP = "swap",
    DEPOSIT = "deposit",
    WITHDRAW = "withdraw",
    POSITION_OPEN = "position_open",
    POSITION_CLOSE = "position_close",
    POSITION_UPDATE = "position_update"
}
/**
 * Event data structure
 */
export interface PoolEvent {
    id: string;
    poolAddress: string;
    type: EventType;
    signature: string;
    blockTime: number;
    slot: number;
    data: any;
}
/**
 * Configuration for the EventCollector
 */
export interface EventCollectorConfig {
    rpcEndpoint: string;
    rpcBackupEndpoint?: string;
    rpcCommitment: Finality;
    interval: number;
    onEvent: (event: PoolEvent) => void;
}
/**
 * Event Collector
 * Responsible for collecting events from liquidity pools
 */
export declare class EventCollector {
    private connection;
    private config;
    private pollingTimer;
    private isRunning;
    private trackedPools;
    private subscriptions;
    /**
     * Create a new Event Collector
     * @param config Collector configuration
     */
    constructor(config: EventCollectorConfig);
    /**
     * Start collecting events
     */
    start(): Promise<void>;
    /**
     * Stop collecting events
     */
    stop(): void;
    /**
     * Track events for a pool
     * @param poolAddress Pool address
     */
    trackPool(poolAddress: string): Promise<void>;
    /**
     * Stop tracking events for a pool
     * @param poolAddress Pool address
     */
    untrackPool(poolAddress: string): void;
    /**
     * Poll for events for all tracked pools
     */
    private pollEvents;
    /**
     * Get recent transactions for a pool
     * @param poolAddress Pool address
     */
    private getRecentTransactions;
    /**
     * Process a transaction to extract events
     * @param poolAddress Pool address
     * @param transaction Transaction data
     * @param signatureInfo Signature information
     * @returns Array of events
     */
    private processTransaction;
    /**
     * Determine the event type based on instruction data
     * @param instruction Instruction data
     * @param transaction Transaction data
     * @returns Event type or null if not recognized
     */
    private determineEventType;
    /**
     * Handle account change event
     * @param poolAddress Pool address
     * @param accountInfo Account information
     * @param context Context information
     */
    private handleAccountChange;
}
