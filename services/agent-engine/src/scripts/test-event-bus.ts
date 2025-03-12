import { 
  initializeMessageQueue, 
  initializeEventBus 
} from '../messaging';
import { EventType } from '../utils';
import { createLogger } from '../utils';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const logger = createLogger('TestEventBus');

async function main() {
  try {
    // 初始化消息队列
    const messageQueue = initializeMessageQueue({
      host: process.env.RABBITMQ_HOST || 'localhost',
      port: parseInt(process.env.RABBITMQ_PORT || '5672'),
      username: process.env.RABBITMQ_USER || 'guest',
      password: process.env.RABBITMQ_PASSWORD || 'guest',
      vhost: process.env.RABBITMQ_VHOST || '/'
    });

    // 连接到 RabbitMQ
    await messageQueue.connect();
    logger.info('Connected to RabbitMQ');

    // 初始化事件总线
    const eventBus = initializeEventBus(messageQueue, 'test-publisher');
    await eventBus.initialize();
    logger.info('Event bus initialized');

    // 发布测试事件
    await eventBus.publish(EventType.AGENT_CREATED, {
      agentId: 'test-agent-1',
      name: 'Test Agent',
      initialFunds: 100,
      riskLevel: 3
    });
    logger.info('Published test event');

    // 等待一段时间，确保消息被处理
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 关闭连接
    await messageQueue.close();
    logger.info('Closed RabbitMQ connection');

    process.exit(0);
  } catch (error) {
    logger.error('Error in test script', error);
    process.exit(1);
  }
}

// 运行测试
main().catch(error => {
  logger.error('Unhandled error in main', error);
  process.exit(1);
}); 