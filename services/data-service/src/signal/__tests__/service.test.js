import { SignalService } from '../service.js';
import { MeteoraDLMMSDK } from '../../meteora/sdk.js';

// Mock Meteora SDK
jest.mock('../../meteora/sdk.js');

describe('SignalService', () => {
  let service;
  let mockConnection;
  let mockPool;

  beforeEach(() => {
    mockConnection = {};
    mockPool = {
      address: 'pool123',
      token_x: { symbol: 'SOL', address: 'So11111111111111111111111111111111111111112' },
      token_y: { symbol: 'USDC', address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
      trade_volume_24h: 500000,
      daily_yield: 7.5,
      liquidity: 1000000,
      fees_24h: 1500,
      base_fee_percentage: 0.003
    };

    // Mock SDK methods
    MeteoraDLMMSDK.mockImplementation(() => ({
      getActiveBinInfo: jest.fn().mockResolvedValue({
        binId: 100,
        price: 25.5,
        pricePerToken: 25.5
      }),
      getBinsDistribution: jest.fn().mockResolvedValue({
        bins: Array(20).fill(0).map((_, i) => ({
          binId: 90 + i,
          price: 25 + (i * 0.5),
          liquidity: 50000
        }))
      }),
      getPoolFeeInfo: jest.fn().mockResolvedValue({
        baseFee: 0.003,
        maxFee: 0.01,
        currentDynamicFee: 0.005,
        protocolFee: 0.001
      }),
      getLiquidityDistribution: jest.fn().mockResolvedValue({
        bins: Array(20).fill(0).map((_, i) => ({
          binId: 90 + i,
          liquidity: 50000
        }))
      }),
      getPriceHistory: jest.fn().mockResolvedValue(
        Array(14).fill(0).map((_, i) => ({
          timestamp: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)).toISOString(),
          price: 25 + (Math.random() - 0.5)
        }))
      ),
      getYieldHistory: jest.fn().mockResolvedValue(
        Array(14).fill(0).map((_, i) => ({
          timestamp: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)).toISOString(),
          yield: 7.5 + (Math.random() - 0.5)
        }))
      ),
      getVolumeHistory: jest.fn().mockResolvedValue(
        Array(14).fill(0).map((_, i) => ({
          timestamp: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)).toISOString(),
          volume: 500000 + (Math.random() * 100000 - 50000)
        }))
      ),
      getLiquidityHistory: jest.fn().mockResolvedValue(
        Array(14).fill(0).map((_, i) => ({
          timestamp: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)).toISOString(),
          liquidity: 1000000 + (Math.random() * 100000 - 50000)
        }))
      )
    }));

    service = new SignalService(mockConnection);
  });

  describe('getEnhancedPoolData', () => {
    it('should fetch and combine all required pool data', async () => {
      const enhancedPool = await service.getEnhancedPoolData(mockPool);

      expect(enhancedPool).toHaveProperty('enhanced');
      expect(enhancedPool.enhanced).toHaveProperty('activeBin');
      expect(enhancedPool.enhanced).toHaveProperty('binsDistribution');
      expect(enhancedPool.enhanced).toHaveProperty('feeInfo');
      expect(enhancedPool.enhanced).toHaveProperty('liquidityDistribution');
      expect(enhancedPool.enhanced).toHaveProperty('priceHistory');
      expect(enhancedPool.enhanced).toHaveProperty('yieldHistory');
      expect(enhancedPool.enhanced).toHaveProperty('volumeHistory');
      expect(enhancedPool.enhanced).toHaveProperty('liquidityHistory');
    });
  });

  describe('calculateBasePerformanceScore', () => {
    it('should calculate base performance score correctly', () => {
      const score = service.calculateBasePerformanceScore(mockPool);

      expect(score).toHaveProperty('score');
      expect(score).toHaveProperty('components');
      expect(score).toHaveProperty('penalties');
      expect(score.score).toBeGreaterThanOrEqual(0);
      expect(score.score).toBeLessThanOrEqual(100);
    });

    it('should apply penalties for high fees and low liquidity', () => {
      const highFeePool = { ...mockPool, base_fee_percentage: 0.01 };
      const lowLiquidityPool = { ...mockPool, liquidity: 15000 };

      const highFeeScore = service.calculateBasePerformanceScore(highFeePool);
      const lowLiquidityScore = service.calculateBasePerformanceScore(lowLiquidityPool);

      expect(highFeeScore.penalties.fee).toBeGreaterThan(0);
      expect(lowLiquidityScore.penalties.liquidity).toBeGreaterThan(0);
    });
  });

  describe('generateFinalScore', () => {
    it('should generate comprehensive scoring and recommendations', async () => {
      const enhancedPool = await service.getEnhancedPoolData(mockPool);
      const analysis = service.generateFinalScore(enhancedPool);

      expect(analysis).toHaveProperty('scores');
      expect(analysis).toHaveProperty('recommendation');
      expect(analysis).toHaveProperty('details');

      expect(analysis.scores).toHaveProperty('base_performance_score');
      expect(analysis.scores).toHaveProperty('liquidity_distribution_score');
      expect(analysis.scores).toHaveProperty('fee_efficiency_score');
      expect(analysis.scores).toHaveProperty('stability_score');
      expect(analysis.scores).toHaveProperty('final_score');

      expect(analysis.recommendation).toHaveProperty('position_size');
      expect(analysis.recommendation).toHaveProperty('price_range');
      expect(analysis.recommendation).toHaveProperty('bin_distribution');
      expect(analysis.recommendation).toHaveProperty('bin_step');
    });
  });

  describe('analyzePools', () => {
    it('should analyze multiple pools and generate T1/T2/T3 recommendations', async () => {
      const pools = [
        mockPool,
        { ...mockPool, address: 'pool456', token_x: { symbol: 'JTO' }, token_y: { symbol: 'USDC' } },
        { ...mockPool, address: 'pool789', token_x: { symbol: 'BONK' }, token_y: { symbol: 'SOL' } },
        { ...mockPool, address: 'pool012', token_x: { symbol: 'RAY' }, token_y: { symbol: 'USDC' } },
        { ...mockPool, address: 'pool345', token_x: { symbol: 'ORCA' }, token_y: { symbol: 'SOL' } }
      ];

      const analysis = await service.analyzePools(pools);

      expect(analysis).toHaveProperty('timestamp');
      expect(analysis).toHaveProperty('t1_pools');
      expect(analysis).toHaveProperty('t2_pools');
      expect(analysis).toHaveProperty('t3_pools');
      expect(analysis).toHaveProperty('stats');

      expect(analysis.t1_pools.length).toBeLessThanOrEqual(3);
      expect(analysis.t2_pools.length).toBeLessThanOrEqual(5);
      expect(analysis.t3_pools.length).toBeLessThanOrEqual(7);

      // 验证T1池子的多样性
      const t1Tokens = new Set();
      analysis.t1_pools.forEach(pool => {
        t1Tokens.add(pool.token_x.symbol);
        t1Tokens.add(pool.token_y.symbol);
      });
      expect(t1Tokens.size).toBeGreaterThan(analysis.t1_pools.length); // 确保代币不完全重叠
    });
  });
}); 