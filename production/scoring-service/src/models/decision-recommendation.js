/**
 * 决策推荐器
 * 基于风险评估生成行动建议
 */

const { ActionType, RiskLevel } = require('../types');
const logger = require('../utils/logger');

class DecisionRecommender {
  // 行动阈值
  static ACTION_THRESHOLDS = {
    monitor: 3.5, // 分数低于此值时开始监控
    rebalance: 3.0, // 分数低于此值时考虑重新平衡
    partialExit: 2.5, // 分数低于此值时考虑部分退出
    fullExit: 1.5, // 分数低于此值时考虑完全退出
  };

  /**
   * 基于健康分数和风险评估生成决策推荐
   * @param {Object} healthScore 健康分数结果
   * @param {Object} riskAssessment 风险评估结果
   * @returns {Object} 决策推荐
   */
  static generateRecommendation(healthScore, riskAssessment) {
    const { poolAddress, overallScore, scoreChange } = healthScore;
    const timestamp = Date.now();
    
    // 基于分数确定推荐行动
    let recommendedAction;
    let urgency;
    let reasoning;
    const warningMessages = [];
    
    // 基于分数阈值确定行动
    if (overallScore < this.ACTION_THRESHOLDS.fullExit) {
      recommendedAction = ActionType.FULL_EXIT;
      urgency = 'high';
      reasoning = `健康分数 (${overallScore.toFixed(2)}) 表明风险极高。建议立即退出。`;
    } else if (overallScore < this.ACTION_THRESHOLDS.partialExit) {
      recommendedAction = ActionType.PARTIAL_EXIT;
      urgency = 'medium';
      reasoning = `健康分数 (${overallScore.toFixed(2)}) 表明风险较高。建议部分退出以减少风险敞口。`;
    } else if (overallScore < this.ACTION_THRESHOLDS.rebalance) {
      recommendedAction = ActionType.REBALANCE;
      urgency = 'medium';
      reasoning = `健康分数 (${overallScore.toFixed(2)}) 表明风险中等。建议重新平衡以优化仓位。`;
    } else if (overallScore < this.ACTION_THRESHOLDS.monitor) {
      recommendedAction = ActionType.MONITOR;
      urgency = 'low';
      reasoning = `健康分数 (${overallScore.toFixed(2)}) 表明风险较低但未达最佳。建议加强监控。`;
    } else {
      recommendedAction = ActionType.NO_ACTION;
      urgency = 'low';
      reasoning = `健康分数 (${overallScore.toFixed(2)}) 表明风险较低。目前无需采取行动。`;
    }
    
    // 基于分数变化趋势调整紧急程度
    if (scoreChange && scoreChange < -0.5) {
      // 显著的负向变化增加紧急程度
      if (urgency === 'low') urgency = 'medium';
      else if (urgency === 'medium') urgency = 'high';
      
      warningMessages.push(`健康分数下降了 ${Math.abs(scoreChange).toFixed(2)} 点，表明情况正在恶化。`);
    }
    
    // 基于风险评估添加特定风险警告
    this.addRiskWarnings(riskAssessment, warningMessages);
    
    // 如果建议重新平衡，计算建议的分配比例
    let suggestedAllocation;
    if (recommendedAction === ActionType.REBALANCE) {
      suggestedAllocation = this.calculateSuggestedAllocation(riskAssessment);
    }
    
    // 记录推荐
    logger.debug(`已为池 ${poolAddress} 生成推荐: ${recommendedAction} (${urgency} 紧急程度)`);
    
    return {
      poolAddress,
      timestamp,
      recommendedAction,
      urgency,
      reasoning,
      suggestedAllocation,
      warningMessages: warningMessages.length > 0 ? warningMessages : undefined,
    };
  }

  /**
   * 基于风险评估添加特定风险警告
   * @param {Object} riskAssessment 风险评估结果
   * @param {Array} warningMessages 警告消息数组
   */
  static addRiskWarnings(riskAssessment, warningMessages) {
    // 价格风险警告
    if (riskAssessment.priceRisk.level === RiskLevel.HIGH || 
        riskAssessment.priceRisk.level === RiskLevel.EXTREMELY_HIGH) {
      warningMessages.push(`价格波动性高 (${(riskAssessment.priceRisk.volatility * 100).toFixed(1)}%)，可能导致不稳定。`);
    }
    
    if (Math.abs(riskAssessment.priceRisk.recentChange) > 0.1) {
      const direction = riskAssessment.priceRisk.recentChange > 0 ? '上涨' : '下跌';
      warningMessages.push(`价格最近${direction}了 ${Math.abs(riskAssessment.priceRisk.recentChange * 100).toFixed(1)}%。`);
    }
    
    // 流动性风险警告
    if (riskAssessment.liquidityRisk.level === RiskLevel.HIGH || 
        riskAssessment.liquidityRisk.level === RiskLevel.EXTREMELY_HIGH) {
      warningMessages.push(`流动性风险高，可能影响退出能力。`);
    }
    
    if (riskAssessment.liquidityRisk.tvlChangePercent < -0.1) {
      warningMessages.push(`TVL下降了 ${Math.abs(riskAssessment.liquidityRisk.tvlChangePercent * 100).toFixed(1)}%，表明资金正在流出。`);
    }
    
    // 交易风险警告
    if (riskAssessment.tradingRisk.slippageEstimate > 0.05) {
      warningMessages.push(`预计滑点高 (${(riskAssessment.tradingRisk.slippageEstimate * 100).toFixed(1)}%)，可能导致不利的执行价格。`);
    }
    
    // 大户风险警告
    if (riskAssessment.whaleRisk.level === RiskLevel.HIGH || 
        riskAssessment.whaleRisk.level === RiskLevel.EXTREMELY_HIGH) {
      warningMessages.push(`大户集中度高 (${(riskAssessment.whaleRisk.largeHoldersPercent * 100).toFixed(1)}%)，增加了突然流动性变化的风险。`);
    }
    
    if (riskAssessment.whaleRisk.recentWithdrawals > 0.05) {
      warningMessages.push(`大户最近提取了 ${(riskAssessment.whaleRisk.recentWithdrawals * 100).toFixed(1)}% 的资金，可能表明内部人士正在退出。`);
    }
    
    // 不平衡风险警告
    if (Math.abs(riskAssessment.imbalanceRisk.tokenRatioImbalance) > 0.2) {
      const token = riskAssessment.imbalanceRisk.tokenRatioImbalance > 0 ? 'X' : 'Y';
      warningMessages.push(`池严重不平衡，偏向代币${token}，可能导致无常损失增加。`);
    }
  }

  /**
   * 计算重新平衡的建议分配
   * @param {Object} riskAssessment 风险评估结果
   * @returns {Object} 建议的代币分配百分比
   */
  static calculateSuggestedAllocation(riskAssessment) {
    // 默认为50/50分配
    let tokenXAllocation = 0.5;
    let tokenYAllocation = 0.5;
    
    // 基于不平衡调整
    const { tokenRatioImbalance } = riskAssessment.imbalanceRisk;
    
    // 如果不平衡显著，建议纠正性分配
    if (Math.abs(tokenRatioImbalance) > 0.1) {
      // 计算调整因子 (0-0.2范围)
      const adjustmentFactor = Math.min(0.2, Math.abs(tokenRatioImbalance) * 0.5);
      
      // 如果代币X过多（正向不平衡），分配更多给代币Y
      if (tokenRatioImbalance > 0) {
        tokenXAllocation -= adjustmentFactor;
        tokenYAllocation += adjustmentFactor;
      }
      // 如果代币Y过多（负向不平衡），分配更多给代币X
      else {
        tokenXAllocation += adjustmentFactor;
        tokenYAllocation -= adjustmentFactor;
      }
    }
    
    // 确保分配总和为1
    const sum = tokenXAllocation + tokenYAllocation;
    tokenXAllocation = tokenXAllocation / sum;
    tokenYAllocation = tokenYAllocation / sum;
    
    return {
      tokenX: tokenXAllocation,
      tokenY: tokenYAllocation,
    };
  }
}

module.exports = DecisionRecommender; 