/**
 * Strategy Service
 * Handles communication with the strategy service and data processing
 */
import axios from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';

// Define interfaces
export interface Strategy {
  id: string;
  name: string;
  description?: string;
  type: string;
  parameters: Record<string, any>;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  createdBy?: string;
  performance?: StrategyPerformance;
}

export interface StrategyPerformance {
  winRate: number;
  profitFactor: number;
  sharpeRatio?: number;
  maxDrawdown: number;
  totalTrades: number;
  averageReturn: number;
  lastEvaluated: number;
}

export interface StrategyFilter {
  type?: string;
  isActive?: boolean;
  limit: number;
  offset: number;
}

export interface EvaluationOptions {
  timeframe: string;
  poolAddresses?: string[];
}

export interface OptimizationOptions extends EvaluationOptions {
  optimizationGoal: string;
  constraints?: Record<string, any>;
}

export interface OptimizationResult {
  originalParameters: Record<string, any>;
  optimizedParameters: Record<string, any>;
  performanceImprovement: number;
  evaluationMetrics: StrategyPerformance;
}

export class StrategyService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.signalServiceUrl;
    logger.info('StrategyService initialized', { baseUrl: this.baseUrl });
  }

  /**
   * Get strategies with optional filtering
   */
  public async getStrategies(filter: StrategyFilter): Promise<Strategy[]> {
    try {
      logger.info('Fetching strategies with filter', { filter });
      
      const response = await axios.get(`${this.baseUrl}/strategies`, {
        params: {
          type: filter.type,
          isActive: filter.isActive,
          limit: filter.limit,
          offset: filter.offset
        }
      });

      return response.data.data;
    } catch (error) {
      logger.error('Error fetching strategies', { 
        error: (error as Error).message,
        filter 
      });
      throw error;
    }
  }

  /**
   * Get a strategy by ID
   */
  public async getStrategyById(id: string): Promise<Strategy | null> {
    try {
      logger.info('Fetching strategy by ID', { id });
      
      const response = await axios.get(`${this.baseUrl}/strategies/${id}`);
      
      return response.data.data;
    } catch (error) {
      // If 404, return null instead of throwing
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        logger.warn('Strategy not found', { id });
        return null;
      }
      
      logger.error('Error fetching strategy by ID', { 
        id, 
        error: (error as Error).message 
      });
      throw error;
    }
  }

  /**
   * Create a new strategy
   */
  public async createStrategy(strategyData: Partial<Strategy>): Promise<Strategy> {
    try {
      logger.info('Creating new strategy', { strategyData });
      
      const response = await axios.post(`${this.baseUrl}/strategies`, strategyData);
      
      return response.data.data;
    } catch (error) {
      logger.error('Error creating strategy', { 
        error: (error as Error).message,
        strategyData 
      });
      throw error;
    }
  }

  /**
   * Update an existing strategy
   */
  public async updateStrategy(id: string, strategyData: Partial<Strategy>): Promise<Strategy> {
    try {
      logger.info('Updating strategy', { id, strategyData });
      
      const response = await axios.put(`${this.baseUrl}/strategies/${id}`, strategyData);
      
      return response.data.data;
    } catch (error) {
      logger.error('Error updating strategy', { 
        id,
        error: (error as Error).message,
        strategyData 
      });
      throw error;
    }
  }

  /**
   * Delete a strategy
   */
  public async deleteStrategy(id: string): Promise<void> {
    try {
      logger.info('Deleting strategy', { id });
      
      await axios.delete(`${this.baseUrl}/strategies/${id}`);
    } catch (error) {
      logger.error('Error deleting strategy', { 
        id,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Evaluate a strategy's performance
   */
  public async evaluateStrategy(id: string, options: EvaluationOptions): Promise<StrategyPerformance> {
    try {
      logger.info('Evaluating strategy', { id, options });
      
      const response = await axios.post(`${this.baseUrl}/strategies/${id}/evaluate`, options);
      
      return response.data.data;
    } catch (error) {
      logger.error('Error evaluating strategy', { 
        id,
        options,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Optimize a strategy's parameters
   */
  public async optimizeStrategy(id: string, options: OptimizationOptions): Promise<OptimizationResult> {
    try {
      logger.info('Optimizing strategy', { id, options });
      
      const response = await axios.post(`${this.baseUrl}/strategies/${id}/optimize`, options);
      
      return response.data.data;
    } catch (error) {
      logger.error('Error optimizing strategy', { 
        id,
        options,
        error: (error as Error).message
      });
      throw error;
    }
  }
} 