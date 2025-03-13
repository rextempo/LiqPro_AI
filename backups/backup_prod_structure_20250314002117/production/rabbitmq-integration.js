/**
 * RabbitMQ集成模块
 * 
 * 负责将数据发送到RabbitMQ消息队列
 */

const amqp = require('amqplib');
const logger = require('./src/utils/logger');

class RabbitMQPublisher {
  constructor(config) {
    this.config = {
      host: config.host || 'rabbitmq',
      port: config.port || 5672,
      username: config.username || 'liqpro',
      password: config.password || 'liqpro',
      poolDataQueue: config.poolDataQueue || 'pool_data_queue',
      reconnectInterval: config.reconnectInterval || 5000,
      ...config
    };
    
    this.connection = null;
    this.channel = null;
    this.isConnecting = false;
    this.connectionRetries = 0;
    this.maxRetries = 10;
  }
  
  /**
   * 连接到RabbitMQ
   */
  async connect() {
    if (this.isConnecting) {
      return;
    }
    
    this.isConnecting = true;
    
    try {
      // 构建连接URL
      const connectionUrl = `amqp://${this.config.username}:${this.config.password}@${this.config.host}:${this.config.port}`;
      logger.info(`正在连接到RabbitMQ: amqp://${this.config.username}:***@${this.config.host}:${this.config.port}`);
      
      // 创建连接
      this.connection = await amqp.connect(connectionUrl);
      logger.info('RabbitMQ连接成功');
      
      // 重置重试计数
      this.connectionRetries = 0;
      
      // 处理连接关闭
      this.connection.on('close', () => {
        logger.warn('RabbitMQ连接已关闭，尝试重新连接...');
        this.connection = null;
        this.channel = null;
        
        // 延迟重连
        setTimeout(() => {
          this.isConnecting = false;
          this.connect();
        }, this.config.reconnectInterval);
      });
      
      // 处理错误
      this.connection.on('error', (err) => {
        logger.error('RabbitMQ连接错误', { error: err.message });
        
        if (this.connection) {
          try {
            this.connection.close();
          } catch (closeErr) {
            logger.error('关闭RabbitMQ连接时出错', { error: closeErr.message });
          }
        }
        
        this.connection = null;
        this.channel = null;
        
        // 延迟重连
        setTimeout(() => {
          this.isConnecting = false;
          this.connect();
        }, this.config.reconnectInterval);
      });
      
      // 创建通道
      this.channel = await this.connection.createChannel();
      logger.info('RabbitMQ通道创建成功');
      
      // 确保队列存在
      await this.channel.assertQueue(this.config.poolDataQueue, { durable: true });
      logger.info(`队列 ${this.config.poolDataQueue} 已确认`);
      
      this.isConnecting = false;
    } catch (error) {
      this.connectionRetries++;
      logger.error('RabbitMQ连接失败', { 
        error: error.message, 
        retries: this.connectionRetries,
        maxRetries: this.maxRetries
      });
      
      this.connection = null;
      this.channel = null;
      
      // 如果重试次数超过最大值，停止重试
      if (this.connectionRetries >= this.maxRetries) {
        logger.error(`RabbitMQ连接失败次数超过最大值(${this.maxRetries})，停止重试`);
        this.isConnecting = false;
        return;
      }
      
      // 延迟重连
      setTimeout(() => {
        this.isConnecting = false;
        this.connect();
      }, this.config.reconnectInterval);
    }
  }
  
  /**
   * 发布池数据到队列
   * @param {Object} poolData 池数据
   */
  async publishPoolData(poolData) {
    try {
      // 如果没有连接或通道，尝试连接
      if (!this.connection || !this.channel) {
        await this.connect();
        
        // 如果连接失败，记录错误并返回
        if (!this.connection || !this.channel) {
          logger.error('无法发布池数据，RabbitMQ未连接');
          return false;
        }
      }
      
      // 发布消息
      const message = JSON.stringify(poolData);
      const result = this.channel.publish('', this.config.poolDataQueue, Buffer.from(message));
      
      if (result) {
        logger.info(`池数据已发布到 ${this.config.poolDataQueue} 队列`, { 
          poolId: poolData.poolId || poolData.address,
          messageSize: message.length
        });
        return true;
      } else {
        logger.warn('发布池数据失败，通道已满或已关闭，尝试重新创建通道...');
        
        // 关闭旧通道
        try {
          await this.channel.close();
        } catch (closeError) {
          logger.error('关闭旧通道时出错', { error: closeError.message });
        }
        
        // 创建新通道
        try {
          this.channel = await this.connection.createChannel();
          await this.channel.assertQueue(this.config.poolDataQueue, { durable: true });
          logger.info('已重新创建RabbitMQ通道');
          
          // 重试发布
          const retryResult = this.channel.publish('', this.config.poolDataQueue, Buffer.from(message));
          
          if (retryResult) {
            logger.info(`重试成功：池数据已发布到 ${this.config.poolDataQueue} 队列`, {
              poolId: poolData.poolId || poolData.address,
              messageSize: message.length
            });
            return true;
          } else {
            logger.error('重试发布池数据失败');
            return false;
          }
        } catch (channelError) {
          logger.error('重新创建通道失败', { error: channelError.message });
          this.channel = null;
          return false;
        }
      }
    } catch (error) {
      logger.error('发布池数据时出错', { error: error.message });
      
      // 重置连接和通道
      this.connection = null;
      this.channel = null;
      
      return false;
    }
  }
  
  /**
   * 关闭连接
   */
  async close() {
    try {
      if (this.channel) {
        await this.channel.close();
        logger.info('RabbitMQ通道已关闭');
      }
      
      if (this.connection) {
        await this.connection.close();
        logger.info('RabbitMQ连接已关闭');
      }
    } catch (error) {
      logger.error('关闭RabbitMQ连接时出错', { error: error.message });
    } finally {
      this.channel = null;
      this.connection = null;
    }
  }
}

module.exports = { RabbitMQPublisher }; 