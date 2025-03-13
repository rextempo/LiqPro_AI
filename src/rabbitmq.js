"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RabbitMQConnection = void 0;
const amqplib_1 = __importDefault(require("amqplib"));
const utils_1 = require("../utils");
const logger = (0, utils_1.createLogger)('RabbitMQ');
class RabbitMQConnection {
    constructor(config) {
        this.connection = null;
        this.channel = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectInterval = 5000; // 5 seconds
        this.config = config;
    }
    /**
     * Connect to RabbitMQ server
     */
    async connect() {
        try {
            const { host, port, username, password, vhost } = this.config;
            const url = `amqp://${username}:${password}@${host}:${port}${vhost}`;
            logger.info(`Connecting to RabbitMQ at ${host}:${port}${vhost}`);
            this.connection = await amqplib_1.default.connect(url);
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
        }
        catch (error) {
            logger.error('Failed to connect to RabbitMQ', error);
            this.reconnect();
            throw error;
        }
    }
    /**
     * Create a channel
     */
    async createChannel() {
        if (!this.connection) {
            await this.connect();
        }
        try {
            this.channel = await this.connection.createChannel();
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
        }
        catch (error) {
            logger.error('Failed to create RabbitMQ channel', error);
            throw error;
        }
    }
    /**
     * Get an existing channel or create a new one
     */
    async getChannel() {
        if (this.channel) {
            return this.channel;
        }
        return this.createChannel();
    }
    /**
     * Close the connection and channel
     */
    async close() {
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
        }
        catch (error) {
            logger.error('Error closing RabbitMQ connection', error);
            throw error;
        }
    }
    /**
     * Attempt to reconnect to RabbitMQ
     */
    reconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            logger.error(`Failed to reconnect to RabbitMQ after ${this.maxReconnectAttempts} attempts`);
            return;
        }
        this.reconnectAttempts++;
        logger.info(`Attempting to reconnect to RabbitMQ (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        setTimeout(async () => {
            try {
                await this.connect();
            }
            catch (error) {
                // Error is already logged in connect method
            }
        }, this.reconnectInterval);
    }
}
exports.RabbitMQConnection = RabbitMQConnection;
//# sourceMappingURL=rabbitmq.js.map