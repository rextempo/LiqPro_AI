"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const events_1 = require("events");
const utils_1 = require("./utils");
const eventHandlers_1 = require("./eventHandlers");
const messaging_1 = require("./messaging");
const monitoring_1 = require("./monitoring");
// Create logger
const logger = (0, utils_1.createLogger)('AgentEngine');
// Initialize Express app
const app = (0, express_1.default)();
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use((0, utils_1.expressLogger)());
app.use((0, monitoring_1.metricsMiddleware)());
// 初始化健康监控
(0, monitoring_1.initializeHealthMonitoring)();
// 创建事件发射器用于监控连接状态
const connectionEvents = new events_1.EventEmitter();
// 更新 MQ 连接状态指标
connectionEvents.on('connected', () => {
    monitoring_1.mqConnectionStatus.set(1);
    (0, monitoring_1.checkMessageQueueHealth)(true);
});
connectionEvents.on('disconnected', () => {
    monitoring_1.mqConnectionStatus.set(0);
    (0, monitoring_1.checkMessageQueueHealth)(false);
});
// Initialize message queue
const messageQueue = (0, messaging_1.initializeMessageQueue)({
    host: process.env.RABBITMQ_HOST || 'localhost',
    port: parseInt(process.env.RABBITMQ_PORT || '5672'),
    username: process.env.RABBITMQ_USER || 'guest',
    password: process.env.RABBITMQ_PASSWORD || 'guest',
    vhost: process.env.RABBITMQ_VHOST || '/'
});
// Initialize event bus
const eventBus = (0, messaging_1.initializeEventBus)(messageQueue, 'agent-engine');
// 包装发布方法以添加指标
const originalPublish = eventBus.publish.bind(eventBus);
eventBus.publish = async function (type, payload) {
    await originalPublish(type, payload);
    monitoring_1.mqMessagesPublishedTotal.inc({
        exchange: 'liqpro.events',
        routing_key: type
    });
};
// Connect to message queue and set up event handlers
async function setupEventHandlers() {
    try {
        // Connect to message queue
        await messageQueue.connect();
        logger.info('Connected to RabbitMQ');
        connectionEvents.emit('connected');
        // Initialize event bus
        await eventBus.initialize();
        logger.info('Event bus initialized');
        // Subscribe to agent events
        await eventBus.subscribe(utils_1.EventType.AGENT_CREATED, async (event) => {
            monitoring_1.mqMessagesConsumedTotal.inc({
                queue: 'agent-engine',
                event_type: utils_1.EventType.AGENT_CREATED
            });
            return (0, eventHandlers_1.handleAgentCreated)(event);
        });
        await eventBus.subscribe(utils_1.EventType.AGENT_STARTED, async (event) => {
            monitoring_1.mqMessagesConsumedTotal.inc({
                queue: 'agent-engine',
                event_type: utils_1.EventType.AGENT_STARTED
            });
            return (0, eventHandlers_1.handleAgentStarted)(event);
        });
        await eventBus.subscribe(utils_1.EventType.AGENT_STOPPED, async (event) => {
            monitoring_1.mqMessagesConsumedTotal.inc({
                queue: 'agent-engine',
                event_type: utils_1.EventType.AGENT_STOPPED
            });
            return (0, eventHandlers_1.handleAgentStopped)(event);
        });
        // Subscribe to signal events
        await eventBus.subscribe(utils_1.EventType.SIGNAL_GENERATED, async (event) => {
            monitoring_1.mqMessagesConsumedTotal.inc({
                queue: 'agent-engine',
                event_type: utils_1.EventType.SIGNAL_GENERATED
            });
            return (0, eventHandlers_1.handleSignalGenerated)(event);
        });
        logger.info('Event handlers registered');
    }
    catch (error) {
        logger.error('Failed to set up event handlers', error);
        connectionEvents.emit('disconnected');
        // Retry after delay
        setTimeout(setupEventHandlers, 5000);
    }
}
// 设置健康检查端点
(0, monitoring_1.setupHealthEndpoint)(app);
// 设置 Prometheus 指标端点
(0, monitoring_1.setupMetricsEndpoint)(app);
// 启动健康检查
let healthCheckInterval;
// Start application
setupEventHandlers()
    .then(() => {
    // 启动定期健康检查
    healthCheckInterval = (0, monitoring_1.startHealthChecks)(parseInt(process.env.HEALTH_CHECK_INTERVAL || '60000'));
    logger.info('Health checks started');
})
    .catch(err => {
    logger.error('Failed to set up event handlers', err);
});
// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Unhandled error', err);
    res.status(500).json({ error: 'Internal server error' });
});
// 优雅关闭
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully');
    // 停止健康检查
    if (healthCheckInterval) {
        (0, monitoring_1.stopHealthChecks)(healthCheckInterval);
    }
    // 关闭消息队列连接
    await (0, messaging_1.closeMessaging)();
    // 更新指标
    connectionEvents.emit('disconnected');
    process.exit(0);
});
process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully');
    // 停止健康检查
    if (healthCheckInterval) {
        (0, monitoring_1.stopHealthChecks)(healthCheckInterval);
    }
    // 关闭消息队列连接
    await (0, messaging_1.closeMessaging)();
    // 更新指标
    connectionEvents.emit('disconnected');
    process.exit(0);
});
exports.default = app;
//# sourceMappingURL=app-new.js.map