import amqplib, { Channel, Connection } from 'amqplib';
import { logger } from './logger';
import { processPoolData } from './services/signalService';

// RabbitMQ 连接配置
const RABBITMQ_HOST = process.env.RABBITMQ_HOST || 'localhost';
const RABBITMQ_PORT = process.env.RABBITMQ_PORT || '5672';
const RABBITMQ_USER = process.env.RABBITMQ_USER || 'guest';
const RABBITMQ_PASS = process.env.RABBITMQ_PASS || 'guest';

// 队列名称
const POOL_DATA_QUEUE = 'pool_data';
const SIGNAL_QUEUE = 'trading_signals';

let connection: Connection;
let channel: Channel;

/**
 * 设置 RabbitMQ 连接和通道
 */
export const setupRabbitMQ = async (): Promise<void> => {
  try {
    // 创建连接
    const url = `amqp://${RABBITMQ_USER}:${RABBITMQ_PASS}@${RABBITMQ_HOST}:${RABBITMQ_PORT}`;
    connection = await amqplib.connect(url);
    
    // 创建通道
    channel = await connection.createChannel();
    
    // 确保队列存在
    await channel.assertQueue(POOL_DATA_QUEUE, { durable: true });
    await channel.assertQueue(SIGNAL_QUEUE, { durable: true });
    
    // 设置消费者
    await setupConsumers();
    
    logger.info('RabbitMQ 连接和通道设置成功');
    
    // 处理连接关闭
    connection.on('close', () => {
      logger.error('RabbitMQ 连接关闭，尝试重新连接...');
      setTimeout(setupRabbitMQ, 5000);
    });
  } catch (error) {
    logger.error('RabbitMQ 设置失败:', error);
    setTimeout(setupRabbitMQ, 5000);
  }
};

/**
 * 设置消息队列消费者
 */
const setupConsumers = async (): Promise<void> => {
  try {
    // 消费池数据队列
    await channel.consume(POOL_DATA_QUEUE, async (msg) => {
      if (msg) {
        try {
          const content = msg.content.toString();
          const poolData = JSON.parse(content);
          
          // 处理池数据并生成信号
          await processPoolData(poolData);
          
          // 确认消息已处理
          channel.ack(msg);
        } catch (error) {
          logger.error('处理池数据消息失败:', error);
          // 拒绝消息并重新排队
          channel.nack(msg, false, true);
        }
      }
    });
    
    logger.info('RabbitMQ 消费者设置成功');
  } catch (error) {
    logger.error('设置 RabbitMQ 消费者失败:', error);
    throw error;
  }
};

/**
 * 发布信号到队列
 */
export const publishSignal = async (signal: any): Promise<void> => {
  try {
    const message = JSON.stringify(signal);
    channel.publish('', SIGNAL_QUEUE, Buffer.from(message));
    logger.info('信号已发布到队列', { signal });
  } catch (error) {
    logger.error('发布信号失败:', error);
    throw error;
  }
}; 