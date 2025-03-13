"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const messaging_1 = require("../messaging");
const utils_1 = require("../utils");
const utils_2 = require("../utils");
const dotenv_1 = __importDefault(require("dotenv"));
// 加载环境变量
dotenv_1.default.config();
const logger = (0, utils_2.createLogger)('TestEventBus');
async function main() {
    try {
        // 初始化消息队列
        const messageQueue = (0, messaging_1.initializeMessageQueue)({
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
        const eventBus = (0, messaging_1.initializeEventBus)(messageQueue, 'test-publisher');
        await eventBus.initialize();
        logger.info('Event bus initialized');
        // 发布测试事件
        await eventBus.publish(utils_1.EventType.AGENT_CREATED, {
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
    }
    catch (error) {
        logger.error('Error in test script', error);
        process.exit(1);
    }
}
// 运行测试
main().catch(error => {
    logger.error('Unhandled error in main', error);
    process.exit(1);
});
//# sourceMappingURL=test-event-bus.js.map