import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { EventEmitter } from 'events';
import { 
  createLogger, 
  expressLogger, 
  EventType,
  Event,
  AgentCreatedPayload
} from './utils';
import {
  handleAgentCreated,
  handleAgentStarted,
  handleAgentStopped,
  handleSignalGenerated
} from './eventHandlers';
import { 
  initializeMessageQueue, 
  initializeEventBus,
  closeMessaging
} from './messaging';
import {
  metricsMiddleware,
  setupMetricsEndpoint,
  mqConnectionStatus,
  mqMessagesPublishedTotal,
  mqMessagesConsumedTotal,
  initializeHealthMonitoring,
  setupHealthEndpoint,
  checkMessageQueueHealth,
  startHealthChecks,
  stopHealthChecks,
  SystemComponent
} from './monitoring';

// Create logger
const logger = createLogger('AgentEngine');

// Initialize Express app
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(expressLogger());
app.use(metricsMiddleware());

// 初始化健康监控
initializeHealthMonitoring();

// 创建事件发射器用于监控连接状态
const connectionEvents = new EventEmitter();

// 更新 MQ 连接状态指标
connectionEvents.on('connected', () => {
  mqConnectionStatus.set(1);
  checkMessageQueueHealth(true);
});

connectionEvents.on('disconnected', () => {
  mqConnectionStatus.set(0);
  checkMessageQueueHealth(false);
});

// Initialize message queue
const messageQueue = initializeMessageQueue({
  host: process.env.RABBITMQ_HOST || 'localhost',
  port: parseInt(process.env.RABBITMQ_PORT || '5672'),
  username: process.env.RABBITMQ_USER || 'guest',
  password: process.env.RABBITMQ_PASSWORD || 'guest',
  vhost: process.env.RABBITMQ_VHOST || '/'
});

// Initialize event bus
const eventBus = initializeEventBus(messageQueue, 'agent-engine');

// 包装发布方法以添加指标
const originalPublish = eventBus.publish.bind(eventBus);
eventBus.publish = async function<T>(type: EventType, payload: T): Promise<void> {
  await originalPublish(type, payload);
  mqMessagesPublishedTotal.inc({
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
    await eventBus.subscribe(EventType.AGENT_CREATED, async (event: Event<AgentCreatedPayload>) => {
      mqMessagesConsumedTotal.inc({
        queue: 'agent-engine',
        event_type: EventType.AGENT_CREATED
      });
      return handleAgentCreated(event);
    });
    
    await eventBus.subscribe(EventType.AGENT_STARTED, async (event: Event<any>) => {
      mqMessagesConsumedTotal.inc({
        queue: 'agent-engine',
        event_type: EventType.AGENT_STARTED
      });
      return handleAgentStarted(event);
    });
    
    await eventBus.subscribe(EventType.AGENT_STOPPED, async (event: Event<any>) => {
      mqMessagesConsumedTotal.inc({
        queue: 'agent-engine',
        event_type: EventType.AGENT_STOPPED
      });
      return handleAgentStopped(event);
    });
    
    // Subscribe to signal events
    await eventBus.subscribe(EventType.SIGNAL_GENERATED, async (event: Event<any>) => {
      mqMessagesConsumedTotal.inc({
        queue: 'agent-engine',
        event_type: EventType.SIGNAL_GENERATED
      });
      return handleSignalGenerated(event);
    });
    
    logger.info('Event handlers registered');
  } catch (error) {
    logger.error('Failed to set up event handlers', error);
    connectionEvents.emit('disconnected');
    // Retry after delay
    setTimeout(setupEventHandlers, 5000);
  }
}

// 设置健康检查端点
setupHealthEndpoint(app);

// 设置 Prometheus 指标端点
setupMetricsEndpoint(app);

// 启动健康检查
let healthCheckInterval: NodeJS.Timeout;

// Start application
setupEventHandlers()
  .then(() => {
    // 启动定期健康检查
    healthCheckInterval = startHealthChecks(
      parseInt(process.env.HEALTH_CHECK_INTERVAL || '60000')
    );
    logger.info('Health checks started');
  })
  .catch(err => {
    logger.error('Failed to set up event handlers', err);
  });

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 优雅关闭
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  // 停止健康检查
  if (healthCheckInterval) {
    stopHealthChecks(healthCheckInterval);
  }
  
  // 关闭消息队列连接
  await closeMessaging();
  
  // 更新指标
  connectionEvents.emit('disconnected');
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  // 停止健康检查
  if (healthCheckInterval) {
    stopHealthChecks(healthCheckInterval);
  }
  
  // 关闭消息队列连接
  await closeMessaging();
  
  // 更新指标
  connectionEvents.emit('disconnected');
  
  process.exit(0);
});

export default app; 