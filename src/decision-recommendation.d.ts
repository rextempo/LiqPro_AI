import { DecisionRecommendation, HealthScoreResult, RiskAssessmentResult } from '../types';
/**
 * Decision Recommendation
 * Generates action recommendations based on risk assessments
 */
export declare class DecisionRecommender {
    private static readonly ACTION_THRESHOLDS;
    /**
     * Generate a decision recommendation based on health score and risk assessment
     * @param healthScore Health score result
     * @param riskAssessment Risk assessment result
     * @returns Decision recommendation
     */
    static generateRecommendation(healthScore: HealthScoreResult, riskAssessment: RiskAssessmentResult): DecisionRecommendation;
    /**
     * Add specific risk warnings based on risk assessment
     * @param riskAssessment Risk assessment result
     * @param warningMessages Array of warning messages to append to
     */
    private static addRiskWarnings;
    /**
     * Calculate suggested allocation for rebalancing
     * @param riskAssessment Risk assessment result
     * @returns Suggested allocation percentages for tokenX and tokenY
     */
    private static calculateSuggestedAllocation;
}
//# sourceMappingURL=decision-recommendation.d.ts.map