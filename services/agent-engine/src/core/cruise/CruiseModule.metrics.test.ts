import { CruiseModule } from './CruiseModule';
import { ScheduledTaskManager } from './ScheduledTaskManager';
import { PositionOptimizer } from './PositionOptimizer';
import { CruiseMetrics } from './CruiseMetrics';
import { Logger } from '../../utils/logger';
import { AgentConfig, AgentState } from '../../types';

// Mock dependencies
interface AgentStateMachine {
  getActiveAgents: () => Promise<any[]>;
  getAgentState: (agentId: string) => Promise<any>;
}

interface TransactionExecutor {
  executeTransaction: (request: any) => Promise<any>;
}

interface FundsManager {
  getAgentFunds: (agentId: string) => Promise<any>;
}

interface RiskController {
  assessRisk: (agentId: string, action: string) => Promise<any>;
}

interface SignalService {
  getSignal: () => Promise<any>;
  getT1Pools: () => Promise<any>;
}

describe('CruiseModule Metrics Integration Tests', () => {
  let logger: Logger;
  let cruiseModule: CruiseModule;
  let metrics: CruiseMetrics;
  let taskManager: ScheduledTaskManager;
  let positionOptimizer: PositionOptimizer;
  
  // Mock dependencies
  let mockAgentStateMachine: jest.Mocked<AgentStateMachine>;
  let mockTransactionExecutor: jest.Mocked<TransactionExecutor>;
  let mockFundsManager: jest.Mocked<FundsManager>;
  let mockRiskController: jest.Mocked<RiskController>;
  let mockSignalService: jest.Mocked<SignalService>;
  
  beforeEach(() => {
    // Create logger
    logger = new Logger({ module: 'test' });
    
    // Create metrics collector
    metrics = new CruiseMetrics(logger);
    
    // Create task manager
    taskManager = new ScheduledTaskManager(logger);
    
    // Mock dependencies
    mockAgentStateMachine = {
      getActiveAgents: jest.fn(),
      getAgentState: jest.fn()
    };
    
    mockTransactionExecutor = {
      executeTransaction: jest.fn()
    };
    
    mockFundsManager = {
      getAgentFunds: jest.fn()
    };
    
    mockRiskController = {
      assessRisk: jest.fn()
    };

    mockSignalService = {
      getSignal: jest.fn(),
      getT1Pools: jest.fn()
    };
    
    // Create position optimizer
    const getPoolRecommendations = async () => ({
      healthScore: 4.0,
      action: 'maintain',
      priceChange24h: 0.01,
      volumeChange: 0.05,
      liquidityChange: 0.02
    });
    
    positionOptimizer = new PositionOptimizer(logger, getPoolRecommendations);
    
    // Create cruise module
    cruiseModule = new CruiseModule(
      logger,
      mockAgentStateMachine as any,
      mockTransactionExecutor as any,
      mockFundsManager as any,
      mockRiskController as any,
      mockSignalService,
      positionOptimizer,
      taskManager,
      metrics
    );
    
    // Start metrics collection
    metrics.startMetricsReporting();
    
    // Mock data
    mockAgentStateMachine.getActiveAgents.mockResolvedValue([
      { id: 'agent1', config: { healthCheckInterval: 300000 } },
      { id: 'agent2', config: { healthCheckInterval: 600000 } }
    ]);
    
    mockAgentStateMachine.getAgentState.mockResolvedValue({
      id: 'agent1',
      state: AgentState.RUNNING,
      config: {
        name: 'Agent 1',
        walletAddress: 'wallet1',
        maxPositions: 5,
        minSolBalance: 1,
        targetHealthScore: 4.0,
        riskTolerance: 'medium',
        healthCheckIntervalMinutes: 5,
        marketChangeCheckIntervalMinutes: 15,
        optimizationIntervalHours: 24,
        emergencyThresholds: {
          minHealthScore: 2.0,
          maxDrawdown: 0.2
        }
      },
      positions: [
        { poolAddress: 'pool1', tokenA: 'SOL', tokenB: 'USDC', value: 100 }
      ]
    });
    
    mockFundsManager.getAgentFunds.mockResolvedValue({
      totalValueUsd: 1000,
      totalValueSol: 1000,
      availableSol: 500,
      positions: [
        { poolAddress: 'pool1', tokenA: 'SOL', tokenB: 'USDC', value: 500 },
        { poolAddress: 'pool2', tokenA: 'SOL', tokenB: 'USDT', value: 500 }
      ]
    });
    
    mockRiskController.assessRisk.mockResolvedValue({
      riskLevel: 'low',
      recommendation: 'proceed'
    });
    
    mockTransactionExecutor.executeTransaction.mockResolvedValue({
      success: true,
      txId: 'tx123'
    });
  });
  
  afterEach(() => {
    // Stop metrics collection
    metrics.stopMetricsReporting();
    
    // Stop task manager
    taskManager.stop();
    
    // Clear mocks
    jest.clearAllMocks();
  });
  
  test('should register agents and update metrics', async () => {
    const agentConfig: AgentConfig = {
      name: 'Agent 1',
      walletAddress: 'wallet1',
      maxPositions: 5,
      minSolBalance: 1,
      targetHealthScore: 4.0,
      riskTolerance: 'medium',
      healthCheckIntervalMinutes: 5,
      marketChangeCheckIntervalMinutes: 15,
      optimizationIntervalHours: 24,
      emergencyThresholds: {
        minHealthScore: 2.0,
        maxDrawdown: 0.2
      }
    };

    // Register agent
    await cruiseModule.registerAgent('agent1', agentConfig);
    
    // Register agent with metrics collector
    metrics.registerAgent('agent1');
    
    // Verify agent registration
    expect(cruiseModule.getRegisteredAgentCount()).toBe(1);
    
    // Verify agent metrics in collector
    const agentMetrics = metrics.getAgentMetrics('agent1');
    expect(agentMetrics).toBeDefined();
  });
  
  test('should record health check metrics', async () => {
    const agentConfig: AgentConfig = {
      name: 'Agent 1',
      walletAddress: 'wallet1',
      maxPositions: 5,
      minSolBalance: 1,
      targetHealthScore: 4.0,
      riskTolerance: 'medium',
      healthCheckIntervalMinutes: 5,
      marketChangeCheckIntervalMinutes: 15,
      optimizationIntervalHours: 24,
      emergencyThresholds: {
        minHealthScore: 2.0,
        maxDrawdown: 0.2
      }
    };

    // Register agent
    await cruiseModule.registerAgent('agent1', agentConfig);
    
    // Register agent with metrics collector
    metrics.registerAgent('agent1');
    
    // Perform health check
    await cruiseModule.performHealthCheck('agent1');
    
    // Record health check metrics
    metrics.recordHealthCheck('agent1', true, 100);
    
    // Verify health check metrics
    const agentMetrics = metrics.getAgentMetrics('agent1');
    if (agentMetrics) {
      expect(agentMetrics.healthChecks).toBeDefined();
      expect(agentMetrics.healthChecks.totalChecks).toBe(1);
      expect(agentMetrics.healthChecks.successfulChecks).toBe(1);
    }
  });
  
  test('should record optimization metrics', async () => {
    const agentConfig: AgentConfig = {
      name: 'Agent 1',
      walletAddress: 'wallet1',
      maxPositions: 5,
      minSolBalance: 1,
      targetHealthScore: 4.0,
      riskTolerance: 'medium',
      healthCheckIntervalMinutes: 5,
      marketChangeCheckIntervalMinutes: 15,
      optimizationIntervalHours: 24,
      emergencyThresholds: {
        minHealthScore: 2.0,
        maxDrawdown: 0.2
      }
    };

    // Register agent
    await cruiseModule.registerAgent('agent1', agentConfig);
    
    // Register agent with metrics collector
    metrics.registerAgent('agent1');
    
    // Perform position optimization
    await cruiseModule.optimizePositions('agent1');
    
    // Record optimization metrics
    metrics.recordOptimization(
      'agent1',
      true,
      200,
      1,
      1,
      0.5,
      2,
      1000
    );
    
    // Verify optimization metrics
    const agentMetrics = metrics.getAgentMetrics('agent1');
    if (agentMetrics) {
      expect(agentMetrics.optimizations).toBeDefined();
      expect(agentMetrics.optimizations.totalOptimizations).toBe(1);
      expect(agentMetrics.optimizations.successfulOptimizations).toBe(1);
    }
  });
  
  test('should update task metrics', async () => {
    // Start task manager
    taskManager.start();
    
    // Schedule tasks
    taskManager.scheduleTask(
      'task1',
      async () => { console.log('Task 1 executed'); },
      1000,
      ['agent1']
    );
    
    taskManager.scheduleRecurringTask(
      'task2',
      async () => { console.log('Task 2 executed'); },
      5000,
      0,
      ['agent1']
    );
    
    // Update task metrics
    metrics.updateTaskMetrics(
      taskManager.getTaskCount(),
      taskManager.getEnabledTaskCount()
    );
    
    // Verify task metrics
    const metricsSummary = metrics.getMetricsSummary();
    expect(metricsSummary.tasks.total).toBe(2);
    expect(metricsSummary.tasks.enabled).toBe(2);
  });
  
  test('should generate metrics summary', async () => {
    const agentConfig: AgentConfig = {
      name: 'Agent 1',
      walletAddress: 'wallet1',
      maxPositions: 5,
      minSolBalance: 1,
      targetHealthScore: 4.0,
      riskTolerance: 'medium',
      healthCheckIntervalMinutes: 5,
      marketChangeCheckIntervalMinutes: 15,
      optimizationIntervalHours: 24,
      emergencyThresholds: {
        minHealthScore: 2.0,
        maxDrawdown: 0.2
      }
    };

    // Register agents
    await cruiseModule.registerAgent('agent1', agentConfig);
    await cruiseModule.registerAgent('agent2', agentConfig);
    
    // Register agents with metrics collector
    metrics.registerAgent('agent1');
    metrics.registerAgent('agent2');
    
    // Record health check metrics
    metrics.recordHealthCheck('agent1', true, 100);
    metrics.recordHealthCheck('agent2', false, 150);
    
    // Record optimization metrics
    metrics.recordOptimization('agent1', true, 200, 1, 1, 0.5, 2, 1000);
    
    // Update task metrics
    metrics.updateTaskMetrics(2, 2);
    
    // Get metrics summary
    const summary = metrics.getMetricsSummary();
    
    // Verify summary content
    expect(summary).toBeDefined();
    expect(summary.registeredAgents).toBe(2);
    expect(summary.healthChecks.total).toBe(2);
    expect(summary.healthChecks.successful).toBe(1);
    expect(summary.optimizations.total).toBe(1);
    expect(summary.optimizations.successful).toBe(1);
    expect(summary.tasks.total).toBe(2);
  });
}); 