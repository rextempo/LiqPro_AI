/**
 * API服务入口文件
 */
import app from './app';
import { config } from './config';
import { Logger } from './utils/logger';

const logger = new Logger('Server');
const PORT = config.port;

// 启动服务器
const server = app.listen(PORT, () => {
  logger.info(`API服务已启动，监听端口: ${PORT}`);
  logger.info(`环境: ${config.env}`);
});

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  logger.error(`未捕获的异常: ${errorMessage}`);
  // 在生产环境中，可能需要通知管理员并优雅地关闭服务
  if (config.env === 'production') {
    // 优雅地关闭服务
    gracefulShutdown();
  }
});

// 处理未处理的Promise拒绝
process.on('unhandledRejection', (reason, promise) => {
  const reasonStr = reason instanceof Error ? reason.message : String(reason);
  logger.error(`未处理的Promise拒绝: ${reasonStr}`);
});

// 处理SIGTERM信号
process.on('SIGTERM', () => {
  logger.info('收到SIGTERM信号');
  gracefulShutdown();
});

// 处理SIGINT信号
process.on('SIGINT', () => {
  logger.info('收到SIGINT信号');
  gracefulShutdown();
});

/**
 * 优雅关闭服务
 */
function gracefulShutdown() {
  logger.info('正在优雅关闭服务...');
  
  server.close((err) => {
    if (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error(`关闭服务器时出错: ${errorMessage}`);
      process.exit(1);
    }
    
    logger.info('服务器已关闭');
    process.exit(0);
  });
  
  // 如果在一定时间内无法正常关闭，则强制退出
  setTimeout(() => {
    logger.error('无法在规定时间内关闭服务器，强制退出');
    process.exit(1);
  }, 10000); // 10秒超时
}

export default server; 