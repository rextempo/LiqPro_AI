import amqp from 'amqplib';
import { EventEmitter } from 'events';
import { logger } from '../logger';

export enum ExchangeType {
  DIRECT = 'direct',
  FANOUT = 'fanout',
  TOPIC = 'topic',
  HEADERS = 'headers'
}

export interface MessageQueueConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  vhost?: string;
  heartbeat?: number;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export interface PublishOptions {
  persistent?: boolean;
  contentType?: string;
  contentEncoding?: string;
  headers?: Record<string, any>;
  correlationId?: string;
  replyTo?: string;
  expiration?: string;
  messageId?: string;
  timestamp?: number;
  type?: string;
  appId?: string;
}

export interface ConsumeOptions {
  noAck?: boolean;
  exclusive?: boolean;
  priority?: number;
  prefetch?: number;
}

export class MessageQueue extends EventEmitter {
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private connecting = false;
  private config: MessageQueueConfig;

  constructor(config: MessageQueueConfig) {
    super();
    this.config = {
      vhost: '/',
      heartbeat: 30,
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      ...config
    };
  }

  async connect(): Promise<void> {
    if (this.connection || this.connecting) {
      return;
    }

    this.connecting = true;

    try {
      const { host, port, username, password, vhost, heartbeat } = this.config;
      const connectionString = `amqp://${username}:${password}@${host}:${port}${vhost}?heartbeat=${heartbeat}`;
      
      logger.info(`Connecting to RabbitMQ at ${host}:${port}${vhost}`);
      this.connection = await amqp.connect(connectionString);
      
      this.connection.on('error', (err) => {
        logger.error('RabbitMQ connection error', err);
        this.handleConnectionError();
      });
      
      this.connection.on('close', () => {
        logger.warn('RabbitMQ connection closed');
        this.handleConnectionError();
      });
      
      this.channel = await this.connection.createChannel();
      this.channel.on('error', (err) => {
        logger.error('RabbitMQ channel error', err);
      });
      
      this.channel.on('close', () => {
        logger.warn('RabbitMQ channel closed');
      });
      
      this.reconnectAttempts = 0;
      this.connecting = false;
      this.emit('connected');
      logger.info('Successfully connected to RabbitMQ');
    } catch (error) {
      this.connecting = false;
      logger.error('Failed to connect to RabbitMQ', error);
      this.handleConnectionError();
    }
  }

  private handleConnectionError(): void {
    if (this.connection) {
      try {
        this.connection.close();
      } catch (err) {
        logger.error('Error closing RabbitMQ connection', err);
      }
      this.connection = null;
      this.channel = null;
    }

    const { reconnectInterval, maxReconnectAttempts } = this.config;
    
    if (this.reconnectAttempts >= maxReconnectAttempts!) {
      logger.error(`Maximum reconnect attempts (${maxReconnectAttempts}) reached. Giving up.`);
      this.emit('error', new Error('Maximum reconnect attempts reached'));
      return;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    this.reconnectAttempts++;
    logger.info(`Attempting to reconnect to RabbitMQ in ${reconnectInterval}ms (attempt ${this.reconnectAttempts}/${maxReconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(err => {
        logger.error('Error during reconnect', err);
      });
    }, reconnectInterval);
  }

  async createExchange(name: string, type: ExchangeType, options: amqp.Options.AssertExchange = {}): Promise<amqp.Replies.AssertExchange> {
    if (!this.channel) {
      throw new Error('Not connected to RabbitMQ');
    }
    
    return this.channel.assertExchange(name, type, {
      durable: true,
      ...options
    });
  }

  async createQueue(name: string, options: amqp.Options.AssertQueue = {}): Promise<amqp.Replies.AssertQueue> {
    if (!this.channel) {
      throw new Error('Not connected to RabbitMQ');
    }
    
    return this.channel.assertQueue(name, {
      durable: true,
      ...options
    });
  }

  async bindQueue(queue: string, exchange: string, routingKey: string): Promise<amqp.Replies.Empty> {
    if (!this.channel) {
      throw new Error('Not connected to RabbitMQ');
    }
    
    return this.channel.bindQueue(queue, exchange, routingKey);
  }

  async publish(exchange: string, routingKey: string, content: Buffer | string | object, options: PublishOptions = {}): Promise<boolean> {
    if (!this.channel) {
      throw new Error('Not connected to RabbitMQ');
    }
    
    let buffer: Buffer;
    
    if (Buffer.isBuffer(content)) {
      buffer = content;
    } else if (typeof content === 'string') {
      buffer = Buffer.from(content);
    } else {
      buffer = Buffer.from(JSON.stringify(content));
      if (!options.contentType) {
        options.contentType = 'application/json';
      }
    }
    
    return this.channel.publish(exchange, routingKey, buffer, {
      persistent: true,
      ...options
    });
  }

  async consume(queue: string, callback: (msg: amqp.ConsumeMessage | null) => void, options: ConsumeOptions = {}): Promise<amqp.Replies.Consume> {
    if (!this.channel) {
      throw new Error('Not connected to RabbitMQ');
    }
    
    if (options.prefetch) {
      await this.channel.prefetch(options.prefetch);
    }
    
    return this.channel.consume(queue, callback, {
      noAck: false,
      ...options
    });
  }

  async ack(message: amqp.ConsumeMessage): Promise<void> {
    if (!this.channel) {
      throw new Error('Not connected to RabbitMQ');
    }
    
    this.channel.ack(message);
  }

  async nack(message: amqp.ConsumeMessage, allUpTo = false, requeue = true): Promise<void> {
    if (!this.channel) {
      throw new Error('Not connected to RabbitMQ');
    }
    
    this.channel.nack(message, allUpTo, requeue);
  }

  async close(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.channel) {
      await this.channel.close();
      this.channel = null;
    }
    
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
    }
    
    logger.info('Disconnected from RabbitMQ');
  }
}

// Singleton instance for easy sharing across modules
let messageQueueInstance: MessageQueue | null = null;

export function getMessageQueue(config?: MessageQueueConfig): MessageQueue {
  if (!messageQueueInstance && config) {
    messageQueueInstance = new MessageQueue(config);
  } else if (!messageQueueInstance) {
    throw new Error('MessageQueue not initialized. Provide config on first call.');
  }
  
  return messageQueueInstance;
}

export function initializeMessageQueue(config: MessageQueueConfig): MessageQueue {
  messageQueueInstance = new MessageQueue(config);
  return messageQueueInstance;
}

export * from './events';
export * from './handlers'; 