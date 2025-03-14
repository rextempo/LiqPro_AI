import axios from 'axios';
import { createLogger } from '@liqpro/monitoring';
import { MongoDBStorage } from './storage/mongodb-storage';
import { Finality } from '@solana/web3.js';
import mongoose from 'mongoose';

const logger = createLogger({
  serviceName: 'api-service:data-controller',
  level: 'info',
  console: true
});

export interface DataControllerConfig {
  rpcEndpoint: string;
  rpcBackupEndpoint: string;
  rpcCommitment: Finality;
  meteoraProgramId: string;
  services: {
    dataServiceUrl: string;
    signalServiceUrl: string;
    scoringServiceUrl: string;
    agentServiceUrl: string;
  };
  storage: MongoDBStorage;
}

export class DataController {
  private config: DataControllerConfig;
  private isRunning: boolean = false;

  constructor(config: DataControllerConfig) {
    this.config = config;
  }

  /**
   * Start the data controller
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    try {
      logger.info('Starting data controller...');
      
      // Initialize connections to other services
      await this.checkServicesHealth();
      
      this.isRunning = true;
      logger.info('Data controller started');
    } catch (error) {
      logger.error('Failed to start data controller', { error });
      throw error;
    }
  }

  /**
   * Stop the data controller
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    logger.info('Stopping data controller...');
    this.isRunning = false;
    logger.info('Data controller stopped');
  }

  /**
   * Check the health of all services
   */
  private async checkServicesHealth(): Promise<void> {
    try {
      const services = [
        { name: 'data-service-real', url: `${this.config.services.dataServiceUrl}/health` },
        { name: 'signal-service', url: `${this.config.services.signalServiceUrl}/health` },
        { name: 'scoring-service', url: `${this.config.services.scoringServiceUrl}/health` },
        { name: 'agent-service', url: `${this.config.services.agentServiceUrl}/health` },
      ];

      for (const service of services) {
        try {
          const response = await axios.get(service.url, { timeout: 5000 });
          
          if (response.status === 200 && response.data.status === 'ok') {
            logger.info(`Service ${service.name} is healthy`);
          } else {
            logger.warn(`Service ${service.name} returned unexpected response`, { 
              status: response.status, 
              data: response.data 
            });
          }
        } catch (error) {
          logger.warn(`Service ${service.name} is not available, but continuing startup`, { 
            error: error instanceof Error ? error.message : String(error)
          });
          // 继续启动，不要因为依赖服务不可用而阻止启动
        }
      }
    } catch (error) {
      logger.error('Failed to check services health, but continuing startup', { 
        error: error instanceof Error ? error.message : String(error)
      });
      // 继续启动，不要因为健康检查失败而阻止启动
    }
  }

  /**
   * Get pools from data service
   */
  async getPools(options: { limit?: number; offset?: number } = {}): Promise<any[]> {
    try {
      logger.info(`Attempting to get pools from ${this.config.services.dataServiceUrl}/api/meteora/pools`);
      
      const response = await axios.get(`${this.config.services.dataServiceUrl}/api/meteora/pools`, {
        params: options,
      });
      
      logger.info('Successfully retrieved pools data');
      return response.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to get pools', { 
        error: errorMessage,
        errorObject: JSON.stringify(error),
        url: `${this.config.services.dataServiceUrl}/api/meteora/pools`
      });
      throw error;
    }
  }

  /**
   * Get pool by address
   */
  async getPoolByAddress(address: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.config.services.dataServiceUrl}/api/meteora/pool/${address}`
      );
      
      return response.data;
    } catch (error) {
      logger.error('Failed to get pool by address', { 
        address, 
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get liquidity distribution for a pool
   */
  async getPoolLiquidityDistribution(address: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.config.services.dataServiceUrl}/api/meteora/liquidity/${address}`
      );
      
      return response.data;
    } catch (error) {
      logger.error('Failed to get pool liquidity distribution', { 
        address, 
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get signals from MongoDB
   */
  async getSignals(options: { limit?: number; offset?: number } = {}): Promise<any[]> {
    try {
      const { limit = 20, offset = 0 } = options;
      
      // 使用 mongoose 直接从 MongoDB 获取信号数据
      const Signal = mongoose.model('Signal', new mongoose.Schema({}, { strict: false }));
      
      // 从数据库获取信号数据
      const signals = await Signal.find()
        .sort({ analysis_timestamp: -1 })
        .skip(Number(offset))
        .limit(Number(limit));
      
      return signals;
    } catch (error) {
      logger.error('Failed to get signals from MongoDB', { 
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get signal by ID
   */
  async getSignalById(id: string): Promise<any> {
    try {
      // 使用 mongoose 直接从 MongoDB 获取信号数据
      const Signal = mongoose.model('Signal', new mongoose.Schema({}, { strict: false }));
      
      // 从数据库获取特定信号
      const signal = await Signal.findOne({ id });
      
      if (!signal) {
        throw new Error(`Signal with ID ${id} not found`);
      }
      
      return signal;
    } catch (error) {
      logger.error('Failed to get signal by ID from MongoDB', { 
        id, 
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get strategies from signal service
   */
  async getStrategies(options: { limit?: number; offset?: number } = {}): Promise<any[]> {
    try {
      const response = await axios.get(`${this.config.services.signalServiceUrl}/api/strategies`, {
        params: options,
      });
      
      return response.data;
    } catch (error) {
      logger.error('Failed to get strategies', { 
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get strategy by ID
   */
  async getStrategyById(id: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.config.services.signalServiceUrl}/api/strategies/${id}`
      );
      
      return response.data;
    } catch (error) {
      logger.error('Failed to get strategy by ID', { 
        id, 
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get agents from agent service
   */
  async getAgents(options: { limit?: number; offset?: number } = {}): Promise<any[]> {
    try {
      const response = await axios.get(`${this.config.services.agentServiceUrl}/api/agents`, {
        params: options,
      });
      
      return response.data;
    } catch (error) {
      logger.error('Failed to get agents', { 
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get agent by ID
   */
  async getAgentById(id: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.config.services.agentServiceUrl}/api/agents/${id}`
      );
      
      return response.data;
    } catch (error) {
      logger.error('Failed to get agent by ID', { 
        id, 
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
} 