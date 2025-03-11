import { CruiseService } from './CruiseService';
import { Logger } from '../../utils/logger';
import { AgentConfig } from '../../types';

// 模拟接口
interface MockAgentStateMachine {
  getActiveAgents: jest.Mock;
  getAgentState: jest.Mock;
}

interface MockTransactionExecutor {
  executeTransaction: jest.Mock;
}

interface MockFundsManager {
  getAgentFunds: jest.Mock;
}

interface MockRiskController {
  assessRisk: jest.Mock;
}

// Mock dependencies
jest.mock('./CruiseModule');

describe('CruiseService', () => {
  let logger: Logger;
  let agentStateMachine: MockAgentStateMachine;
  let transactionExecutor: MockTransactionExecutor;
  let fundsManager: MockFundsManager;
  let riskController: MockRiskController;
  let cruiseService: CruiseService;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create logger
    logger = new Logger({ module: 'test' });
    
    // Create mocked dependencies
    agentStateMachine = {
      getActiveAgents: jest.fn().mockResolvedValue([
        { id: 'agent1', config: { maxPositions: 5 } as AgentConfig },
        { id: 'agent2', config: { maxPositions: 3 } as AgentConfig }
      ]),
      getAgentState: jest.fn()
    };
    
    transactionExecutor = {
      executeTransaction: jest.fn()
    };
    
    fundsManager = {
      getAgentFunds: jest.fn()
    };
    
    riskController = {
      assessRisk: jest.fn()
    };
    
    // Create CruiseService instance
    cruiseService = CruiseService.getInstance(
      logger,
      agentStateMachine as any,
      transactionExecutor as any,
      fundsManager as any,
      riskController as any
    );
  });

  afterEach(() => {
    // Reset singleton
    (CruiseService as any).instance = null;
  });

  describe('getInstance', () => {
    it('should return the same instance when called multiple times', () => {
      const instance1 = CruiseService.getInstance(
        logger,
        agentStateMachine as any,
        transactionExecutor as any,
        fundsManager as any,
        riskController as any
      );
      
      const instance2 = CruiseService.getInstance(
        logger,
        agentStateMachine as any,
        transactionExecutor as any,
        fundsManager as any,
        riskController as any
      );
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('start', () => {
    it('should start the cruise service and register active agents', async () => {
      const result = await cruiseService.start();
      
      expect(result).toBe(true);
      expect(agentStateMachine.getActiveAgents).toHaveBeenCalled();
    });
    
    it('should return true if already running', async () => {
      // Start once
      await cruiseService.start();
      
      // Start again
      const result = await cruiseService.start();
      
      expect(result).toBe(true);
      expect(agentStateMachine.getActiveAgents).toHaveBeenCalledTimes(1);
    });
    
    it('should return false if an error occurs', async () => {
      // Mock error
      agentStateMachine.getActiveAgents = jest.fn().mockRejectedValue(new Error('Test error'));
      
      const result = await cruiseService.start();
      
      expect(result).toBe(false);
    });
  });

  describe('stop', () => {
    it('should stop the cruise service', async () => {
      // Start first
      await cruiseService.start();
      
      const result = await cruiseService.stop();
      
      expect(result).toBe(true);
    });
    
    it('should return true if not running', async () => {
      const result = await cruiseService.stop();
      
      expect(result).toBe(true);
    });
    
    it('should return false if an error occurs', async () => {
      // Start first
      await cruiseService.start();
      
      // Mock CruiseModule.stop to throw an error
      const mockCruiseModule = (cruiseService as any).cruiseModule;
      mockCruiseModule.stop = jest.fn().mockRejectedValue(new Error('Test error'));
      
      const result = await cruiseService.stop();
      
      expect(result).toBe(false);
    });
  });

  describe('getHealth', () => {
    it('should return health status when not running', () => {
      const health = cruiseService.getHealth();
      
      expect(health).toEqual({ isRunning: false });
    });
    
    it('should return health status with agent count when running', async () => {
      // Start first
      await cruiseService.start();
      
      // Mock getRegisteredAgentCount
      const mockCruiseModule = (cruiseService as any).cruiseModule;
      mockCruiseModule.getRegisteredAgentCount = jest.fn().mockReturnValue(2);
      
      const health = cruiseService.getHealth();
      
      expect(health).toEqual({ isRunning: true, agentCount: 2 });
    });
  });

  describe('performAgentHealthCheck', () => {
    it('should return failure if not running', async () => {
      const result = await cruiseService.performAgentHealthCheck('agent1');
      
      expect(result).toEqual({
        success: false,
        message: 'CruiseService is not running'
      });
    });
    
    it('should perform health check when running', async () => {
      // Start first
      await cruiseService.start();
      
      // Mock performHealthCheck
      const mockCruiseModule = (cruiseService as any).cruiseModule;
      mockCruiseModule.performHealthCheck = jest.fn().mockResolvedValue(true);
      
      const result = await cruiseService.performAgentHealthCheck('agent1');
      
      expect(result).toEqual({
        success: true,
        message: 'Health check completed for agent agent1'
      });
      expect(mockCruiseModule.performHealthCheck).toHaveBeenCalledWith('agent1');
    });
    
    it('should return failure if health check fails', async () => {
      // Start first
      await cruiseService.start();
      
      // Mock performHealthCheck
      const mockCruiseModule = (cruiseService as any).cruiseModule;
      mockCruiseModule.performHealthCheck = jest.fn().mockResolvedValue(false);
      
      const result = await cruiseService.performAgentHealthCheck('agent1');
      
      expect(result).toEqual({
        success: false,
        message: 'Failed to perform health check for agent agent1'
      });
    });
    
    it('should return error if an exception occurs', async () => {
      // Start first
      await cruiseService.start();
      
      // Mock performHealthCheck
      const mockCruiseModule = (cruiseService as any).cruiseModule;
      mockCruiseModule.performHealthCheck = jest.fn().mockRejectedValue(new Error('Test error'));
      
      const result = await cruiseService.performAgentHealthCheck('agent1');
      
      expect(result).toEqual({
        success: false,
        message: 'Error: Test error'
      });
    });
  });

  describe('optimizeAgentPositions', () => {
    it('should return failure if not running', async () => {
      const result = await cruiseService.optimizeAgentPositions('agent1');
      
      expect(result).toEqual({
        success: false,
        message: 'CruiseService is not running'
      });
    });
    
    it('should optimize positions when running', async () => {
      // Start first
      await cruiseService.start();
      
      // Mock optimizePositions
      const mockCruiseModule = (cruiseService as any).cruiseModule;
      mockCruiseModule.optimizePositions = jest.fn().mockResolvedValue(true);
      
      const result = await cruiseService.optimizeAgentPositions('agent1');
      
      expect(result).toEqual({
        success: true,
        message: 'Position optimization completed for agent agent1'
      });
      expect(mockCruiseModule.optimizePositions).toHaveBeenCalledWith('agent1');
    });
    
    it('should return failure if optimization fails', async () => {
      // Start first
      await cruiseService.start();
      
      // Mock optimizePositions
      const mockCruiseModule = (cruiseService as any).cruiseModule;
      mockCruiseModule.optimizePositions = jest.fn().mockResolvedValue(false);
      
      const result = await cruiseService.optimizeAgentPositions('agent1');
      
      expect(result).toEqual({
        success: false,
        message: 'Failed to optimize positions for agent agent1'
      });
    });
    
    it('should return error if an exception occurs', async () => {
      // Start first
      await cruiseService.start();
      
      // Mock optimizePositions
      const mockCruiseModule = (cruiseService as any).cruiseModule;
      mockCruiseModule.optimizePositions = jest.fn().mockRejectedValue(new Error('Test error'));
      
      const result = await cruiseService.optimizeAgentPositions('agent1');
      
      expect(result).toEqual({
        success: false,
        message: 'Error: Test error'
      });
    });
  });
}); 