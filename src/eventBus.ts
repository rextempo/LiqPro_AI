import { Channel } from 'amqplib';
import { v4 as uuidv4 } from 'uuid';
import { EventType, Event } from '../utils/events';
import { createLogger } from '../utils';
import { RabbitMQConnection } from './rabbitmq';

const logger = createLogger('EventBus');

// 事件处理器类型
export type EventHandler<T = any> = (event: Event<T>) => Promise<void>;

export class EventBus {
  private readonly connection: RabbitMQConnection;
  private channel: Channel | null = null;
  private readonly serviceName: string;
  private readonly exchange = 'liqpro.events';
  private readonly deadLetterExchange = 'liqpro.events.dlx';
  private readonly retryExchange = 'liqpro.events.retry';
  private readonly handlers: Map<EventType, EventHandler[]> = new Map();
  private isInitialized = false;

  constructor(connection: RabbitMQConnection, serviceName: string) {
    this.connection = connection;
    this.serviceName = serviceName;
  }

  /**
   * 初始化事件总线
   */
  public async initialize(): Promise<void> {
    try {
      this.channel = await this.connection.getChannel();
      
      // 创建交换机
      await this.channel.assertExchange(this.exchange, 'topic', { durable: true });
      await this.channel.assertExchange(this.deadLetterExchange, 'topic', { durable: true });
      await this.channel.assertExchange(this.retryExchange, 'topic', { durable: true });
      
      // 创建服务队列
      const queueName = `${this.serviceName}.events`;
      await this.channel.assertQueue(queueName, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': this.deadLetterExchange,
          'x-dead-letter-routing-key': `${this.serviceName}.dlq`
        }
      });
      
      // 创建死信队列
      const dlqName = `${this.serviceName}.dlq`;
      await this.channel.assertQueue(dlqName, { durable: true });
      await this.channel.bindQueue(dlqName, this.deadLetterExchange, `${this.serviceName}.dlq`);
      
      // 创建重试队列
      const retryQueueName = `${this.serviceName}.retry`;
      await this.channel.assertQueue(retryQueueName, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': this.exchange,
          'x-message-ttl': 30000 // 30 seconds delay
        }
      });
      await this.channel.bindQueue(retryQueueName, this.retryExchange, `${this.serviceName}.retry`);
      
      this.isInitialized = true;
      logger.info('Event bus initialized');
    } catch (error) {
      logger.error('Failed to initialize event bus', error);
      throw error;
    }
  }

  /**
   * 发布事件
   */
  public async publish<T>(type: EventType, payload: T): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const event: Event<T> = {
        id: uuidv4(),
        type,
        timestamp: Date.now(),
        payload,
        metadata: {
          publisher: this.serviceName
        }
      };
      
      const routingKey = type;
      const content = Buffer.from(JSON.stringify(event));
      
      await this.channel!.publish(this.exchange, routingKey, content, {
        persistent: true,
        contentType: 'application/json',
        messageId: event.id,
        timestamp: event.timestamp,
        headers: {
          'x-retry-count': 0
        }
      });
      
      logger.debug(`Published event ${event.id} of type ${type}`);
    } catch (error) {
      logger.error(`Failed to publish event of type ${type}`, error);
      throw error;
    }
  }

  /**
   * 订阅事件
   */
  public async subscribe<T>(type: EventType, handler: EventHandler<T>): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // 添加处理器到映射表
      if (!this.handlers.has(type)) {
        this.handlers.set(type, []);
      }
      this.handlers.get(type)!.push(handler as EventHandler);
      
      // 绑定队列到交换机
      const queueName = `${this.serviceName}.events`;
      await this.channel!.bindQueue(queueName, this.exchange, type);
      
      logger.info(`Subscribed to event type ${type}`);
      
      // 如果这是第一个处理器，开始消费消息
      if (this.handlers.get(type)!.length === 1) {
        await this.startConsuming();
      }
    } catch (error) {
      logger.error(`Failed to subscribe to event type ${type}`, error);
      throw error;
    }
  }

  /**
   * 开始消费消息
   */
  private async startConsuming(): Promise<void> {
    try {
      const queueName = `${this.serviceName}.events`;
      
      await this.channel!.consume(queueName, async (msg) => {
        if (!msg) {
          return;
        }
        
        try {
          const content = msg.content.toString();
          const event = JSON.parse(content) as Event;
          const handlers = this.handlers.get(event.type);
          
          if (!handlers || handlers.length === 0) {
            logger.warn(`No handlers registered for event type ${event.type}`);
            this.channel!.ack(msg);
            return;
          }
          
          logger.debug(`Processing event ${event.id} of type ${event.type}`);
          
          // 执行所有处理器
          for (const handler of handlers) {
            try {
              await handler(event);
            } catch (error) {
              logger.error(`Handler failed for event ${event.id} of type ${event.type}`, error);
              
              // 获取重试次数
              const retryCount = (msg.properties.headers['x-retry-count'] || 0) as number;
              
              if (retryCount < 3) {
                // 重试
                const retryContent = Buffer.from(content);
                await this.channel!.publish(this.retryExchange, `${this.serviceName}.retry`, retryContent, {
                  persistent: true,
                  contentType: 'application/json',
                  messageId: event.id,
                  timestamp: event.timestamp,
                  headers: {
                    'x-retry-count': retryCount + 1,
                    'x-original-exchange': this.exchange,
                    'x-original-routing-key': event.type
                  }
                });
                
                logger.info(`Scheduled retry ${retryCount + 1}/3 for event ${event.id}`);
              } else {
                // 发送到死信队列
                logger.error(`Event ${event.id} of type ${event.type} failed after 3 retries, sending to DLQ`);
              }
              
              // 在任何情况下都确认消息，因为我们已经处理了重试逻辑
              this.channel!.ack(msg);
              return;
            }
          }
          
          // 所有处理器成功执行，确认消息
          this.channel!.ack(msg);
          logger.debug(`Successfully processed event ${event.id} of type ${event.type}`);
        } catch (error) {
          logger.error('Failed to process message', error);
          // 如果解析失败，拒绝消息并不重新入队
          this.channel!.reject(msg, false);
        }
      });
      
      logger.info(`Started consuming messages from queue ${queueName}`);
    } catch (error) {
      logger.error('Failed to start consuming messages', error);
      throw error;
    }
  }

  /**
   * 关闭事件总线
   */
  public async close(): Promise<void> {
    if (this.channel) {
      logger.info('Closing event bus');
      this.isInitialized = false;
      this.handlers.clear();
    }
  }
} 