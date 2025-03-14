/**
 * 评分控制器
 * 管理评分过程和与其他服务的交互
 */

const axios = require('axios');
const logger = require('../utils/logger');
const HealthScoreCalculator = require('../models/health-score-calculator');
const RiskAssessment = require('../models/risk-assessment');
const DecisionRecommender = require('../models/decision-recommendation');

class ScoringController {
  /**
   * 构造函数
   * @param {Object} config 评分服务配置
   */
  constructor(config) {
    this.config = config;
    this.isRunning = false;
    this.scoringInterval = null;
    this.healthScores = new Map();
    this.riskAssessments = new Map();
    this.recommendations = new Map();
    
    logger.info('评分控制器已初始化');
  }

  /**
   * 启动评分服务
   */
  async start() {
    if (this.isRunning) {
      logger.warn('评分服务已在运行中');
      return;
    }
    
    logger.info('启动评分服务');
    this.isRunning = true;
    
    // 启动定期评分
    this.scoringInterval = setInterval(
      () => this.runScoringCycle(),
      this.config.scoringInterval
    );
    
    // 运行初始评分周期
    await this.runScoringCycle();
  }

  /**
   * 停止评分服务
   */
  stop() {
    if (!this.isRunning) {
      logger.warn('评分服务未在运行');
      return;
    }
    
    logger.info('停止评分服务');
    this.isRunning = false;
    
    if (this.scoringInterval) {
      clearInterval(this.scoringInterval);
      this.scoringInterval = null;
    }
  }

  /**
   * 运行评分周期，处理所有被跟踪的池
   */
  async runScoringCycle() {
    try {
      logger.info('开始评分周期');
      
      // 获取被跟踪的池列表
      const pools = await this.getTrackedPools();
      logger.info(`找到 ${pools.length} 个被跟踪的池`);
      
      // 处理每个池
      for (const poolAddress of pools) {
        try {
          await this.processPool(poolAddress);
        } catch (error) {
          logger.error(`处理池 ${poolAddress} 时出错: ${error.message}`);
        }
      }
      
      // 清理旧数据
      this.cleanupOldData();
      
      logger.info('评分周期完成');
    } catch (error) {
      logger.error(`评分周期失败: ${error.message}`);
    }
  }

  /**
   * 处理单个池
   * @param {string} poolAddress 池地址
   */
  async processPool(poolAddress) {
    logger.info(`处理池 ${poolAddress}`);
    
    try {
      // 获取池数据
      const poolData = await this.getPoolData(poolAddress);
      
      // 获取历史数据
      const historicalData = await this.getHistoricalData(poolAddress);
      
      // 计算指标
      const priceVolatility = this.calculatePriceVolatility(poolData, historicalData);
      const recentPriceChange = this.calculateRecentPriceChange(poolData, historicalData);
      const tvlChangePercent = this.calculateTVLChange(poolData, historicalData);
      const liquidityDepth = this.calculateLiquidityDepth(poolData);
      const volumeChangePercent = this.calculateVolumeChange(poolData, historicalData);
      const slippageEstimate = this.calculateSlippageEstimate(poolData);
      const largeHoldersPercent = this.calculateLargeHoldersPercent(poolData);
      const recentWhaleWithdrawals = this.calculateRecentWhaleWithdrawals(poolData, historicalData);
      const tokenRatioImbalance = this.calculateTokenRatioImbalance(poolData);
      
      // 获取上一次的健康分数（如果有）
      const previousScores = this.healthScores.get(poolAddress) || [];
      const previousScore = previousScores.length > 0 ? previousScores[0].overallScore : undefined;
      
      // 计算健康分数
      const healthScore = HealthScoreCalculator.calculateHealthScore(
        poolAddress,
        priceVolatility,
        tvlChangePercent,
        volumeChangePercent,
        recentWhaleWithdrawals,
        tokenRatioImbalance,
        previousScore
      );
      
      // 评估风险
      const riskAssessment = RiskAssessment.assessRisks(
        poolAddress,
        priceVolatility,
        recentPriceChange,
        tvlChangePercent,
        liquidityDepth,
        volumeChangePercent,
        slippageEstimate,
        largeHoldersPercent,
        recentWhaleWithdrawals,
        tokenRatioImbalance
      );
      
      // 生成决策推荐
      const recommendation = DecisionRecommender.generateRecommendation(
        healthScore,
        riskAssessment
      );
      
      // 存储结果
      this.storeResults(poolAddress, healthScore, riskAssessment, recommendation);
      
      logger.info(`池 ${poolAddress} 处理完成，健康分数: ${healthScore.overallScore.toFixed(2)}`);
    } catch (error) {
      logger.error(`处理池 ${poolAddress} 失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 存储评分结果
   * @param {string} poolAddress 池地址
   * @param {Object} healthScore 健康分数
   * @param {Object} riskAssessment 风险评估
   * @param {Object} recommendation 决策推荐
   */
  storeResults(poolAddress, healthScore, riskAssessment, recommendation) {
    // 存储健康分数
    if (!this.healthScores.has(poolAddress)) {
      this.healthScores.set(poolAddress, []);
    }
    this.healthScores.get(poolAddress).unshift(healthScore);
    
    // 存储风险评估
    if (!this.riskAssessments.has(poolAddress)) {
      this.riskAssessments.set(poolAddress, []);
    }
    this.riskAssessments.get(poolAddress).unshift(riskAssessment);
    
    // 存储决策推荐
    if (!this.recommendations.has(poolAddress)) {
      this.recommendations.set(poolAddress, []);
    }
    this.recommendations.get(poolAddress).unshift(recommendation);
  }

  /**
   * 清理旧数据
   */
  cleanupOldData() {
    const now = Date.now();
    const retentionPeriod = this.config.historyRetentionPeriod;
    
    // 清理健康分数
    for (const [poolAddress, scores] of this.healthScores.entries()) {
      const filteredScores = scores.filter(score => now - score.timestamp < retentionPeriod);
      this.healthScores.set(poolAddress, filteredScores);
    }
    
    // 清理风险评估
    for (const [poolAddress, assessments] of this.riskAssessments.entries()) {
      const filteredAssessments = assessments.filter(assessment => now - assessment.timestamp < retentionPeriod);
      this.riskAssessments.set(poolAddress, filteredAssessments);
    }
    
    // 清理决策推荐
    for (const [poolAddress, recommendations] of this.recommendations.entries()) {
      const filteredRecommendations = recommendations.filter(recommendation => now - recommendation.timestamp < retentionPeriod);
      this.recommendations.set(poolAddress, filteredRecommendations);
    }
  }

  /**
   * 获取被跟踪的池列表
   * @returns {Array} 被跟踪的池地址数组
   */
  async getTrackedPools() {
    try {
      const response = await axios.get(`${this.config.dataServiceUrl}/api/pools/tracked`);
      return response.data;
    } catch (error) {
      logger.error(`获取被跟踪的池失败: ${error.message}`);
      return [];
    }
  }

  /**
   * 获取池数据
   * @param {string} poolAddress 池地址
   * @returns {Object} 池数据
   */
  async getPoolData(poolAddress) {
    try {
      const response = await axios.get(`${this.config.dataServiceUrl}/api/pools/${poolAddress}`);
      return response.data;
    } catch (error) {
      logger.error(`获取池 ${poolAddress} 数据失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取池的历史数据
   * @param {string} poolAddress 池地址
   * @returns {Array} 历史数据数组
   */
  async getHistoricalData(poolAddress) {
    try {
      const response = await axios.get(`${this.config.dataServiceUrl}/api/pools/${poolAddress}/history`, {
        params: {
          period: '24h',
        },
      });
      return response.data;
    } catch (error) {
      logger.error(`获取池 ${poolAddress} 历史数据失败: ${error.message}`);
      return [];
    }
  }

  /**
   * 计算价格波动性
   * @param {Object} currentData 当前池数据
   * @param {Array} historicalData 历史池数据
   * @returns {number} 价格波动性 (0-1)
   */
  calculatePriceVolatility(currentData, historicalData) {
    if (!historicalData || historicalData.length < 2) {
      return 0;
    }
    
    // 提取价格数据
    const prices = historicalData.map(data => data.price);
    
    // 计算标准差
    const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const squaredDiffs = prices.map(price => Math.pow(price - mean, 2));
    const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / prices.length;
    const stdDev = Math.sqrt(variance);
    
    // 计算波动性（标准差/均值）
    const volatility = stdDev / mean;
    
    // 归一化到0-1范围
    return Math.min(1, volatility);
  }

  /**
   * 计算近期价格变化
   * @param {Object} currentData 当前池数据
   * @param {Array} historicalData 历史池数据
   * @returns {number} 近期价格变化 (-1 to 1)
   */
  calculateRecentPriceChange(currentData, historicalData) {
    if (!historicalData || historicalData.length === 0) {
      return 0;
    }
    
    const oldestPrice = historicalData[historicalData.length - 1].price;
    const currentPrice = currentData.price;
    
    // 计算变化百分比
    const change = (currentPrice - oldestPrice) / oldestPrice;
    
    // 限制在-1到1范围内
    return Math.max(-1, Math.min(1, change));
  }

  /**
   * 计算TVL变化
   * @param {Object} currentData 当前池数据
   * @param {Array} historicalData 历史池数据
   * @returns {number} TVL变化百分比 (-1 to 1)
   */
  calculateTVLChange(currentData, historicalData) {
    if (!historicalData || historicalData.length === 0) {
      return 0;
    }
    
    const oldestTVL = historicalData[historicalData.length - 1].tvl;
    const currentTVL = currentData.tvl;
    
    // 计算变化百分比
    const change = (currentTVL - oldestTVL) / oldestTVL;
    
    // 限制在-1到1范围内
    return Math.max(-1, Math.min(1, change));
  }

  /**
   * 计算流动性深度
   * @param {Object} poolData 池数据
   * @returns {number} 流动性深度 (0-1)
   */
  calculateLiquidityDepth(poolData) {
    // 简化实现，基于TVL和价格范围
    const depth = Math.min(1, poolData.tvl / 1000000) * 0.7 + 
                 Math.min(1, poolData.priceRange / 0.2) * 0.3;
    
    return Math.min(1, depth);
  }

  /**
   * 计算交易量变化
   * @param {Object} currentData 当前池数据
   * @param {Array} historicalData 历史池数据
   * @returns {number} 交易量变化百分比 (-1 to 1)
   */
  calculateVolumeChange(currentData, historicalData) {
    if (!historicalData || historicalData.length === 0) {
      return 0;
    }
    
    // 计算24小时前的交易量
    const oldVolume = historicalData[historicalData.length - 1].volume24h;
    const currentVolume = currentData.volume24h;
    
    // 计算变化百分比
    const change = (currentVolume - oldVolume) / oldVolume;
    
    // 限制在-1到1范围内
    return Math.max(-1, Math.min(1, change));
  }

  /**
   * 计算滑点估计
   * @param {Object} poolData 池数据
   * @returns {number} 滑点估计 (0-1)
   */
  calculateSlippageEstimate(poolData) {
    // 简化实现，基于流动性和交易量
    const slippage = Math.max(0, 0.1 - (poolData.tvl / 1000000)) * 0.5 +
                    Math.min(1, poolData.volume24h / poolData.tvl) * 0.5;
    
    return Math.min(1, slippage);
  }

  /**
   * 计算大户持有百分比
   * @param {Object} poolData 池数据
   * @returns {number} 大户持有百分比 (0-1)
   */
  calculateLargeHoldersPercent(poolData) {
    // 简化实现，假设数据中包含大户信息
    return poolData.largeHoldersPercent || 0.2; // 默认值
  }

  /**
   * 计算近期大户提款
   * @param {Object} currentData 当前池数据
   * @param {Array} historicalData 历史池数据
   * @returns {number} 近期大户提款占池的百分比 (0-1)
   */
  calculateRecentWhaleWithdrawals(currentData, historicalData) {
    // 简化实现，假设数据中包含大户提款信息
    return currentData.recentWhaleWithdrawals || 0.05; // 默认值
  }

  /**
   * 计算代币比例不平衡
   * @param {Object} poolData 池数据
   * @returns {number} 代币比例不平衡 (-1 to 1, 0是平衡)
   */
  calculateTokenRatioImbalance(poolData) {
    // 简化实现，假设数据中包含代币比例信息
    return poolData.tokenRatioImbalance || 0; // 默认值
  }

  /**
   * 获取池的健康分数
   * @param {string} poolAddress 池地址
   * @param {number} limit 限制返回的结果数量
   * @returns {Array} 健康分数数组
   */
  getHealthScores(poolAddress, limit) {
    const scores = this.healthScores.get(poolAddress) || [];
    return limit ? scores.slice(0, limit) : scores;
  }

  /**
   * 获取池的最新健康分数
   * @param {string} poolAddress 池地址
   * @returns {Object} 最新健康分数
   */
  getLatestHealthScore(poolAddress) {
    const scores = this.healthScores.get(poolAddress) || [];
    return scores.length > 0 ? scores[0] : null;
  }

  /**
   * 获取池的风险评估
   * @param {string} poolAddress 池地址
   * @param {number} limit 限制返回的结果数量
   * @returns {Array} 风险评估数组
   */
  getRiskAssessments(poolAddress, limit) {
    const assessments = this.riskAssessments.get(poolAddress) || [];
    return limit ? assessments.slice(0, limit) : assessments;
  }

  /**
   * 获取池的最新风险评估
   * @param {string} poolAddress 池地址
   * @returns {Object} 最新风险评估
   */
  getLatestRiskAssessment(poolAddress) {
    const assessments = this.riskAssessments.get(poolAddress) || [];
    return assessments.length > 0 ? assessments[0] : null;
  }

  /**
   * 获取池的决策推荐
   * @param {string} poolAddress 池地址
   * @param {number} limit 限制返回的结果数量
   * @returns {Array} 决策推荐数组
   */
  getRecommendations(poolAddress, limit) {
    const recommendations = this.recommendations.get(poolAddress) || [];
    return limit ? recommendations.slice(0, limit) : recommendations;
  }

  /**
   * 获取池的最新决策推荐
   * @param {string} poolAddress 池地址
   * @returns {Object} 最新决策推荐
   */
  getLatestRecommendation(poolAddress) {
    const recommendations = this.recommendations.get(poolAddress) || [];
    return recommendations.length > 0 ? recommendations[0] : null;
  }
}

module.exports = ScoringController; 