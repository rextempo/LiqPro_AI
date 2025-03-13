"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.systemHealthStatus = exports.agentOperationDurationSeconds = exports.agentOperationsTotal = exports.agentsTotal = exports.mqMessageProcessingErrorsTotal = exports.mqMessageProcessingDurationSeconds = exports.mqMessagesConsumedTotal = exports.mqMessagesPublishedTotal = exports.mqConnectionStatus = exports.httpRequestDurationSeconds = exports.httpRequestsTotal = exports.register = void 0;
exports.metricsMiddleware = metricsMiddleware;
exports.setupMetricsEndpoint = setupMetricsEndpoint;
exports.resetMetrics = resetMetrics;
const prom_client_1 = __importDefault(require("prom-client"));
const logger_1 = require("./logger");
const logger = (0, logger_1.createLogger)('Metrics');
// 创建一个注册表来注册指标
exports.register = new prom_client_1.default.Registry();
// 添加默认指标（进程、GC 等）
prom_client_1.default.collectDefaultMetrics({ register: exports.register });
// HTTP 请求计数器
exports.httpRequestsTotal = new prom_client_1.default.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [exports.register]
});
// HTTP 请求持续时间直方图
exports.httpRequestDurationSeconds = new prom_client_1.default.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
    registers: [exports.register]
});
// 消息队列指标
exports.mqConnectionStatus = new prom_client_1.default.Gauge({
    name: 'mq_connection_status',
    help: 'Status of the RabbitMQ connection (1 = connected, 0 = disconnected)',
    registers: [exports.register]
});
exports.mqMessagesPublishedTotal = new prom_client_1.default.Counter({
    name: 'mq_messages_published_total',
    help: 'Total number of messages published to RabbitMQ',
    labelNames: ['exchange', 'routing_key'],
    registers: [exports.register]
});
exports.mqMessagesConsumedTotal = new prom_client_1.default.Counter({
    name: 'mq_messages_consumed_total',
    help: 'Total number of messages consumed from RabbitMQ',
    labelNames: ['queue', 'event_type'],
    registers: [exports.register]
});
exports.mqMessageProcessingDurationSeconds = new prom_client_1.default.Histogram({
    name: 'mq_message_processing_duration_seconds',
    help: 'Duration of message processing in seconds',
    labelNames: ['queue', 'event_type'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
    registers: [exports.register]
});
exports.mqMessageProcessingErrorsTotal = new prom_client_1.default.Counter({
    name: 'mq_message_processing_errors_total',
    help: 'Total number of errors during message processing',
    labelNames: ['queue', 'event_type', 'error_type'],
    registers: [exports.register]
});
// 代理指标
exports.agentsTotal = new prom_client_1.default.Gauge({
    name: 'agents_total',
    help: 'Total number of agents',
    labelNames: ['status'],
    registers: [exports.register]
});
exports.agentOperationsTotal = new prom_client_1.default.Counter({
    name: 'agent_operations_total',
    help: 'Total number of agent operations',
    labelNames: ['operation', 'status'],
    registers: [exports.register]
});
exports.agentOperationDurationSeconds = new prom_client_1.default.Histogram({
    name: 'agent_operation_duration_seconds',
    help: 'Duration of agent operations in seconds',
    labelNames: ['operation'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 30, 60],
    registers: [exports.register]
});
// 系统健康指标
exports.systemHealthStatus = new prom_client_1.default.Gauge({
    name: 'system_health_status',
    help: 'Health status of system components (1 = healthy, 0 = unhealthy)',
    labelNames: ['component'],
    registers: [exports.register]
});
// 创建 Express 中间件来收集 HTTP 指标
function metricsMiddleware() {
    return (req, res, next) => {
        // 排除 /metrics 端点，避免自引用
        if (req.path === '/metrics') {
            return next();
        }
        // 记录请求开始时间
        const start = Date.now();
        // 处理响应完成事件
        res.on('finish', () => {
            const duration = (Date.now() - start) / 1000;
            // 规范化路由路径，替换 ID 为参数
            const route = req.route ? req.baseUrl + req.route.path : req.path;
            const normalizedRoute = route.replace(/\/[0-9a-f]{24}|\/[0-9]+/g, '/:id');
            // 增加请求计数
            exports.httpRequestsTotal.inc({
                method: req.method,
                route: normalizedRoute,
                status_code: res.statusCode
            });
            // 记录请求持续时间
            exports.httpRequestDurationSeconds.observe({
                method: req.method,
                route: normalizedRoute,
                status_code: res.statusCode
            }, duration);
        });
        next();
    };
}
// 创建 Prometheus 指标端点
function setupMetricsEndpoint(app) {
    app.get('/metrics', async (req, res) => {
        try {
            res.set('Content-Type', exports.register.contentType);
            res.end(await exports.register.metrics());
        }
        catch (error) {
            logger.error('Error generating metrics', { error });
            res.status(500).end();
        }
    });
    logger.info('Metrics endpoint set up at /metrics');
}
// 重置所有指标（主要用于测试）
function resetMetrics() {
    exports.register.resetMetrics();
    logger.info('All metrics have been reset');
}
// 导出注册表和所有指标
exports.default = {
    register: exports.register,
    httpRequestsTotal: exports.httpRequestsTotal,
    httpRequestDurationSeconds: exports.httpRequestDurationSeconds,
    mqConnectionStatus: exports.mqConnectionStatus,
    mqMessagesPublishedTotal: exports.mqMessagesPublishedTotal,
    mqMessagesConsumedTotal: exports.mqMessagesConsumedTotal,
    mqMessageProcessingDurationSeconds: exports.mqMessageProcessingDurationSeconds,
    mqMessageProcessingErrorsTotal: exports.mqMessageProcessingErrorsTotal,
    agentsTotal: exports.agentsTotal,
    agentOperationsTotal: exports.agentOperationsTotal,
    agentOperationDurationSeconds: exports.agentOperationDurationSeconds,
    systemHealthStatus: exports.systemHealthStatus,
    metricsMiddleware,
    setupMetricsEndpoint,
    resetMetrics
};
//# sourceMappingURL=metrics.js.map