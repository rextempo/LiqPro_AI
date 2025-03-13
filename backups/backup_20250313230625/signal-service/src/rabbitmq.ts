import amqp from 'amqplib';
import { logger } from './logger';
import { processPoolData } from './services/signalService';

// 声明amqplib模块
declare module 'amqplib';

// RabbitMQ 配置
const RABBITMQ_HOST = process.env.RABBITMQ_HOST || 'localhost';
const RABBITMQ_PORT = process.env.RABBITMQ_PORT || '5672';
const RABBITMQ_USER = process.env.RABBITMQ_USER || 'guest';
const RABBITMQ_PASS = process.env.RABBITMQ_PASS || 'guest';

// 队列名称
export const POOL_DATA_QUEUE = 'pool_data_queue';
export const SIGNAL_QUEUE = 'signal_queue';

// 连接 URL
const connectionURL = `amqp://${RABBITMQ_USER}:${RABBITMQ_PASS}@${RABBITMQ_HOST}:${RABBITMQ_PORT}`;

// 连接和通道
let connection: amqp.Connection | null = null;
let channel: amqp.Channel | null = null;

/**
 * 设置 RabbitMQ 连接和通道
 */
export const setupRabbitMQ = async (): Promise<void> => {
  try {
    logger.info('正在连接到 RabbitMQ...');
    
    // 创建连接
    connection = await amqp.connect(connectionURL);
    logger.info('RabbitMQ 连接成功');
    
    // 处理连接关闭
    connection.on('close', () => {
      logger.warn('RabbitMQ 连接已关闭，尝试重新连接...');
      setTimeout(setupRabbitMQ, 5000);
    });
    
    // 创建通道
    channel = await connection.createChannel();
    logger.info('RabbitMQ 通道创建成功');
    
    // 确保队列存在
    await channel.assertQueue(POOL_DATA_QUEUE, { durable: true });
    await channel.assertQueue(SIGNAL_QUEUE, { durable: true });
    logger.info(`队列 ${POOL_DATA_QUEUE} 和 ${SIGNAL_QUEUE} 已确认`);
    
    // 设置消费者
    await setupConsumers();
    
    logger.info('RabbitMQ 设置完成');
  } catch (error) {
    logger.error('RabbitMQ 设置失败:', error);
    throw error;
  }
};

/**
 * 设置消息消费者
 */
const setupConsumers = async (): Promise<void> => {
  if (!channel) {
    throw new Error('RabbitMQ 通道未初始化');
  }
  
  // 消费池数据队列
  channel.consume(POOL_DATA_QUEUE, async (msg: amqp.ConsumeMessage | null) => {
    if (msg) {
      try {
        const content = msg.content.toString();
        logger.info(`收到池数据消息: ${content.substring(0, 100)}...`);
        
        // 处理池数据
        await processPoolData(JSON.parse(content));
        
        // 确认消息
        channel?.ack(msg);
      } catch (error) {
        logger.error('处理池数据消息失败:', error);
        // 拒绝消息并重新排队
        channel?.nack(msg, false, true);
      }
    }
  });
  
  logger.info(`已设置 ${POOL_DATA_QUEUE} 队列的消费者`);
};

/**
 * 发布信号到队列
 */
export const publishSignal = async (signal: any): Promise<void> => {
  if (!channel) {
    throw new Error('RabbitMQ 通道未初始化');
  }
  
  try {
    const message = JSON.stringify(signal);
    channel.publish('', SIGNAL_QUEUE, Buffer.from(message));
    logger.info(`信号已发布到 ${SIGNAL_QUEUE} 队列`);
  } catch (error) {
    logger.error('发布信号失败:', error);
    throw error;
  }
};

/**
 * 关闭 RabbitMQ 连接
 */
export const closeRabbitMQ = async (): Promise<void> => {
  try {
    if (channel) {
      await channel.close();
      logger.info('RabbitMQ 通道已关闭');
    }
    
    if (connection) {
      await connection.close();
      logger.info('RabbitMQ 连接已关闭');
    }
  } catch (error) {
    logger.error('关闭 RabbitMQ 连接失败:', error);
  }
}; 