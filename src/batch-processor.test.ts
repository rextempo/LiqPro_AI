/**
 * Batch Processor Tests
 */
import { BatchProcessor } from '../batch-processor';
import { Signal, SignalType, SignalStrength, SignalTimeframe, SignalReliability } from '../../types';
import { SignalFactorInfo } from '../../types/signal';

describe('BatchProcessor', () => {
  // Mock signal generator
  const createMockSignal = (id: string): Signal => ({
    id,
    poolAddress: 'pool-address',
    tokenPair: 'SOL-USDC',
    type: SignalType.ENTRY,
    strength: SignalStrength.MODERATE,
    timeframe: SignalTimeframe.SHORT_TERM,
    reliability: SignalReliability.MEDIUM,
    timestamp: Date.now(),
    expirationTimestamp: Date.now() + 3600000, // 1 hour from now
    description: 'Test signal',
    suggestedAction: 'Buy',
    parameters: {},
    metadata: { test: true }
  });

  // Create mock signals
  const createMockSignals = (count: number): Signal[] => {
    const signals: Signal[] = [];
    for (let i = 0; i < count; i++) {
      signals.push(createMockSignal(`signal-${i}`));
    }
    return signals;
  };

  it('should process signals in batches', async () => {
    // Create mock processing function
    const processingFn = jest.fn().mockResolvedValue(undefined);
    
    // Create batch processor with small batch size
    const batchProcessor = new BatchProcessor({
      maxBatchSize: 5,
      maxWaitTime: 1000,
      processingFn
    });
    
    // Add signals
    const signals = createMockSignals(12);
    batchProcessor.add(signals);
    
    // Wait for processing to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Should have processed signals in batches
    expect(processingFn).toHaveBeenCalledTimes(3);
    expect(processingFn.mock.calls[0][0].length).toBe(5);
    expect(processingFn.mock.calls[1][0].length).toBe(5);
    expect(processingFn.mock.calls[2][0].length).toBe(2);
  });

  it('should process signals after max wait time', async () => {
    // Create mock processing function
    const processingFn = jest.fn().mockResolvedValue(undefined);
    
    // Create batch processor with long wait time
    const batchProcessor = new BatchProcessor({
      maxBatchSize: 10,
      maxWaitTime: 200,
      processingFn
    });
    
    // Add signals (less than max batch size)
    const signals = createMockSignals(3);
    batchProcessor.add(signals);
    
    // Should not have processed signals yet
    expect(processingFn).not.toHaveBeenCalled();
    
    // Wait for max wait time
    await new Promise(resolve => setTimeout(resolve, 250));
    
    // Should have processed signals
    expect(processingFn).toHaveBeenCalledTimes(1);
    expect(processingFn.mock.calls[0][0].length).toBe(3);
  });

  it('should process signals immediately when batch size is reached', async () => {
    // Create mock processing function
    const processingFn = jest.fn().mockResolvedValue(undefined);
    
    // Create batch processor
    const batchProcessor = new BatchProcessor({
      maxBatchSize: 5,
      maxWaitTime: 1000,
      processingFn
    });
    
    // Add signals (exactly max batch size)
    const signals = createMockSignals(5);
    batchProcessor.add(signals);
    
    // Wait for processing to complete
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Should have processed signals immediately
    expect(processingFn).toHaveBeenCalledTimes(1);
    expect(processingFn.mock.calls[0][0].length).toBe(5);
  });

  it('should handle errors in processing function', async () => {
    // Create mock processing function that throws an error
    const processingFn = jest.fn().mockRejectedValue(new Error('Processing error'));
    
    // Create batch processor
    const batchProcessor = new BatchProcessor({
      maxBatchSize: 5,
      maxWaitTime: 1000,
      processingFn
    });
    
    // Add error handler
    const errorHandler = jest.fn();
    batchProcessor.on('error', errorHandler);
    
    // Add signals
    const signals = createMockSignals(5);
    batchProcessor.add(signals);
    
    // Wait for processing to complete
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Should have called processing function
    expect(processingFn).toHaveBeenCalledTimes(1);
    
    // Should have emitted error event
    expect(errorHandler).toHaveBeenCalledTimes(1);
    expect(errorHandler.mock.calls[0][0].message).toBe('Processing error');
    expect(errorHandler.mock.calls[0][1].length).toBe(5);
  });

  it('should flush batch on demand', async () => {
    // Create mock processing function
    const processingFn = jest.fn().mockResolvedValue(undefined);
    
    // Create batch processor with long wait time
    const batchProcessor = new BatchProcessor({
      maxBatchSize: 10,
      maxWaitTime: 1000,
      processingFn
    });
    
    // Add signals (less than max batch size)
    const signals = createMockSignals(3);
    batchProcessor.add(signals);
    
    // Should not have processed signals yet
    expect(processingFn).not.toHaveBeenCalled();
    
    // Flush batch
    await batchProcessor.flush();
    
    // Should have processed signals
    expect(processingFn).toHaveBeenCalledTimes(1);
    expect(processingFn.mock.calls[0][0].length).toBe(3);
  });

  it('should track processing stats', async () => {
    // Create mock processing function
    const processingFn = jest.fn().mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });
    
    // Create batch processor
    const batchProcessor = new BatchProcessor({
      maxBatchSize: 5,
      maxWaitTime: 1000,
      processingFn
    });
    
    // Add signals
    const signals = createMockSignals(5);
    batchProcessor.add(signals);
    
    // Wait for processing to complete
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Get stats
    const stats = batchProcessor.getStats();
    
    // Check stats
    expect(stats.totalProcessed).toBe(5);
    expect(stats.totalBatches).toBe(1);
    expect(stats.currentBatchSize).toBe(0);
    expect(stats.lastProcessTime).toBeGreaterThan(0);
    expect(stats.avgProcessingTime).toBeGreaterThan(0);
    expect(stats.processingTimes.length).toBe(1);
  });
}); 