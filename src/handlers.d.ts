import { Event, EventType } from './events';
import { MessageQueue } from './index';
export type EventHandler<T = any> = (event: Event<T>) => Promise<void>;
export declare class EventHandlerRegistry {
    private handlers;
    private wildcardHandlers;
    register<T = any>(eventType: EventType, handler: EventHandler<T>): void;
    registerWildcard<T = any>(pattern: string, handler: EventHandler<T>): void;
    getHandlers(eventType: EventType): EventHandler[];
    unregister(eventType: EventType, handler: EventHandler): boolean;
    unregisterWildcard(pattern: string, handler: EventHandler): boolean;
    clear(): void;
}
export declare class EventBus {
    private registry;
    private messageQueue;
    private serviceName;
    private exchangeName;
    private queueName;
    private initialized;
    constructor(messageQueue: MessageQueue, serviceName: string);
    initialize(): Promise<void>;
    private setupConsumer;
    private processEvent;
    subscribe<T = any>(eventType: EventType, handler: EventHandler<T>): void;
    subscribeMany(eventTypes: EventType[], handler: EventHandler): void;
    subscribePattern<T = any>(pattern: string, handler: EventHandler<T>): void;
    unsubscribe(eventType: EventType, handler: EventHandler): boolean;
    unsubscribePattern(pattern: string, handler: EventHandler): boolean;
    publish<T = any>(eventType: EventType, payload: T, metadata?: Record<string, any>): Promise<string>;
}
export declare function getEventBus(messageQueue?: MessageQueue, serviceName?: string): EventBus;
export declare function initializeEventBus(messageQueue: MessageQueue, serviceName: string): EventBus;
//# sourceMappingURL=handlers.d.ts.map