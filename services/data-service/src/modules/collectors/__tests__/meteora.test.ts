import { MeteoraPoolCollector } from '../meteora';

describe('MeteoraPoolCollector', () => {
  let collector: MeteoraPoolCollector;

  // Known Meteora pool on mainnet for testing
  const TEST_POOL = '8HoQnePLqPj4M7PUDzfw8e3Ymdwgc7NLGnaTUapubyvu'; // Example SOL-USDC pool
  const TEST_TOKEN_X = 'So11111111111111111111111111111111111111112'; // SOL
  const TEST_TOKEN_Y = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // USDC

  beforeAll(() => {
    // Initialize collector with mainnet RPC
    collector = new MeteoraPoolCollector('https://api.mainnet-beta.solana.com');
  });

  describe('Pool Information Retrieval', () => {
    it('should fetch pool information', async () => {
      try {
        const poolInfo = await collector.getPoolInfo(TEST_POOL);
        console.log('Pool Info:', {
          address: TEST_POOL,
          price: poolInfo.price,
          binStep: poolInfo.binStep,
          totalLiquidity: poolInfo.totalLiquidity.toString(),
        });
        expect(poolInfo).toBeDefined();
        expect(poolInfo.price).toBeGreaterThan(0);
      } catch (error) {
        console.error('Error fetching pool info:', error);
        throw error;
      }
    });

    it('should fetch pools for token pair', async () => {
      try {
        const pools = await collector.getPoolsForTokenPair(TEST_TOKEN_X, TEST_TOKEN_Y);
        console.log('Found pools for SOL-USDC:', pools.length);
        console.log('First 3 pools:', pools.slice(0, 3));
        expect(pools).toBeDefined();
        expect(pools.length).toBeGreaterThan(0);
      } catch (error) {
        console.error('Error fetching pools for token pair:', error);
        throw error;
      }
    });

    it('should fetch liquidity distribution', async () => {
      try {
        const distribution = await collector.getLiquidityDistribution(TEST_POOL);
        console.log('Liquidity Distribution Summary:', {
          binArraysCount: distribution.length,
          sampleBin: distribution[0]?.bins[0],
        });
        expect(distribution).toBeDefined();
        expect(distribution.length).toBeGreaterThan(0);
      } catch (error) {
        console.error('Error fetching liquidity distribution:', error);
        throw error;
      }
    });
  });

  describe('Monitoring and Cache', () => {
    it('should monitor large removals', async () => {
      try {
        // First call to cache initial state
        await collector.getPoolInfo(TEST_POOL);

        // Wait a bit and check for changes
        await new Promise(resolve => setTimeout(resolve, 5000));

        const removalData = await collector.monitorLargeRemovals(TEST_POOL, 5);
        console.log('Large Removal Check Result:', removalData);

        // We don't expect any specific result, just that the function runs
        expect(removalData !== undefined).toBe(true);
      } catch (error) {
        console.error('Error monitoring large removals:', error);
        throw error;
      }
    });

    it('should handle cache operations', () => {
      // Test cache interval setting
      collector.setUpdateInterval(30000); // 30 seconds

      // Test cache clearing
      collector.clearCache(TEST_POOL);
      collector.clearCache(); // Clear all

      // If we reached here without errors, the test passes
      expect(true).toBe(true);
    });
  });
});
