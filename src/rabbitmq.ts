import amqp, { Connection, Channel } from 'amqplib';
import { createLogger } from '../utils';

const logger = createLogger('RabbitMQ');

export interface RabbitMQConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  vhost: string;
}

export class RabbitMQConnection {
  private connection: Connection | null = null;
  private channel: Channel | null = null;
  private readonly config: RabbitMQConfig;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;
  private readonly reconnectInterval = 5000; // 5 seconds

  constructor(config: RabbitMQConfig) {
    this.config = config;
  }

  /**
   * Connect to RabbitMQ server
   */
  public async connect(): Promise<Connection> {
    try {
      const { host, port, username, password, vhost } = this.config;
      const url = `amqp://${username}:${password}@${host}:${port}${vhost}`;
      
      logger.info(`Connecting to RabbitMQ at ${host}:${port}${vhost}`);
      this.connection = await amqp.connect(url);
      
      // Reset reconnect attempts on successful connection
      this.reconnectAttempts = 0;
      
      // Handle connection close
      this.connection.on('close', (err) => {
        logger.warn('RabbitMQ connection closed', err);
        this.connection = null;
        this.channel = null;
        this.reconnect();
      });
      
      // Handle connection error
      this.connection.on('error', (err) => {
        logger.error('RabbitMQ connection error', err);
        this.connection = null;
        this.channel = null;
        this.reconnect();
      });
      
      logger.info('Connected to RabbitMQ');
      return this.connection;
    } catch (error) {
      logger.error('Failed to connect to RabbitMQ', error);
      this.reconnect();
      throw error;
    }
  }

  /**
   * Create a channel
   */
  public async createChannel(): Promise<Channel> {
    if (!this.connection) {
      await this.connect();
    }

    try {
      this.channel = await this.connection!.createChannel();
      
      // Handle channel close
      this.channel.on('close', () => {
        logger.warn('RabbitMQ channel closed');
        this.channel = null;
      });
      
      // Handle channel error
      this.channel.on('error', (err) => {
        logger.error('RabbitMQ channel error', err);
        this.channel = null;
      });
      
      logger.info('Created RabbitMQ channel');
      return this.channel;
    } catch (error) {
      logger.error('Failed to create RabbitMQ channel', error);
      throw error;
    }
  }

  /**
   * Get an existing channel or create a new one
   */
  public async getChannel(): Promise<Channel> {
    if (this.channel) {
      return this.channel;
    }
    
    return this.createChannel();
  }

  /**
   * Close the connection and channel
   */
  public async close(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
        logger.info('Closed RabbitMQ channel');
      }
      
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
        logger.info('Closed RabbitMQ connection');
      }
    } catch (error) {
      logger.error('Error closing RabbitMQ connection', error);
      throw error;
    }
  }

  /**
   * Attempt to reconnect to RabbitMQ
   */
  private reconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error(`Failed to reconnect to RabbitMQ after ${this.maxReconnectAttempts} attempts`);
      return;
    }
    
    this.reconnectAttempts++;
    
    logger.info(`Attempting to reconnect to RabbitMQ (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        // Error is already logged in connect method
      }
    }, this.reconnectInterval);
  }
} 