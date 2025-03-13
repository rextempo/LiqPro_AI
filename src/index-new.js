"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_new_1 = __importDefault(require("./app-new"));
const utils_1 = require("./utils");
const messaging_1 = require("./messaging");
const logger = (0, utils_1.createLogger)('AgentEngineService');
const PORT = process.env.PORT || 3004;
// 启动服务器
const server = app_new_1.default.listen(PORT, () => {
    logger.info(`Agent Engine service running on port ${PORT}`);
});
// 处理优雅关闭
async function gracefulShutdown(signal) {
    logger.info(`${signal} received, shutting down gracefully`);
    // 关闭 HTTP 服务器
    server.close(() => {
        logger.info('HTTP server closed');
    });
    try {
        // 关闭消息队列连接
        await (0, messaging_1.closeMessaging)();
        logger.info('Messaging connections closed');
    }
    catch (error) {
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
//# sourceMappingURL=index-new.js.map