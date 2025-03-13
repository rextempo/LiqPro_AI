/**
 * LiqPro Data Service
 * 
 * 数据服务负责从各种来源收集数据，包括 Meteora DLMM 池，
 * 并提供 API 端点供其他服务访问这些数据。
 */

import express from 'express';
import logger from './utils/logger';
import { connectToDatabase, closeDatabaseConnection } from './utils/db';
import { startDataCollectionTask } from './meteora';
import poolRoutes from './routes/pool-routes';
import snapshotRoutes from './routes/snapshot-routes';

// 配置
const PORT = process.env.PORT || 3000;
const DATA_COLLECTION_INTERVAL = parseInt(process.env.DATA_COLLECTION_INTERVAL || '300000', 10); // 默认 5 分钟

// 创建 Express 应用
const app = express();

// 中间件
app.use(express.json());

// 路由
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'data-service' });
});

// 池数据路由
app.use('/api/v1/meteora/pools', poolRoutes);

// 快照数据路由
app.use('/api/v1/meteora/snapshots', snapshotRoutes);

// 错误处理中间件
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('服务器错误', { error: err.message, stack: err.stack });
  res.status(500).json({
    status: 'error',
    message: '服务器内部错误'
  });
});

// 启动服务器
async function startServer() {
  try {
    // 连接到数据库
    await connectToDatabase();

    // 启动服务器
    app.listen(PORT, () => {
      logger.info(`数据服务已启动，监听端口 ${PORT}`);
      
      // 启动数据收集任务
      logger.info(`启动 Meteora 数据收集任务，间隔: ${DATA_COLLECTION_INTERVAL}ms`);
      const dataCollectionTask = startDataCollectionTask(DATA_COLLECTION_INTERVAL);
      
      // 优雅关闭
      process.on('SIGTERM', async () => {
        logger.info('收到 SIGTERM 信号，正在关闭服务...');
        dataCollectionTask.stop();
        await closeDatabaseConnection();
        process.exit(0);
      });
      
      process.on('SIGINT', async () => {
        logger.info('收到 SIGINT 信号，正在关闭服务...');
        dataCollectionTask.stop();
        await closeDatabaseConnection();
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error('启动服务失败', { error });
    process.exit(1);
  }
}

startServer(); 