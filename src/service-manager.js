"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceManager = void 0;
const signal_client_1 = require("./signal-client");
const data_client_1 = require("./data-client");
const scoring_client_1 = require("./scoring-client");
const agent_client_1 = require("./agent-client");
const logger_1 = require("../utils/logger");
/**
 * 服务管理器
 * 用于统一管理所有服务客户端
 */
class ServiceManager {
    /**
     * 创建服务管理器实例
     * @param config 服务配置
     */
    constructor(config) {
        this.config = config;
        this.logger = new logger_1.Logger('ServiceManager');
        const timeout = config.timeout || 10000;
        this.signalClient = new signal_client_1.SignalClient(config.signalServiceUrl, timeout);
        this.dataClient = new data_client_1.DataClient(config.dataServiceUrl, timeout);
        this.scoringClient = new scoring_client_1.ScoringClient(config.scoringServiceUrl, timeout);
        this.agentClient = new agent_client_1.AgentClient(config.agentServiceUrl, timeout);
        this.logger.info('ServiceManager initialized');
    }
    /**
     * 获取服务管理器实例
     * @param config 服务配置
     * @returns 服务管理器实例
     */
    static getInstance(config) {
        if (!ServiceManager.instance && config) {
            ServiceManager.instance = new ServiceManager(config);
        }
        else if (!ServiceManager.instance && !config) {
            throw new Error('ServiceManager not initialized. Please provide config.');
        }
        return ServiceManager.instance;
    }
    /**
     * 获取信号服务客户端
     * @returns 信号服务客户端
     */
    getSignalClient() {
        return this.signalClient;
    }
    /**
     * 获取数据服务客户端
     * @returns 数据服务客户端
     */
    getDataClient() {
        return this.dataClient;
    }
    /**
     * 获取评分服务客户端
     * @returns 评分服务客户端
     */
    getScoringClient() {
        return this.scoringClient;
    }
    /**
     * 获取Agent引擎客户端
     * @returns Agent引擎客户端
     */
    getAgentClient() {
        return this.agentClient;
    }
    /**
     * 检查所有服务健康状态
     * @returns 服务健康状态
     */
    async checkServicesHealth() {
        try {
            // 在开发环境中返回模拟的健康状态
            if (process.env.NODE_ENV === 'development') {
                this.logger.info('返回开发环境模拟的服务健康状态');
                return {
                    signal: true,
                    data: true,
                    scoring: true,
                    agent: true
                };
            }
            // 生产环境中实际检查服务健康状态
            const [signalHealth, dataHealth, scoringHealth, agentHealth] = await Promise.all([
                this.signalClient.healthCheck(),
                this.dataClient.healthCheck(),
                this.scoringClient.healthCheck(),
                this.agentClient.healthCheck()
            ]);
            return {
                signal: signalHealth,
                data: dataHealth,
                scoring: scoringHealth,
                agent: agentHealth
            };
        }
        catch (error) {
            this.logger.error(`Error checking services health: ${error.message}`);
            // 在开发环境中，即使出错也返回模拟的健康状态
            if (process.env.NODE_ENV === 'development') {
                this.logger.info('出错后返回开发环境模拟的服务健康状态');
                return {
                    signal: true,
                    data: true,
                    scoring: true,
                    agent: true
                };
            }
            throw error;
        }
    }
    /**
     * 重新初始化服务管理器
     * @param config 服务配置
     */
    static reinitialize(config) {
        ServiceManager.instance = new ServiceManager(config);
    }
}
exports.ServiceManager = ServiceManager;
//# sourceMappingURL=service-manager.js.map