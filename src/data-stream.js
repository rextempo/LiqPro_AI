"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataStreamManager = exports.StreamType = void 0;
const events_1 = require("events");
const monitoring_1 = require("@liqpro/monitoring");
const logger = (0, monitoring_1.createLogger)('data-service:data-stream');
/**
 * Stream Type
 */
var StreamType;
(function (StreamType) {
    StreamType["POOL_DATA"] = "pool_data";
    StreamType["MARKET_PRICE"] = "market_price";
    StreamType["WHALE_ACTIVITY"] = "whale_activity";
    StreamType["SYSTEM_METRICS"] = "system_metrics";
})(StreamType || (exports.StreamType = StreamType = {}));
/**
 * Data Stream Manager
 * Responsible for managing real-time data streams
 */
class DataStreamManager {
    /**
     * Create a new Data Stream Manager
     */
    constructor() {
        this.emitter = new events_1.EventEmitter();
        this.subscriptions = new Map();
        this.buffers = new Map();
        this.bufferSize = 100;
        this.bufferTTL = 60 * 60 * 1000; // 1 hour in milliseconds
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
    publish(type, topic, data) {
        const event = {
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
    publishPoolData(poolAddress, data) {
        this.publish(StreamType.POOL_DATA, poolAddress, data);
    }
    /**
     * Subscribe to a stream
     * @param type Stream type
     * @param topic Stream topic (e.g., pool address)
     * @param callback Callback function
     * @returns Subscription ID
     */
    subscribe(type, topic, callback) {
        const subscriptionId = `${type}:${topic}:${Date.now()}:${Math.random().toString(36).substring(2, 9)}`;
        const eventKey = `${type}:${topic}`;
        // Create subscription
        const subscription = {
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
    unsubscribe(subscriptionId) {
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
    bufferEvent(key, event) {
        // Get or create buffer
        if (!this.buffers.has(key)) {
            this.buffers.set(key, []);
        }
        const buffer = this.buffers.get(key);
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
    sendBufferedEvents(key, callback) {
        const buffer = this.buffers.get(key) || [];
        // Send buffered events
        for (const event of buffer) {
            try {
                callback(event);
            }
            catch (error) {
                logger.error(`Error sending buffered event to subscriber`, { error, key });
            }
        }
    }
    /**
     * Clean up old buffers
     */
    cleanupBuffers() {
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
    getSubscriptions() {
        return Array.from(this.subscriptions.values());
    }
    /**
     * Get subscriptions for a specific stream
     * @param type Stream type
     * @param topic Stream topic
     * @returns Array of subscriptions
     */
    getStreamSubscriptions(type, topic) {
        const eventKey = `${type}:${topic}`;
        return Array.from(this.subscriptions.values()).filter(sub => `${sub.type}:${sub.topic}` === eventKey);
    }
    /**
     * Set the buffer size
     * @param size Buffer size
     */
    setBufferSize(size) {
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
    setBufferTTL(ttlMs) {
        this.bufferTTL = ttlMs;
        logger.info(`Set buffer TTL to ${ttlMs}ms`);
    }
}
exports.DataStreamManager = DataStreamManager;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YS1zdHJlYW0uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvbW9kdWxlcy9wcm9jZXNzb3JzL2RhdGEtc3RyZWFtLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1DQUFzQztBQUN0QyxtREFBa0Q7QUFHbEQsTUFBTSxNQUFNLEdBQUcsSUFBQSx5QkFBWSxFQUFDLDBCQUEwQixDQUFDLENBQUM7QUFFeEQ7O0dBRUc7QUFDSCxJQUFZLFVBS1g7QUFMRCxXQUFZLFVBQVU7SUFDcEIscUNBQXVCLENBQUE7SUFDdkIsMkNBQTZCLENBQUE7SUFDN0IsK0NBQWlDLENBQUE7SUFDakMsK0NBQWlDLENBQUE7QUFDbkMsQ0FBQyxFQUxXLFVBQVUsMEJBQVYsVUFBVSxRQUtyQjtBQXNCRDs7O0dBR0c7QUFDSCxNQUFhLGlCQUFpQjtJQU81Qjs7T0FFRztJQUNIO1FBVFEsWUFBTyxHQUFpQixJQUFJLHFCQUFZLEVBQUUsQ0FBQztRQUMzQyxrQkFBYSxHQUFvQyxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQzNELFlBQU8sR0FBK0IsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUNoRCxlQUFVLEdBQVcsR0FBRyxDQUFDO1FBQ3pCLGNBQVMsR0FBVyxFQUFFLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDLHlCQUF5QjtRQU1uRSx3REFBd0Q7UUFDeEQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUM7UUFFbEMsdUJBQXVCO1FBQ3ZCLFdBQVcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLG1CQUFtQjtRQUU3RSxNQUFNLENBQUMsSUFBSSxDQUFDLGlDQUFpQyxDQUFDLENBQUM7SUFDakQsQ0FBQztJQUVEOzs7OztPQUtHO0lBQ0gsT0FBTyxDQUFVLElBQWdCLEVBQUUsS0FBYSxFQUFFLElBQU87UUFDdkQsTUFBTSxLQUFLLEdBQW1CO1lBQzVCLElBQUk7WUFDSixLQUFLO1lBQ0wsU0FBUyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUU7WUFDckIsSUFBSTtTQUNMLENBQUM7UUFFRixhQUFhO1FBQ2IsTUFBTSxRQUFRLEdBQUcsR0FBRyxJQUFJLElBQUksS0FBSyxFQUFFLENBQUM7UUFDcEMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRW5DLGVBQWU7UUFDZixJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUVsQyxNQUFNLENBQUMsS0FBSyxDQUFDLHNCQUFzQixRQUFRLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQztJQUNqRixDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILGVBQWUsQ0FBQyxXQUFtQixFQUFFLElBQW1CO1FBQ3RELElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLFNBQVMsRUFBRSxXQUFXLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDeEQsQ0FBQztJQUVEOzs7Ozs7T0FNRztJQUNILFNBQVMsQ0FDUCxJQUFnQixFQUNoQixLQUFhLEVBQ2IsUUFBeUM7UUFFekMsTUFBTSxjQUFjLEdBQUcsR0FBRyxJQUFJLElBQUksS0FBSyxJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUN0RyxNQUFNLFFBQVEsR0FBRyxHQUFHLElBQUksSUFBSSxLQUFLLEVBQUUsQ0FBQztRQUVwQyxzQkFBc0I7UUFDdEIsTUFBTSxZQUFZLEdBQXVCO1lBQ3ZDLEVBQUUsRUFBRSxjQUFjO1lBQ2xCLElBQUk7WUFDSixLQUFLO1lBQ0wsUUFBUTtTQUNULENBQUM7UUFFRixxQkFBcUI7UUFDckIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsY0FBYyxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBRXJELGVBQWU7UUFDZixJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFFcEMsdUJBQXVCO1FBQ3ZCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFFNUMsTUFBTSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsUUFBUSxZQUFZLGNBQWMsRUFBRSxDQUFDLENBQUM7UUFFbkUsT0FBTyxjQUFjLENBQUM7SUFDeEIsQ0FBQztJQUVEOzs7T0FHRztJQUNILFdBQVcsQ0FBQyxjQUFzQjtRQUNoQyxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUU1RCxJQUFJLFlBQVksRUFBRSxDQUFDO1lBQ2pCLE1BQU0sRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxHQUFHLFlBQVksQ0FBQztZQUMvQyxNQUFNLFFBQVEsR0FBRyxHQUFHLElBQUksSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUVwQyxrQkFBa0I7WUFDbEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBRXJDLHNCQUFzQjtZQUN0QixJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQztZQUUxQyxNQUFNLENBQUMsSUFBSSxDQUFDLHFCQUFxQixRQUFRLFlBQVksY0FBYyxFQUFFLENBQUMsQ0FBQztRQUN6RSxDQUFDO0lBQ0gsQ0FBQztJQUVEOzs7O09BSUc7SUFDSyxXQUFXLENBQUMsR0FBVyxFQUFFLEtBQWtCO1FBQ2pELHVCQUF1QjtRQUN2QixJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUMzQixJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDNUIsQ0FBQztRQUVELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBRSxDQUFDO1FBRXRDLHNCQUFzQjtRQUN0QixNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRW5CLG9CQUFvQjtRQUNwQixJQUFJLE1BQU0sQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ3BDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLHNCQUFzQjtRQUN4QyxDQUFDO0lBQ0gsQ0FBQztJQUVEOzs7O09BSUc7SUFDSyxrQkFBa0IsQ0FBQyxHQUFXLEVBQUUsUUFBc0M7UUFDNUUsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDO1FBRTNDLHVCQUF1QjtRQUN2QixLQUFLLE1BQU0sS0FBSyxJQUFJLE1BQU0sRUFBRSxDQUFDO1lBQzNCLElBQUksQ0FBQztnQkFDSCxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDbEIsQ0FBQztZQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7Z0JBQ2YsTUFBTSxDQUFDLEtBQUssQ0FBQyw0Q0FBNEMsRUFBRSxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO1lBQzdFLENBQUM7UUFDSCxDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0ssY0FBYztRQUNwQixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7UUFFdkIsb0JBQW9CO1FBQ3BCLEtBQUssTUFBTSxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUM7WUFDbkQsb0JBQW9CO1lBQ3BCLE1BQU0sU0FBUyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsS0FBSyxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7WUFFbEYsZ0JBQWdCO1lBQ2hCLElBQUksU0FBUyxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ3JDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxTQUFTLENBQUMsQ0FBQztnQkFDakMsTUFBTSxDQUFDLEtBQUssQ0FBQyxjQUFjLE1BQU0sQ0FBQyxNQUFNLEdBQUcsU0FBUyxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsRUFBRSxDQUFDLENBQUM7WUFDeEYsQ0FBQztZQUVELHVCQUF1QjtZQUN2QixJQUFJLFNBQVMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQzNCLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUN6QixNQUFNLENBQUMsS0FBSyxDQUFDLDRCQUE0QixHQUFHLEVBQUUsQ0FBQyxDQUFDO1lBQ2xELENBQUM7UUFDSCxDQUFDO0lBQ0gsQ0FBQztJQUVEOzs7T0FHRztJQUNILGdCQUFnQjtRQUNkLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7SUFDakQsQ0FBQztJQUVEOzs7OztPQUtHO0lBQ0gsc0JBQXNCLENBQUMsSUFBZ0IsRUFBRSxLQUFhO1FBQ3BELE1BQU0sUUFBUSxHQUFHLEdBQUcsSUFBSSxJQUFJLEtBQUssRUFBRSxDQUFDO1FBRXBDLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsTUFBTSxDQUNuRCxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLElBQUksSUFBSSxHQUFHLENBQUMsS0FBSyxFQUFFLEtBQUssUUFBUSxDQUMvQyxDQUFDO0lBQ0osQ0FBQztJQUVEOzs7T0FHRztJQUNILGFBQWEsQ0FBQyxJQUFZO1FBQ3hCLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDO1FBRXZCLHdCQUF3QjtRQUN4QixLQUFLLE1BQU0sQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO1lBQ25ELElBQUksTUFBTSxDQUFDLE1BQU0sR0FBRyxJQUFJLEVBQUUsQ0FBQztnQkFDekIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsOEJBQThCO2dCQUMxRSxNQUFNLENBQUMsS0FBSyxDQUFDLHNCQUFzQixHQUFHLE9BQU8sSUFBSSxTQUFTLENBQUMsQ0FBQztZQUM5RCxDQUFDO1FBQ0gsQ0FBQztRQUVELE1BQU0sQ0FBQyxJQUFJLENBQUMsc0JBQXNCLElBQUksRUFBRSxDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUVEOzs7T0FHRztJQUNILFlBQVksQ0FBQyxLQUFhO1FBQ3hCLElBQUksQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDO1FBQ3ZCLE1BQU0sQ0FBQyxJQUFJLENBQUMscUJBQXFCLEtBQUssSUFBSSxDQUFDLENBQUM7SUFDOUMsQ0FBQztDQUNGO0FBaE9ELDhDQWdPQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEV2ZW50RW1pdHRlciB9IGZyb20gJ2V2ZW50cyc7XG5pbXBvcnQgeyBjcmVhdGVMb2dnZXIgfSBmcm9tICdAbGlxcHJvL21vbml0b3JpbmcnO1xuaW1wb3J0IHsgUG9vbERhdGFQb2ludCB9IGZyb20gJy4vZGF0YS1hZ2dyZWdhdG9yJztcblxuY29uc3QgbG9nZ2VyID0gY3JlYXRlTG9nZ2VyKCdkYXRhLXNlcnZpY2U6ZGF0YS1zdHJlYW0nKTtcblxuLyoqXG4gKiBTdHJlYW0gVHlwZVxuICovXG5leHBvcnQgZW51bSBTdHJlYW1UeXBlIHtcbiAgUE9PTF9EQVRBID0gJ3Bvb2xfZGF0YScsXG4gIE1BUktFVF9QUklDRSA9ICdtYXJrZXRfcHJpY2UnLFxuICBXSEFMRV9BQ1RJVklUWSA9ICd3aGFsZV9hY3Rpdml0eScsXG4gIFNZU1RFTV9NRVRSSUNTID0gJ3N5c3RlbV9tZXRyaWNzJyxcbn1cblxuLyoqXG4gKiBTdHJlYW0gRXZlbnRcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBTdHJlYW1FdmVudDxUID0gYW55PiB7XG4gIHR5cGU6IFN0cmVhbVR5cGU7XG4gIHRvcGljOiBzdHJpbmc7XG4gIHRpbWVzdGFtcDogbnVtYmVyO1xuICBkYXRhOiBUO1xufVxuXG4vKipcbiAqIFN0cmVhbSBTdWJzY3JpcHRpb25cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBTdHJlYW1TdWJzY3JpcHRpb24ge1xuICBpZDogc3RyaW5nO1xuICB0eXBlOiBTdHJlYW1UeXBlO1xuICB0b3BpYzogc3RyaW5nO1xuICBjYWxsYmFjazogKGV2ZW50OiBTdHJlYW1FdmVudCkgPT4gdm9pZDtcbn1cblxuLyoqXG4gKiBEYXRhIFN0cmVhbSBNYW5hZ2VyXG4gKiBSZXNwb25zaWJsZSBmb3IgbWFuYWdpbmcgcmVhbC10aW1lIGRhdGEgc3RyZWFtc1xuICovXG5leHBvcnQgY2xhc3MgRGF0YVN0cmVhbU1hbmFnZXIge1xuICBwcml2YXRlIGVtaXR0ZXI6IEV2ZW50RW1pdHRlciA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcbiAgcHJpdmF0ZSBzdWJzY3JpcHRpb25zOiBNYXA8c3RyaW5nLCBTdHJlYW1TdWJzY3JpcHRpb24+ID0gbmV3IE1hcCgpO1xuICBwcml2YXRlIGJ1ZmZlcnM6IE1hcDxzdHJpbmcsIFN0cmVhbUV2ZW50W10+ID0gbmV3IE1hcCgpO1xuICBwcml2YXRlIGJ1ZmZlclNpemU6IG51bWJlciA9IDEwMDtcbiAgcHJpdmF0ZSBidWZmZXJUVEw6IG51bWJlciA9IDYwICogNjAgKiAxMDAwOyAvLyAxIGhvdXIgaW4gbWlsbGlzZWNvbmRzXG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIG5ldyBEYXRhIFN0cmVhbSBNYW5hZ2VyXG4gICAqL1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICAvLyBTZXQgbWF4aW11bSBudW1iZXIgb2YgbGlzdGVuZXJzIHRvIGF2b2lkIG1lbW9yeSBsZWFrc1xuICAgIHRoaXMuZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoMTAwKTtcblxuICAgIC8vIFN0YXJ0IGJ1ZmZlciBjbGVhbnVwXG4gICAgc2V0SW50ZXJ2YWwoKCkgPT4gdGhpcy5jbGVhbnVwQnVmZmVycygpLCAxNSAqIDYwICogMTAwMCk7IC8vIEV2ZXJ5IDE1IG1pbnV0ZXNcblxuICAgIGxvZ2dlci5pbmZvKCdEYXRhIFN0cmVhbSBNYW5hZ2VyIGluaXRpYWxpemVkJyk7XG4gIH1cblxuICAvKipcbiAgICogUHVibGlzaCBhbiBldmVudCB0byBhIHN0cmVhbVxuICAgKiBAcGFyYW0gdHlwZSBTdHJlYW0gdHlwZVxuICAgKiBAcGFyYW0gdG9waWMgU3RyZWFtIHRvcGljIChlLmcuLCBwb29sIGFkZHJlc3MpXG4gICAqIEBwYXJhbSBkYXRhIEV2ZW50IGRhdGFcbiAgICovXG4gIHB1Ymxpc2g8VCA9IGFueT4odHlwZTogU3RyZWFtVHlwZSwgdG9waWM6IHN0cmluZywgZGF0YTogVCk6IHZvaWQge1xuICAgIGNvbnN0IGV2ZW50OiBTdHJlYW1FdmVudDxUPiA9IHtcbiAgICAgIHR5cGUsXG4gICAgICB0b3BpYyxcbiAgICAgIHRpbWVzdGFtcDogRGF0ZS5ub3coKSxcbiAgICAgIGRhdGEsXG4gICAgfTtcblxuICAgIC8vIEVtaXQgZXZlbnRcbiAgICBjb25zdCBldmVudEtleSA9IGAke3R5cGV9OiR7dG9waWN9YDtcbiAgICB0aGlzLmVtaXR0ZXIuZW1pdChldmVudEtleSwgZXZlbnQpO1xuXG4gICAgLy8gQnVmZmVyIGV2ZW50XG4gICAgdGhpcy5idWZmZXJFdmVudChldmVudEtleSwgZXZlbnQpO1xuXG4gICAgbG9nZ2VyLmRlYnVnKGBQdWJsaXNoZWQgZXZlbnQgdG8gJHtldmVudEtleX1gLCB7IHRpbWVzdGFtcDogZXZlbnQudGltZXN0YW1wIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFB1Ymxpc2ggcG9vbCBkYXRhXG4gICAqIEBwYXJhbSBwb29sQWRkcmVzcyBQb29sIGFkZHJlc3NcbiAgICogQHBhcmFtIGRhdGEgUG9vbCBkYXRhIHBvaW50XG4gICAqL1xuICBwdWJsaXNoUG9vbERhdGEocG9vbEFkZHJlc3M6IHN0cmluZywgZGF0YTogUG9vbERhdGFQb2ludCk6IHZvaWQge1xuICAgIHRoaXMucHVibGlzaChTdHJlYW1UeXBlLlBPT0xfREFUQSwgcG9vbEFkZHJlc3MsIGRhdGEpO1xuICB9XG5cbiAgLyoqXG4gICAqIFN1YnNjcmliZSB0byBhIHN0cmVhbVxuICAgKiBAcGFyYW0gdHlwZSBTdHJlYW0gdHlwZVxuICAgKiBAcGFyYW0gdG9waWMgU3RyZWFtIHRvcGljIChlLmcuLCBwb29sIGFkZHJlc3MpXG4gICAqIEBwYXJhbSBjYWxsYmFjayBDYWxsYmFjayBmdW5jdGlvblxuICAgKiBAcmV0dXJucyBTdWJzY3JpcHRpb24gSURcbiAgICovXG4gIHN1YnNjcmliZTxUID0gYW55PihcbiAgICB0eXBlOiBTdHJlYW1UeXBlLFxuICAgIHRvcGljOiBzdHJpbmcsXG4gICAgY2FsbGJhY2s6IChldmVudDogU3RyZWFtRXZlbnQ8VD4pID0+IHZvaWRcbiAgKTogc3RyaW5nIHtcbiAgICBjb25zdCBzdWJzY3JpcHRpb25JZCA9IGAke3R5cGV9OiR7dG9waWN9OiR7RGF0ZS5ub3coKX06JHtNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHJpbmcoMiwgOSl9YDtcbiAgICBjb25zdCBldmVudEtleSA9IGAke3R5cGV9OiR7dG9waWN9YDtcblxuICAgIC8vIENyZWF0ZSBzdWJzY3JpcHRpb25cbiAgICBjb25zdCBzdWJzY3JpcHRpb246IFN0cmVhbVN1YnNjcmlwdGlvbiA9IHtcbiAgICAgIGlkOiBzdWJzY3JpcHRpb25JZCxcbiAgICAgIHR5cGUsXG4gICAgICB0b3BpYyxcbiAgICAgIGNhbGxiYWNrLFxuICAgIH07XG5cbiAgICAvLyBTdG9yZSBzdWJzY3JpcHRpb25cbiAgICB0aGlzLnN1YnNjcmlwdGlvbnMuc2V0KHN1YnNjcmlwdGlvbklkLCBzdWJzY3JpcHRpb24pO1xuXG4gICAgLy8gQWRkIGxpc3RlbmVyXG4gICAgdGhpcy5lbWl0dGVyLm9uKGV2ZW50S2V5LCBjYWxsYmFjayk7XG5cbiAgICAvLyBTZW5kIGJ1ZmZlcmVkIGV2ZW50c1xuICAgIHRoaXMuc2VuZEJ1ZmZlcmVkRXZlbnRzKGV2ZW50S2V5LCBjYWxsYmFjayk7XG5cbiAgICBsb2dnZXIuaW5mbyhgU3Vic2NyaWJlZCB0byAke2V2ZW50S2V5fSB3aXRoIElEICR7c3Vic2NyaXB0aW9uSWR9YCk7XG5cbiAgICByZXR1cm4gc3Vic2NyaXB0aW9uSWQ7XG4gIH1cblxuICAvKipcbiAgICogVW5zdWJzY3JpYmUgZnJvbSBhIHN0cmVhbVxuICAgKiBAcGFyYW0gc3Vic2NyaXB0aW9uSWQgU3Vic2NyaXB0aW9uIElEXG4gICAqL1xuICB1bnN1YnNjcmliZShzdWJzY3JpcHRpb25JZDogc3RyaW5nKTogdm9pZCB7XG4gICAgY29uc3Qgc3Vic2NyaXB0aW9uID0gdGhpcy5zdWJzY3JpcHRpb25zLmdldChzdWJzY3JpcHRpb25JZCk7XG5cbiAgICBpZiAoc3Vic2NyaXB0aW9uKSB7XG4gICAgICBjb25zdCB7IHR5cGUsIHRvcGljLCBjYWxsYmFjayB9ID0gc3Vic2NyaXB0aW9uO1xuICAgICAgY29uc3QgZXZlbnRLZXkgPSBgJHt0eXBlfToke3RvcGljfWA7XG5cbiAgICAgIC8vIFJlbW92ZSBsaXN0ZW5lclxuICAgICAgdGhpcy5lbWl0dGVyLm9mZihldmVudEtleSwgY2FsbGJhY2spO1xuXG4gICAgICAvLyBSZW1vdmUgc3Vic2NyaXB0aW9uXG4gICAgICB0aGlzLnN1YnNjcmlwdGlvbnMuZGVsZXRlKHN1YnNjcmlwdGlvbklkKTtcblxuICAgICAgbG9nZ2VyLmluZm8oYFVuc3Vic2NyaWJlZCBmcm9tICR7ZXZlbnRLZXl9IHdpdGggSUQgJHtzdWJzY3JpcHRpb25JZH1gKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQnVmZmVyIGFuIGV2ZW50XG4gICAqIEBwYXJhbSBrZXkgRXZlbnQga2V5XG4gICAqIEBwYXJhbSBldmVudCBTdHJlYW0gZXZlbnRcbiAgICovXG4gIHByaXZhdGUgYnVmZmVyRXZlbnQoa2V5OiBzdHJpbmcsIGV2ZW50OiBTdHJlYW1FdmVudCk6IHZvaWQge1xuICAgIC8vIEdldCBvciBjcmVhdGUgYnVmZmVyXG4gICAgaWYgKCF0aGlzLmJ1ZmZlcnMuaGFzKGtleSkpIHtcbiAgICAgIHRoaXMuYnVmZmVycy5zZXQoa2V5LCBbXSk7XG4gICAgfVxuXG4gICAgY29uc3QgYnVmZmVyID0gdGhpcy5idWZmZXJzLmdldChrZXkpITtcblxuICAgIC8vIEFkZCBldmVudCB0byBidWZmZXJcbiAgICBidWZmZXIucHVzaChldmVudCk7XG5cbiAgICAvLyBMaW1pdCBidWZmZXIgc2l6ZVxuICAgIGlmIChidWZmZXIubGVuZ3RoID4gdGhpcy5idWZmZXJTaXplKSB7XG4gICAgICBidWZmZXIuc2hpZnQoKTsgLy8gUmVtb3ZlIG9sZGVzdCBldmVudFxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBTZW5kIGJ1ZmZlcmVkIGV2ZW50cyB0byBhIG5ldyBzdWJzY3JpYmVyXG4gICAqIEBwYXJhbSBrZXkgRXZlbnQga2V5XG4gICAqIEBwYXJhbSBjYWxsYmFjayBDYWxsYmFjayBmdW5jdGlvblxuICAgKi9cbiAgcHJpdmF0ZSBzZW5kQnVmZmVyZWRFdmVudHMoa2V5OiBzdHJpbmcsIGNhbGxiYWNrOiAoZXZlbnQ6IFN0cmVhbUV2ZW50KSA9PiB2b2lkKTogdm9pZCB7XG4gICAgY29uc3QgYnVmZmVyID0gdGhpcy5idWZmZXJzLmdldChrZXkpIHx8IFtdO1xuXG4gICAgLy8gU2VuZCBidWZmZXJlZCBldmVudHNcbiAgICBmb3IgKGNvbnN0IGV2ZW50IG9mIGJ1ZmZlcikge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY2FsbGJhY2soZXZlbnQpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgbG9nZ2VyLmVycm9yKGBFcnJvciBzZW5kaW5nIGJ1ZmZlcmVkIGV2ZW50IHRvIHN1YnNjcmliZXJgLCB7IGVycm9yLCBrZXkgfSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENsZWFuIHVwIG9sZCBidWZmZXJzXG4gICAqL1xuICBwcml2YXRlIGNsZWFudXBCdWZmZXJzKCk6IHZvaWQge1xuICAgIGNvbnN0IG5vdyA9IERhdGUubm93KCk7XG5cbiAgICAvLyBDaGVjayBlYWNoIGJ1ZmZlclxuICAgIGZvciAoY29uc3QgW2tleSwgYnVmZmVyXSBvZiB0aGlzLmJ1ZmZlcnMuZW50cmllcygpKSB7XG4gICAgICAvLyBSZW1vdmUgb2xkIGV2ZW50c1xuICAgICAgY29uc3QgbmV3QnVmZmVyID0gYnVmZmVyLmZpbHRlcihldmVudCA9PiBub3cgLSBldmVudC50aW1lc3RhbXAgPD0gdGhpcy5idWZmZXJUVEwpO1xuXG4gICAgICAvLyBVcGRhdGUgYnVmZmVyXG4gICAgICBpZiAobmV3QnVmZmVyLmxlbmd0aCA8IGJ1ZmZlci5sZW5ndGgpIHtcbiAgICAgICAgdGhpcy5idWZmZXJzLnNldChrZXksIG5ld0J1ZmZlcik7XG4gICAgICAgIGxvZ2dlci5kZWJ1ZyhgQ2xlYW5lZCB1cCAke2J1ZmZlci5sZW5ndGggLSBuZXdCdWZmZXIubGVuZ3RofSBvbGQgZXZlbnRzIGZyb20gJHtrZXl9YCk7XG4gICAgICB9XG5cbiAgICAgIC8vIFJlbW92ZSBlbXB0eSBidWZmZXJzXG4gICAgICBpZiAobmV3QnVmZmVyLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICB0aGlzLmJ1ZmZlcnMuZGVsZXRlKGtleSk7XG4gICAgICAgIGxvZ2dlci5kZWJ1ZyhgUmVtb3ZlZCBlbXB0eSBidWZmZXIgZm9yICR7a2V5fWApO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgYWxsIGFjdGl2ZSBzdWJzY3JpcHRpb25zXG4gICAqIEByZXR1cm5zIEFycmF5IG9mIHN1YnNjcmlwdGlvbnNcbiAgICovXG4gIGdldFN1YnNjcmlwdGlvbnMoKTogU3RyZWFtU3Vic2NyaXB0aW9uW10ge1xuICAgIHJldHVybiBBcnJheS5mcm9tKHRoaXMuc3Vic2NyaXB0aW9ucy52YWx1ZXMoKSk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHN1YnNjcmlwdGlvbnMgZm9yIGEgc3BlY2lmaWMgc3RyZWFtXG4gICAqIEBwYXJhbSB0eXBlIFN0cmVhbSB0eXBlXG4gICAqIEBwYXJhbSB0b3BpYyBTdHJlYW0gdG9waWNcbiAgICogQHJldHVybnMgQXJyYXkgb2Ygc3Vic2NyaXB0aW9uc1xuICAgKi9cbiAgZ2V0U3RyZWFtU3Vic2NyaXB0aW9ucyh0eXBlOiBTdHJlYW1UeXBlLCB0b3BpYzogc3RyaW5nKTogU3RyZWFtU3Vic2NyaXB0aW9uW10ge1xuICAgIGNvbnN0IGV2ZW50S2V5ID0gYCR7dHlwZX06JHt0b3BpY31gO1xuXG4gICAgcmV0dXJuIEFycmF5LmZyb20odGhpcy5zdWJzY3JpcHRpb25zLnZhbHVlcygpKS5maWx0ZXIoXG4gICAgICBzdWIgPT4gYCR7c3ViLnR5cGV9OiR7c3ViLnRvcGljfWAgPT09IGV2ZW50S2V5XG4gICAgKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXQgdGhlIGJ1ZmZlciBzaXplXG4gICAqIEBwYXJhbSBzaXplIEJ1ZmZlciBzaXplXG4gICAqL1xuICBzZXRCdWZmZXJTaXplKHNpemU6IG51bWJlcik6IHZvaWQge1xuICAgIHRoaXMuYnVmZmVyU2l6ZSA9IHNpemU7XG5cbiAgICAvLyBUcmltIGV4aXN0aW5nIGJ1ZmZlcnNcbiAgICBmb3IgKGNvbnN0IFtrZXksIGJ1ZmZlcl0gb2YgdGhpcy5idWZmZXJzLmVudHJpZXMoKSkge1xuICAgICAgaWYgKGJ1ZmZlci5sZW5ndGggPiBzaXplKSB7XG4gICAgICAgIHRoaXMuYnVmZmVycy5zZXQoa2V5LCBidWZmZXIuc2xpY2UoLXNpemUpKTsgLy8gS2VlcCBvbmx5IHRoZSBuZXdlc3QgZXZlbnRzXG4gICAgICAgIGxvZ2dlci5kZWJ1ZyhgVHJpbW1lZCBidWZmZXIgZm9yICR7a2V5fSB0byAke3NpemV9IGV2ZW50c2ApO1xuICAgICAgfVxuICAgIH1cblxuICAgIGxvZ2dlci5pbmZvKGBTZXQgYnVmZmVyIHNpemUgdG8gJHtzaXplfWApO1xuICB9XG5cbiAgLyoqXG4gICAqIFNldCB0aGUgYnVmZmVyIFRUTFxuICAgKiBAcGFyYW0gdHRsTXMgVFRMIGluIG1pbGxpc2Vjb25kc1xuICAgKi9cbiAgc2V0QnVmZmVyVFRMKHR0bE1zOiBudW1iZXIpOiB2b2lkIHtcbiAgICB0aGlzLmJ1ZmZlclRUTCA9IHR0bE1zO1xuICAgIGxvZ2dlci5pbmZvKGBTZXQgYnVmZmVyIFRUTCB0byAke3R0bE1zfW1zYCk7XG4gIH1cbn1cbiJdfQ==