import { Logger } from '../src/utils/logger';
import { AgentConfig, AgentState, PoolRecommendation, FundsStatus, RiskAssessment } from '../src/types';
import { CruiseModule } from '../src/core/cruise/CruiseModule';
import { ScheduledTaskManager } from '../src/core/cruise/ScheduledTaskManager';
import { PositionOptimizer } from '../src/core/cruise/PositionOptimizer';
import { CruiseMetrics } from '../src/core/cruise/CruiseMetrics';
import axios from 'axios';

// Mock external dependencies
jest.mock('axios');
jest.mock('../src/utils/logger');
jest.mock('../src/core/TransactionExecutor');
jest.mock('../src/core/FundsManager');
jest.mock('../src/core/RiskController');
jest.mock('../src/core/AgentStateMachine');

// Mock implementation for axios
const mockAxios = axios as jest.Mocked<typeof axios>;

// Mock interfaces for testing
interface AgentStateMachine {
  getActiveAgents(): Promise<Array<{id: string, config: AgentConfig}>>;
  getAgentState(agentId: string): Promise<{state: AgentState, config: AgentConfig}>;
}

interface TransactionExecutor {
  executeTransaction(transaction: any): Promise<{success: boolean, txHash: string}>;
}

interface FundsManager {
  getAgentFunds(agentId: string): Promise<FundsStatus>;
}

interface RiskController {
  assessRisk(agentId: string): Promise<RiskAssessment>;
}

interface SignalService {
  getT1Pools(): Promise<PoolRecommendation[]>;
}

describe('Cruise Module', () => {
  let logger: jest.Mocked<Logger>;
  let transactionExecutor: any;
  let fundsManager: any;
  let riskController: any;
  let stateMachine: any;
  let cruiseModule: CruiseModule;
  let mockSignalService: any;
  let mockPositionOptimizer: any;
  let mockTaskManager: any;
  let mockMetrics: any;
  
  const AGENT_ID = 'test-agent';
  const SCORING_SERVICE_URL = 'http://localhost:3000';
  
  const mockConfig: AgentConfig = {
    name: 'Test Agent',
    walletAddress: 'test-wallet',
    maxPositions: 5,
    minSolBalance: 0.1,
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
  
  const mockRiskAssessment: RiskAssessment = {
    agentId: AGENT_ID,
    timestamp: Date.now(),
    riskLevel: 'low',
    healthScore: 4.5,
    warnings: [],
    recommendations: []
  };
  
  beforeEach(() => {
    // Reset and recreate mocks
    jest.clearAllMocks();
    
    logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      child: jest.fn().mockReturnThis()
    } as unknown as jest.Mocked<Logger>;
    
    transactionExecutor = {
      executeTransaction: jest.fn().mockResolvedValue({ success: true, txHash: 'txhash123' })
    };
    
    fundsManager = {};
    
    riskController = {
      assessRisk: jest.fn().mockResolvedValue(mockRiskAssessment)
    };
    
    // Create a fresh mock of AgentStateMachine for each test
    stateMachine = {
      getActiveAgents: jest.fn().mockResolvedValue([{ id: AGENT_ID, config: mockConfig }]),
      getAgentState: jest.fn().mockResolvedValue({ state: AgentState.RUNNING, config: mockConfig })
    };

    mockSignalService = {
      getT1Pools: jest.fn().mockResolvedValue([])
    };

    mockPositionOptimizer = {
      optimizePositions: jest.fn().mockResolvedValue(true)
    };

    mockTaskManager = {
      scheduleTask: jest.fn(),
      cancelTask: jest.fn()
    };

    mockMetrics = {
      recordHealthCheck: jest.fn(),
      recordOptimization: jest.fn()
    };
    
    // Mock axios return value
    mockAxios.get.mockResolvedValue({
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {
        url: `${SCORING_SERVICE_URL}/api/v1/signal`
      },
      data: {
        action: 'maintain',
        healthScore: 4.2,
        adjustmentPercentage: 0.0,
        targetBins: [
          { binId: 100, percentage: 0.5 },
          { binId: 101, percentage: 0.5 }
        ]
      }
    });
    
    // Create the Cruise Module instance
    cruiseModule = new CruiseModule(
      logger,
      stateMachine,
      transactionExecutor,
      fundsManager,
      riskController,
      mockSignalService,
      mockPositionOptimizer,
      mockTaskManager,
      mockMetrics
    );
  });
  
  test('should initialize correctly', () => {
    expect(cruiseModule).toBeDefined();
    expect(logger.info).toHaveBeenCalledWith('Cruise Module initialized');
  });
  
  test('should start and stop correctly', async () => {
    await cruiseModule.start();
    expect(logger.info).toHaveBeenCalledWith('Cruise Module started successfully');
    
    await cruiseModule.start(); // Try starting again
    expect(logger.warn).toHaveBeenCalledWith('Cruise module is already running');
    
    await cruiseModule.stop();
    expect(logger.info).toHaveBeenCalledWith('Cruise Module stopped successfully');
    
    await cruiseModule.stop(); // Try stopping again
    expect(logger.warn).toHaveBeenCalledWith('Cruise module is not running');
  });
  
  test('should register and unregister agents', () => {
    cruiseModule.registerAgent(AGENT_ID, mockConfig);
    expect(logger.info).toHaveBeenCalledWith({ agentId: AGENT_ID }, 'Agent registered with cruise module');
    expect(stateMachine.addStateChangeListener).toHaveBeenCalled();
    
    // Try registering the same agent again
    cruiseModule.registerAgent(AGENT_ID, mockConfig);
    expect(logger.warn).toHaveBeenCalledWith({ agentId: AGENT_ID }, 'Agent already registered with cruise module');
    
    cruiseModule.unregisterAgent(AGENT_ID);
    expect(logger.info).toHaveBeenCalledWith({ agentId: AGENT_ID }, 'Agent unregistered from cruise module');
    
    // Try unregistering an agent that doesn't exist
    cruiseModule.unregisterAgent('non-existent-agent');
    expect(logger.warn).toHaveBeenCalledWith({ agentId: 'non-existent-agent' }, 'Agent not registered with cruise module');
  });
  
  test('should call health check and handle healthy positions', async () => {
    // Set up a healthy risk assessment
    riskController.assessRisk = jest.fn().mockResolvedValue({
      healthScore: 4.0,
      riskLevel: 'low',
      triggers: []
    });
    
    cruiseModule.registerAgent(AGENT_ID, mockConfig);
    
    // Access private method using type assertion
    const performHealthCheck = (cruiseModule as any).performHealthCheck.bind(cruiseModule);
    await performHealthCheck(AGENT_ID);
    
    expect(riskController.assessRisk).toHaveBeenCalledWith(AGENT_ID);
    expect(logger.info).toHaveBeenCalledWith(
      { agentId: AGENT_ID, healthScore: 4.0, riskLevel: 'low' },
      'Position health check completed'
    );
    
    // No additional action should be scheduled for healthy positions
    expect(logger.info).not.toHaveBeenCalledWith(
      expect.objectContaining({ healthScore: expect.any(Number) }),
      'Scheduling position adjustment due to below-optimal health score'
    );
  });
  
  test('should call health check and handle unhealthy positions', async () => {
    // Set up an unhealthy risk assessment that requires adjustment
    riskController.assessRisk = jest.fn().mockResolvedValue({
      healthScore: 2.5,
      riskLevel: 'medium',
      triggers: [{ type: 'price_volatility', value: 0.15, threshold: 0.1 }]
    });
    
    cruiseModule.registerAgent(AGENT_ID, mockConfig);
    
    // Access private method using type assertion
    const performHealthCheck = (cruiseModule as any).performHealthCheck.bind(cruiseModule);
    await performHealthCheck(AGENT_ID);
    
    expect(riskController.assessRisk).toHaveBeenCalledWith(AGENT_ID);
    expect(logger.info).toHaveBeenCalledWith(
      { agentId: AGENT_ID, healthScore: 2.5, riskLevel: 'medium' },
      'Position health check completed'
    );
    
    // Should schedule adjustment for unhealthy positions
    expect(logger.info).toHaveBeenCalledWith(
      { agentId: AGENT_ID, healthScore: 2.5 },
      'Scheduling position adjustment due to below-optimal health score'
    );
  });
  
  test('should handle agent state changes correctly', () => {
    cruiseModule.registerAgent(AGENT_ID, mockConfig);
    
    // Access private method using type assertion
    const handleAgentStateChange = (cruiseModule as any).handleAgentStateChange.bind(cruiseModule);
    
    // Test RUNNING state
    handleAgentStateChange(AGENT_ID, AgentState.RUNNING);
    expect(logger.info).toHaveBeenCalledWith(
      { agentId: AGENT_ID, newState: AgentState.RUNNING },
      'Agent state changed'
    );
    
    // Test WAITING state
    handleAgentStateChange(AGENT_ID, AgentState.WAITING);
    expect(logger.info).toHaveBeenCalledWith(
      { agentId: AGENT_ID, newState: AgentState.WAITING },
      'Agent state changed'
    );
    
    // Test STOPPED state
    handleAgentStateChange(AGENT_ID, AgentState.STOPPED);
    expect(logger.info).toHaveBeenCalledWith(
      { agentId: AGENT_ID, newState: AgentState.STOPPED },
      'Agent state changed'
    );
  });
  
  test('should handle API errors gracefully', async () => {
    // Make API call fail
    mockAxios.get.mockRejectedValue(new Error('API unavailable'));
    
    cruiseModule.registerAgent(AGENT_ID, mockConfig);
    
    // Access private method using type assertion
    const checkForPositionAdjustments = (cruiseModule as any).checkForPositionAdjustments.bind(cruiseModule);
    await checkForPositionAdjustments(AGENT_ID);
    
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to fetch pool recommendations'),
      expect.any(Object)
    );
  });
}); 