import { TransactionExecutor } from '../core/TransactionExecutor';
import { FundsManager } from '../core/FundsManager';
import { RiskController } from '../core/RiskController';
import { AgentStateMachine } from '../core/AgentStateMachine';
/**
 * Cruise Service
 * Manages the lifecycle of the cruise module and provides API access to its functionality
 */
export declare class CruiseService {
    private transactionExecutor;
    private fundsManager;
    private riskController;
    private static instance;
    private logger;
    private cruiseModule;
    private agentStateMachines;
    private isInitialized;
    private constructor();
    /**
     * Gets the singleton instance
     */
    static getInstance(transactionExecutor: TransactionExecutor, fundsManager: FundsManager, riskController: RiskController): CruiseService;
    /**
     * Starts the Cruise Service
     */
    start(): Promise<void>;
    /**
     * Stops the Cruise Service
     */
    stop(): Promise<void>;
    /**
     * Registers an agent with the cruise module
     */
    registerAgent(agentId: string, stateMachine: AgentStateMachine): void;
    /**
     * Unregisters an agent from the cruise module
     */
    unregisterAgent(agentId: string): void;
    /**
     * Gets the status of the cruise service
     */
    getStatus(): {
        isRunning: boolean;
        agentCount: number;
    };
    /**
     * Triggers an immediate health check for a specific agent
     */
    triggerHealthCheck(agentId: string): Promise<boolean>;
    /**
     * Triggers an immediate position optimization for a specific agent
     */
    triggerOptimization(agentId: string): Promise<boolean>;
}
