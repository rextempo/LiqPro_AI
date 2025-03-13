import { AgentStateMachine } from '../src/core/AgentStateMachine';
import { AgentState, AgentEvent, AgentConfig } from '../src/types';
import { ConsoleLogger, LogLevel } from '../src/utils/logger';

describe('AgentStateMachine', () => {
  let stateMachine: AgentStateMachine;
  const logger = new ConsoleLogger(LogLevel.DEBUG);
  
  const mockConfig: AgentConfig = {
    name: 'TestAgent',
    walletAddress: 'test_wallet_address',
    riskLevel: 'medium',
    maxPositions: 5,
    minSolBalance: 0.1,
    emergencyThreshold: 1.5
  };
  
  beforeEach(() => {
    stateMachine = new AgentStateMachine(mockConfig, logger);
  });

  describe('Initial State', () => {
    it('should start in INITIALIZING state', () => {
      expect(stateMachine.getStatus().state).toBe(AgentState.INITIALIZING);
    });

    it('should have correct initial config', () => {
      const status = stateMachine.getStatus();
      expect(status.config).toEqual(mockConfig);
    });
  });

  describe('State Transitions', () => {
    it('should initialize in INITIALIZING state', () => {
      expect(stateMachine.getStatus().state).toBe(AgentState.INITIALIZING);
    });
    
    it('should transition to RUNNING on START event', () => {
      stateMachine.handleEvent(AgentEvent.START);
      expect(stateMachine.getStatus().state).toBe(AgentState.RUNNING);
    });
    
    it('should transition to STOPPED on STOP event', () => {
      stateMachine.handleEvent(AgentEvent.START);
      stateMachine.handleEvent(AgentEvent.STOP);
      expect(stateMachine.getStatus().state).toBe(AgentState.STOPPED);
    });
    
    it('should transition to WAITING on FUNDS_LOW event', () => {
      stateMachine.handleEvent(AgentEvent.START);
      stateMachine.updateFunds({
        availableSol: 0.05,
        totalValueSol: 1,
        positions: [],
        lastUpdate: Date.now()
      });
      expect(stateMachine.getStatus().state).toBe(AgentState.WAITING);
    });
    
    it('should transition back to RUNNING on FUNDS_SUFFICIENT event', () => {
      stateMachine.handleEvent(AgentEvent.START);
      stateMachine.updateFunds({
        availableSol: 0.05,
        totalValueSol: 1,
        positions: [],
        lastUpdate: Date.now()
      });
      expect(stateMachine.getStatus().state).toBe(AgentState.WAITING);
      
      stateMachine.updateFunds({
        availableSol: 0.2,
        totalValueSol: 2,
        positions: [],
        lastUpdate: Date.now()
      });
      expect(stateMachine.getStatus().state).toBe(AgentState.RUNNING);
    });
  });

  describe('Risk Assessment', () => {
    it('should transition to PARTIAL_REDUCING on medium risk', () => {
      stateMachine.handleEvent(AgentEvent.START);
      stateMachine.handleEvent(AgentEvent.RISK_MEDIUM);
      expect(stateMachine.getStatus().state).toBe(AgentState.PARTIAL_REDUCING);
    });
    
    it('should transition to EMERGENCY_EXIT on high risk', () => {
      stateMachine.handleEvent(AgentEvent.START);
      stateMachine.handleEvent(AgentEvent.RISK_HIGH);
      expect(stateMachine.getStatus().state).toBe(AgentState.EMERGENCY_EXIT);
    });
    
    it('should return to RUNNING when risk is resolved', () => {
      stateMachine.handleEvent(AgentEvent.START);
      stateMachine.handleEvent(AgentEvent.RISK_MEDIUM);
      expect(stateMachine.getStatus().state).toBe(AgentState.PARTIAL_REDUCING);
      
      stateMachine.handleEvent(AgentEvent.RISK_RESOLVED);
      expect(stateMachine.getStatus().state).toBe(AgentState.RUNNING);
    });
  });

  describe('Error Handling', () => {
    it('should set and clear error state', () => {
      stateMachine.setError('Test error');
      expect(stateMachine.getStatus().lastError).toBe('Test error');
      
      stateMachine.clearError();
      expect(stateMachine.getStatus().lastError).toBeUndefined();
    });
  });
}); 