import { AgentStateMachine } from '../src/core/AgentStateMachine';
import { AgentState, AgentEvent, AgentConfig } from '../src/types';

describe('AgentStateMachine', () => {
  let stateMachine: AgentStateMachine;
  const mockConfig: AgentConfig = {
    name: 'TestAgent',
    walletAddress: 'test123',
    riskLevel: 'medium',
    maxPositions: 5,
    minSolBalance: 0.1,
    emergencyThreshold: 1.5
  };

  beforeEach(() => {
    stateMachine = new AgentStateMachine(mockConfig);
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
    it('should transition from INITIALIZING to RUNNING on START event', () => {
      stateMachine.handleEvent(AgentEvent.START);
      expect(stateMachine.getStatus().state).toBe(AgentState.RUNNING);
    });

    it('should transition to STOPPED on STOP event', () => {
      stateMachine.handleEvent(AgentEvent.START);
      stateMachine.handleEvent(AgentEvent.STOP);
      expect(stateMachine.getStatus().state).toBe(AgentState.STOPPED);
    });

    it('should transition to WAITING when funds are low', () => {
      stateMachine.handleEvent(AgentEvent.START);
      stateMachine.updateFunds({
        totalValueSol: 1.0,
        availableSol: 0.05,
        positions: []
      });
      expect(stateMachine.getStatus().state).toBe(AgentState.WAITING);
    });

    it('should transition back to RUNNING when funds become sufficient', () => {
      stateMachine.handleEvent(AgentEvent.START);
      stateMachine.updateFunds({
        totalValueSol: 1.0,
        availableSol: 0.05,
        positions: []
      });
      stateMachine.updateFunds({
        totalValueSol: 2.0,
        availableSol: 0.2,
        positions: []
      });
      expect(stateMachine.getStatus().state).toBe(AgentState.RUNNING);
    });
  });

  describe('Risk Assessment', () => {
    beforeEach(() => {
      stateMachine.handleEvent(AgentEvent.START);
    });

    it('should transition to PARTIAL_REDUCING on medium risk', () => {
      stateMachine.handleRiskAssessment({
        healthScore: 2.2,
        riskLevel: 'medium',
        triggers: []
      });
      expect(stateMachine.getStatus().state).toBe(AgentState.PARTIAL_REDUCING);
    });

    it('should transition to EMERGENCY_EXIT on high risk', () => {
      stateMachine.handleRiskAssessment({
        healthScore: 1.4,
        riskLevel: 'high',
        triggers: []
      });
      expect(stateMachine.getStatus().state).toBe(AgentState.EMERGENCY_EXIT);
    });

    it('should return to RUNNING when risk is resolved', () => {
      stateMachine.handleRiskAssessment({
        healthScore: 2.2,
        riskLevel: 'medium',
        triggers: []
      });
      stateMachine.handleRiskAssessment({
        healthScore: 4.0,
        riskLevel: 'low',
        triggers: []
      });
      expect(stateMachine.getStatus().state).toBe(AgentState.RUNNING);
    });
  });

  describe('Error Handling', () => {
    it('should set and clear error state', () => {
      const errorMessage = 'Test error';
      stateMachine.setError(errorMessage);
      expect(stateMachine.getStatus().lastError).toBe(errorMessage);
      
      stateMachine.clearError();
      expect(stateMachine.getStatus().lastError).toBeUndefined();
    });
  });
}); 