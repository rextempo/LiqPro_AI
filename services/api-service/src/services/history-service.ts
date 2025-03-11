/**
 * History Service
 * Handles communication with the data service for historical data
 */
import axios from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';
import { Signal } from './signal-service';

// Define interfaces
export interface HistoricalSignalFilter {
  poolAddress?: string;
  signalType?: string;
  timeframe?: string;
  minStrength?: number;
  minReliability?: number;
  startTime?: number;
  endTime?: number;
  limit: number;
  offset: number;
}

export interface PoolPerformance {
  poolAddress: string;
  tokenA: string;
  tokenB: string;
  timeframe: string;
  startTime: number;
  endTime: number;
  metrics: {
    volume: number;
    fees: number;
    tvl: number;
    priceChange: number;
    volatility: number;
    impermanentLoss: number;
    returns: number;
    signalAccuracy: number;
  };
  historicalData: {
    timestamp: number;
    value: number;
  }[];
}

export interface SignalAccuracy {
  signalType?: string;
  timeframe: string;
  startTime: number;
  endTime: number;
  overallAccuracy: number;
  bySignalType: Record<string, {
    accuracy: number;
    totalSignals: number;
    correctSignals: number;
  }>;
  byTimeframe: Record<string, {
    accuracy: number;
    totalSignals: number;
    correctSignals: number;
  }>;
  trend: {
    timestamp: number;
    accuracy: number;
  }[];
}

export interface MarketTrend {
  poolAddress?: string;
  timeframe: string;
  resolution: string;
  startTime: number;
  endTime: number;
  data: {
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    signals?: Signal[];
  }[];
}

export interface ExportOptions {
  dataType: 'signals' | 'performance' | 'accuracy' | 'trends';
  format: 'csv' | 'json';
  filters?: Record<string, any>;
}

export class HistoryService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.dataServiceUrl;
    logger.info('HistoryService initialized', { baseUrl: this.baseUrl });
  }

  /**
   * Get historical signals with filtering options
   */
  public async getHistoricalSignals(filter: HistoricalSignalFilter): Promise<Signal[]> {
    try {
      logger.info('Fetching historical signals with filter', { filter });
      
      const response = await axios.get(`${this.baseUrl}/history/signals`, {
        params: filter
      });

      return response.data.data;
    } catch (error) {
      logger.error('Error fetching historical signals', { 
        error: (error as Error).message,
        filter 
      });
      throw error;
    }
  }

  /**
   * Get pool performance metrics
   */
  public async getPoolPerformance(poolAddress: string, timeframe: string): Promise<PoolPerformance | null> {
    try {
      logger.info('Fetching pool performance', { poolAddress, timeframe });
      
      const response = await axios.get(`${this.baseUrl}/history/performance/${poolAddress}`, {
        params: { timeframe }
      });
      
      return response.data.data;
    } catch (error) {
      // If 404, return null instead of throwing
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        logger.warn('Pool performance data not found', { poolAddress });
        return null;
      }
      
      logger.error('Error fetching pool performance', { 
        poolAddress,
        timeframe,
        error: (error as Error).message 
      });
      throw error;
    }
  }

  /**
   * Get signal accuracy metrics
   */
  public async getSignalAccuracy(options: { signalType?: string; timeframe: string }): Promise<SignalAccuracy> {
    try {
      logger.info('Fetching signal accuracy', { options });
      
      const response = await axios.get(`${this.baseUrl}/history/accuracy`, {
        params: options
      });
      
      return response.data.data;
    } catch (error) {
      logger.error('Error fetching signal accuracy', { 
        options,
        error: (error as Error).message 
      });
      throw error;
    }
  }

  /**
   * Get market trends data
   */
  public async getMarketTrends(options: { 
    poolAddress?: string; 
    timeframe: string;
    resolution: string;
  }): Promise<MarketTrend> {
    try {
      logger.info('Fetching market trends', { options });
      
      const response = await axios.get(`${this.baseUrl}/history/trends`, {
        params: options
      });
      
      return response.data.data;
    } catch (error) {
      logger.error('Error fetching market trends', { 
        options,
        error: (error as Error).message 
      });
      throw error;
    }
  }

  /**
   * Export historical data to a file
   */
  public async exportData(options: ExportOptions): Promise<string> {
    try {
      logger.info('Exporting historical data', { options });
      
      const response = await axios.post(`${this.baseUrl}/history/export`, options, {
        responseType: 'text'
      });
      
      return response.data;
    } catch (error) {
      logger.error('Error exporting historical data', { 
        options,
        error: (error as Error).message 
      });
      throw error;
    }
  }

  /**
   * Process and format historical data
   * This can be expanded to add additional processing or formatting
   */
  private processHistoricalData<T>(data: T): T {
    // Add any processing logic here
    return data;
  }
} 