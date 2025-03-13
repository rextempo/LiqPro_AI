import { Event, EventType } from './events';
import { MessageQueue, ExchangeType } from './index';
import { logger } from '../logger';
import { v4 as uuidv4 } from 'uuid';

// Define the handler function type
export type EventHandler<T = any> = (event: Event<T>) => Promise<void>;

// Handler registry to store all event handlers
export class EventHandlerRegistry {
  private handlers: Map<EventType, EventHandler[]> = new Map();
  private wildcardHandlers: Map<string, EventHandler[]> = new Map();

  // Register a handler for a specific event type
  register<T = any>(eventType: EventType, handler: EventHandler<T>): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler as EventHandler);
    logger.debug(`Registered handler for event type: ${eventType}`);
  }

  // Register a handler for a wildcard event pattern (e.g., 'agent.*')
  registerWildcard<T = any>(pattern: string, handler: EventHandler<T>): void {
    if (!pattern.includes('*')) {
      throw new Error('Wildcard pattern must include at least one "*" character');
    }
    
    if (!this.wildcardHandlers.has(pattern)) {
      this.wildcardHandlers.set(pattern, []);
    }
    this.wildcardHandlers.get(pattern)!.push(handler as EventHandler);
    logger.debug(`Registered wildcard handler for pattern: ${pattern}`);
  }

  // Get all handlers for a specific event type
  getHandlers(eventType: EventType): EventHandler[] {
    const directHandlers = this.handlers.get(eventType) || [];
    
    // Find matching wildcard handlers
    const matchingWildcardHandlers: EventHandler[] = [];
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
  unregister(eventType: EventType, handler: EventHandler): boolean {
    if (!this.handlers.has(eventType)) {
      return false;
    }
    
    const handlers = this.handlers.get(eventType)!;
    const index = handlers.indexOf(handler);
    
    if (index === -1) {
      return false;
    }
    
    handlers.splice(index, 1);
    logger.debug(`Unregistered handler for event type: ${eventType}`);
    return true;
  }

  // Remove a wildcard handler
  unregisterWildcard(pattern: string, handler: EventHandler): boolean {
    if (!this.wildcardHandlers.has(pattern)) {
      return false;
    }
    
    const handlers = this.wildcardHandlers.get(pattern)!;
    const index = handlers.indexOf(handler);
    
    if (index === -1) {
      return false;
    }
    
    handlers.splice(index, 1);
    logger.debug(`Unregistered wildcard handler for pattern: ${pattern}`);
    return true;
  }

  // Clear all handlers
  clear(): void {
    this.handlers.clear();
    this.wildcardHandlers.clear();
    logger.debug('Cleared all event handlers');
  }
}

// Event bus for publishing and subscribing to events
export class EventBus {
  private registry: EventHandlerRegistry;
  private messageQueue: MessageQueue;
  private serviceName: string;
  private exchangeName: string;
  private queueName: string;
  private initialized = false;

  constructor(messageQueue: MessageQueue, serviceName: string) {
    this.registry = new EventHandlerRegistry();
    this.messageQueue = messageQueue;
    this.serviceName = serviceName;
    this.exchangeName = 'liqpro.events';
    this.queueName = `liqpro.${serviceName}.events`;
  }

  // Initialize the event bus
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    try {
      // Ensure connection to message queue
      await this.messageQueue.connect();
      
      // Create the main events exchange
      await this.messageQueue.createExchange(this.exchangeName, ExchangeType.TOPIC);
      
      // Create a queue for this service
      await this.messageQueue.createQueue(this.queueName, {
        durable: true,
        autoDelete: false
      });
      
      // Start consuming messages
      await this.setupConsumer();
      
      this.initialized = true;
      logger.info(`EventBus initialized for service: ${this.serviceName}`);
    } catch (error) {
      logger.error('Failed to initialize EventBus', error);
      throw error;
    }
  }

  // Set up the consumer for the service queue
  private async setupConsumer(): Promise<void> {
    await this.messageQueue.consume(this.queueName, async (msg) => {
      if (!msg) {
        return;
      }
      
      try {
        const content = msg.content.toString();
        const event = JSON.parse(content) as Event;
        
        logger.debug(`Received event: ${event.type}`, { eventId: event.id });
        
        // Process the event
        await this.processEvent(event);
        
        // Acknowledge the message
        this.messageQueue.ack(msg);
      } catch (error) {
        logger.error('Error processing event message', error);
        // Negative acknowledge and requeue the message
        this.messageQueue.nack(msg, false, true);
      }
    }, {
      prefetch: 10
    });
  }

  // Process an event by calling all registered handlers
  private async processEvent(event: Event): Promise<void> {
    const handlers = this.registry.getHandlers(event.type);
    
    if (handlers.length === 0) {
      logger.debug(`No handlers registered for event type: ${event.type}`);
      return;
    }
    
    logger.debug(`Processing event: ${event.type} with ${handlers.length} handlers`);
    
    // Execute all handlers in parallel
    await Promise.all(
      handlers.map(async (handler) => {
        try {
          await handler(event);
        } catch (error) {
          logger.error(`Error in event handler for ${event.type}`, error);
        }
      })
    );
  }

  // Subscribe to an event type
  subscribe<T = any>(eventType: EventType, handler: EventHandler<T>): void {
    this.registry.register(eventType, handler);
    
    // Bind the queue to the exchange with the event type as routing key
    this.messageQueue.bindQueue(this.queueName, this.exchangeName, eventType)
      .catch(err => logger.error(`Failed to bind queue for event type: ${eventType}`, err));
  }

  // Subscribe to multiple event types
  subscribeMany(eventTypes: EventType[], handler: EventHandler): void {
    for (const eventType of eventTypes) {
      this.subscribe(eventType, handler);
    }
  }

  // Subscribe to a wildcard pattern
  subscribePattern<T = any>(pattern: string, handler: EventHandler<T>): void {
    this.registry.registerWildcard(pattern, handler);
    
    // Bind the queue to the exchange with the pattern as routing key
    // Convert the pattern to RabbitMQ routing key format (. is separator, * is wildcard for one word, # is wildcard for multiple words)
    const routingKey = pattern.replace(/\*/g, '#');
    
    this.messageQueue.bindQueue(this.queueName, this.exchangeName, routingKey)
      .catch(err => logger.error(`Failed to bind queue for pattern: ${pattern}`, err));
  }

  // Unsubscribe from an event type
  unsubscribe(eventType: EventType, handler: EventHandler): boolean {
    return this.registry.unregister(eventType, handler);
  }

  // Unsubscribe from a wildcard pattern
  unsubscribePattern(pattern: string, handler: EventHandler): boolean {
    return this.registry.unregisterWildcard(pattern, handler);
  }

  // Publish an event
  async publish<T = any>(eventType: EventType, payload: T, metadata?: Record<string, any>): Promise<string> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const eventId = uuidv4();
    const event: Event<T> = {
      id: eventId,
      type: eventType,
      timestamp: Date.now(),
      payload,
      metadata
    };
    
    logger.debug(`Publishing event: ${eventType}`, { eventId });
    
    await this.messageQueue.publish(this.exchangeName, eventType, event);
    
    return eventId;
  }
}

// Singleton instance for easy sharing across modules
let eventBusInstance: EventBus | null = null;

export function getEventBus(messageQueue?: MessageQueue, serviceName?: string): EventBus {
  if (!eventBusInstance && messageQueue && serviceName) {
    eventBusInstance = new EventBus(messageQueue, serviceName);
  } else if (!eventBusInstance) {
    throw new Error('EventBus not initialized. Provide messageQueue and serviceName on first call.');
  }
  
  return eventBusInstance;
}

export function initializeEventBus(messageQueue: MessageQueue, serviceName: string): EventBus {
  eventBusInstance = new EventBus(messageQueue, serviceName);
  return eventBusInstance;
} 