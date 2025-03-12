import { RabbitMQConnection, RabbitMQConfig } from './rabbitmq';
import { EventBus } from './eventBus';
import { createLogger } from '../utils';

const logger = createLogger('Messaging');

// 全局实例
let rabbitMQConnection: RabbitMQConnection | null = null;
let eventBus: EventBus | null = null;

/**
 * 初始化消息队列连接
 */
export function initializeMessageQueue(config: RabbitMQConfig): RabbitMQConnection {
  if (rabbitMQConnection) {
    logger.info('Reusing existing RabbitMQ connection');
    return rabbitMQConnection;
  }

  logger.info('Initializing new RabbitMQ connection');
  rabbitMQConnection = new RabbitMQConnection(config);
  return rabbitMQConnection;
}

/**
 * 初始化事件总线
 */
export function initializeEventBus(connection: RabbitMQConnection, serviceName: string): EventBus {
  if (eventBus) {
    logger.info('Reusing existing event bus');
    return eventBus;
  }

  logger.info(`Initializing new event bus for service ${serviceName}`);
  eventBus = new EventBus(connection, serviceName);
  return eventBus;
}

/**
 * 获取事件总线实例
 */
export function getEventBus(): EventBus {
  if (!eventBus) {
    throw new Error('Event bus not initialized. Call initializeEventBus first.');
  }
  return eventBus;
}

/**
 * 关闭消息队列连接和事件总线
 */
export async function closeMessaging(): Promise<void> {
  try {
    if (eventBus) {
      await eventBus.close();
      eventBus = null;
      logger.info('Event bus closed');
    }

    if (rabbitMQConnection) {
      await rabbitMQConnection.close();
      rabbitMQConnection = null;
      logger.info('RabbitMQ connection closed');
    }
  } catch (error) {
    logger.error('Error closing messaging connections', error);
    throw error;
  }
}

export { RabbitMQConnection, EventBus }; 