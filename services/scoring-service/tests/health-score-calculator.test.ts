import { HealthScoreCalculator } from '../src/models/health-score-calculator';
import { RiskLevel } from '../src/types';

// Mock the logger
jest.mock('@liqpro/monitoring', () => ({
  createLogger: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

describe('HealthScoreCalculator', () => {
  const poolAddress = 'testPoolAddress123';

  describe('calculateHealthScore', () => {
    it('should calculate a perfect health score correctly', () => {
      // All metrics are perfect (no risk)
      const result = HealthScoreCalculator.calculateHealthScore(
        poolAddress,
        0, // No price volatility
        0, // No TVL change
        0, // No volume change
        0, // No whale withdrawals
        0, // Perfect token balance
      );

      expect(result.overallScore).toBeCloseTo(5.0);
      expect(result.riskLevel).toBe(RiskLevel.EXTREMELY_LOW);
      expect(result.components.priceRiskScore).toBeCloseTo(5.0);
      expect(result.components.liquidityRiskScore).toBeCloseTo(5.0);
      expect(result.components.tradingRiskScore).toBeCloseTo(5.0);
      expect(result.components.whaleRiskScore).toBeCloseTo(5.0);
      expect(result.components.imbalanceRiskScore).toBeCloseTo(5.0);
    });

    it('should calculate a high risk health score correctly', () => {
      // All metrics indicate high risk
      const result = HealthScoreCalculator.calculateHealthScore(
        poolAddress,
        0.2, // High price volatility
        -0.3, // Significant TVL decrease
        -0.4, // Significant volume decrease
        0.1, // Significant whale withdrawals
        0.5, // Significant token imbalance
      );

      expect(result.overallScore).toBeLessThan(3.0);
      expect(result.riskLevel).toBe(RiskLevel.MEDIUM);
      expect(result.components.priceRiskScore).toBeLessThan(3.0);
      expect(result.components.liquidityRiskScore).toBeLessThan(3.0);
      expect(result.components.tradingRiskScore).toBeLessThan(3.0);
      expect(result.components.whaleRiskScore).toBeLessThan(3.0);
      expect(result.components.imbalanceRiskScore).toBeLessThan(3.0);
    });

    it('should calculate score change correctly when previous score is provided', () => {
      const previousScore = 4.0;
      const result = HealthScoreCalculator.calculateHealthScore(
        poolAddress,
        0.05, // Low price volatility
        -0.05, // Small TVL decrease
        0.1, // Small volume increase
        0.02, // Small whale withdrawals
        0.1, // Small token imbalance
        previousScore
      );

      expect(result.previousScore).toBe(previousScore);
      expect(result.scoreChange).toBeDefined();
      expect(result.scoreChange).toBeCloseTo(result.overallScore - previousScore);
    });
  });

  describe('mapScoreToRiskLevel', () => {
    it('should map scores to risk levels correctly', () => {
      expect(HealthScoreCalculator.mapScoreToRiskLevel(5.0)).toBe(RiskLevel.EXTREMELY_LOW);
      expect(HealthScoreCalculator.mapScoreToRiskLevel(4.5)).toBe(RiskLevel.EXTREMELY_LOW);
      expect(HealthScoreCalculator.mapScoreToRiskLevel(4.0)).toBe(RiskLevel.LOW);
      expect(HealthScoreCalculator.mapScoreToRiskLevel(3.5)).toBe(RiskLevel.LOW);
      expect(HealthScoreCalculator.mapScoreToRiskLevel(3.0)).toBe(RiskLevel.MEDIUM);
      expect(HealthScoreCalculator.mapScoreToRiskLevel(2.5)).toBe(RiskLevel.MEDIUM);
      expect(HealthScoreCalculator.mapScoreToRiskLevel(2.0)).toBe(RiskLevel.HIGH);
      expect(HealthScoreCalculator.mapScoreToRiskLevel(1.5)).toBe(RiskLevel.HIGH);
      expect(HealthScoreCalculator.mapScoreToRiskLevel(1.0)).toBe(RiskLevel.EXTREMELY_HIGH);
    });
  });
}); 