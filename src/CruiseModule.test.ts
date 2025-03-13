import { CruiseModule } from './CruiseModule';
import { ScheduledTaskManager } from './ScheduledTaskManager';
import { PositionOptimizer } from './PositionOptimizer';
import { Logger } from '../../utils/logger';
import { AgentConfig } from '../../types';

// Mock interfaces
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

describe('CruiseModule', () => {
  let logger: Logger;
  let agentStateMachine: MockAgentStateMachine;
  let transactionExecutor: MockTransactionExecutor;
  let fundsManager: MockFundsManager;
  let riskController: MockRiskController;
  let positionOptimizer: PositionOptimizer;
  let taskManager: ScheduledTaskManager;
  let cruiseModule: CruiseModule;
  
  const AGENT_ID = 'test-agent-id';
  const AGENT_CONFIG: AgentConfig = {
    maxPositions: 5,
    minSolBalance: 0.1,
    targetHealthScore: 4.0,
    riskTolerance: 'medium',
    healthCheckIntervalMinutes: 30,
    marketChangeCheckIntervalMinutes: 15,
    optimizationIntervalHours: 24,
    emergencyThresholds: {
      minHealthScore: 1.5,
      maxDrawdown: 0.15,
    },
  };

  beforeEach(() => {
    // Create logger
    logger = new Logger({ module: 'test' });
    
    // Create mock dependencies
    agentStateMachine = {
      getActiveAgents: jest.fn(),
      getAgentState: jest.fn(),
    };
    
    transactionExecutor = {
      executeTransaction: jest.fn(),
    };
    
    fundsManager = {
      getAgentFunds: jest.fn(),
    };
    
    riskController = {
      assessRisk: jest.fn(),
    };
    
    // Create real ScheduledTaskManager
    taskManager = new ScheduledTaskManager(logger);
    
    // Mock getPoolRecommendations function
    const getPoolRecommendations = jest.fn().mockResolvedValue({
      healthScore: 4.0,
      action: 'maintain',
      priceChange24h: 0.01,
      volumeChange: 0.05,
      liquidityChange: 0.02
    });
    
    // Create real PositionOptimizer
    positionOptimizer = new PositionOptimizer(logger, getPoolRecommendations);
    
    // Create CruiseModule
    cruiseModule = new CruiseModule(
      logger,
      agentStateMachine as any,
      transactionExecutor as any,
      fundsManager as any,
      riskController as any,
      positionOptimizer,
      taskManager
    );
  });

  afterEach(async () => {
    // Stop the module if it's running
    await cruiseModule.stop();
  });

  describe('start', () => {
    it('should start the cruise module', async () => {
      await cruiseModule.start();
      
      // Check if the module is running
      expect((cruiseModule as any).isRunning).toBe(true);
    });
    
    it('should not start if already running', async () => {
      // Start once
      await cruiseModule.start();
      
      // Spy on taskManager.start
      const spy = jest.spyOn(taskManager, 'start');
      
      // Start again
      await cruiseModule.start();
      
      // Should not call taskManager.start again
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('stop', () => {
    it('should stop the cruise module', async () => {
      // Start first
      await cruiseModule.start();
      
      // Stop
      await cruiseModule.stop();
      
      // Check if the module is stopped
      expect((cruiseModule as any).isRunning).toBe(false);
    });
    
    it('should not stop if not running', async () => {
      // Spy on taskManager.stop
      const spy = jest.spyOn(taskManager, 'stop');
      
      // Stop without starting
      await cruiseModule.stop();
      
      // Should not call taskManager.stop
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('registerAgent', () => {
    it('should register an agent', async () => {
      // Start first
      await cruiseModule.start();
      
      // Register agent
      const result = await cruiseModule.registerAgent(AGENT_ID, AGENT_CONFIG);
      
      // Should return true
      expect(result).toBe(true);
      
      // Should add agent to registeredAgents
      expect((cruiseModule as any).registeredAgents.has(AGENT_ID)).toBe(true);
    });
    
    it('should not register if module is not running', async () => {
      // Register agent without starting
      const result = await cruiseModule.registerAgent(AGENT_ID, AGENT_CONFIG);
      
      // Should return false
      expect(result).toBe(false);
      
      // Should not add agent to registeredAgents
      expect((cruiseModule as any).registeredAgents.has(AGENT_ID)).toBe(false);
    });
    
    it('should return true if agent is already registered', async () => {
      // Start first
      await cruiseModule.start();
      
      // Register agent
      await cruiseModule.registerAgent(AGENT_ID, AGENT_CONFIG);
      
      // Register again
      const result = await cruiseModule.registerAgent(AGENT_ID, AGENT_CONFIG);
      
      // Should return true
      expect(result).toBe(true);
    });
  });

  describe('unregisterAgent', () => {
    it('should unregister an agent', async () => {
      // Start first
      await cruiseModule.start();
      
      // Register agent
      await cruiseModule.registerAgent(AGENT_ID, AGENT_CONFIG);
      
      // Unregister agent
      const result = await cruiseModule.unregisterAgent(AGENT_ID);
      
      // Should return true
      expect(result).toBe(true);
      
      // Should remove agent from registeredAgents
      expect((cruiseModule as any).registeredAgents.has(AGENT_ID)).toBe(false);
    });
    
    it('should not unregister if module is not running', async () => {
      // Start first
      await cruiseModule.start();
      
      // Register agent
      await cruiseModule.registerAgent(AGENT_ID, AGENT_CONFIG);
      
      // Stop module
      await cruiseModule.stop();
      
      // Unregister agent
      const result = await cruiseModule.unregisterAgent(AGENT_ID);
      
      // Should return false
      expect(result).toBe(false);
    });
    
    it('should return true if agent is not registered', async () => {
      // Start first
      await cruiseModule.start();
      
      // Unregister non-existent agent
      const result = await cruiseModule.unregisterAgent('non-existent-agent');
      
      // Should return true
      expect(result).toBe(true);
    });
  });

  describe('getRegisteredAgentCount', () => {
    it('should return the number of registered agents', async () => {
      // Start first
      await cruiseModule.start();
      
      // Register agents
      await cruiseModule.registerAgent(AGENT_ID, AGENT_CONFIG);
      await cruiseModule.registerAgent('another-agent', AGENT_CONFIG);
      
      // Get count
      const count = cruiseModule.getRegisteredAgentCount();
      
      // Should return 2
      expect(count).toBe(2);
    });
    
    it('should return 0 if no agents are registered', () => {
      // Get count without registering
      const count = cruiseModule.getRegisteredAgentCount();
      
      // Should return 0
      expect(count).toBe(0);
    });
  });

  describe('performHealthCheck', () => {
    it('should perform health check for an agent', async () => {
      // Start first
      await cruiseModule.start();
      
      // Register agent
      await cruiseModule.registerAgent(AGENT_ID, AGENT_CONFIG);
      
      // Mock dependencies
      agentStateMachine.getAgentState.mockResolvedValue({ status: 'active' });
      fundsManager.getAgentFunds.mockResolvedValue({
        totalValueUsd: 1000,
        totalValueSol: 10,
        availableSol: 1,
        positions: []
      });
      riskController.assessRisk.mockResolvedValue({
        agentId: AGENT_ID,
        timestamp: Date.now(),
        healthScore: 4.0,
        riskLevel: 'low',
        warnings: [],
        recommendations: []
      });
      
      // Perform health check
      const result = await cruiseModule.performHealthCheck(AGENT_ID);
      
      // Should return true
      expect(result).toBe(true);
      
      // Should call dependencies
      expect(agentStateMachine.getAgentState).toHaveBeenCalledWith(AGENT_ID);
      expect(fundsManager.getAgentFunds).toHaveBeenCalledWith(AGENT_ID);
      expect(riskController.assessRisk).toHaveBeenCalledWith(AGENT_ID);
    });
    
    it('should not perform health check if module is not running', async () => {
      // Perform health check without starting
      const result = await cruiseModule.performHealthCheck(AGENT_ID);
      
      // Should return false
      expect(result).toBe(false);
      
      // Should not call dependencies
      expect(agentStateMachine.getAgentState).not.toHaveBeenCalled();
    });
    
    it('should not perform health check if agent is not registered', async () => {
      // Start first
      await cruiseModule.start();
      
      // Perform health check for non-existent agent
      const result = await cruiseModule.performHealthCheck('non-existent-agent');
      
      // Should return false
      expect(result).toBe(false);
      
      // Should not call dependencies
      expect(agentStateMachine.getAgentState).not.toHaveBeenCalled();
    });
    
    it('should not perform health check if agent is not active', async () => {
      // Start first
      await cruiseModule.start();
      
      // Register agent
      await cruiseModule.registerAgent(AGENT_ID, AGENT_CONFIG);
      
      // Mock dependencies
      agentStateMachine.getAgentState.mockResolvedValue({ status: 'stopped' });
      
      // Perform health check
      const result = await cruiseModule.performHealthCheck(AGENT_ID);
      
      // Should return false
      expect(result).toBe(false);
      
      // Should call getAgentState but not other dependencies
      expect(agentStateMachine.getAgentState).toHaveBeenCalledWith(AGENT_ID);
      expect(fundsManager.getAgentFunds).not.toHaveBeenCalled();
    });
  });

  describe('optimizePositions', () => {
    it('should optimize positions for an agent', async () => {
      // Start first
      await cruiseModule.start();
      
      // Register agent
      await cruiseModule.registerAgent(AGENT_ID, AGENT_CONFIG);
      
      // Mock dependencies
      fundsManager.getAgentFunds.mockResolvedValue({
        totalValueUsd: 1000,
        totalValueSol: 10,
        availableSol: 1,
        positions: [
          {
            poolAddress: 'pool1',
            valueUsd: 500,
            valueSol: 5
          }
        ]
      });
      
      // Mock transaction execution
      transactionExecutor.executeTransaction.mockResolvedValue(true);
      
      // Spy on positionOptimizer.calculateOptimalPositions
      const spy = jest.spyOn(positionOptimizer, 'calculateOptimalPositions');
      spy.mockResolvedValue({
        agentId: AGENT_ID,
        totalValueSol: 10,
        actions: [
          {
            type: 'adjust',
            poolAddress: 'pool1',
            currentAmountSol: 5,
            targetAmountSol: 6
          }
        ],
        expectedHealthImprovement: 0.2
      });
      
      // Optimize positions
      const result = await cruiseModule.optimizePositions(AGENT_ID);
      
      // Should return true
      expect(result).toBe(true);
      
      // Should call dependencies
      expect(fundsManager.getAgentFunds).toHaveBeenCalledWith(AGENT_ID);
      expect(spy).toHaveBeenCalledWith(AGENT_ID, expect.anything(), AGENT_CONFIG);
      expect(transactionExecutor.executeTransaction).toHaveBeenCalled();
    });
    
    it('should not optimize if module is not running', async () => {
      // Optimize positions without starting
      const result = await cruiseModule.optimizePositions(AGENT_ID);
      
      // Should return false
      expect(result).toBe(false);
      
      // Should not call dependencies
      expect(fundsManager.getAgentFunds).not.toHaveBeenCalled();
    });
    
    it('should not optimize if agent is not registered', async () => {
      // Start first
      await cruiseModule.start();
      
      // Optimize positions for non-existent agent
      const result = await cruiseModule.optimizePositions('non-existent-agent');
      
      // Should return false
      expect(result).toBe(false);
      
      // Should not call dependencies
      expect(fundsManager.getAgentFunds).not.toHaveBeenCalled();
    });
    
    it('should return true if no optimization actions are needed', async () => {
      // Start first
      await cruiseModule.start();
      
      // Register agent
      await cruiseModule.registerAgent(AGENT_ID, AGENT_CONFIG);
      
      // Mock dependencies
      fundsManager.getAgentFunds.mockResolvedValue({
        totalValueUsd: 1000,
        totalValueSol: 10,
        availableSol: 1,
        positions: []
      });
      
      // Spy on positionOptimizer.calculateOptimalPositions
      const spy = jest.spyOn(positionOptimizer, 'calculateOptimalPositions');
      spy.mockResolvedValue({
        agentId: AGENT_ID,
        totalValueSol: 10,
        actions: [],
        expectedHealthImprovement: 0
      });
      
      // Optimize positions
      const result = await cruiseModule.optimizePositions(AGENT_ID);
      
      // Should return true
      expect(result).toBe(true);
      
      // Should call dependencies
      expect(fundsManager.getAgentFunds).toHaveBeenCalledWith(AGENT_ID);
      expect(spy).toHaveBeenCalledWith(AGENT_ID, expect.anything(), AGENT_CONFIG);
      
      // Should not call executeTransaction
      expect(transactionExecutor.executeTransaction).not.toHaveBeenCalled();
    });
  });
}); 