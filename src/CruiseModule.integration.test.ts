import { CruiseModule } from './CruiseModule';
import { ScheduledTaskManager } from './ScheduledTaskManager';
import { PositionOptimizer } from './PositionOptimizer';
import { Logger } from '../../utils/logger';
import { AgentConfig, FundsStatus, RiskAssessment, AgentState } from '../../types';

// 模拟接口
interface MockAgentStateMachine {
  getActiveAgents: jest.Mock;
  getAgentState: jest.Mock;
  handleEvent: jest.Mock;
  addStateChangeListener: jest.Mock;
  getStatus: jest.Mock;
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

describe('CruiseModule Integration Tests', () => {
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
      getActiveAgents: jest.fn().mockResolvedValue([
        { id: AGENT_ID, config: AGENT_CONFIG }
      ]),
      getAgentState: jest.fn().mockResolvedValue({ status: 'active' }),
      handleEvent: jest.fn(),
      addStateChangeListener: jest.fn(),
      getStatus: jest.fn().mockReturnValue({
        state: AgentState.RUNNING,
        config: AGENT_CONFIG,
        funds: {
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
        }
      })
    };
    
    transactionExecutor = {
      executeTransaction: jest.fn().mockResolvedValue(true)
    };
    
    fundsManager = {
      getAgentFunds: jest.fn().mockResolvedValue({
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
      })
    };
    
    riskController = {
      assessRisk: jest.fn().mockResolvedValue({
        agentId: AGENT_ID,
        timestamp: Date.now(),
        healthScore: 4.0,
        riskLevel: 'low',
        warnings: [],
        recommendations: []
      })
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

  describe('Integration with AgentStateMachine', () => {
    it('should register agents from AgentStateMachine when starting', async () => {
      // Start the cruise module
      await cruiseModule.start();
      
      // Check if getActiveAgents was called
      expect(agentStateMachine.getActiveAgents).toHaveBeenCalled();
      
      // Check if the agent was registered
      expect((cruiseModule as any).registeredAgents.has(AGENT_ID)).toBe(true);
    });
    
    it('should perform health check based on agent state', async () => {
      // Start the cruise module
      await cruiseModule.start();
      
      // Register agent
      await cruiseModule.registerAgent(AGENT_ID, AGENT_CONFIG);
      
      // Perform health check
      const result = await cruiseModule.performHealthCheck(AGENT_ID);
      
      // Check if getAgentState was called
      expect(agentStateMachine.getAgentState).toHaveBeenCalledWith(AGENT_ID);
      
      // Check if health check was successful
      expect(result).toBe(true);
    });
    
    it('should not perform health check if agent is not active', async () => {
      // Mock agent state as stopped
      agentStateMachine.getAgentState = jest.fn().mockResolvedValue({ status: 'stopped' });
      
      // Start the cruise module
      await cruiseModule.start();
      
      // Register agent
      await cruiseModule.registerAgent(AGENT_ID, AGENT_CONFIG);
      
      // Perform health check
      const result = await cruiseModule.performHealthCheck(AGENT_ID);
      
      // Check if getAgentState was called
      expect(agentStateMachine.getAgentState).toHaveBeenCalledWith(AGENT_ID);
      
      // Check if health check was not performed
      expect(result).toBe(false);
      
      // Check if getFundsStatus was not called
      expect(fundsManager.getAgentFunds).not.toHaveBeenCalled();
    });
  });

  describe('Integration with TransactionExecutor', () => {
    it('should execute transactions during position optimization', async () => {
      // Mock calculateOptimalPositions to return actions
      jest.spyOn(positionOptimizer, 'calculateOptimalPositions').mockResolvedValue({
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
      
      // Start the cruise module
      await cruiseModule.start();
      
      // Register agent
      await cruiseModule.registerAgent(AGENT_ID, AGENT_CONFIG);
      
      // Optimize positions
      const result = await cruiseModule.optimizePositions(AGENT_ID);
      
      // Check if executeTransaction was called
      expect(transactionExecutor.executeTransaction).toHaveBeenCalled();
      
      // Check if optimization was successful
      expect(result).toBe(true);
    });
    
    it('should handle transaction failures during optimization', async () => {
      // Mock calculateOptimalPositions to return actions
      jest.spyOn(positionOptimizer, 'calculateOptimalPositions').mockResolvedValue({
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
      
      // Mock transaction failure
      transactionExecutor.executeTransaction = jest.fn().mockResolvedValue(false);
      
      // Start the cruise module
      await cruiseModule.start();
      
      // Register agent
      await cruiseModule.registerAgent(AGENT_ID, AGENT_CONFIG);
      
      // Optimize positions
      const result = await cruiseModule.optimizePositions(AGENT_ID);
      
      // Check if executeTransaction was called
      expect(transactionExecutor.executeTransaction).toHaveBeenCalled();
      
      // Check if optimization failed
      expect(result).toBe(false);
    });
  });

  describe('Integration with RiskController', () => {
    it('should use risk assessment during health check', async () => {
      // Start the cruise module
      await cruiseModule.start();
      
      // Register agent
      await cruiseModule.registerAgent(AGENT_ID, AGENT_CONFIG);
      
      // Perform health check
      await cruiseModule.performHealthCheck(AGENT_ID);
      
      // Check if assessRisk was called
      expect(riskController.assessRisk).toHaveBeenCalledWith(AGENT_ID);
    });
    
    it('should trigger optimization for unhealthy positions', async () => {
      // Mock unhealthy risk assessment
      riskController.assessRisk = jest.fn().mockResolvedValue({
        agentId: AGENT_ID,
        timestamp: Date.now(),
        healthScore: 2.0,
        riskLevel: 'medium',
        warnings: ['Position health is below optimal'],
        recommendations: ['Consider rebalancing positions']
      });
      
      // Mock identifyUnhealthyPositions to return unhealthy positions
      jest.spyOn(positionOptimizer, 'identifyUnhealthyPositions').mockResolvedValue([
        {
          poolAddress: 'pool1',
          valueSol: 5
        }
      ]);
      
      // Spy on optimizePositions
      const optimizeSpy = jest.spyOn(cruiseModule, 'optimizePositions');
      
      // Start the cruise module
      await cruiseModule.start();
      
      // Register agent
      await cruiseModule.registerAgent(AGENT_ID, AGENT_CONFIG);
      
      // Perform health check
      await cruiseModule.performHealthCheck(AGENT_ID);
      
      // Check if optimizePositions was called
      expect(optimizeSpy).toHaveBeenCalledWith(AGENT_ID);
    });
  });

  describe('Integration with FundsManager', () => {
    it('should retrieve funds status during health check', async () => {
      // Start the cruise module
      await cruiseModule.start();
      
      // Register agent
      await cruiseModule.registerAgent(AGENT_ID, AGENT_CONFIG);
      
      // Perform health check
      await cruiseModule.performHealthCheck(AGENT_ID);
      
      // Check if getAgentFunds was called
      expect(fundsManager.getAgentFunds).toHaveBeenCalledWith(AGENT_ID);
    });
    
    it('should retrieve funds status during position optimization', async () => {
      // Start the cruise module
      await cruiseModule.start();
      
      // Register agent
      await cruiseModule.registerAgent(AGENT_ID, AGENT_CONFIG);
      
      // Optimize positions
      await cruiseModule.optimizePositions(AGENT_ID);
      
      // Check if getAgentFunds was called
      expect(fundsManager.getAgentFunds).toHaveBeenCalledWith(AGENT_ID);
    });
  });

  describe('Task Scheduling', () => {
    it('should schedule health check tasks for registered agents', async () => {
      // Spy on scheduleRecurringTask
      const scheduleSpy = jest.spyOn(taskManager, 'scheduleRecurringTask');
      
      // Start the cruise module
      await cruiseModule.start();
      
      // Register agent
      await cruiseModule.registerAgent(AGENT_ID, AGENT_CONFIG);
      
      // Check if scheduleRecurringTask was called for health check
      expect(scheduleSpy).toHaveBeenCalledWith(
        `health-check-${AGENT_ID}`,
        expect.any(Function),
        AGENT_CONFIG.healthCheckIntervalMinutes * 60 * 1000,
        [`agent:${AGENT_ID}`, 'health-check']
      );
    });
    
    it('should schedule market change detection tasks for registered agents', async () => {
      // Spy on scheduleRecurringTask
      const scheduleSpy = jest.spyOn(taskManager, 'scheduleRecurringTask');
      
      // Start the cruise module
      await cruiseModule.start();
      
      // Register agent
      await cruiseModule.registerAgent(AGENT_ID, AGENT_CONFIG);
      
      // Check if scheduleRecurringTask was called for market change detection
      expect(scheduleSpy).toHaveBeenCalledWith(
        `market-change-${AGENT_ID}`,
        expect.any(Function),
        AGENT_CONFIG.marketChangeCheckIntervalMinutes * 60 * 1000,
        [`agent:${AGENT_ID}`, 'market-change']
      );
    });
    
    it('should cancel tasks when unregistering an agent', async () => {
      // Spy on cancelTasksByTag
      const cancelSpy = jest.spyOn(taskManager, 'cancelTasksByTag');
      
      // Start the cruise module
      await cruiseModule.start();
      
      // Register agent
      await cruiseModule.registerAgent(AGENT_ID, AGENT_CONFIG);
      
      // Unregister agent
      await cruiseModule.unregisterAgent(AGENT_ID);
      
      // Check if cancelTasksByTag was called
      expect(cancelSpy).toHaveBeenCalledWith(`agent:${AGENT_ID}`);
    });
  });
}); 