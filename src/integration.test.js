import { SignalService } from '../service.js';
import { MeteoraDLMMSDK } from '../../meteora/sdk.js';
import { logger } from '../../utils/logger.js';
import { config } from '../../config.js';

describe('SignalService Integration Tests', () => {
  let service;
  let connection;

  beforeAll(async () => {
    // 使用实际的RPC连接
    connection = new Connection(config.rpc.endpoint, 'confirmed');
    service = new SignalService(connection, {
      historyDays: 14,
      updateInterval: 5 * 60 * 1000
    });

    // 等待RPC连接就绪
    await connection.getLatestBlockhash();
  });

  describe('Real Pool Analysis', () => {
    it('should analyze actual Meteora pools', async () => {
      // 获取实际的池子列表
      const sdk = new MeteoraDLMMSDK(connection);
      const pools = await sdk.getAllPools();

      // 确保获取到了池子数据
      expect(pools.length).toBeGreaterThan(0);
      logger.info(`Found ${pools.length} pools to analyze`);

      // 分析池子
      const analysis = await service.analyzePools(pools);

      // 验证分析结果
      expect(analysis).toHaveProperty('t1_pools');
      expect(analysis.t1_pools.length).toBeLessThanOrEqual(3);
      expect(analysis.t2_pools.length).toBeLessThanOrEqual(5);
      expect(analysis.t3_pools.length).toBeLessThanOrEqual(7);

      // 记录分析结果
      logger.info('Analysis Results:', {
        t1_count: analysis.t1_pools.length,
        t2_count: analysis.t2_pools.length,
        t3_count: analysis.t3_pools.length,
        avg_daily_yield: analysis.stats.avg_daily_yield,
        highest_yield_pool: analysis.stats.highest_yield_pool
      });

      // 验证T1池子的质量
      for (const pool of analysis.t1_pools) {
        expect(pool.analysis.scores.final_score).toBeGreaterThanOrEqual(85);
        expect(pool.analysis.scores.stability_score).toBeGreaterThanOrEqual(70);
        expect(pool.liquidity).toBeGreaterThanOrEqual(5000);
        expect(pool.trade_volume_24h).toBeGreaterThanOrEqual(10000);
      }
    }, 30000); // 设置较长的超时时间

    it('should handle large number of pools efficiently', async () => {
      const sdk = new MeteoraDLMMSDK(connection);
      const pools = await sdk.getAllPools();

      // 记录开始时间
      const startTime = Date.now();

      // 分析池子
      await service.analyzePools(pools);

      // 计算总耗时
      const duration = Date.now() - startTime;

      // 验证性能要求（PRD要求：处理100个池子时间<30秒）
      expect(duration).toBeLessThan(30000);
      logger.info(`Analyzed ${pools.length} pools in ${duration}ms`);
    }, 35000);

    it('should maintain scoring consistency', async () => {
      const sdk = new MeteoraDLMMSDK(connection);
      const pools = await sdk.getAllPools();

      // 连续进行两次分析
      const analysis1 = await service.analyzePools(pools);
      const analysis2 = await service.analyzePools(pools);

      // 验证评分的一致性
      for (let i = 0; i < analysis1.t1_pools.length; i++) {
        const pool1 = analysis1.t1_pools[i];
        const pool2 = analysis2.t1_pools[i];

        // 评分差异不应超过1分
        expect(Math.abs(pool1.analysis.scores.final_score - pool2.analysis.scores.final_score))
          .toBeLessThanOrEqual(1);
      }
    }, 60000);
  });

  describe('Error Handling', () => {
    it('should handle RPC node failures gracefully', async () => {
      // 模拟RPC节点故障
      const badConnection = new Connection('http://bad-endpoint.com', 'confirmed');
      const serviceWithBadConnection = new SignalService(badConnection);

      try {
        await serviceWithBadConnection.analyzePools([mockPool]);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('Failed to fetch pool data');
      }
    });

    it('should handle invalid pool data gracefully', async () => {
      const invalidPool = {
        address: 'invalid-pool',
        token_x: { symbol: 'INVALID' },
        token_y: { symbol: 'TOKEN' }
      };

      try {
        await service.analyzePools([invalidPool]);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('Invalid pool data');
      }
    });
  });

  describe('Performance Monitoring', () => {
    it('should track API call performance', async () => {
      const sdk = new MeteoraDLMMSDK(connection);
      const pools = await sdk.getAllPools();
      const pool = pools[0];

      // 测量API调用性能
      const startTime = Date.now();
      const enhancedPool = await service.getEnhancedPoolData(pool);
      const duration = Date.now() - startTime;

      // 记录性能数据
      logger.info('API Performance:', {
        operation: 'getEnhancedPoolData',
        duration,
        poolAddress: pool.address
      });

      // 验证性能要求
      expect(duration).toBeLessThan(5000); // 单个池子的增强数据获取应在5秒内完成
    });

    it('should monitor memory usage', async () => {
      const sdk = new MeteoraDLMMSDK(connection);
      const pools = await sdk.getAllPools();

      // 记录初始内存使用
      const initialMemory = process.memoryUsage();

      // 分析池子
      await service.analyzePools(pools);

      // 记录最终内存使用
      const finalMemory = process.memoryUsage();

      // 计算内存增长
      const heapGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      const heapGrowthMB = heapGrowth / 1024 / 1024;

      // 记录内存使用情况
      logger.info('Memory Usage:', {
        initialHeapMB: initialMemory.heapUsed / 1024 / 1024,
        finalHeapMB: finalMemory.heapUsed / 1024 / 1024,
        growthMB: heapGrowthMB
      });

      // 验证内存使用是否在合理范围内（假设限制为500MB）
      expect(heapGrowthMB).toBeLessThan(500);
    });
  });
}); 