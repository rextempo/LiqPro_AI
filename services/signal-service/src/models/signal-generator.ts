/**
 * 信号生成器
 */
import { v4 as uuidv4 } from 'uuid';
import { 
  Signal, 
  SignalType, 
  SignalStrength, 
  SignalTimeframe, 
  SignalReliability,
  PoolData,
  MarketAnalysis,
  SignalFactor
} from '../types';
import { logger } from '../utils/logger';
import { HttpClient } from '../utils/http-client';
import { config } from '../config';
import { AnalysisEngine } from './analysis-engine';

/**
 * 信号生成器类
 * 负责基于市场分析生成投资信号
 */
export class SignalGenerator {
  private dataServiceClient: HttpClient;
  private analysisEngine: AnalysisEngine;
  private signals: Map<string, Signal> = new Map();
  private lastGenerationTime: number = 0;
  private readonly RISK_THRESHOLDS = {
    HIGH_VOLATILITY: 0.7,
    LOW_LIQUIDITY: 0.7,
    HIGH_IL: 0.7,
    SYSTEMIC: 0.6
  };

  /**
   * 构造函数
   */
  constructor() {
    this.dataServiceClient = new HttpClient(config.dataServiceUrl, {
      timeout: 30000,
      retryCount: 3,
    });
    this.analysisEngine = new AnalysisEngine();
    logger.info('SignalGenerator initialized');
  }

  /**
   * 生成信号
   * @returns 生成的信号列表
   */
  async generateSignals(): Promise<Signal[]> {
    try {
      logger.info('开始生成信号');
      this.lastGenerationTime = Date.now();

      // 从数据服务获取活跃池子数据
      const pools = await this.fetchActivePools();
      logger.info(`获取到 ${pools.length} 个活跃池子数据`);

      // 使用分析引擎进行市场分析
      const marketAnalyses = await this.analysisEngine.analyzeMarket(pools);
      logger.info('完成市场分析');

      // 生成信号
      const signals: Signal[] = [];
      for (const analysis of marketAnalyses) {
        const pool = pools.find(p => p.address === analysis.poolAddress);
        if (!pool) continue;

        // 检查风险警报
        if (this.hasHighRisk(analysis)) {
          signals.push(this.createRiskAlert(pool, analysis));
          continue;
        }

        // 生成交易信号
        const tradingSignals = this.generateTradingSignals(pool, analysis);
        signals.push(...tradingSignals);

        // 生成再平衡信号
        if (this.needsRebalancing(analysis)) {
          signals.push(this.createRebalanceSignal(pool, analysis));
        }

        // 更新信号缓存
        signals.forEach(signal => {
          this.signals.set(signal.id, signal);
        });
      }

      // 清理过期信号
      this.cleanExpiredSignals();

      logger.info(`生成了 ${signals.length} 个信号`);
      return signals;
    } catch (error) {
      logger.error('生成信号失败', { error });
      throw error;
    }
  }

  /**
   * 获取信号
   * @param id 信号ID
   * @returns 信号对象
   */
  getSignal(id: string): Signal | undefined {
    return this.signals.get(id);
  }

  /**
   * 获取所有信号
   * @returns 信号列表
   */
  getAllSignals(): Signal[] {
    return Array.from(this.signals.values());
  }

  /**
   * 清理过期信号
   */
  cleanExpiredSignals(): void {
    const now = Date.now();
    let expiredCount = 0;

    for (const [id, signal] of this.signals.entries()) {
      if (signal.expirationTimestamp < now) {
        this.signals.delete(id);
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      logger.info(`清理了 ${expiredCount} 个过期信号`);
    }
  }

  /**
   * 获取最后生成时间
   * @returns 最后生成时间
   */
  getLastGenerationTime(): number {
    return this.lastGenerationTime;
  }

  /**
   * 获取活跃池子数据
   */
  private async fetchActivePools(): Promise<PoolData[]> {
    try {
      const response = await this.dataServiceClient.get('/api/pools', {
        active: true,
        minLiquidity: 10000, // 最小流动性要求
        minVolume24h: 5000,  // 最小24小时交易量
      });
      return response.pools || [];
    } catch (error) {
      logger.error('获取池子数据失败', { error });
      throw error;
    }
  }

  /**
   * 检查是否存在高风险
   */
  private hasHighRisk(analysis: MarketAnalysis): boolean {
    const { risk } = analysis;
    return (
      risk.volatilityRisk > this.RISK_THRESHOLDS.HIGH_VOLATILITY ||
      risk.liquidityRisk > this.RISK_THRESHOLDS.LOW_LIQUIDITY ||
      risk.impermanentLossRisk > this.RISK_THRESHOLDS.HIGH_IL ||
      risk.systemicRisk > this.RISK_THRESHOLDS.SYSTEMIC
    );
  }

  /**
   * 检查是否需要再平衡
   */
  private needsRebalancing(analysis: MarketAnalysis): boolean {
    const { liquidity } = analysis;
    return (
      liquidity.imbalanceRisk > 0.6 ||
      liquidity.concentration > 0.8 ||
      this.isOutsideOptimalRange(liquidity)
    );
  }

  /**
   * 检查是否在最优范围外
   */
  private isOutsideOptimalRange(liquidity: any): boolean {
    if (!liquidity.optimalBinRanges || liquidity.optimalBinRanges.length === 0) {
      return false;
    }
    
    // 检查高置信度范围
    const optimalRange = liquidity.optimalBinRanges.find(r => r.confidence > 0.8);
    if (!optimalRange) return false;

    const currentDistribution = liquidity.binDistribution;
    const totalLiquidity = currentDistribution.reduce((sum, bin) => sum + bin.liquidity, 0);
    const liquidityInRange = currentDistribution
      .filter(bin => bin.binId >= optimalRange.start && bin.binId <= optimalRange.end)
      .reduce((sum, bin) => sum + bin.liquidity, 0);

    return liquidityInRange / totalLiquidity < 0.7; // 如果范围内流动性少于70%，需要再平衡
  }

  /**
   * 生成交易信号
   */
  private generateTradingSignals(pool: PoolData, analysis: MarketAnalysis): Signal[] {
    const signals: Signal[] = [];
    const { trend, liquidity, volume } = analysis;

    // 入场信号条件
    if (
      trend.momentum > 0.6 &&
      trend.breakoutProbability > 0.7 &&
      liquidity.depth > 0.6 &&
      volume.predictedTrend > 0.6 &&
      !volume.anomalies.length
    ) {
      signals.push(this.createEntrySignal(pool, analysis));
    }

    // 出场信号条件
    if (
      trend.momentum < -0.6 ||
      (trend.volatility > 0.7 && trend.breakoutProbability < 0.3) ||
      liquidity.depth < 0.3
    ) {
      signals.push(this.createExitSignal(pool, analysis));
    }

    return signals;
  }

  /**
   * 创建入场信号
   */
  private createEntrySignal(pool: PoolData, analysis: MarketAnalysis): Signal {
    const strength = this.calculateSignalStrength(analysis);
    const reliability = this.calculateSignalReliability(analysis);
    const timeframe = this.determineSignalTimeframe(analysis.trend);

    return {
      id: uuidv4(),
      poolAddress: pool.address,
      tokenPair: `${pool.tokenX}/${pool.tokenY}`,
      type: SignalType.ENTRY,
      strength,
      timeframe,
      reliability,
      timestamp: Date.now(),
      expirationTimestamp: Date.now() + this.getExpirationTime(timeframe),
      description: `${pool.tokenX}/${pool.tokenY} 池子显示入场机会`,
      suggestedAction: this.generateEntryActionSuggestion(pool, analysis),
      factors: this.formatSignalFactors(analysis),
      metadata: {
        trend: analysis.trend,
        liquidity: analysis.liquidity,
        volume: analysis.volume,
        optimalBinRanges: analysis.liquidity.optimalBinRanges
      }
    };
  }

  /**
   * 创建出场信号
   */
  private createExitSignal(pool: PoolData, analysis: MarketAnalysis): Signal {
    const strength = this.calculateSignalStrength(analysis);
    const reliability = this.calculateSignalReliability(analysis);
    const timeframe = this.determineSignalTimeframe(analysis.trend);

    return {
      id: uuidv4(),
      poolAddress: pool.address,
      tokenPair: `${pool.tokenX}/${pool.tokenY}`,
      type: SignalType.EXIT,
      strength,
      timeframe,
      reliability,
      timestamp: Date.now(),
      expirationTimestamp: Date.now() + this.getExpirationTime(timeframe),
      description: `${pool.tokenX}/${pool.tokenY} 池子显示出场信号`,
      suggestedAction: this.generateExitActionSuggestion(pool, analysis),
      factors: this.formatSignalFactors(analysis),
      metadata: {
        trend: analysis.trend,
        liquidity: analysis.liquidity,
        volume: analysis.volume,
        risk: analysis.risk
      }
    };
  }

  /**
   * 创建再平衡信号
   */
  private createRebalanceSignal(pool: PoolData, analysis: MarketAnalysis): Signal {
    const strength = this.calculateSignalStrength(analysis);
    const reliability = this.calculateSignalReliability(analysis);
    const timeframe = this.determineSignalTimeframe(analysis.trend);

    return {
      id: uuidv4(),
      poolAddress: pool.address,
      tokenPair: `${pool.tokenX}/${pool.tokenY}`,
      type: SignalType.REBALANCE,
      strength,
      timeframe,
      reliability,
      timestamp: Date.now(),
      expirationTimestamp: Date.now() + this.getExpirationTime(timeframe),
      description: `${pool.tokenX}/${pool.tokenY} 池子需要再平衡`,
      suggestedAction: this.generateRebalanceActionSuggestion(pool, analysis),
      factors: this.formatSignalFactors(analysis),
      metadata: {
        liquidity: analysis.liquidity,
        optimalBinRanges: analysis.liquidity.optimalBinRanges,
        currentDistribution: analysis.liquidity.binDistribution
      }
    };
  }

  /**
   * 创建风险警报信号
   */
  private createRiskAlert(pool: PoolData, analysis: MarketAnalysis): Signal {
    return {
      id: uuidv4(),
      poolAddress: pool.address,
      tokenPair: `${pool.tokenX}/${pool.tokenY}`,
      type: SignalType.ALERT,
      strength: SignalStrength.VERY_STRONG,
      timeframe: SignalTimeframe.SHORT_TERM,
      reliability: SignalReliability.HIGH,
      timestamp: Date.now(),
      expirationTimestamp: Date.now() + 4 * 60 * 60 * 1000, // 4小时
      description: `${pool.tokenX}/${pool.tokenY} 池子出现高风险警报`,
      suggestedAction: this.generateRiskAlertSuggestion(pool, analysis),
      factors: this.formatRiskFactors(analysis),
      metadata: {
        risk: analysis.risk,
        liquidity: analysis.liquidity,
        volume: analysis.volume
      }
    };
  }

  /**
   * 生成入场建议
   */
  private generateEntryActionSuggestion(pool: PoolData, analysis: MarketAnalysis): string {
    const optimalRange = analysis.liquidity.optimalBinRanges[0];
    return `建议在 ${pool.tokenX}/${pool.tokenY} 池子中建立仓位，集中在 ${optimalRange.start} 到 ${optimalRange.end} 的bin范围内`;
  }

  /**
   * 生成出场建议
   */
  private generateExitActionSuggestion(pool: PoolData, analysis: MarketAnalysis): string {
    return `建议从 ${pool.tokenX}/${pool.tokenY} 池子中撤出资金，原因：${this.getRiskReason(analysis)}`;
  }

  /**
   * 生成再平衡建议
   */
  private generateRebalanceActionSuggestion(pool: PoolData, analysis: MarketAnalysis): string {
    const optimalRange = analysis.liquidity.optimalBinRanges[0];
    return `建议调整 ${pool.tokenX}/${pool.tokenY} 池子的仓位分布，将流动性集中在 ${optimalRange.start} 到 ${optimalRange.end} 的bin范围内`;
  }

  /**
   * 生成风险警报建议
   */
  private generateRiskAlertSuggestion(pool: PoolData, analysis: MarketAnalysis): string {
    return `请注意 ${pool.tokenX}/${pool.tokenY} 池子的风险状况：${this.getRiskReason(analysis)}`;
  }

  /**
   * 获取风险原因
   */
  private getRiskReason(analysis: MarketAnalysis): string {
    const reasons = [];
    const { risk } = analysis;

    if (risk.volatilityRisk > this.RISK_THRESHOLDS.HIGH_VOLATILITY) {
      reasons.push('市场波动性异常高');
    }
    if (risk.liquidityRisk > this.RISK_THRESHOLDS.LOW_LIQUIDITY) {
      reasons.push('流动性风险显著');
    }
    if (risk.impermanentLossRisk > this.RISK_THRESHOLDS.HIGH_IL) {
      reasons.push('无常损失风险高');
    }
    if (risk.systemicRisk > this.RISK_THRESHOLDS.SYSTEMIC) {
      reasons.push('系统性风险警报');
    }

    return reasons.join('，');
  }

  /**
   * 计算信号强度
   */
  private calculateSignalStrength(analysis: MarketAnalysis): SignalStrength {
    const avgStrength = analysis.signalFactors.reduce((sum, factor) => sum + factor.strength, 0) / analysis.signalFactors.length;

    if (avgStrength > 0.8) return SignalStrength.VERY_STRONG;
    if (avgStrength > 0.6) return SignalStrength.STRONG;
    if (avgStrength > 0.4) return SignalStrength.MODERATE;
    if (avgStrength > 0.2) return SignalStrength.WEAK;
    return SignalStrength.VERY_WEAK;
  }

  /**
   * 计算信号可靠性
   */
  private calculateSignalReliability(analysis: MarketAnalysis): SignalReliability {
    const avgConfidence = analysis.signalFactors.reduce((sum, factor) => sum + factor.confidence, 0) / analysis.signalFactors.length;

    if (avgConfidence > 0.7) return SignalReliability.HIGH;
    if (avgConfidence > 0.4) return SignalReliability.MEDIUM;
    return SignalReliability.LOW;
  }

  /**
   * 确定信号时间框架
   */
  private determineSignalTimeframe(trend: any): SignalTimeframe {
    if (trend.longTerm > 0.7) return SignalTimeframe.LONG_TERM;
    if (trend.mediumTerm > 0.7) return SignalTimeframe.MEDIUM_TERM;
    return SignalTimeframe.SHORT_TERM;
  }

  /**
   * 获取信号过期时间
   */
  private getExpirationTime(timeframe: SignalTimeframe): number {
    switch (timeframe) {
      case SignalTimeframe.LONG_TERM:
        return 7 * 24 * 60 * 60 * 1000; // 7天
      case SignalTimeframe.MEDIUM_TERM:
        return 24 * 60 * 60 * 1000; // 1天
      case SignalTimeframe.SHORT_TERM:
        return 4 * 60 * 60 * 1000; // 4小时
      default:
        return 24 * 60 * 60 * 1000; // 默认1天
    }
  }

  /**
   * 格式化信号因子
   */
  private formatSignalFactors(analysis: MarketAnalysis): { type: string; impact: number; description: string; }[] {
    return analysis.signalFactors.map(factor => ({
      type: factor.type,
      impact: factor.strength,
      description: this.getFactorDescription(factor)
    }));
  }

  /**
   * 获取因子描述
   */
  private getFactorDescription(factor: SignalFactor): string {
    const directionDesc = {
      BULLISH: '上涨',
      BEARISH: '下跌',
      POSITIVE: '积极',
      NEGATIVE: '消极',
      INCREASING: '增加',
      DECREASING: '减少',
      HIGH: '高',
      LOW: '低',
      NEUTRAL: '中性'
    }[factor.direction];

    const typeDesc = {
      TREND: '价格趋势',
      LIQUIDITY: '流动性',
      VOLUME: '交易量',
      SENTIMENT: '市场情绪',
      RISK: '风险水平'
    }[factor.type];

    return `${typeDesc}显示${directionDesc}趋势，强度为${(factor.strength * 100).toFixed(0)}%，可信度为${(factor.confidence * 100).toFixed(0)}%`;
  }

  private formatRiskFactors(analysis: MarketAnalysis): { type: string; impact: number; description: string; }[] {
    return analysis.signalFactors.map(factor => ({
      type: factor.type,
      impact: factor.strength,
      description: this.getRiskFactorDescription(factor)
    }));
  }

  private getRiskFactorDescription(factor: SignalFactor): string {
    const directionDesc = {
      BULLISH: '上涨',
      BEARISH: '下跌',
      POSITIVE: '积极',
      NEGATIVE: '消极',
      INCREASING: '增加',
      DECREASING: '减少',
      HIGH: '高',
      LOW: '低',
      NEUTRAL: '中性'
    }[factor.direction];

    const typeDesc = {
      TREND: '价格趋势',
      LIQUIDITY: '流动性',
      VOLUME: '交易量',
      SENTIMENT: '市场情绪',
      RISK: '风险水平'
    }[factor.type];

    return `${typeDesc}显示${directionDesc}趋势，强度为${(factor.strength * 100).toFixed(0)}%，可信度为${(factor.confidence * 100).toFixed(0)}%`;
  }
}

export default SignalGenerator; 