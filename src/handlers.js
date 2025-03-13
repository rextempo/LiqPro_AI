"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeEventBus = exports.getEventBus = exports.EventBus = exports.EventHandlerRegistry = void 0;
const index_1 = require("./index");
const logger_1 = require("../logger");
const uuid_1 = require("uuid");
// Handler registry to store all event handlers
class EventHandlerRegistry {
    constructor() {
        this.handlers = new Map();
        this.wildcardHandlers = new Map();
    }
    // Register a handler for a specific event type
    register(eventType, handler) {
        if (!this.handlers.has(eventType)) {
            this.handlers.set(eventType, []);
        }
        this.handlers.get(eventType).push(handler);
        logger_1.logger.debug(`Registered handler for event type: ${eventType}`);
    }
    // Register a handler for a wildcard event pattern (e.g., 'agent.*')
    registerWildcard(pattern, handler) {
        if (!pattern.includes('*')) {
            throw new Error('Wildcard pattern must include at least one "*" character');
        }
        if (!this.wildcardHandlers.has(pattern)) {
            this.wildcardHandlers.set(pattern, []);
        }
        this.wildcardHandlers.get(pattern).push(handler);
        logger_1.logger.debug(`Registered wildcard handler for pattern: ${pattern}`);
    }
    // Get all handlers for a specific event type
    getHandlers(eventType) {
        const directHandlers = this.handlers.get(eventType) || [];
        // Find matching wildcard handlers
        const matchingWildcardHandlers = [];
        this.wildcardHandlers.forEach((handlers, pattern) => {
            const regexPattern = pattern.replace(/\./g, '\\.').replace(/\*/g, '.*');
            const regex = new RegExp(`^${regexPattern}$`);
            if (regex.test(eventType)) {
                matchingWildcardHandlers.push(...handlers);
            }
        });
        return [...directHandlers, ...matchingWildcardHandlers];
    }
    // Remove a handler for a specific event type
    unregister(eventType, handler) {
        if (!this.handlers.has(eventType)) {
            return false;
        }
        const handlers = this.handlers.get(eventType);
        const index = handlers.indexOf(handler);
        if (index === -1) {
            return false;
        }
        handlers.splice(index, 1);
        logger_1.logger.debug(`Unregistered handler for event type: ${eventType}`);
        return true;
    }
    // Remove a wildcard handler
    unregisterWildcard(pattern, handler) {
        if (!this.wildcardHandlers.has(pattern)) {
            return false;
        }
        const handlers = this.wildcardHandlers.get(pattern);
        const index = handlers.indexOf(handler);
        if (index === -1) {
            return false;
        }
        handlers.splice(index, 1);
        logger_1.logger.debug(`Unregistered wildcard handler for pattern: ${pattern}`);
        return true;
    }
    // Clear all handlers
    clear() {
        this.handlers.clear();
        this.wildcardHandlers.clear();
        logger_1.logger.debug('Cleared all event handlers');
    }
}
exports.EventHandlerRegistry = EventHandlerRegistry;
// Event bus for publishing and subscribing to events
class EventBus {
    constructor(messageQueue, serviceName) {
        this.initialized = false;
        this.registry = new EventHandlerRegistry();
        this.messageQueue = messageQueue;
        this.serviceName = serviceName;
        this.exchangeName = 'liqpro.events';
        this.queueName = `liqpro.${serviceName}.events`;
    }
    // Initialize the event bus
    async initialize() {
        if (this.initialized) {
            return;
        }
        try {
            // Ensure connection to message queue
            await this.messageQueue.connect();
            // Create the main events exchange
            await this.messageQueue.createExchange(this.exchangeName, index_1.ExchangeType.TOPIC);
            // Create a queue for this service
            await this.messageQueue.createQueue(this.queueName, {
                durable: true,
                autoDelete: false
            });
            // Start consuming messages
            await this.setupConsumer();
            this.initialized = true;
            logger_1.logger.info(`EventBus initialized for service: ${this.serviceName}`);
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize EventBus', error);
            throw error;
        }
    }
    // Set up the consumer for the service queue
    async setupConsumer() {
        await this.messageQueue.consume(this.queueName, async (msg) => {
            if (!msg) {
                return;
            }
            try {
                const content = msg.content.toString();
                const event = JSON.parse(content);
                logger_1.logger.debug(`Received event: ${event.type}`, { eventId: event.id });
                // Process the event
                await this.processEvent(event);
                // Acknowledge the message
                this.messageQueue.ack(msg);
            }
            catch (error) {
                logger_1.logger.error('Error processing event message', error);
                // Negative acknowledge and requeue the message
                this.messageQueue.nack(msg, false, true);
            }
        }, {
            prefetch: 10
        });
    }
    // Process an event by calling all registered handlers
    async processEvent(event) {
        const handlers = this.registry.getHandlers(event.type);
        if (handlers.length === 0) {
            logger_1.logger.debug(`No handlers registered for event type: ${event.type}`);
            return;
        }
        logger_1.logger.debug(`Processing event: ${event.type} with ${handlers.length} handlers`);
        // Execute all handlers in parallel
        await Promise.all(handlers.map(async (handler) => {
            try {
                await handler(event);
            }
            catch (error) {
                logger_1.logger.error(`Error in event handler for ${event.type}`, error);
            }
        }));
    }
    // Subscribe to an event type
    subscribe(eventType, handler) {
        this.registry.register(eventType, handler);
        // Bind the queue to the exchange with the event type as routing key
        this.messageQueue.bindQueue(this.queueName, this.exchangeName, eventType)
            .catch(err => logger_1.logger.error(`Failed to bind queue for event type: ${eventType}`, err));
    }
    // Subscribe to multiple event types
    subscribeMany(eventTypes, handler) {
        for (const eventType of eventTypes) {
            this.subscribe(eventType, handler);
        }
    }
    // Subscribe to a wildcard pattern
    subscribePattern(pattern, handler) {
        this.registry.registerWildcard(pattern, handler);
        // Bind the queue to the exchange with the pattern as routing key
        // Convert the pattern to RabbitMQ routing key format (. is separator, * is wildcard for one word, # is wildcard for multiple words)
        const routingKey = pattern.replace(/\*/g, '#');
        this.messageQueue.bindQueue(this.queueName, this.exchangeName, routingKey)
            .catch(err => logger_1.logger.error(`Failed to bind queue for pattern: ${pattern}`, err));
    }
    // Unsubscribe from an event type
    unsubscribe(eventType, handler) {
        return this.registry.unregister(eventType, handler);
    }
    // Unsubscribe from a wildcard pattern
    unsubscribePattern(pattern, handler) {
        return this.registry.unregisterWildcard(pattern, handler);
    }
    // Publish an event
    async publish(eventType, payload, metadata) {
        if (!this.initialized) {
            await this.initialize();
        }
        const eventId = (0, uuid_1.v4)();
        const event = {
            id: eventId,
            type: eventType,
            timestamp: Date.now(),
            payload,
            metadata
        };
        logger_1.logger.debug(`Publishing event: ${eventType}`, { eventId });
        await this.messageQueue.publish(this.exchangeName, eventType, event);
        return eventId;
    }
}
exports.EventBus = EventBus;
// Singleton instance for easy sharing across modules
let eventBusInstance = null;
function getEventBus(messageQueue, serviceName) {
    if (!eventBusInstance && messageQueue && serviceName) {
        eventBusInstance = new EventBus(messageQueue, serviceName);
    }
    else if (!eventBusInstance) {
        throw new Error('EventBus not initialized. Provide messageQueue and serviceName on first call.');
    }
    return eventBusInstance;
}
exports.getEventBus = getEventBus;
function initializeEventBus(messageQueue, serviceName) {
    eventBusInstance = new EventBus(messageQueue, serviceName);
    return eventBusInstance;
}
exports.initializeEventBus = initializeEventBus;
