/**
 * Batch Processor
 * Utility for batch processing signals to optimize performance
 */
import { Signal } from '../types';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

export interface BatchProcessorOptions {
  maxBatchSize: number;       // Maximum batch size
  maxWaitTime: number;        // Maximum wait time in ms
  processingFn: (batch: Signal[]) => Promise<void>; // Processing function
  debug?: boolean;            // Enable debug logging
}

/**
 * Batch processor for signals
 * Collects signals and processes them in batches to optimize performance
 */
export class BatchProcessor extends EventEmitter {
  private options: BatchProcessorOptions;
  private batch: Signal[] = [];
  private timer: NodeJS.Timeout | null = null;
  private processing: boolean = false;
  private totalProcessed: number = 0;
  private totalBatches: number = 0;
  private lastProcessTime: number = 0;
  private processingTimes: number[] = [];

  /**
   * Constructor
   * @param options Batch processor options
   */
  constructor(options: BatchProcessorOptions) {
    super();
    
    this.options = options;
    
    this.log('Batch processor initialized', {
      maxBatchSize: this.options.maxBatchSize,
      maxWaitTime: this.options.maxWaitTime
    });
  }

  /**
   * Add signals to batch
   * @param signals Signals to add
   */
  add(signals: Signal | Signal[]): void {
    if (!signals) {
      return;
    }
    
    // Convert single signal to array
    const signalArray = Array.isArray(signals) ? signals : [signals];
    
    if (signalArray.length === 0) {
      return;
    }
    
    // Add signals to batch
    this.batch.push(...signalArray);
    
    this.log('Added signals to batch', {
      added: signalArray.length,
      batchSize: this.batch.length
    });
    
    // Start timer if not already started
    this.startTimer();
    
    // Process batch if max size reached
    if (this.batch.length >= this.options.maxBatchSize) {
      this.processBatch();
    }
  }

  /**
   * Start timer for batch processing
   */
  private startTimer(): void {
    if (this.timer) {
      return;
    }
    
    this.timer = setTimeout(() => {
      this.processBatch();
    }, this.options.maxWaitTime);
    
    this.log('Started batch timer', {
      maxWaitTime: this.options.maxWaitTime
    });
  }

  /**
   * Process current batch
   */
  private async processBatch(): Promise<void> {
    if (this.processing || this.batch.length === 0) {
      return;
    }
    
    // Clear timer
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    
    // Set processing flag
    this.processing = true;
    
    // Get current batch and clear
    const currentBatch = [...this.batch];
    this.batch = [];
    
    const startTime = Date.now();
    
    this.log('Processing batch', {
      batchSize: currentBatch.length
    });
    
    try {
      // Process batch
      await this.options.processingFn(currentBatch);
      
      // Update stats
      const processingTime = Date.now() - startTime;
      this.totalProcessed += currentBatch.length;
      this.totalBatches++;
      this.lastProcessTime = processingTime;
      this.processingTimes.push(processingTime);
      
      // Keep only last 10 processing times
      if (this.processingTimes.length > 10) {
        this.processingTimes.shift();
      }
      
      this.log('Batch processed successfully', {
        batchSize: currentBatch.length,
        processingTime,
        totalProcessed: this.totalProcessed,
        totalBatches: this.totalBatches
      });
      
      // Emit processed event
      this.emit('processed', {
        batchSize: currentBatch.length,
        processingTime,
        totalProcessed: this.totalProcessed,
        totalBatches: this.totalBatches
      });
    } catch (error) {
      this.log('Error processing batch', {
        error,
        batchSize: currentBatch.length
      });
      
      // Emit error event
      this.emit('error', error, currentBatch);
    } finally {
      // Reset processing flag
      this.processing = false;
      
      // Process next batch if available
      if (this.batch.length > 0) {
        this.processBatch();
      } else {
        // Start timer for next batch
        this.startTimer();
      }
    }
  }

  /**
   * Flush current batch
   * @returns Promise that resolves when batch is processed
   */
  async flush(): Promise<void> {
    if (this.batch.length === 0) {
      return;
    }
    
    this.log('Flushing batch', {
      batchSize: this.batch.length
    });
    
    return this.processBatch();
  }

  /**
   * Get batch processor stats
   * @returns Batch processor stats
   */
  getStats(): any {
    const avgProcessingTime = this.processingTimes.length > 0
      ? this.processingTimes.reduce((sum, time) => sum + time, 0) / this.processingTimes.length
      : 0;
    
    return {
      totalProcessed: this.totalProcessed,
      totalBatches: this.totalBatches,
      currentBatchSize: this.batch.length,
      lastProcessTime: this.lastProcessTime,
      avgProcessingTime,
      processingTimes: [...this.processingTimes]
    };
  }

  /**
   * Log message if debug is enabled
   * @param message Message to log
   * @param data Additional data
   */
  private log(message: string, data?: any): void {
    if (this.options.debug) {
      logger.debug(`[BatchProcessor] ${message}`, data);
    }
  }
} 