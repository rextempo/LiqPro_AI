/**
 * History Controller
 * Provides endpoints for querying historical signals and performance data
 */
import { Request, Response } from 'express';
import { SignalGenerator } from '../models/signal-generator';
import { StrategyManager } from '../models/strategy-manager';
import { CacheService } from '../services/cache-service';
import { logger } from '../utils/logger';
import { Signal, SignalType, SignalTimeframe } from '../types';

/**
 * History Controller class
 */
export class HistoryController {
  private signalGenerator: SignalGenerator;
  private strategyManager: StrategyManager;
  private cacheService: CacheService;

  /**
   * Constructor
   * @param cacheService Cache service instance
   */
  constructor(cacheService: CacheService) {
    this.signalGenerator = new SignalGenerator();
    this.strategyManager = new StrategyManager();
    this.cacheService = cacheService;
    logger.info('History controller initialized');
  }

  /**
   * Get historical signals with filtering
   * @param req Request object
   * @param res Response object
   */
  getHistoricalSignals = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        poolAddress,
        signalType,
        timeframe,
        minStrength,
        minReliability,
        startTime,
        endTime,
        limit = 100,
        offset = 0
      } = req.query;

      logger.info('Historical signals request', { 
        poolAddress, signalType, timeframe, startTime, endTime 
      });

      // Try to get from cache first
      const cacheKey = `history:signals:${JSON.stringify(req.query)}`;
      const cachedResult = await this.cacheService.get(cacheKey);
      
      if (cachedResult) {
        logger.debug('Returning cached historical signals');
        res.status(200).json(cachedResult);
        return;
      }

      // Get signals from data service
      const signals = await this.fetchHistoricalSignals({
        poolAddress: poolAddress as string,
        signalType: signalType as SignalType,
        timeframe: timeframe as SignalTimeframe,
        minStrength: minStrength as string,
        minReliability: minReliability as string,
        startTime: startTime ? parseInt(startTime as string) : undefined,
        endTime: endTime ? parseInt(endTime as string) : undefined,
        limit: limit ? parseInt(limit as string) : 100,
        offset: offset ? parseInt(offset as string) : 0
      });

      // Format response
      const response = {
        signals,
        meta: {
          total: signals.length,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string)
        }
      };

      // Cache the result
      await this.cacheService.set(cacheKey, response, 60000); // 1 minute cache

      res.status(200).json(response);
    } catch (error) {
      logger.error('Error retrieving historical signals', { error });
      res.status(500).json({
        error: 'Failed to retrieve historical signals',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Get performance metrics for a pool
   * @param req Request object
   * @param res Response object
   */
  getPoolPerformance = async (req: Request, res: Response): Promise<void> => {
    try {
      const { poolAddress, timeframe = '30d' } = req.params;

      if (!poolAddress) {
        res.status(400).json({ error: 'Pool address is required' });
        return;
      }

      logger.info('Pool performance request', { poolAddress, timeframe });

      // Try to get from cache first
      const cacheKey = `history:performance:${poolAddress}:${timeframe}`;
      const cachedResult = await this.cacheService.get(cacheKey);
      
      if (cachedResult) {
        logger.debug('Returning cached pool performance');
        res.status(200).json(cachedResult);
        return;
      }

      // Get performance data
      const performance = await this.fetchPoolPerformance(poolAddress, timeframe);

      // Cache the result
      await this.cacheService.set(cacheKey, performance, 300000); // 5 minute cache

      res.status(200).json(performance);
    } catch (error) {
      logger.error('Error retrieving pool performance', { error });
      res.status(500).json({
        error: 'Failed to retrieve pool performance',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Get signal accuracy metrics
   * @param req Request object
   * @param res Response object
   */
  getSignalAccuracy = async (req: Request, res: Response): Promise<void> => {
    try {
      const { signalType, timeframe = '30d' } = req.query;

      logger.info('Signal accuracy request', { signalType, timeframe });

      // Try to get from cache first
      const cacheKey = `history:accuracy:${signalType || 'all'}:${timeframe}`;
      const cachedResult = await this.cacheService.get(cacheKey);
      
      if (cachedResult) {
        logger.debug('Returning cached signal accuracy');
        res.status(200).json(cachedResult);
        return;
      }

      // Get accuracy data
      const accuracy = await this.fetchSignalAccuracy(
        signalType as SignalType | undefined,
        timeframe as string
      );

      // Cache the result
      await this.cacheService.set(cacheKey, accuracy, 300000); // 5 minute cache

      res.status(200).json(accuracy);
    } catch (error) {
      logger.error('Error retrieving signal accuracy', { error });
      res.status(500).json({
        error: 'Failed to retrieve signal accuracy',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Fetch historical signals from data service
   * @param filters Signal filters
   * @returns Array of signals
   */
  private async fetchHistoricalSignals(filters: {
    poolAddress?: string;
    signalType?: SignalType;
    timeframe?: SignalTimeframe;
    minStrength?: string;
    minReliability?: string;
    startTime?: number;
    endTime?: number;
    limit?: number;
    offset?: number;
  }): Promise<Signal[]> {
    try {
      // In a real implementation, this would fetch from a database or data service
      // For now, we'll return mock data
      const allSignals = this.signalGenerator.getAllSignals();
      
      // Apply filters
      return allSignals.filter(signal => {
        // Filter by pool address
        if (filters.poolAddress && signal.poolAddress !== filters.poolAddress) {
          return false;
        }
        
        // Filter by signal type
        if (filters.signalType && signal.type !== filters.signalType) {
          return false;
        }
        
        // Filter by timeframe
        if (filters.timeframe && signal.timeframe !== filters.timeframe) {
          return false;
        }
        
        // Filter by time range
        if (filters.startTime && signal.timestamp < filters.startTime) {
          return false;
        }
        
        if (filters.endTime && signal.timestamp > filters.endTime) {
          return false;
        }
        
        return true;
      }).slice(filters.offset || 0, (filters.offset || 0) + (filters.limit || 100));
    } catch (error) {
      logger.error('Error fetching historical signals', { error, filters });
      throw new Error('Failed to fetch historical signals');
    }
  }

  /**
   * Fetch pool performance metrics
   * @param poolAddress Pool address
   * @param timeframe Time frame (e.g., '7d', '30d', '90d')
   * @returns Performance metrics
   */
  private async fetchPoolPerformance(poolAddress: string, timeframe: string): Promise<any> {
    try {
      // In a real implementation, this would fetch from a database or data service
      // For now, we'll return mock data
      return {
        poolAddress,
        timeframe,
        metrics: {
          totalSignals: 24,
          accurateSignals: 18,
          accuracy: 0.75,
          profitLoss: 0.12,
          volume: 1250000,
          fees: 3750,
          impermanentLoss: -0.02
        },
        timeSeries: {
          timestamps: [/* Array of timestamps */],
          values: [/* Array of values */]
        }
      };
    } catch (error) {
      logger.error('Error fetching pool performance', { error, poolAddress, timeframe });
      throw new Error('Failed to fetch pool performance');
    }
  }

  /**
   * Fetch signal accuracy metrics
   * @param signalType Signal type
   * @param timeframe Time frame
   * @returns Accuracy metrics
   */
  private async fetchSignalAccuracy(signalType?: SignalType, timeframe?: string): Promise<any> {
    try {
      // In a real implementation, this would fetch from a database or data service
      // For now, we'll return mock data
      return {
        timeframe: timeframe || '30d',
        signalType: signalType || 'all',
        metrics: {
          totalSignals: signalType ? 42 : 156,
          accurateSignals: signalType ? 32 : 117,
          accuracy: signalType ? 0.76 : 0.75,
          averageReturn: 0.08,
          averageHoldingTime: 72 // hours
        },
        byType: signalType ? undefined : {
          ENTRY: { count: 58, accuracy: 0.78 },
          EXIT: { count: 52, accuracy: 0.73 },
          REBALANCE: { count: 32, accuracy: 0.81 },
          ALERT: { count: 14, accuracy: 0.64 }
        }
      };
    } catch (error) {
      logger.error('Error fetching signal accuracy', { error, signalType, timeframe });
      throw new Error('Failed to fetch signal accuracy');
    }
  }
} 