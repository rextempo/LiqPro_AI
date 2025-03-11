import { logger } from '../utils/logger';
import { HttpClient } from '../utils/http-client';
import { config } from '../config';
import {
  PoolData,
  MarketAnalysis,
  SignalFactor,
  RiskMetrics,
  TrendAnalysis,
  LiquidityAnalysis,
  VolumeAnalysis,
  MarketSentiment
} from '../types';

/**
 * 高级信号分析引擎
 * 实现多因子分析、市场分析和风险管理
 */
export class AnalysisEngine {
  private dataServiceClient: HttpClient;
  private meteoraClient: HttpClient;
  private jupiterClient: HttpClient;
  private lastAnalysisTime: number = 0;
  private marketCache: Map<string, MarketAnalysis> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

  constructor() {
    this.dataServiceClient = new HttpClient(config.dataServiceUrl, {
      timeout: 30000,
      retryCount: 3
    });
    this.meteoraClient = new HttpClient(config.meteoraServiceUrl, {
      timeout: 30000,
      retryCount: 3
    });
    this.jupiterClient = new HttpClient(config.jupiterServiceUrl, {
      timeout: 30000,
      retryCount: 3
    });
    logger.info('AnalysisEngine initialized');
  }

  /**
   * 执行全面市场分析
   */
  async analyzeMarket(pools: PoolData[]): Promise<MarketAnalysis[]> {
    try {
      logger.info('开始执行市场分析', { poolCount: pools.length });
      this.lastAnalysisTime = Date.now();

      const results: MarketAnalysis[] = await Promise.all(
        pools.map(async pool => {
          // 检查缓存
          const cachedAnalysis = this.getCachedAnalysis(pool.address);
          if (cachedAnalysis) return cachedAnalysis;

          // 获取Meteora池子数据
          const meteoraPoolData = await this.meteoraClient.get(`/api/pools/${pool.address}`);
          
          // 获取Jupiter价格影响数据
          const jupiterQuote = await this.jupiterClient.get(`/api/quote/${pool.tokenX}/${pool.tokenY}`);

          // 并行获取各类分析数据
          const [
            trendAnalysis,
            liquidityAnalysis,
            volumeAnalysis,
            riskMetrics
          ] = await Promise.all([
            this.analyzePriceTrends(pool, jupiterQuote.data),
            this.analyzeLiquidity(pool, meteoraPoolData.data),
            this.analyzeVolume(pool),
            this.calculateRiskMetrics(pool, meteoraPoolData.data, jupiterQuote.data)
          ]);

          // 生成综合分析结果
          const analysis: MarketAnalysis = {
            poolAddress: pool.address,
            tokenPair: `${pool.tokenX}/${pool.tokenY}`,
            timestamp: Date.now(),
            trend: trendAnalysis,
            liquidity: liquidityAnalysis,
            volume: volumeAnalysis,
            risk: riskMetrics,
            signalFactors: this.calculateSignalFactors({
              trend: trendAnalysis,
              liquidity: liquidityAnalysis,
              volume: volumeAnalysis,
              risk: riskMetrics
            }),
            meteoraData: meteoraPoolData.data,
            jupiterData: jupiterQuote.data
          };

          // 更新缓存
          this.updateCache(pool.address, analysis);
          return analysis;
        })
      );

      logger.info('市场分析完成', { analysisCount: results.length });
      return results;
    } catch (error) {
      logger.error('市场分析失败', { error });
      throw error;
    }
  }

  /**
   * 分析价格趋势
   */
  private async analyzePriceTrends(pool: PoolData, jupiterData: any): Promise<TrendAnalysis> {
    try {
      const response = await this.dataServiceClient.get(`/api/analysis/trends/${pool.address}`);
      const data = response.data;

      return {
        shortTerm: this.calculateTrendStrength(data.shortTerm),
        mediumTerm: this.calculateTrendStrength(data.mediumTerm),
        longTerm: this.calculateTrendStrength(data.longTerm),
        momentum: data.momentum,
        volatility: data.volatility,
        breakoutProbability: data.breakoutProbability,
        supportLevels: data.supportLevels,
        resistanceLevels: data.resistanceLevels,
        priceImpact: jupiterData.priceImpact
      };
    } catch (error) {
      logger.error('趋势分析失败', { poolAddress: pool.address, error });
      throw error;
    }
  }

  /**
   * 分析流动性状况
   */
  private async analyzeLiquidity(pool: PoolData, meteoraData: any): Promise<LiquidityAnalysis> {
    try {
      // 分析Meteora bin分布
      const binAnalysis = this.analyzeBinDistribution(meteoraData.bins);

      return {
        totalLiquidity: meteoraData.totalLiquidity,
        concentration: binAnalysis.concentration,
        depth: binAnalysis.depth,
        stability: binAnalysis.stability,
        binDistribution: meteoraData.bins,
        imbalanceRisk: binAnalysis.imbalanceRisk,
        whaleActivity: this.detectWhaleActivity(meteoraData.recentTrades),
        optimalBinRanges: this.calculateOptimalBinRanges(meteoraData.bins, meteoraData.activeId)
      };
    } catch (error) {
      logger.error('流动性分析失败', { poolAddress: pool.address, error });
      throw error;
    }
  }

  /**
   * 分析交易量
   */
  private async analyzeVolume(pool: PoolData): Promise<VolumeAnalysis> {
    try {
      const response = await this.dataServiceClient.get(`/api/analysis/volume/${pool.address}`);
      const data = response.data;

      return {
        dailyVolume: data.dailyVolume,
        weeklyTrend: data.weeklyTrend,
        volatility: data.volatility,
        patterns: this.detectVolumePatterns(data.volumeHistory),
        anomalies: this.detectVolumeAnomalies(data.volumeHistory),
        predictedTrend: data.predictedTrend,
        marketImpact: data.marketImpact
      };
    } catch (error) {
      logger.error('交易量分析失败', { poolAddress: pool.address, error });
      throw error;
    }
  }

  /**
   * 计算风险指标
   */
  private async calculateRiskMetrics(pool: PoolData, meteoraData: any, jupiterData: any): Promise<RiskMetrics> {
    try {
      const baseRisk = await this.dataServiceClient.get(`/api/analysis/risk/${pool.address}`);
      
      // 计算综合风险指标
      const volatilityRisk = this.calculateVolatilityRisk(meteoraData, baseRisk.data);
      const liquidityRisk = this.calculateLiquidityRisk(meteoraData);
      const impermanentLossRisk = this.calculateImpermanentLossRisk(meteoraData);
      const systemicRisk = this.calculateSystemicRisk(baseRisk.data);
      
      // 检查是否触发风险警报
      const riskAlerts = this.checkRiskAlerts({
        volatilityRisk,
        liquidityRisk,
        impermanentLossRisk,
        systemicRisk
      });

      return {
        volatilityRisk,
        liquidityRisk,
        counterpartyRisk: baseRisk.data.counterpartyRisk,
        systemicRisk,
        impermanentLossRisk,
        regulatoryRisk: baseRisk.data.regulatoryRisk,
        overallRisk: this.calculateOverallRisk([
          volatilityRisk,
          liquidityRisk,
          baseRisk.data.counterpartyRisk,
          systemicRisk,
          impermanentLossRisk,
          baseRisk.data.regulatoryRisk
        ]),
        alerts: riskAlerts
      };
    } catch (error) {
      logger.error('风险指标计算失败', { poolAddress: pool.address, error });
      throw error;
    }
  }

  /**
   * 分析Meteora bin分布
   */
  private analyzeBinDistribution(bins: any[]): any {
    const totalLiquidity = bins.reduce((sum, bin) => sum + bin.liquidity, 0);
    const sortedBins = [...bins].sort((a, b) => b.liquidity - a.liquidity);
    
    // 计算流动性集中度
    const concentration = sortedBins.slice(0, 10).reduce((sum, bin) => 
      sum + bin.liquidity / totalLiquidity, 0);
    
    // 计算深度
    const depth = bins.filter(bin => bin.liquidity > totalLiquidity * 0.01).length / bins.length;
    
    // 计算稳定性
    const stability = this.calculateBinStability(bins);
    
    // 计算不平衡风险
    const imbalanceRisk = this.calculateBinImbalance(bins);
    
    return {
      concentration,
      depth,
      stability,
      imbalanceRisk
    };
  }

  /**
   * 计算最优bin范围
   */
  private calculateOptimalBinRanges(bins: any[], activeId: number): any[] {
    const ranges = [];
    const volatility = this.calculateBinVolatility(bins);
    
    // 根据波动率计算合适的bin范围
    const rangeSizes = [
      { size: 10, confidence: 0.9 },
      { size: 20, confidence: 0.8 },
      { size: 30, confidence: 0.7 }
    ];
    
    for (const range of rangeSizes) {
      ranges.push({
        start: activeId - Math.floor(range.size * volatility),
        end: activeId + Math.floor(range.size * volatility),
        confidence: range.confidence
      });
    }
    
    return ranges;
  }

  /**
   * 检测大户活动
   */
  private detectWhaleActivity(recentTrades: any[]): number {
    if (!recentTrades || recentTrades.length === 0) return 0;
    
    const totalVolume = recentTrades.reduce((sum, trade) => sum + trade.volume, 0);
    const whaleThreshold = totalVolume * 0.1; // 定义大户交易阈值
    
    const whaleTrades = recentTrades.filter(trade => trade.volume >= whaleThreshold);
    return whaleTrades.length / recentTrades.length;
  }

  /**
   * 检测交易量模式
   */
  private detectVolumePatterns(volumeHistory: any[]): any[] {
    if (!volumeHistory || volumeHistory.length === 0) return [];
    
    const patterns = [];
    const recentVolumes = volumeHistory.slice(-30); // 分析最近30个周期
    
    // 检测积累模式
    if (this.isAccumulationPattern(recentVolumes)) {
      patterns.push({
        type: 'ACCUMULATION',
        strength: this.calculatePatternStrength(recentVolumes),
        timeframe: 'MEDIUM'
      });
    }
    
    // 检测分发模式
    if (this.isDistributionPattern(recentVolumes)) {
      patterns.push({
        type: 'DISTRIBUTION',
        strength: this.calculatePatternStrength(recentVolumes),
        timeframe: 'MEDIUM'
      });
    }
    
    return patterns;
  }

  /**
   * 检测交易量异常
   */
  private detectVolumeAnomalies(volumeHistory: any[]): any[] {
    if (!volumeHistory || volumeHistory.length === 0) return [];
    
    const anomalies = [];
    const recentVolumes = volumeHistory.slice(-30);
    const mean = this.calculateMean(recentVolumes);
    const std = this.calculateStd(recentVolumes, mean);
    
    // 检测异常值
    recentVolumes.forEach((volume, index) => {
      if (Math.abs(volume - mean) > 3 * std) {
        anomalies.push({
          type: volume > mean ? 'SPIKE' : 'DROP',
          severity: this.calculateAnomalySeverity(volume, mean, std),
          timestamp: volumeHistory[volumeHistory.length - 30 + index].timestamp
        });
      }
    });
    
    return anomalies;
  }

  /**
   * 计算风险警报
   */
  private checkRiskAlerts(risks: any): any[] {
    const alerts = [];
    const thresholds = {
      volatility: 0.7,
      liquidity: 0.7,
      impermanentLoss: 0.7,
      systemic: 0.7
    };
    
    if (risks.volatilityRisk > thresholds.volatility) {
      alerts.push({
        type: 'HIGH_VOLATILITY',
        severity: 'HIGH',
        message: '市场波动性异常高'
      });
    }
    
    if (risks.liquidityRisk > thresholds.liquidity) {
      alerts.push({
        type: 'LOW_LIQUIDITY',
        severity: 'HIGH',
        message: '流动性风险显著'
      });
    }
    
    if (risks.impermanentLossRisk > thresholds.impermanentLoss) {
      alerts.push({
        type: 'HIGH_IL_RISK',
        severity: 'HIGH',
        message: '无常损失风险高'
      });
    }
    
    if (risks.systemicRisk > thresholds.systemic) {
      alerts.push({
        type: 'HIGH_SYSTEMIC_RISK',
        severity: 'CRITICAL',
        message: '系统性风险警报'
      });
    }
    
    return alerts;
  }

  /**
   * 从缓存获取分析结果
   */
  private getCachedAnalysis(poolAddress: string): MarketAnalysis | null {
    const cached = this.marketCache.get(poolAddress);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached;
    }
    return null;
  }

  /**
   * 更新缓存
   */
  private updateCache(poolAddress: string, analysis: MarketAnalysis): void {
    this.marketCache.set(poolAddress, analysis);
  }

  /**
   * 计算趋势强度
   */
  private calculateTrendStrength(trendData: any): number {
    const { direction, magnitude, consistency } = trendData;
    return direction * magnitude * consistency;
  }

  // ... 其他辅助方法保持不变 ...
} 