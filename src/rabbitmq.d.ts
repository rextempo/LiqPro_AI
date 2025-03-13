import { Connection, Channel } from 'amqplib';
export interface RabbitMQConfig {
    host: string;
    port: number;
    username: string;
    password: string;
    vhost: string;
}
export declare class RabbitMQConnection {
    private connection;
    private channel;
    private readonly config;
    private reconnectAttempts;
    private readonly maxReconnectAttempts;
    private readonly reconnectInterval;
    constructor(config: RabbitMQConfig);
    /**
     * Connect to RabbitMQ server
     */
    connect(): Promise<Connection>;
    /**
     * Create a channel
     */
    createChannel(): Promise<Channel>;
    /**
     * Get an existing channel or create a new one
     */
    getChannel(): Promise<Channel>;
    /**
     * Close the connection and channel
     */
    close(): Promise<void>;
    /**
     * Attempt to reconnect to RabbitMQ
     */
    private reconnect;
}
