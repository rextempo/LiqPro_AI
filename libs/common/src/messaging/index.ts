import amqp from 'amqplib';
import { EventEmitter } from 'events';
import { createLogger } from '../utils/logger';
import { DEFAULT_RETRY_OPTIONS, RetryOptions, handleMessageFailure } from './retry';

const logger = createLogger('MessageQueue');

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
  vhost: string;
  heartbeat?: number;
  retryOptions?: RetryOptions;
}

export interface PublishOptions extends amqp.Options.Publish {
  persistent?: boolean;
  contentType?: string;
  contentEncoding?: string;
  headers?: any;
  expiration?: string | number;
  messageId?: string;
  timestamp?: number;
  appId?: string;
}

export interface ConsumeOptions extends amqp.Options.Consume {
  prefetch?: number;
}

export interface MessageHandler {
  (message: amqp.ConsumeMessage | null): Promise<void>;
}

export class MessageQueue extends EventEmitter {
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectDelay: number = 1000;
  private connecting: boolean = false;
  private delayedMessagesExchange: string = 'delayed.messages';
  private deadLetterExchange: string = 'dead.letter';

  constructor(private config: MessageQueueConfig) {
    super();
    this.config.heartbeat = this.config.heartbeat || 60;
    this.config.retryOptions = this.config.retryOptions || DEFAULT_RETRY_OPTIONS;
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
      
      // Setup delayed message exchange for retries
      await this.setupDelayedMessageExchange();
      
      // Setup dead letter exchange for failed messages
      await this.setupDeadLetterExchange();
      
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
    if (this.reconnectTimer) {
      return;
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts), 30000);
      this.reconnectAttempts++;
      
      logger.info(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      this.reconnectTimer = setTimeout(async () => {
        this.reconnectTimer = null;
        this.connection = null;
        this.channel = null;
        
        try {
          await this.connect();
        } catch (error) {
          logger.error('Reconnection attempt failed', error);
        }
      }, delay);
    } else {
      logger.error(`Failed to reconnect after ${this.maxReconnectAttempts} attempts`);
      this.emit('reconnect_failed');
    }
  }

  private async setupDelayedMessageExchange(): Promise<void> {
    if (!this.channel) {
      throw new Error('Not connected to RabbitMQ');
    }
    
    await this.channel.assertExchange(this.delayedMessagesExchange, ExchangeType.DIRECT, {
      durable: true
    });
  }

  private async setupDeadLetterExchange(): Promise<void> {
    if (!this.channel) {
      throw new Error('Not connected to RabbitMQ');
    }
    
    await this.channel.assertExchange(this.deadLetterExchange, ExchangeType.DIRECT, {
      durable: true
    });
    
    // Create a queue for dead letter messages
    await this.channel.assertQueue('dead.letter.queue', {
      durable: true,
      arguments: {
        'x-message-ttl': 1000 * 60 * 60 * 24 * 7 // 7 days
      }
    });
    
    // Bind the queue to the exchange
    await this.channel.bindQueue('dead.letter.queue', this.deadLetterExchange, '#');
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
      options.contentType = options.contentType || 'application/json';
    }
    
    return this.channel.publish(exchange, routingKey, buffer, {
      persistent: true,
      ...options
    });
  }

  async publishWithDelay(exchange: string, routingKey: string, content: Buffer | string | object, delay: number, options: PublishOptions = {}): Promise<boolean> {
    if (!this.channel) {
      throw new Error('Not connected to RabbitMQ');
    }
    
    // Create a temporary queue with TTL that will forward to the actual queue
    const queueName = `delayed.${exchange}.${routingKey}.${Date.now()}`;
    
    await this.channel.assertQueue(queueName, {
      durable: true,
      expires: delay + 60000, // Queue will be deleted after message is processed
      arguments: {
        'x-dead-letter-exchange': exchange,
        'x-dead-letter-routing-key': routingKey,
        'x-message-ttl': delay
      }
    });
    
    let buffer: Buffer;
    
    if (Buffer.isBuffer(content)) {
      buffer = content;
    } else if (typeof content === 'string') {
      buffer = Buffer.from(content);
    } else {
      buffer = Buffer.from(JSON.stringify(content));
      options.contentType = options.contentType || 'application/json';
    }
    
    return this.channel.sendToQueue(queueName, buffer, {
      persistent: true,
      ...options
    });
  }

  async sendToQueue(queue: string, content: Buffer | string | object, options: PublishOptions = {}): Promise<boolean> {
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
      options.contentType = options.contentType || 'application/json';
    }
    
    return this.channel.sendToQueue(queue, buffer, {
      persistent: true,
      ...options
    });
  }

  async consume(queue: string, callback: MessageHandler, options: ConsumeOptions = {}): Promise<amqp.Replies.Consume> {
    if (!this.channel) {
      throw new Error('Not connected to RabbitMQ');
    }
    
    if (options.prefetch) {
      await this.channel.prefetch(options.prefetch);
    }
    
    return this.channel.consume(queue, async (msg) => {
      if (!msg) {
        return;
      }
      
      try {
        await callback(msg);
        this.ack(msg);
      } catch (error) {
        logger.error('Error processing message', {
          queue,
          messageId: msg.properties.messageId,
          error: error instanceof Error ? error.message : String(error)
        });
        
        // Handle retry logic
        await this.handleMessageRetry(msg, error as Error);
      }
    }, {
      noAck: false,
      ...options
    });
  }

  private async handleMessageRetry(message: amqp.ConsumeMessage, error: Error): Promise<void> {
    await handleMessageFailure(
      message,
      error,
      async (msg, delay) => {
        // Republish with delay
        const content = msg.content;
        const exchange = msg.fields.exchange || '';
        const routingKey = msg.fields.routingKey;
        
        await this.publishWithDelay(exchange, routingKey, content, delay, {
          ...msg.properties,
          headers: msg.properties.headers
        });
        
        this.ack(msg);
      },
      async (msg, err) => {
        // Send to dead letter queue
        const content = msg.content;
        const routingKey = msg.fields.routingKey;
        
        await this.publish(this.deadLetterExchange, routingKey, content, {
          ...msg.properties,
          headers: {
            ...msg.properties.headers,
            'x-error': err.message,
            'x-original-exchange': msg.fields.exchange,
            'x-original-routing-key': routingKey,
            'x-failed-at': new Date().toISOString()
          }
        });
        
        this.ack(msg);
      },
      this.config.retryOptions
    );
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