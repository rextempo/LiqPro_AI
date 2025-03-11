/**
 * Signal Service
 * Handles communication with the signal service and data processing
 */
import axios from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';

// Define interfaces
export interface Signal {
  id: string;
  poolAddress: string;
  signalType: string;
  timeframe: string;
  strength: number;
  reliability: number;
  timestamp: number;
  parameters: Record<string, any>;
  message: string;
  source: string;
}

export interface SignalFilter {
  poolAddress?: string;
  signalType?: string;
  minStrength?: number;
  limit: number;
  offset: number;
}

export class SignalService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.signalServiceUrl;
    logger.info('SignalService initialized', { baseUrl: this.baseUrl });
  }

  /**
   * Get signals with optional filtering
   */
  public async getSignals(filter: SignalFilter): Promise<Signal[]> {
    try {
      logger.info('Fetching signals with filter', { filter });
      
      const response = await axios.get(`${this.baseUrl}/signals`, {
        params: {
          poolAddress: filter.poolAddress,
          signalType: filter.signalType,
          minStrength: filter.minStrength,
          limit: filter.limit,
          offset: filter.offset
        }
      });

      return response.data.data;
    } catch (error) {
      logger.error('Error fetching signals', { 
        error: (error as Error).message,
        filter 
      });
      throw error;
    }
  }

  /**
   * Get a signal by ID
   */
  public async getSignalById(id: string): Promise<Signal | null> {
    try {
      logger.info('Fetching signal by ID', { id });
      
      const response = await axios.get(`${this.baseUrl}/signals/${id}`);
      
      return response.data.data;
    } catch (error) {
      // If 404, return null instead of throwing
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        logger.warn('Signal not found', { id });
        return null;
      }
      
      logger.error('Error fetching signal by ID', { 
        id, 
        error: (error as Error).message 
      });
      throw error;
    }
  }

  /**
   * Get latest signals
   */
  public async getLatestSignals(limit: number): Promise<Signal[]> {
    try {
      logger.info('Fetching latest signals', { limit });
      
      const response = await axios.get(`${this.baseUrl}/signals/latest`, {
        params: { limit }
      });
      
      return response.data.data;
    } catch (error) {
      logger.error('Error fetching latest signals', { 
        limit, 
        error: (error as Error).message 
      });
      throw error;
    }
  }

  /**
   * Process and enrich signal data
   * This can be expanded to add additional information or formatting
   */
  private processSignalData(signal: Signal): Signal {
    // Add any processing logic here
    return {
      ...signal,
      // Add any enriched fields
    };
  }
} 