import { EventType, Event } from '../utils/events';
import { RabbitMQConnection } from './rabbitmq';
export type EventHandler<T = any> = (event: Event<T>) => Promise<void>;
export declare class EventBus {
    private readonly connection;
    private channel;
    private readonly serviceName;
    private readonly exchange;
    private readonly deadLetterExchange;
    private readonly retryExchange;
    private readonly handlers;
    private isInitialized;
    constructor(connection: RabbitMQConnection, serviceName: string);
    /**
     * 初始化事件总线
     */
    initialize(): Promise<void>;
    /**
     * 发布事件
     */
    publish<T>(type: EventType, payload: T): Promise<void>;
    /**
     * 订阅事件
     */
    subscribe<T>(type: EventType, handler: EventHandler<T>): Promise<void>;
    /**
     * 开始消费消息
     */
    private startConsuming;
    /**
     * 关闭事件总线
     */
    close(): Promise<void>;
}
