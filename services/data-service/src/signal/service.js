/**
 * 信号服务
 * 负责分析池子数据并生成投资信号
 */

const { Connection } = require('@solana/web3.js');
const { MeteoraDLMMSDK } = require('../meteora/sdk');
const { logger } = require('../utils/logger');
const { SignalMonitor } = require('./monitor');

/**
 * 信号服务类
 */
class SignalService {
  /**
   * 构造函数
   * @param {Connection} connection - Solana连接实例
   * @param {Object} options - 配置选项
   * @param {number} options.historyDays - 历史数据天数
   * @param {number} options.updateInterval - 更新间隔（毫秒）
   */
  constructor(connection, options = {}) {
    this.connection = connection;
    this.options = {
      historyDays: options.historyDays || 14,
      updateInterval: options.updateInterval || 5 * 60 * 1000, // 默认5分钟
      maxT1Pools: options.maxT1Pools || 3,
      maxT2Pools: options.maxT2Pools || 5,
      maxT3Pools: options.maxT3Pools || 7
    };
    
    // 初始化SDK
    this.sdk = new MeteoraDLMMSDK(connection);
    
    // 初始化监控器
    this.monitor = new SignalMonitor({
      maxMetricsAge: 7 * 24 * 60 * 60 * 1000, // 7天
      memoryThreshold: {
        warning: 500 * 1024 * 1024, // 500MB
        critical: 1000 * 1024 * 1024 // 1GB
      },
      apiTimeout: 10000 // 10秒
    });
    
    logger.info('SignalService initialized', { options: this.options });
  }
  
  /**
   * 启动监控
   */
  startMonitoring() {
    // 每分钟监控内存使用
    this.memoryMonitorInterval = setInterval(() => {
      this.monitor.trackMemoryUsage();
    }, 60 * 1000);
    
    // 每小时生成性能报告
    this.reportInterval = setInterval(() => {
      const report = this.monitor.generatePerformanceReport();
      logger.info('Signal system performance report', { report });
    }, 60 * 60 * 1000);
    
    logger.info('Signal monitoring started');
  }
  
  /**
   * 停止监控
   */
  stopMonitoring() {
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
    }
    
    if (this.reportInterval) {
      clearInterval(this.reportInterval);
    }
    
    logger.info('Signal monitoring stopped');
  }

  /**
   * 获取增强的池子数据
   * @param {Object} pool - 池子基础数据
   * @returns {Promise<Object>} 增强的池子数据
   */
  async getEnhancedPoolData(pool) {
    const startTime = Date.now();
    
    try {
      // 监控API调用
      this.monitor.trackApiCall('getEnhancedPoolData', pool.address);
      
      // 获取增强数据
      const [
        activeBin,
        binsDistribution,
        feeInfo,
        liquidityDistribution,
        priceHistory,
        yieldHistory,
        volumeHistory,
        liquidityHistory
      ] = await Promise.all([
        this.sdk.getActiveBinInfo(pool.address),
        this.sdk.getBinsDistribution(pool.address, 100, 10),
        this.sdk.getPoolFeeInfo(pool.address),
        this.sdk.getLiquidityDistribution(pool.address),
        this.sdk.getPriceHistory(pool.address, this.options.historyDays),
        this.sdk.getYieldHistory(pool.address, this.options.historyDays),
        this.sdk.getVolumeHistory(pool.address, this.options.historyDays),
        this.sdk.getLiquidityHistory(pool.address, this.options.historyDays)
      ]);
      
      // 记录API调用性能
      const duration = Date.now() - startTime;
      this.monitor.trackApiCall('getEnhancedPoolData', pool.address, duration);
      
      // 返回增强数据
      return {
        ...pool,
        enhanced: {
          activeBin,
          binsDistribution,
          feeInfo,
          liquidityDistribution,
          priceHistory,
          yieldHistory,
          volumeHistory,
          liquidityHistory
        }
      };
    } catch (error) {
      // 记录错误
      this.monitor.trackError('getEnhancedPoolData', error, { poolAddress: pool.address });
      logger.error(`Failed to get enhanced pool data: ${error.message}`, {
        poolAddress: pool.address,
        error
      });
      throw new Error(`Failed to fetch pool data: ${error.message}`);
    }
  }

  /**
   * 分析池子
   * @param {Array} pools - 池子列表
   * @returns {Promise<Object>} 分析结果
   */
  async analyzePools(pools) {
    const startTime = Date.now();
    
    try {
      if (!pools || !Array.isArray(pools) || pools.length === 0) {
        throw new Error('Invalid pool data: empty or invalid pools array');
      }
      
      logger.info(`Analyzing ${pools.length} pools`);
      
      // 获取增强数据
      const enhancedPools = await Promise.all(
        pools.map(pool => this.getEnhancedPoolData(pool))
      );
      
      // 计算评分
      const scoredPools = enhancedPools.map(pool => this._calculateScores(pool));
      
      // 按评分排序
      scoredPools.sort((a, b) => 
        (b.analysis?.scores.final_score || 0) - (a.analysis?.scores.final_score || 0)
      );
      
      // 分类池子
      const t1Pools = scoredPools.slice(0, this.options.maxT1Pools);
      const t2Pools = scoredPools.slice(
        this.options.maxT1Pools,
        this.options.maxT1Pools + this.options.maxT2Pools
      );
      const t3Pools = scoredPools.slice(
        this.options.maxT1Pools + this.options.maxT2Pools,
        this.options.maxT1Pools + this.options.maxT2Pools + this.options.maxT3Pools
      );
      
      // 计算统计数据
      const avgDailyYield = scoredPools.reduce(
        (sum, pool) => sum + pool.daily_yield,
        0
      ) / scoredPools.length;
      
      const highestYieldPool = scoredPools.reduce(
        (highest, pool) => pool.daily_yield > highest.daily_yield ? pool : highest,
        scoredPools[0]
      ).address;
      
      // 监控T1池子的多样性
      const t1TokenPairs = new Set();
      t1Pools.forEach(pool => {
        t1TokenPairs.add(`${pool.token_x.symbol}-${pool.token_y.symbol}`);
      });
      
      // 记录T1池子的评分准确性
      t1Pools.forEach(pool => {
        // 假设我们有历史收益率数据可以用来验证评分准确性
        const predictedYield = pool.analysis.scores.final_score / 100 * 0.2; // 假设评分100对应20%年化收益
        const actualYield = pool.daily_yield * 365; // 日收益率转为年化
        
        this.monitor.trackScoringAccuracy(
          pool.address,
          predictedYield,
          actualYield
        );
      });
      
      // 计算分析性能
      const duration = Date.now() - startTime;
      
      // 构建结果
      const result = {
        timestamp: new Date().toISOString(),
        t1_pools: t1Pools,
        t2_pools: t2Pools,
        t3_pools: t3Pools,
        stats: {
          avg_daily_yield: avgDailyYield,
          highest_yield_pool: highestYieldPool
        },
        performance: {
          duration,
          poolsAnalyzed: pools.length,
          timestamp: new Date().toISOString()
        }
      };
      
      logger.info('Pool analysis completed', {
        duration,
        t1Count: t1Pools.length,
        t2Count: t2Pools.length,
        t3Count: t3Pools.length,
        t1Diversity: t1TokenPairs.size
      });
      
      return result;
    } catch (error) {
      this.monitor.trackError('analyzePools', error);
      logger.error(`Failed to analyze pools: ${error.message}`, { error });
      throw error;
    }
  }

  /**
   * 计算池子评分
   * @param {Object} pool - 池子数据
   * @returns {Object} 带有评分的池子数据
   * @private
   */
  _calculateScores(pool) {
    // 基础性能评分 (0-100)
    const basePerformanceScore = Math.min(100, Math.max(0, 
      pool.daily_yield * 500 + // 日收益率权重
      Math.log10(pool.liquidity) * 10 + // 流动性权重
      Math.log10(pool.trade_volume_24h) * 5 // 交易量权重
    ));
    
    // 稳定性评分 (0-100)
    let stabilityScore = 80; // 默认值
    
    if (pool.enhanced && pool.enhanced.yieldHistory && pool.enhanced.yieldHistory.length > 0) {
      // 计算收益率标准差
      const yields = pool.enhanced.yieldHistory.map(h => h.yield);
      const avgYield = yields.reduce((sum, y) => sum + y, 0) / yields.length;
      const variance = yields.reduce((sum, y) => sum + Math.pow(y - avgYield, 2), 0) / yields.length;
      const stdDev = Math.sqrt(variance);
      
      // 标准差越低，稳定性越高
      stabilityScore = Math.min(100, Math.max(0, 100 - stdDev * 1000));
    }
    
    // 最终评分 (0-100)
    const finalScore = Math.round(
      basePerformanceScore * 0.7 + // 基础性能权重70%
      stabilityScore * 0.3 // 稳定性权重30%
    );
    
    // 返回带有评分的池子
    return {
      ...pool,
      analysis: {
        scores: {
          final_score: finalScore,
          stability_score: Math.round(stabilityScore),
          base_performance_score: Math.round(basePerformanceScore)
        }
      }
    };
  }
}

module.exports = { SignalService }; 