/**
 * MongoDB 数据库连接工具
 */

import mongoose from 'mongoose';
import logger from './logger';

// 默认连接字符串，可通过环境变量覆盖
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/liqpro';

/**
 * 连接到 MongoDB 数据库
 */
export async function connectToDatabase(): Promise<void> {
  try {
    await mongoose.connect(MONGO_URI);
    logger.info('已成功连接到 MongoDB 数据库');
  } catch (error) {
    logger.error('连接到 MongoDB 数据库失败', { error });
    throw error;
  }
}

/**
 * 关闭 MongoDB 数据库连接
 */
export async function closeDatabaseConnection(): Promise<void> {
  try {
    await mongoose.connection.close();
    logger.info('已关闭 MongoDB 数据库连接');
  } catch (error) {
    logger.error('关闭 MongoDB 数据库连接失败', { error });
    throw error;
  }
}

/**
 * 检查数据库连接状态
 * @returns 连接状态
 */
export function getDatabaseStatus(): { connected: boolean; status: string } {
  const connected = mongoose.connection.readyState === 1;
  let status = 'disconnected';
  
  switch (mongoose.connection.readyState) {
    case 0:
      status = 'disconnected';
      break;
    case 1:
      status = 'connected';
      break;
    case 2:
      status = 'connecting';
      break;
    case 3:
      status = 'disconnecting';
      break;
    default:
      status = 'unknown';
  }
  
  return { connected, status };
} 