/**
 * API Service Application
 * Main application setup and configuration
 */
import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { ServiceManager } from './clients/service-manager';
import { CacheService } from './services/cache-service';
import { Logger } from './utils/logger';
import routes from './routes';
import healthRoutes from './routes/health-routes';
import { apiKeyAuth } from './middleware/auth';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { performanceMiddleware, startPerformanceMonitoring } from './middleware/performance';
import performanceRoutes from './routes/performance-routes';

// 定义事件类型枚举
enum EventType {
  AGENT_CREATED = 'agent.created',
  AGENT_STARTED = 'agent.started',
  AGENT_STOPPED = 'agent.stopped'
}

// 简单的日志记录器
const createLogger = (name: string) => {
  return {
    info: (message: string, ...args: any[]) => console.log(`[${name}] INFO: ${message}`, ...args),
    error: (message: string, ...args: any[]) => console.error(`[${name}] ERROR: ${message}`, ...args),
    warn: (message: string, ...args: any[]) => console.warn(`[${name}] WARN: ${message}`, ...args),
    debug: (message: string, ...args: any[]) => console.debug(`[${name}] DEBUG: ${message}`, ...args)
  };
};

// 简单的Express日志中间件
const expressLogger = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    console.log(`${req.method} ${req.url}`);
    next();
  };
};

// 简单的消息队列模拟
const initializeMessageQueue = (config: any) => {
  return {
    connect: () => Promise.resolve(),
    publish: (queue: string, message: any) => Promise.resolve(),
    subscribe: (queue: string, callback: (message: any) => void) => Promise.resolve()
  };
};

// 简单的事件总线模拟
const initializeEventBus = (messageQueue: any, serviceName: string) => {
  return {
    initialize: () => Promise.resolve(),
    publish: (eventType: EventType, data: any) => {
      console.log(`[EventBus] Publishing event: ${eventType}`, data);
      return Promise.resolve();
    },
    subscribe: (eventType: EventType, callback: (data: any) => void) => Promise.resolve()
  };
};

const logger = new Logger('App');

// 初始化服务管理器
try {
  ServiceManager.getInstance({
    signalServiceUrl: config.services.signal.url,
    dataServiceUrl: config.services.data.url,
    scoringServiceUrl: config.services.scoring.url,
    agentServiceUrl: config.services.agent.url,
    timeout: config.services.timeout
  });
  logger.info('ServiceManager initialized successfully');
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  logger.error(`Failed to initialize ServiceManager: ${errorMessage}`);
  process.exit(1);
}

// 初始化缓存服务
try {
  if (config.cache.redis.enabled) {
    CacheService.getInstance(config.cache.redis.url);
    logger.info('CacheService initialized with Redis support');
  } else {
    CacheService.getInstance();
    logger.info('CacheService initialized with memory cache only');
  }
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  logger.error(`Failed to initialize CacheService: ${errorMessage}`);
  // 不退出进程，因为缓存服务不是必需的
  logger.warn('Continuing without cache service');
}

// 创建Express应用
const app: Application = express();

// 启动性能监控
startPerformanceMonitoring({
  interval: 60000, // 每分钟收集一次指标
  maxHistory: 60, // 保留60条历史记录
  logMetrics: true // 记录指标到日志
});

// 安全中间件
app.use(helmet());

// CORS配置
app.use(cors({
  origin: config.corsOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  credentials: true,
  maxAge: 86400 // 预检请求缓存1天
}));

// 请求解析
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 压缩响应
app.use(compression());

// 速率限制
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 每个IP 15分钟内最多100个请求
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many requests, please try again later'
  }
}));

// 性能监控中间件
app.use(performanceMiddleware());

// 健康检查路由 - 不需要API密钥
app.use('/health', healthRoutes);

// 性能监控路由 - 需要认证
app.use('/performance', apiKeyAuth, performanceRoutes);

// API路由 - 需要API密钥
app.use('/api', apiKeyAuth, routes);

// 初始化消息队列（模拟）
const messageQueue = initializeMessageQueue({
  host: process.env.RABBITMQ_HOST || 'localhost',
  port: parseInt(process.env.RABBITMQ_PORT || '5672'),
  username: process.env.RABBITMQ_USER || 'guest',
  password: process.env.RABBITMQ_PASSWORD || 'guest',
  vhost: process.env.RABBITMQ_VHOST || '/'
});

// 初始化事件总线（模拟）
const eventBus = initializeEventBus(messageQueue, 'api-service');

// 连接到消息队列（模拟）
messageQueue.connect()
  .then(() => {
    logger.info('Connected to RabbitMQ (simulated)');
    return eventBus.initialize();
  })
  .then(() => {
    logger.info('Event bus initialized (simulated)');
  })
  .catch(err => {
    logger.error('Failed to connect to RabbitMQ', err);
  });

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.get('/api/v1/agents', async (req, res) => {
  try {
    // This would typically come from a database
    const agents = [
      { id: '1', name: 'Agent 1', status: 'active' },
      { id: '2', name: 'Agent 2', status: 'paused' }
    ];
    
    res.status(200).json(agents);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Error fetching agents', { error: errorMessage });
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/v1/agents', async (req, res) => {
  try {
    const { name, initialFunds, riskLevel } = req.body;
    
    // Validate input
    if (!name || !initialFunds || !riskLevel) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Create agent (this would typically be saved to a database)
    const agentId = `agent-${Date.now()}`;
    
    // Publish agent created event
    await eventBus.publish(EventType.AGENT_CREATED, {
      agentId,
      userId: req.body.userId || 'anonymous',
      name,
      initialFunds,
      riskLevel,
      settings: req.body.settings || {}
    });
    
    res.status(201).json({
      id: agentId,
      name,
      initialFunds,
      riskLevel,
      status: 'created'
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Error creating agent', { error: errorMessage });
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/v1/agents/:agentId/start', async (req, res) => {
  try {
    const { agentId } = req.params;
    
    // Publish agent started event
    await eventBus.publish(EventType.AGENT_STARTED, {
      agentId
    });
    
    res.status(200).json({
      id: agentId,
      status: 'started'
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Error starting agent', { error: errorMessage });
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/v1/agents/:agentId/stop', async (req, res) => {
  try {
    const { agentId } = req.params;
    
    // Publish agent stopped event
    await eventBus.publish(EventType.AGENT_STOPPED, {
      agentId
    });
    
    res.status(200).json({
      id: agentId,
      status: 'stopped'
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Error stopping agent', { error: errorMessage });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 添加钱包连接相关的API端点
app.post('/auth/wallet', async (req, res) => {
  try {
    const { walletAddress, signature } = req.body;
    
    // 验证请求参数
    if (!walletAddress || !signature) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'missing_parameters',
          message: '缺少必要的参数'
        }
      });
    }
    
    // 这里应该验证签名，但为了简化，我们直接模拟成功
    // 在实际应用中，应该验证签名是否有效
    
    // 生成模拟的认证令牌
    const accessToken = `access_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const refreshToken = `refresh_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    res.status(200).json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        expiresIn: 3600 // 1小时
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Error authenticating wallet', { error: errorMessage });
    res.status(500).json({
      success: false,
      error: {
        code: 'server_error',
        message: '服务器内部错误'
      }
    });
  }
});

// 获取用户信息
app.get('/user/profile', async (req, res) => {
  try {
    // 这里应该从数据库获取用户信息，但为了简化，我们返回模拟数据
    res.status(200).json({
      success: true,
      data: {
        id: '1',
        username: 'demo_user',
        walletAddress: req.headers.authorization ? req.headers.authorization.split(' ')[1].substring(0, 10) : 'unknown',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Error fetching user profile', { error: errorMessage });
    res.status(500).json({
      success: false,
      error: {
        code: 'server_error',
        message: '服务器内部错误'
      }
    });
  }
});

// 验证会话
app.get('/auth/validate', async (req, res) => {
  try {
    // 这里应该验证令牌，但为了简化，我们假设所有请求都有效
    res.status(200).json({
      success: true,
      data: {
        valid: true
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Error validating session', { error: errorMessage });
    res.status(500).json({
      success: false,
      error: {
        code: 'server_error',
        message: '服务器内部错误'
      }
    });
  }
});

// 根路径
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'LiqPro API Service',
    version: '1.0.0'
  });
});

// 404处理
app.use(notFoundHandler);

// 错误处理中间件
app.use(errorHandler);

export default app; 