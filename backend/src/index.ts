/**
 * LiqPro 后端服务入口文件
 * 创建于: 2025-03-16
 */

import 'reflect-metadata';
import express from 'express';

// 创建 Express 应用
const app = express();
const port = process.env.PORT || 3000;

// 配置中间件
app.use(express.json());

// 启动服务器
const server = app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
});

// 优雅关闭
const gracefulShutdown = (signal: string) => {
  console.log(`${signal} received. Starting graceful shutdown...`);
  
  server.close(() => {
    console.log('HTTP server closed');
    
    // 关闭数据库连接等其他资源
    // TODO: 添加数据库连接关闭逻辑
    
    process.exit(0);
  });

  // 如果10秒内没有完成关闭，强制退出
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// 处理进程信号
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

// 处理未处理的Promise拒绝
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
}); 