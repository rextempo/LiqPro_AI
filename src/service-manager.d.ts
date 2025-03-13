import { SignalClient } from './signal-client';
import { DataClient } from './data-client';
import { ScoringClient } from './scoring-client';
import { AgentClient } from './agent-client';
/**
 * 服务配置接口
 */
export interface ServiceConfig {
    signalServiceUrl: string;
    dataServiceUrl: string;
    scoringServiceUrl: string;
    agentServiceUrl: string;
    timeout?: number;
}
/**
 * 服务管理器
 * 用于统一管理所有服务客户端
 */
export declare class ServiceManager {
    private static instance;
    private signalClient;
    private dataClient;
    private scoringClient;
    private agentClient;
    private logger;
    private config;
    /**
     * 创建服务管理器实例
     * @param config 服务配置
     */
    private constructor();
    /**
     * 获取服务管理器实例
     * @param config 服务配置
     * @returns 服务管理器实例
     */
    static getInstance(config?: ServiceConfig): ServiceManager;
    /**
     * 获取信号服务客户端
     * @returns 信号服务客户端
     */
    getSignalClient(): SignalClient;
    /**
     * 获取数据服务客户端
     * @returns 数据服务客户端
     */
    getDataClient(): DataClient;
    /**
     * 获取评分服务客户端
     * @returns 评分服务客户端
     */
    getScoringClient(): ScoringClient;
    /**
     * 获取Agent引擎客户端
     * @returns Agent引擎客户端
     */
    getAgentClient(): AgentClient;
    /**
     * 检查所有服务健康状态
     * @returns 服务健康状态
     */
    checkServicesHealth(): Promise<Record<string, boolean>>;
    /**
     * 重新初始化服务管理器
     * @param config 服务配置
     */
    static reinitialize(config: ServiceConfig): void;
}
