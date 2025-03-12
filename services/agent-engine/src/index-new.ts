import app from './app-new';
import { createLogger } from './utils';
import { closeMessaging } from './messaging';

const logger = createLogger('AgentEngineService');
const PORT = process.env.PORT || 3004;

// 启动服务器
const server = app.listen(PORT, () => {
  logger.info(`Agent Engine service running on port ${PORT}`);
});

// 处理优雅关闭
async function gracefulShutdown(signal: string) {
  logger.info(`${signal} received, shutting down gracefully`);
  
  // 关闭 HTTP 服务器
  server.close(() => {
    logger.info('HTTP server closed');
  });
  
  try {
    // 关闭消息队列连接
    await closeMessaging();
    logger.info('Messaging connections closed');
  } catch (error) {
    logger.error('Error closing messaging connections', error);
  }
  
  // 退出进程
  process.exit(0);
}

// 处理终止信号
process.on('SIGTERM', () => {
  gracefulShutdown('SIGTERM').catch(err => {
    logger.error('Error during shutdown', err);
    process.exit(1);
  });
});

process.on('SIGINT', () => {
  gracefulShutdown('SIGINT').catch(err => {
    logger.error('Error during shutdown', err);
    process.exit(1);
  });
});

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught exception: ${error.message}`, error);
  
  // 尝试优雅关闭
  gracefulShutdown('uncaughtException').catch(() => {
    process.exit(1);
  });
});

// 处理未处理的 Promise 拒绝
process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled rejection at: ${promise}, reason: ${reason}`);
}); 