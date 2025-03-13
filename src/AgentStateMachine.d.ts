import { AgentState, AgentEvent, AgentConfig, AgentStatus, FundsStatus, RiskAssessment } from '../types';
import { Logger } from '../utils/logger';
interface StatePersistence {
    saveState(agentId: string, state: AgentStatus): Promise<void>;
    loadState(agentId: string): Promise<AgentStatus | null>;
}
export declare class AgentStateMachine {
    private state;
    private config;
    private funds;
    private lastUpdate;
    private lastError?;
    private persistence;
    private logger;
    private stateChangeListeners;
    private stateHistory;
    private riskHistory;
    private mediumRiskStartTime?;
    private highRiskStartTime?;
    private stateStartTime;
    private recoveryAttempts;
    private readonly MAX_RECOVERY_ATTEMPTS;
    private readonly STATE_TIMEOUT_MS;
    constructor(config: AgentConfig, logger: Logger, persistence?: StatePersistence);
    private isValidTransition;
    private checkStateTimeout;
    private attemptStateRecovery;
    initialize(): Promise<void>;
    getStatus(): AgentStatus;
    handleEvent(event: AgentEvent): boolean;
    updateFunds(funds: FundsStatus): void;
    handleRiskAssessment(assessment: RiskAssessment): void;
    setError(error: string): void;
    clearError(): void;
    addStateChangeListener(listener: (status: AgentStatus) => void): void;
    removeStateChangeListener(listener: (status: AgentStatus) => void): void;
    getStateHistory(): {
        state: AgentState;
        timestamp: number;
    }[];
    getRiskHistory(): {
        assessment: RiskAssessment;
        timestamp: number;
    }[];
    private persistState;
    private recordStateChange;
    private notifyStateChangeListeners;
    periodicCheck(): void;
    getCurrentStateDuration(): number;
    getRecoveryAttempts(): number;
    resetRecoveryAttempts(): void;
}
export {};
