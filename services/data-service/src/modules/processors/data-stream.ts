import { EventEmitter } from 'events';
import { createLogger } from '@liqpro/monitoring';
import { PoolDataPoint } from './data-aggregator';

const logger = createLogger('data-service:data-stream');

/**
 * Stream Type
 */
export enum StreamType {
  POOL_DATA = 'pool_data',
  MARKET_PRICE = 'market_price',
  WHALE_ACTIVITY = 'whale_activity',
  SYSTEM_METRICS = 'system_metrics',
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
export class DataStreamManager {
  private emitter: EventEmitter = new EventEmitter();
  private subscriptions: Map<string, StreamSubscription> = new Map();
  private buffers: Map<string, StreamEvent[]> = new Map();
  private bufferSize: number = 100;
  private bufferTTL: number = 60 * 60 * 1000; // 1 hour in milliseconds

  /**
   * Create a new Data Stream Manager
   */
  constructor() {
    // Set maximum number of listeners to avoid memory leaks
    this.emitter.setMaxListeners(100);

    // Start buffer cleanup
    setInterval(() => this.cleanupBuffers(), 15 * 60 * 1000); // Every 15 minutes

    logger.info('Data Stream Manager initialized');
  }

  /**
   * Publish an event to a stream
   * @param type Stream type
   * @param topic Stream topic (e.g., pool address)
   * @param data Event data
   */
  publish<T = any>(type: StreamType, topic: string, data: T): void {
    const event: StreamEvent<T> = {
      type,
      topic,
      timestamp: Date.now(),
      data,
    };

    // Emit event
    const eventKey = `${type}:${topic}`;
    this.emitter.emit(eventKey, event);

    // Buffer event
    this.bufferEvent(eventKey, event);

    logger.debug(`Published event to ${eventKey}`, { timestamp: event.timestamp });
  }

  /**
   * Publish pool data
   * @param poolAddress Pool address
   * @param data Pool data point
   */
  publishPoolData(poolAddress: string, data: PoolDataPoint): void {
    this.publish(StreamType.POOL_DATA, poolAddress, data);
  }

  /**
   * Subscribe to a stream
   * @param type Stream type
   * @param topic Stream topic (e.g., pool address)
   * @param callback Callback function
   * @returns Subscription ID
   */
  subscribe<T = any>(
    type: StreamType,
    topic: string,
    callback: (event: StreamEvent<T>) => void
  ): string {
    const subscriptionId = `${type}:${topic}:${Date.now()}:${Math.random().toString(36).substring(2, 9)}`;
    const eventKey = `${type}:${topic}`;

    // Create subscription
    const subscription: StreamSubscription = {
      id: subscriptionId,
      type,
      topic,
      callback,
    };

    // Store subscription
    this.subscriptions.set(subscriptionId, subscription);

    // Add listener
    this.emitter.on(eventKey, callback);

    // Send buffered events
    this.sendBufferedEvents(eventKey, callback);

    logger.info(`Subscribed to ${eventKey} with ID ${subscriptionId}`);

    return subscriptionId;
  }

  /**
   * Unsubscribe from a stream
   * @param subscriptionId Subscription ID
   */
  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);

    if (subscription) {
      const { type, topic, callback } = subscription;
      const eventKey = `${type}:${topic}`;

      // Remove listener
      this.emitter.off(eventKey, callback);

      // Remove subscription
      this.subscriptions.delete(subscriptionId);

      logger.info(`Unsubscribed from ${eventKey} with ID ${subscriptionId}`);
    }
  }

  /**
   * Buffer an event
   * @param key Event key
   * @param event Stream event
   */
  private bufferEvent(key: string, event: StreamEvent): void {
    // Get or create buffer
    if (!this.buffers.has(key)) {
      this.buffers.set(key, []);
    }

    const buffer = this.buffers.get(key)!;

    // Add event to buffer
    buffer.push(event);

    // Limit buffer size
    if (buffer.length > this.bufferSize) {
      buffer.shift(); // Remove oldest event
    }
  }

  /**
   * Send buffered events to a new subscriber
   * @param key Event key
   * @param callback Callback function
   */
  private sendBufferedEvents(key: string, callback: (event: StreamEvent) => void): void {
    const buffer = this.buffers.get(key) || [];

    // Send buffered events
    for (const event of buffer) {
      try {
        callback(event);
      } catch (error) {
        logger.error(`Error sending buffered event to subscriber`, { error, key });
      }
    }
  }

  /**
   * Clean up old buffers
   */
  private cleanupBuffers(): void {
    const now = Date.now();

    // Check each buffer
    for (const [key, buffer] of this.buffers.entries()) {
      // Remove old events
      const newBuffer = buffer.filter(event => now - event.timestamp <= this.bufferTTL);

      // Update buffer
      if (newBuffer.length < buffer.length) {
        this.buffers.set(key, newBuffer);
        logger.debug(`Cleaned up ${buffer.length - newBuffer.length} old events from ${key}`);
      }

      // Remove empty buffers
      if (newBuffer.length === 0) {
        this.buffers.delete(key);
        logger.debug(`Removed empty buffer for ${key}`);
      }
    }
  }

  /**
   * Get all active subscriptions
   * @returns Array of subscriptions
   */
  getSubscriptions(): StreamSubscription[] {
    return Array.from(this.subscriptions.values());
  }

  /**
   * Get subscriptions for a specific stream
   * @param type Stream type
   * @param topic Stream topic
   * @returns Array of subscriptions
   */
  getStreamSubscriptions(type: StreamType, topic: string): StreamSubscription[] {
    const eventKey = `${type}:${topic}`;

    return Array.from(this.subscriptions.values()).filter(
      sub => `${sub.type}:${sub.topic}` === eventKey
    );
  }

  /**
   * Set the buffer size
   * @param size Buffer size
   */
  setBufferSize(size: number): void {
    this.bufferSize = size;

    // Trim existing buffers
    for (const [key, buffer] of this.buffers.entries()) {
      if (buffer.length > size) {
        this.buffers.set(key, buffer.slice(-size)); // Keep only the newest events
        logger.debug(`Trimmed buffer for ${key} to ${size} events`);
      }
    }

    logger.info(`Set buffer size to ${size}`);
  }

  /**
   * Set the buffer TTL
   * @param ttlMs TTL in milliseconds
   */
  setBufferTTL(ttlMs: number): void {
    this.bufferTTL = ttlMs;
    logger.info(`Set buffer TTL to ${ttlMs}ms`);
  }
}
