/**
 * 服务集成测试
 * 测试API服务与其他微服务的集成
 */
import { ServiceManager } from '../../clients/service-manager';
import { config } from '../../config';

// 模拟配置
jest.mock('../../config', () => ({
  config: {
    services: {
      signal: {
        url: 'http://localhost:3001',
        apiKey: 'test-signal-key'
      },
      data: {
        url: 'http://localhost:3002',
        apiKey: 'test-data-key'
      },
      scoring: {
        url: 'http://localhost:3003',
        apiKey: 'test-scoring-key'
      },
      agent: {
        url: 'http://localhost:3004',
        apiKey: 'test-agent-key'
      },
      timeout: 5000
    }
  }
}));

// 模拟axios
jest.mock('axios', () => {
  return {
    create: jest.fn(() => ({
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    }))
  };
});

describe('Service Integration Tests', () => {
  let serviceManager: ServiceManager;

  beforeAll(() => {
    // 初始化服务管理器
    serviceManager = ServiceManager.getInstance({
      signalServiceUrl: config.services.signal.url,
      dataServiceUrl: config.services.data.url,
      scoringServiceUrl: config.services.scoring.url,
      agentServiceUrl: config.services.agent.url,
      timeout: config.services.timeout
    });
  });

  describe('SignalClient Integration', () => {
    it('should get signal client instance', () => {
      const signalClient = serviceManager.getSignalClient();
      expect(signalClient).toBeDefined();
    });

    it('should have correct base URL', () => {
      const signalClient = serviceManager.getSignalClient();
      expect((signalClient as any).baseUrl).toBe(config.services.signal.url);
    });
  });

  describe('DataClient Integration', () => {
    it('should get data client instance', () => {
      const dataClient = serviceManager.getDataClient();
      expect(dataClient).toBeDefined();
    });

    it('should have correct base URL', () => {
      const dataClient = serviceManager.getDataClient();
      expect((dataClient as any).baseUrl).toBe(config.services.data.url);
    });
  });

  describe('ScoringClient Integration', () => {
    it('should get scoring client instance', () => {
      const scoringClient = serviceManager.getScoringClient();
      expect(scoringClient).toBeDefined();
    });

    it('should have correct base URL', () => {
      const scoringClient = serviceManager.getScoringClient();
      expect((scoringClient as any).baseUrl).toBe(config.services.scoring.url);
    });
  });

  describe('AgentClient Integration', () => {
    it('should get agent client instance', () => {
      const agentClient = serviceManager.getAgentClient();
      expect(agentClient).toBeDefined();
    });

    it('should have correct base URL', () => {
      const agentClient = serviceManager.getAgentClient();
      expect((agentClient as any).baseUrl).toBe(config.services.agent.url);
    });
  });

  describe('ServiceManager Health Check', () => {
    it('should check health of all services', async () => {
      // 模拟所有服务的健康检查返回true
      jest.spyOn(serviceManager.getSignalClient(), 'healthCheck').mockResolvedValue(true);
      jest.spyOn(serviceManager.getDataClient(), 'healthCheck').mockResolvedValue(true);
      jest.spyOn(serviceManager.getScoringClient(), 'healthCheck').mockResolvedValue(true);
      jest.spyOn(serviceManager.getAgentClient(), 'healthCheck').mockResolvedValue(true);

      const health = await serviceManager.checkServicesHealth();
      expect(health).toEqual({
        signal: true,
        data: true,
        scoring: true,
        agent: true
      });
    });

    it('should handle service health check failures', async () => {
      // 模拟部分服务健康检查失败
      jest.spyOn(serviceManager.getSignalClient(), 'healthCheck').mockResolvedValue(true);
      jest.spyOn(serviceManager.getDataClient(), 'healthCheck').mockResolvedValue(false);
      jest.spyOn(serviceManager.getScoringClient(), 'healthCheck').mockResolvedValue(true);
      jest.spyOn(serviceManager.getAgentClient(), 'healthCheck').mockResolvedValue(false);

      const health = await serviceManager.checkServicesHealth();
      expect(health).toEqual({
        signal: true,
        data: false,
        scoring: true,
        agent: false
      });
    });
  });
}); 