import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { 
  createLogger, 
  expressLogger, 
  initializeMessageQueue, 
  initializeEventBus,
  EventType,
  Event,
  AgentCreatedPayload,
  HttpClient
} from '@liqpro/common';
import { Logger } from './utils/logger';
import { config } from './config';
import { createCruiseRoutes } from './api/routes/cruiseRoutes';
import { CruiseService } from './core/cruise/CruiseService';
import { AgentStateMachine } from './core/agent/AgentStateMachine';
import { TransactionExecutor } from './core/transaction/TransactionExecutor';
import { FundsManager } from './core/funds/FundsManager';
import { RiskController } from './core/risk/RiskController';

/**
 * 创建并配置Express应用程序
 * @param logger 日志记录器
 * @returns Express应用程序实例
 */
export const createApp = (logger: Logger) => {
  const app = express();
  
  // 基本中间件
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(expressLogger());
  
  // 请求日志中间件
  app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`);
    next();
  });
  
  // 健康检查端点
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString()
    });
  });
  
  // 初始化服务
  const agentStateMachine = new AgentStateMachine(logger);
  const transactionExecutor = new TransactionExecutor(logger);
  const fundsManager = new FundsManager(logger);
  const riskController = new RiskController(logger);
  
  // 初始化巡航服务
  const cruiseService = CruiseService.getInstance(
    logger,
    agentStateMachine,
    transactionExecutor,
    fundsManager,
    riskController
  );
  
  // 启动巡航服务
  cruiseService.start().then(success => {
    if (success) {
      logger.info('Cruise service started successfully');
    } else {
      logger.error('Failed to start cruise service');
    }
  });
  
  // 注册API路由
  app.use('/api/cruise', createCruiseRoutes(logger, cruiseService));
  
  // 错误处理中间件
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('Unhandled error', err);
    res.status(500).json({ error: 'Internal server error' });
  });
  
  // 处理未找到的路由
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: 'Not Found',
      message: `Route ${req.method} ${req.path} not found`
    });
  });
  
  return app;
};

/**
 * 启动应用程序
 */
if (require.main === module) {
  const logger = new Logger({ module: 'app' });
  const app = createApp(logger);
  
  const port = config.port || 3000;
  app.listen(port, () => {
    logger.info(`Server started on port ${port}`);
  });
} 