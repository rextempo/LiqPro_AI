/**
 * 数据库连接工具
 */

const mongoose = require('mongoose');
const logger = require('./logger');

// MongoDB URI
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/liqpro';

/**
 * 连接到数据库
 */
async function connectToDatabase() {
  try {
    logger.info(`正在连接到MongoDB: ${MONGO_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);
    
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    logger.info('MongoDB连接成功');
  } catch (error) {
    logger.error('MongoDB连接失败', { error: error.message });
    throw error;
  }
}

/**
 * 关闭数据库连接
 */
async function closeDatabaseConnection() {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB连接已关闭');
  } catch (error) {
    logger.error('关闭MongoDB连接失败', { error: error.message });
    throw error;
  }
}

module.exports = {
  connectToDatabase,
  closeDatabaseConnection
}; 