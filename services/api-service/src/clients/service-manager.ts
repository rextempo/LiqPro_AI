import { SignalClient } from './signal-client';
import { DataClient } from './data-client';
import { ScoringClient } from './scoring-client';
import { AgentClient } from './agent-client';
import { Logger } from '../utils/logger';

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
export class ServiceManager {
  private static instance: ServiceManager;
  private signalClient: SignalClient;
  private dataClient: DataClient;
  private scoringClient: ScoringClient;
  private agentClient: AgentClient;
  private logger: Logger;
  private config: ServiceConfig;

  /**
   * 创建服务管理器实例
   * @param config 服务配置
   */
  private constructor(config: ServiceConfig) {
    this.config = config;
    this.logger = new Logger('ServiceManager');
    
    const timeout = config.timeout || 10000;
    
    this.signalClient = new SignalClient(config.signalServiceUrl, timeout);
    this.dataClient = new DataClient(config.dataServiceUrl, timeout);
    this.scoringClient = new ScoringClient(config.scoringServiceUrl, timeout);
    this.agentClient = new AgentClient(config.agentServiceUrl, timeout);
    
    this.logger.info('ServiceManager initialized');
  }

  /**
   * 获取服务管理器实例
   * @param config 服务配置
   * @returns 服务管理器实例
   */
  public static getInstance(config?: ServiceConfig): ServiceManager {
    if (!ServiceManager.instance && config) {
      ServiceManager.instance = new ServiceManager(config);
    } else if (!ServiceManager.instance && !config) {
      throw new Error('ServiceManager not initialized. Please provide config.');
    }
    
    return ServiceManager.instance;
  }

  /**
   * 获取信号服务客户端
   * @returns 信号服务客户端
   */
  public getSignalClient(): SignalClient {
    return this.signalClient;
  }

  /**
   * 获取数据服务客户端
   * @returns 数据服务客户端
   */
  public getDataClient(): DataClient {
    return this.dataClient;
  }

  /**
   * 获取评分服务客户端
   * @returns 评分服务客户端
   */
  public getScoringClient(): ScoringClient {
    return this.scoringClient;
  }

  /**
   * 获取Agent引擎客户端
   * @returns Agent引擎客户端
   */
  public getAgentClient(): AgentClient {
    return this.agentClient;
  }

  /**
   * 检查所有服务健康状态
   * @returns 服务健康状态
   */
  public async checkServicesHealth(): Promise<Record<string, boolean>> {
    try {
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
    } catch (error: any) {
      this.logger.error(`Error checking services health: ${error.message}`);
      throw error;
    }
  }

  /**
   * 重新初始化服务管理器
   * @param config 服务配置
   */
  public static reinitialize(config: ServiceConfig): void {
    ServiceManager.instance = new ServiceManager(config);
  }
} 