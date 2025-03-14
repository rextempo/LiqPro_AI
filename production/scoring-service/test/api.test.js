const request = require('supertest');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

// 模拟ScoringController
class MockScoringController {
  constructor() {
    this.healthScores = new Map();
    this.riskAssessments = new Map();
    this.recommendations = new Map();
    this.isRunning = true;
    
    // 添加一些测试数据
    const poolAddress = 'testPool123';
    const timestamp = Date.now();
    
    // 健康评分
    this.healthScores.set(poolAddress, [
      { 
        poolAddress, 
        score: 4.2, 
        metrics: {
          priceVolatility: 0.05,
          recentPriceChange: 0.02,
          tvlChange: 0.01,
          liquidityDepth: 0.8,
          volumeChange: 0.03,
          slippageEstimate: 0.01,
          largeHoldersPercentage: 0.3,
          recentWhaleWithdrawals: 0,
          tokenRatioImbalance: 0.1
        },
        timestamp
      }
    ]);
    
    // 风险评估
    this.riskAssessments.set(poolAddress, [
      {
        poolAddress,
        riskLevel: 'LOW',
        factors: [
          { name: 'priceVolatility', value: 0.05, impact: 'LOW' },
          { name: 'liquidityDepth', value: 0.8, impact: 'POSITIVE' }
        ],
        timestamp
      }
    ]);
    
    // 建议
    this.recommendations.set(poolAddress, [
      {
        poolAddress,
        action: 'MONITOR',
        confidence: 0.85,
        reasoning: 'Pool shows stable metrics with low risk factors',
        timestamp
      }
    ]);
  }
  
  getHealthScores(poolAddress) {
    return this.healthScores.get(poolAddress) || [];
  }
  
  getLatestHealthScore(poolAddress) {
    const scores = this.healthScores.get(poolAddress) || [];
    return scores.length > 0 ? scores[scores.length - 1] : null;
  }
  
  getRiskAssessments(poolAddress) {
    return this.riskAssessments.get(poolAddress) || [];
  }
  
  getLatestRiskAssessment(poolAddress) {
    const assessments = this.riskAssessments.get(poolAddress) || [];
    return assessments.length > 0 ? assessments[assessments.length - 1] : null;
  }
  
  getRecommendations(poolAddress) {
    return this.recommendations.get(poolAddress) || [];
  }
  
  getLatestRecommendation(poolAddress) {
    const recommendations = this.recommendations.get(poolAddress) || [];
    return recommendations.length > 0 ? recommendations[recommendations.length - 1] : null;
  }
  
  async processPool(poolAddress) {
    return { success: true, message: `Processed pool ${poolAddress}` };
  }
  
  async runScoringCycle() {
    return { success: true, message: 'Scoring cycle completed' };
  }
}

// 创建测试应用
function createTestApp() {
  const app = express();
  const mockScoringController = new MockScoringController();
  
  // 中间件
  app.use(cors());
  app.use(helmet());
  app.use(compression());
  app.use(express.json());
  
  // 健康检查
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'scoring-service',
      isRunning: mockScoringController.isRunning,
      timestamp: new Date().toISOString()
    });
  });
  
  // 获取健康评分
  app.get('/pools/:poolAddress/health-scores', (req, res) => {
    const { poolAddress } = req.params;
    const scores = mockScoringController.getHealthScores(poolAddress);
    res.json(scores);
  });
  
  // 获取最新健康评分
  app.get('/pools/:poolAddress/health-score/latest', (req, res) => {
    const { poolAddress } = req.params;
    const score = mockScoringController.getLatestHealthScore(poolAddress);
    if (!score) {
      return res.status(404).json({ error: 'No health score found for this pool' });
    }
    res.json(score);
  });
  
  // 获取风险评估
  app.get('/pools/:poolAddress/risk-assessments', (req, res) => {
    const { poolAddress } = req.params;
    const assessments = mockScoringController.getRiskAssessments(poolAddress);
    res.json(assessments);
  });
  
  // 获取最新风险评估
  app.get('/pools/:poolAddress/risk-assessment/latest', (req, res) => {
    const { poolAddress } = req.params;
    const assessment = mockScoringController.getLatestRiskAssessment(poolAddress);
    if (!assessment) {
      return res.status(404).json({ error: 'No risk assessment found for this pool' });
    }
    res.json(assessment);
  });
  
  // 获取建议
  app.get('/pools/:poolAddress/recommendations', (req, res) => {
    const { poolAddress } = req.params;
    const recommendations = mockScoringController.getRecommendations(poolAddress);
    res.json(recommendations);
  });
  
  // 获取最新建议
  app.get('/pools/:poolAddress/recommendation/latest', (req, res) => {
    const { poolAddress } = req.params;
    const recommendation = mockScoringController.getLatestRecommendation(poolAddress);
    if (!recommendation) {
      return res.status(404).json({ error: 'No recommendation found for this pool' });
    }
    res.json(recommendation);
  });
  
  // 手动触发对特定池的评分
  app.post('/pools/:poolAddress/score', async (req, res) => {
    const { poolAddress } = req.params;
    try {
      const result = await mockScoringController.processPool(poolAddress);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // 手动触发评分周期
  app.post('/score-cycle', async (req, res) => {
    try {
      const result = await mockScoringController.runScoringCycle();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  return app;
}

// 测试
describe('Scoring Service API', () => {
  const app = createTestApp();
  const testPoolAddress = 'testPool123';
  const nonExistentPool = 'nonExistentPool';
  
  describe('Health Check', () => {
    it('should return service status', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('service', 'scoring-service');
      expect(response.body).toHaveProperty('isRunning', true);
    });
  });
  
  describe('Health Scores', () => {
    it('should return health scores for a pool', async () => {
      const response = await request(app).get(`/pools/${testPoolAddress}/health-scores`);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('poolAddress', testPoolAddress);
      expect(response.body[0]).toHaveProperty('score');
      expect(response.body[0]).toHaveProperty('metrics');
    });
    
    it('should return empty array for non-existent pool', async () => {
      const response = await request(app).get(`/pools/${nonExistentPool}/health-scores`);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
    
    it('should return latest health score for a pool', async () => {
      const response = await request(app).get(`/pools/${testPoolAddress}/health-score/latest`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('poolAddress', testPoolAddress);
      expect(response.body).toHaveProperty('score');
    });
    
    it('should return 404 for latest health score of non-existent pool', async () => {
      const response = await request(app).get(`/pools/${nonExistentPool}/health-score/latest`);
      expect(response.status).toBe(404);
    });
  });
  
  describe('Risk Assessments', () => {
    it('should return risk assessments for a pool', async () => {
      const response = await request(app).get(`/pools/${testPoolAddress}/risk-assessments`);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('poolAddress', testPoolAddress);
      expect(response.body[0]).toHaveProperty('riskLevel');
      expect(response.body[0]).toHaveProperty('factors');
    });
    
    it('should return latest risk assessment for a pool', async () => {
      const response = await request(app).get(`/pools/${testPoolAddress}/risk-assessment/latest`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('poolAddress', testPoolAddress);
      expect(response.body).toHaveProperty('riskLevel');
    });
  });
  
  describe('Recommendations', () => {
    it('should return recommendations for a pool', async () => {
      const response = await request(app).get(`/pools/${testPoolAddress}/recommendations`);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('poolAddress', testPoolAddress);
      expect(response.body[0]).toHaveProperty('action');
      expect(response.body[0]).toHaveProperty('confidence');
    });
    
    it('should return latest recommendation for a pool', async () => {
      const response = await request(app).get(`/pools/${testPoolAddress}/recommendation/latest`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('poolAddress', testPoolAddress);
      expect(response.body).toHaveProperty('action');
    });
  });
  
  describe('Manual Scoring', () => {
    it('should trigger scoring for a specific pool', async () => {
      const response = await request(app).post(`/pools/${testPoolAddress}/score`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });
    
    it('should trigger a scoring cycle', async () => {
      const response = await request(app).post('/score-cycle');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });
  });
}); 