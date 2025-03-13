import logger from '../utils/logger';

// 消息类型定义
export enum MessageType {
  PING = 'ping',
  PONG = 'pong',
  DATA = 'data',
  ERROR = 'error',
  COMMAND = 'command',
  RESPONSE = 'response',
}

// 基础消息接口
export interface Message {
  type: MessageType;
  data: any;
  timestamp: string;
}

// 创建消息的工厂函数
export function createMessage(type: MessageType, data: any = {}): Message {
  logger.debug(`Creating message of type: ${type}`);
  return {
    type,
    data,
    timestamp: new Date().toISOString(),
  };
}

// 处理消息的基础函数
export function processMessage(message: Message): void {
  logger.info(`Processing message of type: ${message.type}`);
  
  switch (message.type) {
    case MessageType.PING:
      logger.debug('Received ping message');
      // 处理ping消息
      break;
    case MessageType.DATA:
      logger.debug('Received data message');
      // 处理数据消息
      break;
    case MessageType.COMMAND:
      logger.debug('Received command message');
      // 处理命令消息
      break;
    case MessageType.ERROR:
      logger.error(`Received error message: ${JSON.stringify(message.data)}`);
      // 处理错误消息
      break;
    default:
      logger.warn(`Unknown message type: ${message.type}`);
  }
}

export default {
  createMessage,
  processMessage,
  MessageType,
}; 