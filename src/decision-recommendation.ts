import { ActionType, DecisionRecommendation, HealthScoreResult, RiskAssessmentResult, RiskLevel } from '../types';
import { createLogger } from '@liqpro/monitoring';

const logger = createLogger('scoring-service:decision-recommendation');

/**
 * Decision Recommendation
 * Generates action recommendations based on risk assessments
 */
export class DecisionRecommender {
  // Action thresholds
  private static readonly ACTION_THRESHOLDS = {
    monitor: 3.5, // Start monitoring when score drops below this
    rebalance: 3.0, // Consider rebalancing when score drops below this
    partialExit: 2.5, // Consider partial exit when score drops below this
    fullExit: 1.5, // Consider full exit when score drops below this
  };

  /**
   * Generate a decision recommendation based on health score and risk assessment
   * @param healthScore Health score result
   * @param riskAssessment Risk assessment result
   * @returns Decision recommendation
   */
  public static generateRecommendation(
    healthScore: HealthScoreResult,
    riskAssessment: RiskAssessmentResult
  ): DecisionRecommendation {
    const { poolAddress, overallScore, scoreChange } = healthScore;
    const timestamp = Date.now();
    
    // Determine recommended action based on score
    let recommendedAction: ActionType;
    let urgency: 'low' | 'medium' | 'high';
    let reasoning: string;
    const warningMessages: string[] = [];
    
    // Determine action based on score thresholds
    if (overallScore < this.ACTION_THRESHOLDS.fullExit) {
      recommendedAction = ActionType.FULL_EXIT;
      urgency = 'high';
      reasoning = `Health score (${overallScore.toFixed(2)}) indicates extremely high risk. Immediate exit recommended.`;
    } else if (overallScore < this.ACTION_THRESHOLDS.partialExit) {
      recommendedAction = ActionType.PARTIAL_EXIT;
      urgency = 'medium';
      reasoning = `Health score (${overallScore.toFixed(2)}) indicates high risk. Partial exit recommended to reduce exposure.`;
    } else if (overallScore < this.ACTION_THRESHOLDS.rebalance) {
      recommendedAction = ActionType.REBALANCE;
      urgency = 'medium';
      reasoning = `Health score (${overallScore.toFixed(2)}) indicates medium risk. Rebalancing recommended to optimize position.`;
    } else if (overallScore < this.ACTION_THRESHOLDS.monitor) {
      recommendedAction = ActionType.MONITOR;
      urgency = 'low';
      reasoning = `Health score (${overallScore.toFixed(2)}) indicates low risk but below optimal. Increased monitoring recommended.`;
    } else {
      recommendedAction = ActionType.NO_ACTION;
      urgency = 'low';
      reasoning = `Health score (${overallScore.toFixed(2)}) indicates low risk. No action needed at this time.`;
    }
    
    // Adjust urgency based on score change trend
    if (scoreChange && scoreChange < -0.5) {
      // Significant negative change increases urgency
      if (urgency === 'low') urgency = 'medium';
      else if (urgency === 'medium') urgency = 'high';
      
      warningMessages.push(`Health score decreased by ${Math.abs(scoreChange).toFixed(2)} points, indicating deteriorating conditions.`);
    }
    
    // Add specific risk warnings based on risk assessment
    this.addRiskWarnings(riskAssessment, warningMessages);
    
    // Calculate suggested allocation if rebalancing is recommended
    let suggestedAllocation;
    if (recommendedAction === ActionType.REBALANCE) {
      suggestedAllocation = this.calculateSuggestedAllocation(riskAssessment);
    }
    
    // Log recommendation
    logger.debug(`Generated recommendation for pool ${poolAddress}: ${recommendedAction} (${urgency} urgency)`);
    
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
   * Add specific risk warnings based on risk assessment
   * @param riskAssessment Risk assessment result
   * @param warningMessages Array of warning messages to append to
   */
  private static addRiskWarnings(
    riskAssessment: RiskAssessmentResult,
    warningMessages: string[]
  ): void {
    const { priceRisk, liquidityRisk, tradingRisk, whaleRisk, imbalanceRisk } = riskAssessment;
    
    // Add price risk warnings
    if (priceRisk.level === RiskLevel.HIGH || priceRisk.level === RiskLevel.EXTREMELY_HIGH) {
      warningMessages.push(`High price volatility detected (${(priceRisk.volatility * 100).toFixed(1)}%).`);
      if (Math.abs(priceRisk.recentChange) > 0.1) {
        const direction = priceRisk.recentChange > 0 ? 'increase' : 'decrease';
        warningMessages.push(`Recent price ${direction} of ${Math.abs(priceRisk.recentChange * 100).toFixed(1)}% detected.`);
      }
    }
    
    // Add liquidity risk warnings
    if (liquidityRisk.level === RiskLevel.HIGH || liquidityRisk.level === RiskLevel.EXTREMELY_HIGH) {
      if (liquidityRisk.tvlChangePercent < -0.05) {
        warningMessages.push(`Significant TVL decrease of ${Math.abs(liquidityRisk.tvlChangePercent * 100).toFixed(1)}% detected.`);
      }
      if (liquidityRisk.depth < 0.3) {
        warningMessages.push(`Low liquidity depth detected, which may lead to higher slippage.`);
      }
    }
    
    // Add trading risk warnings
    if (tradingRisk.level === RiskLevel.HIGH || tradingRisk.level === RiskLevel.EXTREMELY_HIGH) {
      if (tradingRisk.volumeChangePercent < -0.2) {
        warningMessages.push(`Trading volume decreased by ${Math.abs(tradingRisk.volumeChangePercent * 100).toFixed(1)}%.`);
      }
      if (tradingRisk.slippageEstimate > 0.02) {
        warningMessages.push(`High slippage estimate of ${(tradingRisk.slippageEstimate * 100).toFixed(1)}% for standard trades.`);
      }
    }
    
    // Add whale risk warnings
    if (whaleRisk.level === RiskLevel.HIGH || whaleRisk.level === RiskLevel.EXTREMELY_HIGH) {
      if (whaleRisk.largeHoldersPercent > 0.4) {
        warningMessages.push(`High concentration risk: ${(whaleRisk.largeHoldersPercent * 100).toFixed(1)}% of pool held by large holders.`);
      }
      if (whaleRisk.recentWithdrawals > 0.05) {
        warningMessages.push(`Recent whale withdrawals of ${(whaleRisk.recentWithdrawals * 100).toFixed(1)}% detected.`);
      }
    }
    
    // Add imbalance risk warnings
    if (imbalanceRisk.level === RiskLevel.HIGH || imbalanceRisk.level === RiskLevel.EXTREMELY_HIGH) {
      if (Math.abs(imbalanceRisk.tokenRatioImbalance) > 0.3) {
        const token = imbalanceRisk.tokenRatioImbalance > 0 ? 'tokenX' : 'tokenY';
        warningMessages.push(`Significant pool imbalance detected with excess ${token}.`);
      }
    }
  }
  
  /**
   * Calculate suggested allocation for rebalancing
   * @param riskAssessment Risk assessment result
   * @returns Suggested allocation percentages for tokenX and tokenY
   */
  private static calculateSuggestedAllocation(
    riskAssessment: RiskAssessmentResult
  ): { tokenX: number; tokenY: number } {
    // Default to 50/50 allocation
    let tokenXAllocation = 0.5;
    let tokenYAllocation = 0.5;
    
    // Adjust based on imbalance
    const { tokenRatioImbalance } = riskAssessment.imbalanceRisk;
    
    // If imbalance is significant, suggest corrective allocation
    if (Math.abs(tokenRatioImbalance) > 0.1) {
      // Calculate adjustment factor (0-0.2 range)
      const adjustmentFactor = Math.min(0.2, Math.abs(tokenRatioImbalance) * 0.5);
      
      // If tokenX is overrepresented (positive imbalance), allocate more to tokenY
      if (tokenRatioImbalance > 0) {
        tokenXAllocation -= adjustmentFactor;
        tokenYAllocation += adjustmentFactor;
      } 
      // If tokenY is overrepresented (negative imbalance), allocate more to tokenX
      else {
        tokenXAllocation += adjustmentFactor;
        tokenYAllocation -= adjustmentFactor;
      }
    }
    
    // Ensure allocations sum to 1
    const sum = tokenXAllocation + tokenYAllocation;
    tokenXAllocation = tokenXAllocation / sum;
    tokenYAllocation = tokenYAllocation / sum;
    
    return {
      tokenX: tokenXAllocation,
      tokenY: tokenYAllocation,
    };
  }
} 