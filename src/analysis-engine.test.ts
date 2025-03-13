import { AnalysisEngine } from '../analysis-engine';
import { PoolData } from '../../types';
import { HttpClient } from '../../utils/http-client';

// Mock HTTP client
jest.mock('../../utils/http-client');
const MockedHttpClient = HttpClient as jest.Mocked<typeof HttpClient>;

describe('AnalysisEngine', () => {
  let analysisEngine: AnalysisEngine;
  const mockPool: PoolData = {
    address: 'pool123',
    tokenX: 'SOL',
    tokenY: 'USDC',
    totalLiquidity: 1000000,
    volume24h: 500000,
    fees24h: 1500,
    apr: 25.5,
    tvl: 2000000,
    binStep: 10,
    activeId: 100
  };

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Initialize analysis engine
    analysisEngine = new AnalysisEngine();

    // Setup mock responses
    MockedHttpClient.prototype.get.mockImplementation((url: string) => {
      if (url.includes('/trends')) {
        return Promise.resolve({
          data: {
            shortTerm: { direction: 1, magnitude: 0.8, consistency: 0.9 },
            mediumTerm: { direction: 1, magnitude: 0.7, consistency: 0.8 },
            longTerm: { direction: 1, magnitude: 0.6, consistency: 0.7 }
          }
        });
      }
      if (url.includes('/liquidity')) {
        return Promise.resolve({
          data: {
            totalLiquidity: 1000000,
            concentration: 0.8,
            depth: 0.75,
            stability: 0.85
          }
        });
      }
      if (url.includes('/volume')) {
        return Promise.resolve({
          data: {
            dailyVolume: 500000,
            weeklyTrend: 0.6,
            volatility: 0.2
          }
        });
      }
      if (url.includes('/risk')) {
        return Promise.resolve({
          data: {
            volatilityRisk: 0.3,
            liquidityRisk: 0.2,
            counterpartyRisk: 0.1
          }
        });
      }
      return Promise.resolve({ data: {} });
    });

    MockedHttpClient.prototype.post.mockImplementation((url: string) => {
      if (url.includes('/enhance/trends')) {
        return Promise.resolve({
          shortTerm: { direction: 1, magnitude: 0.8, consistency: 0.9 },
          mediumTerm: { direction: 1, magnitude: 0.7, consistency: 0.8 },
          longTerm: { direction: 1, magnitude: 0.6, consistency: 0.7 },
          momentum: 0.75,
          volatility: 0.2,
          breakoutProbability: 0.65,
          supportLevels: [90, 85, 80],
          resistanceLevels: [110, 115, 120]
        });
      }
      if (url.includes('/enhance/liquidity')) {
        return Promise.resolve({
          totalLiquidity: 1000000,
          concentration: 0.8,
          depth: 0.75,
          stability: 0.85,
          binDistribution: [
            { binId: 95, liquidity: 100000, share: 10 },
            { binId: 100, liquidity: 200000, share: 20 }
          ],
          imbalanceRisk: 0.2,
          whaleActivity: 0.1,
          optimalBinRanges: [
            { start: 95, end: 105, confidence: 0.8 }
          ]
        });
      }
      if (url.includes('/enhance/volume')) {
        return Promise.resolve({
          dailyVolume: 500000,
          weeklyTrend: 0.6,
          volatility: 0.2,
          patterns: [
            { type: 'ACCUMULATION', strength: 0.7, timeframe: 'MEDIUM' }
          ],
          anomalies: [],
          predictedTrend: 0.65,
          marketImpact: 0.3
        });
      }
      if (url.includes('/enhance/sentiment')) {
        return Promise.resolve({
          overall: 0.7,
          onChain: 0.75,
          social: 0.65,
          newsImpact: 0.6,
          confidence: 0.8
        });
      }
      if (url.includes('/enhance/risk')) {
        return Promise.resolve({
          volatilityRisk: 0.3,
          liquidityRisk: 0.2,
          counterpartyRisk: 0.1,
          systemicRisk: 0.15,
          impermanentLossRisk: 0.25,
          regulatoryRisk: 0.1,
          overallRisk: 0.2
        });
      }
      return Promise.resolve({});
    });
  });

  describe('analyzeMarket', () => {
    it('should analyze market data for a pool', async () => {
      const results = await analysisEngine.analyzeMarket([mockPool]);
      
      expect(results).toHaveLength(1);
      const analysis = results[0];
      
      // Check basic properties
      expect(analysis.poolAddress).toBe(mockPool.address);
      expect(analysis.tokenPair).toBe(`${mockPool.tokenX}/${mockPool.tokenY}`);
      expect(analysis.timestamp).toBeDefined();
      
      // Check trend analysis
      expect(analysis.trend).toBeDefined();
      expect(analysis.trend.momentum).toBeGreaterThan(0);
      expect(analysis.trend.breakoutProbability).toBeGreaterThan(0);
      
      // Check liquidity analysis
      expect(analysis.liquidity).toBeDefined();
      expect(analysis.liquidity.totalLiquidity).toBeGreaterThan(0);
      expect(analysis.liquidity.binDistribution).toHaveLength(2);
      
      // Check volume analysis
      expect(analysis.volume).toBeDefined();
      expect(analysis.volume.dailyVolume).toBeGreaterThan(0);
      expect(analysis.volume.patterns).toHaveLength(1);
      
      // Check sentiment analysis
      expect(analysis.sentiment).toBeDefined();
      expect(analysis.sentiment.overall).toBeGreaterThan(0);
      expect(analysis.sentiment.confidence).toBeGreaterThan(0);
      
      // Check risk metrics
      expect(analysis.risk).toBeDefined();
      expect(analysis.risk.overallRisk).toBeLessThan(1);
      
      // Check signal factors
      expect(analysis.signalFactors).toBeDefined();
      expect(analysis.signalFactors.length).toBeGreaterThan(0);
    });

    it('should handle API errors gracefully', async () => {
      // Mock API error
      MockedHttpClient.prototype.get.mockRejectedValue(new Error('API Error'));
      
      await expect(analysisEngine.analyzeMarket([mockPool]))
        .rejects
        .toThrow('API Error');
    });

    it('should use cached results when available', async () => {
      // First call to populate cache
      await analysisEngine.analyzeMarket([mockPool]);
      
      // Reset mock calls
      MockedHttpClient.prototype.get.mockClear();
      MockedHttpClient.prototype.post.mockClear();
      
      // Second call should use cache
      await analysisEngine.analyzeMarket([mockPool]);
      
      // Verify no API calls were made
      expect(MockedHttpClient.prototype.get).not.toHaveBeenCalled();
      expect(MockedHttpClient.prototype.post).not.toHaveBeenCalled();
    });

    it('should ignore cache when expired', async () => {
      // First call to populate cache
      await analysisEngine.analyzeMarket([mockPool]);
      
      // Fast forward time past cache TTL
      jest.advanceTimersByTime(6 * 60 * 1000); // 6 minutes
      
      // Reset mock calls
      MockedHttpClient.prototype.get.mockClear();
      MockedHttpClient.prototype.post.mockClear();
      
      // Second call should not use cache
      await analysisEngine.analyzeMarket([mockPool]);
      
      // Verify API calls were made
      expect(MockedHttpClient.prototype.get).toHaveBeenCalled();
      expect(MockedHttpClient.prototype.post).toHaveBeenCalled();
    });
  });

  describe('analyzePriceTrends', () => {
    it('should analyze price trends correctly', async () => {
      const results = await analysisEngine.analyzeMarket([mockPool]);
      const trend = results[0].trend;
      
      expect(trend.shortTerm).toBeGreaterThan(0);
      expect(trend.mediumTerm).toBeGreaterThan(0);
      expect(trend.longTerm).toBeGreaterThan(0);
      expect(trend.momentum).toBeGreaterThan(0);
      expect(trend.volatility).toBeLessThan(1);
      expect(trend.breakoutProbability).toBeGreaterThan(0);
      expect(trend.supportLevels).toHaveLength(3);
      expect(trend.resistanceLevels).toHaveLength(3);
    });
  });

  describe('analyzeLiquidity', () => {
    it('should analyze liquidity correctly', async () => {
      const results = await analysisEngine.analyzeMarket([mockPool]);
      const liquidity = results[0].liquidity;
      
      expect(liquidity.totalLiquidity).toBeGreaterThan(0);
      expect(liquidity.concentration).toBeGreaterThan(0);
      expect(liquidity.depth).toBeGreaterThan(0);
      expect(liquidity.stability).toBeGreaterThan(0);
      expect(liquidity.binDistribution).toHaveLength(2);
      expect(liquidity.imbalanceRisk).toBeLessThan(1);
      expect(liquidity.whaleActivity).toBeLessThan(1);
      expect(liquidity.optimalBinRanges).toHaveLength(1);
    });
  });

  describe('analyzeVolume', () => {
    it('should analyze volume correctly', async () => {
      const results = await analysisEngine.analyzeMarket([mockPool]);
      const volume = results[0].volume;
      
      expect(volume.dailyVolume).toBeGreaterThan(0);
      expect(volume.weeklyTrend).toBeGreaterThan(0);
      expect(volume.volatility).toBeLessThan(1);
      expect(volume.patterns).toHaveLength(1);
      expect(volume.anomalies).toHaveLength(0);
      expect(volume.predictedTrend).toBeGreaterThan(0);
      expect(volume.marketImpact).toBeLessThan(1);
    });
  });

  describe('analyzeSentiment', () => {
    it('should analyze sentiment correctly', async () => {
      const results = await analysisEngine.analyzeMarket([mockPool]);
      const sentiment = results[0].sentiment;
      
      expect(sentiment.overall).toBeGreaterThan(0);
      expect(sentiment.onChain).toBeGreaterThan(0);
      expect(sentiment.social).toBeGreaterThan(0);
      expect(sentiment.newsImpact).toBeGreaterThan(0);
      expect(sentiment.confidence).toBeGreaterThan(0);
    });
  });

  describe('calculateRiskMetrics', () => {
    it('should calculate risk metrics correctly', async () => {
      const results = await analysisEngine.analyzeMarket([mockPool]);
      const risk = results[0].risk;
      
      expect(risk.volatilityRisk).toBeLessThan(1);
      expect(risk.liquidityRisk).toBeLessThan(1);
      expect(risk.counterpartyRisk).toBeLessThan(1);
      expect(risk.systemicRisk).toBeLessThan(1);
      expect(risk.impermanentLossRisk).toBeLessThan(1);
      expect(risk.regulatoryRisk).toBeLessThan(1);
      expect(risk.overallRisk).toBeLessThan(1);
    });
  });
}); 