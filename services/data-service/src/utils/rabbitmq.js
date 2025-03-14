const amqp = require('amqplib');
const logger = require('./logger');

// RabbitMQ配置
const RABBITMQ_HOST = process.env.RABBITMQ_HOST || 'rabbitmq';
const RABBITMQ_PORT = process.env.RABBITMQ_PORT || '5672';
const RABBITMQ_USER = process.env.RABBITMQ_USER || 'liqpro';
const RABBITMQ_PASS = process.env.RABBITMQ_PASS || 'liqpro_password';
const RABBITMQ_URL = `amqp://${RABBITMQ_USER}:${RABBITMQ_PASS}@${RABBITMQ_HOST}:${RABBITMQ_PORT}`;

// 队列名称
const POOL_DATA_QUEUE = 'pool_data_queue';
const SIGNAL_QUEUE = 'signal_queue';

// 连接和通道
let connection = null;
let channel = null;
let isConnecting = false;
let reconnectTimer = null;

/**
 * 连接到RabbitMQ
 * @returns {Promise<boolean>} 连接是否成功
 */
async function connect() {
  // 如果已经在连接中，直接返回
  if (isConnecting) {
    logger.info('RabbitMQ连接已在进行中，跳过重复连接');
    return false;
  }
  
  // 如果已经连接，直接返回
  if (connection && channel) {
    logger.info('RabbitMQ已连接，跳过重复连接');
    return true;
  }
  
  isConnecting = true;
  
  try {
    logger.info(`正在连接到RabbitMQ: ${RABBITMQ_HOST}:${RABBITMQ_PORT}`);
    
    // 创建连接
    connection = await amqp.connect(RABBITMQ_URL, {
      heartbeat: 30, // 心跳间隔30秒
      timeout: 30000, // 连接超时30秒
    });
    
    // 创建通道
    channel = await connection.createChannel();
    
    // 确保队列存在
    await channel.assertQueue(POOL_DATA_QUEUE, {
      durable: true
    });
    
    // 确保信号队列存在
    await channel.assertQueue(SIGNAL_QUEUE, {
      durable: true
    });
    
    // 设置连接关闭处理
    connection.on('close', (err) => {
      logger.warn(`RabbitMQ连接已关闭: ${err ? err.message : '未知原因'}`);
      connection = null;
      channel = null;
      
      // 清除之前的重连定时器
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      
      // 设置重连
      reconnectTimer = setTimeout(() => {
        isConnecting = false;
        connect().catch(error => {
          logger.error('RabbitMQ重连失败:', error);
        });
      }, 5000);
    });
    
    // 设置错误处理
    connection.on('error', (err) => {
      logger.error(`RabbitMQ连接错误: ${err.message}`);
      
      // 如果连接已经关闭，不需要再次关闭
      if (connection) {
        try {
          connection.close();
        } catch (closeError) {
          logger.error(`关闭RabbitMQ连接失败: ${closeError.message}`);
        }
      }
      
      connection = null;
      channel = null;
    });
    
    // 设置通道错误处理
    channel.on('error', (err) => {
      logger.error(`RabbitMQ通道错误: ${err.message}`);
      channel = null;
    });
    
    logger.info('RabbitMQ连接成功');
    isConnecting = false;
    return true;
  } catch (error) {
    logger.error('RabbitMQ连接失败:', error);
    
    // 清除之前的重连定时器
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
    }
    
    // 设置重连
    reconnectTimer = setTimeout(() => {
      isConnecting = false;
      connect().catch(error => {
        logger.error('RabbitMQ重连失败:', error);
      });
    }, 5000);
    
    isConnecting = false;
    return false;
  }
}

/**
 * 发布池数据到RabbitMQ
 * @param {Array|Object} poolData 池数据
 * @returns {Promise<boolean>} 发布是否成功
 */
async function publishPoolData(poolData) {
  try {
    // 确保连接和通道存在
    if (!connection || !channel) {
      logger.warn('RabbitMQ未连接，尝试重新连接...');
      await connect();
      
      if (!connection || !channel) {
        logger.error('RabbitMQ连接失败，无法发布数据');
        return false;
      }
    }
    
    // 准备消息
    const message = {
      type: 'pool_data',
      timestamp: new Date().toISOString(),
      data: poolData
    };
    
    // 发布消息
    const result = channel.sendToQueue(
      POOL_DATA_QUEUE,
      Buffer.from(JSON.stringify(message)),
      { persistent: true }
    );
    
    if (result) {
      logger.info(`成功发布池数据到队列 ${POOL_DATA_QUEUE}`);
    } else {
      logger.warn(`发布池数据到队列 ${POOL_DATA_QUEUE} 失败，通道缓冲区已满`);
      
      // 等待一段时间后重试
      await new Promise(resolve => setTimeout(resolve, 1000));
      return publishPoolData(poolData);
    }
    
    return result;
  } catch (error) {
    logger.error('发布池数据失败:', error);
    
    // 重置连接和通道
    connection = null;
    channel = null;
    
    // 重新连接并重试
    await connect();
    return false;
  }
}

/**
 * 消费信号队列中的消息
 * @param {Function} callback 处理信号的回调函数
 * @returns {Promise<boolean>} 是否成功开始消费
 */
async function consumeSignals(callback) {
  try {
    // 确保连接和通道存在
    if (!connection || !channel) {
      logger.warn('RabbitMQ未连接，尝试重新连接...');
      await connect();
      
      if (!connection || !channel) {
        logger.error('RabbitMQ连接失败，无法消费信号');
        return false;
      }
    }
    
    // 设置预取数量为1，确保一次只处理一条消息
    await channel.prefetch(1);
    
    // 开始消费信号队列
    await channel.consume(SIGNAL_QUEUE, async (msg) => {
      if (msg) {
        try {
          // 解析消息内容
          const signal = JSON.parse(msg.content.toString());
          logger.info(`收到信号: ${signal.id}`);
          
          // 调用回调函数处理信号
          await callback(signal);
          
          // 确认消息已处理
          channel.ack(msg);
        } catch (error) {
          logger.error('处理信号失败:', error);
          // 拒绝消息并重新入队
          channel.nack(msg, false, true);
        }
      }
    }, { noAck: false });
    
    logger.info(`开始消费信号队列 ${SIGNAL_QUEUE}`);
    return true;
  } catch (error) {
    logger.error('开始消费信号队列失败:', error);
    
    // 重置连接和通道
    connection = null;
    channel = null;
    
    // 重新连接并重试
    setTimeout(() => {
      consumeSignals(callback).catch(error => {
        logger.error('重试消费信号队列失败:', error);
      });
    }, 5000);
    
    return false;
  }
}

/**
 * 关闭RabbitMQ连接
 */
async function close() {
  try {
    if (channel) {
      await channel.close();
      channel = null;
    }
    
    if (connection) {
      await connection.close();
      connection = null;
    }
    
    // 清除重连定时器
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    
    logger.info('RabbitMQ连接已关闭');
  } catch (error) {
    logger.error('关闭RabbitMQ连接失败:', error);
  }
}

/**
 * 发布消息到指定队列
 * @param {string} queueName - 队列名称
 * @param {any} data - 要发布的数据
 * @returns {Promise<boolean>} 是否成功发布
 */
async function publishToQueue(queueName, data) {
  try {
    // 确保连接和通道存在
    if (!connection || !channel) {
      logger.warn('RabbitMQ未连接，尝试重新连接...');
      await connect();
      
      if (!connection || !channel) {
        logger.error('RabbitMQ连接失败，无法发布数据');
        return false;
      }
    }
    
    // 确保队列存在
    await channel.assertQueue(queueName, { durable: true });
    
    // 发布消息
    const success = channel.sendToQueue(
      queueName,
      Buffer.from(JSON.stringify(data)),
      { persistent: true }
    );
    
    if (!success) {
      logger.warn(`发布消息到队列 ${queueName} 失败，通道缓冲区已满`);
      
      // 等待一段时间后重试
      await new Promise(resolve => setTimeout(resolve, 1000));
      return publishToQueue(queueName, data);
    }
    
    logger.info(`成功发布消息到队列 ${queueName}`);
    return true;
  } catch (error) {
    logger.error(`发布消息到队列 ${queueName} 失败:`, error);
    
    // 重置连接和通道
    connection = null;
    channel = null;
    
    // 重新连接
    await connect();
    return false;
  }
}

module.exports = {
  connect,
  publishPoolData,
  consumeSignals,
  close,
  publishToQueue
}; 