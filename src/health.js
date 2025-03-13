"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthStatus = exports.SystemComponent = void 0;
exports.initializeHealthMonitoring = initializeHealthMonitoring;
exports.updateComponentHealth = updateComponentHealth;
exports.getComponentHealth = getComponentHealth;
exports.getAllComponentsHealth = getAllComponentsHealth;
exports.getSystemHealth = getSystemHealth;
exports.healthCheckMiddleware = healthCheckMiddleware;
exports.setupHealthEndpoint = setupHealthEndpoint;
exports.checkMessageQueueHealth = checkMessageQueueHealth;
exports.checkExternalServiceHealth = checkExternalServiceHealth;
exports.startHealthChecks = startHealthChecks;
exports.stopHealthChecks = stopHealthChecks;
const logger_1 = require("./logger");
const metrics_1 = require("./metrics");
const logger = (0, logger_1.createLogger)('Health');
// 定义系统组件
var SystemComponent;
(function (SystemComponent) {
    SystemComponent["DATABASE"] = "database";
    SystemComponent["MESSAGE_QUEUE"] = "message_queue";
    SystemComponent["API_SERVICE"] = "api_service";
    SystemComponent["DATA_SERVICE"] = "data_service";
    SystemComponent["SIGNAL_SERVICE"] = "signal_service";
    SystemComponent["SCORING_SERVICE"] = "scoring_service";
    SystemComponent["AGENT_ENGINE"] = "agent_engine";
})(SystemComponent || (exports.SystemComponent = SystemComponent = {}));
// 健康状态
var HealthStatus;
(function (HealthStatus) {
    HealthStatus["HEALTHY"] = "healthy";
    HealthStatus["DEGRADED"] = "degraded";
    HealthStatus["UNHEALTHY"] = "unhealthy";
})(HealthStatus || (exports.HealthStatus = HealthStatus = {}));
// 组件健康状态映射
const componentHealth = new Map();
// 初始化所有组件的健康状态为未知
function initializeHealthMonitoring() {
    Object.values(SystemComponent).forEach(component => {
        updateComponentHealth(component, HealthStatus.UNHEALTHY, 'Not checked yet');
    });
    // 设置当前服务为健康状态
    updateComponentHealth(SystemComponent.AGENT_ENGINE, HealthStatus.HEALTHY);
    logger.info('Health monitoring initialized');
}
// 更新组件健康状态
function updateComponentHealth(component, status, details) {
    const result = {
        status,
        details,
        timestamp: Date.now()
    };
    componentHealth.set(component, result);
    // 更新 Prometheus 指标
    metrics_1.systemHealthStatus.set({ component }, status === HealthStatus.HEALTHY ? 1 : status === HealthStatus.DEGRADED ? 0.5 : 0);
    logger.info(`Component ${component} health updated to ${status}`, { details });
}
// 获取组件健康状态
function getComponentHealth(component) {
    return componentHealth.get(component);
}
// 获取所有组件的健康状态
function getAllComponentsHealth() {
    const result = {};
    componentHealth.forEach((health, component) => {
        result[component] = health;
    });
    return result;
}
// 获取系统整体健康状态
function getSystemHealth() {
    let hasUnhealthy = false;
    let hasDegraded = false;
    componentHealth.forEach(health => {
        if (health.status === HealthStatus.UNHEALTHY) {
            hasUnhealthy = true;
        }
        else if (health.status === HealthStatus.DEGRADED) {
            hasDegraded = true;
        }
    });
    if (hasUnhealthy) {
        return HealthStatus.UNHEALTHY;
    }
    else if (hasDegraded) {
        return HealthStatus.DEGRADED;
    }
    else {
        return HealthStatus.HEALTHY;
    }
}
// 健康检查中间件
function healthCheckMiddleware() {
    return async (req, res) => {
        const systemHealth = getSystemHealth();
        const componentsHealth = getAllComponentsHealth();
        const statusCode = systemHealth === HealthStatus.HEALTHY
            ? 200
            : systemHealth === HealthStatus.DEGRADED
                ? 200
                : 503;
        res.status(statusCode).json({
            status: systemHealth,
            timestamp: new Date().toISOString(),
            components: componentsHealth
        });
    };
}
// 设置健康检查端点
function setupHealthEndpoint(app) {
    app.get('/health', healthCheckMiddleware());
    app.get('/health/detailed', healthCheckMiddleware());
    logger.info('Health endpoints set up at /health and /health/detailed');
}
// 执行消息队列健康检查
async function checkMessageQueueHealth(isConnected) {
    if (isConnected) {
        updateComponentHealth(SystemComponent.MESSAGE_QUEUE, HealthStatus.HEALTHY, 'Connected to RabbitMQ');
    }
    else {
        updateComponentHealth(SystemComponent.MESSAGE_QUEUE, HealthStatus.UNHEALTHY, 'Disconnected from RabbitMQ');
    }
}
// 执行外部服务健康检查
async function checkExternalServiceHealth(component, url, timeout = 5000) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        const response = await fetch(url, {
            method: 'GET',
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (response.ok) {
            updateComponentHealth(component, HealthStatus.HEALTHY, `Service responded with status ${response.status}`);
        }
        else {
            updateComponentHealth(component, HealthStatus.DEGRADED, `Service responded with status ${response.status}`);
        }
    }
    catch (error) {
        updateComponentHealth(component, HealthStatus.UNHEALTHY, `Failed to connect: ${error instanceof Error ? error.message : String(error)}`);
    }
}
// 定期检查外部服务健康状态
function startHealthChecks(checkInterval = 60000) {
    const interval = setInterval(async () => {
        logger.debug('Running scheduled health checks');
        // 检查外部服务
        await checkExternalServiceHealth(SystemComponent.API_SERVICE, process.env.API_SERVICE_URL || 'http://localhost:3000/health');
        await checkExternalServiceHealth(SystemComponent.DATA_SERVICE, process.env.DATA_SERVICE_URL || 'http://localhost:3001/health');
        await checkExternalServiceHealth(SystemComponent.SIGNAL_SERVICE, process.env.SIGNAL_SERVICE_URL || 'http://localhost:3002/health');
        await checkExternalServiceHealth(SystemComponent.SCORING_SERVICE, process.env.SCORING_SERVICE_URL || 'http://localhost:3003/health');
        logger.debug('Scheduled health checks completed');
    }, checkInterval);
    return interval;
}
// 停止健康检查
function stopHealthChecks(interval) {
    clearInterval(interval);
    logger.info('Health checks stopped');
}
exports.default = {
    initializeHealthMonitoring,
    updateComponentHealth,
    getComponentHealth,
    getAllComponentsHealth,
    getSystemHealth,
    healthCheckMiddleware,
    setupHealthEndpoint,
    checkMessageQueueHealth,
    checkExternalServiceHealth,
    startHealthChecks,
    stopHealthChecks,
    SystemComponent,
    HealthStatus
};
//# sourceMappingURL=health.js.map