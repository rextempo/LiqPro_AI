import { PoolDataPoint } from './data-aggregator';
/**
 * Stream Type
 */
export declare enum StreamType {
    POOL_DATA = "pool_data",
    MARKET_PRICE = "market_price",
    WHALE_ACTIVITY = "whale_activity",
    SYSTEM_METRICS = "system_metrics"
}
/**
 * Stream Event
 */
export interface StreamEvent<T = any> {
    type: StreamType;
    topic: string;
    timestamp: number;
    data: T;
}
/**
 * Stream Subscription
 */
export interface StreamSubscription {
    id: string;
    type: StreamType;
    topic: string;
    callback: (event: StreamEvent) => void;
}
/**
 * Data Stream Manager
 * Responsible for managing real-time data streams
 */
export declare class DataStreamManager {
    private emitter;
    private subscriptions;
    private buffers;
    private bufferSize;
    private bufferTTL;
    /**
     * Create a new Data Stream Manager
     */
    constructor();
    /**
     * Publish an event to a stream
     * @param type Stream type
     * @param topic Stream topic (e.g., pool address)
     * @param data Event data
     */
    publish<T = any>(type: StreamType, topic: string, data: T): void;
    /**
     * Publish pool data
     * @param poolAddress Pool address
     * @param data Pool data point
     */
    publishPoolData(poolAddress: string, data: PoolDataPoint): void;
    /**
     * Subscribe to a stream
     * @param type Stream type
     * @param topic Stream topic (e.g., pool address)
     * @param callback Callback function
     * @returns Subscription ID
     */
    subscribe<T = any>(type: StreamType, topic: string, callback: (event: StreamEvent<T>) => void): string;
    /**
     * Unsubscribe from a stream
     * @param subscriptionId Subscription ID
     */
    unsubscribe(subscriptionId: string): void;
    /**
     * Buffer an event
     * @param key Event key
     * @param event Stream event
     */
    private bufferEvent;
    /**
     * Send buffered events to a new subscriber
     * @param key Event key
     * @param callback Callback function
     */
    private sendBufferedEvents;
    /**
     * Clean up old buffers
     */
    private cleanupBuffers;
    /**
     * Get all active subscriptions
     * @returns Array of subscriptions
     */
    getSubscriptions(): StreamSubscription[];
    /**
     * Get subscriptions for a specific stream
     * @param type Stream type
     * @param topic Stream topic
     * @returns Array of subscriptions
     */
    getStreamSubscriptions(type: StreamType, topic: string): StreamSubscription[];
    /**
     * Set the buffer size
     * @param size Buffer size
     */
    setBufferSize(size: number): void;
    /**
     * Set the buffer TTL
     * @param ttlMs TTL in milliseconds
     */
    setBufferTTL(ttlMs: number): void;
}
