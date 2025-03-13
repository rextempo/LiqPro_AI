import { Logger } from '../utils/logger';
import { CruiseModule } from '../core/cruise/CruiseModule';
import { TransactionExecutor } from '../core/TransactionExecutor';
import { FundsManager } from '../core/FundsManager';
import { RiskController } from '../core/RiskController';
import { AgentStateMachine } from '../core/AgentStateMachine';
import { config } from '../config';

/**
 * Cruise Service
 * Manages the lifecycle of the cruise module and provides API access to its functionality
 */
export class CruiseService {
  private static instance: CruiseService;
  private logger: Logger;
  private cruiseModule: CruiseModule;
  private agentStateMachines: Map<string, AgentStateMachine> = new Map();
  private isInitialized: boolean = false;
  
  private constructor(
    private transactionExecutor: TransactionExecutor,
    private fundsManager: FundsManager,
    private riskController: RiskController
  ) {
    this.logger = new Logger({ module: 'CruiseService' });
    
    // Initialize the cruise module
    this.cruiseModule = new CruiseModule(
      this.logger,
      this.transactionExecutor,
      this.fundsManager,
      this.riskController,
      config.scoringServiceUrl
    );
    
    this.logger.info('Cruise Service initialized');
  }
  
  /**
   * Gets the singleton instance
   */
  public static getInstance(
    transactionExecutor: TransactionExecutor,
    fundsManager: FundsManager,
    riskController: RiskController
  ): CruiseService {
    if (!CruiseService.instance) {
      CruiseService.instance = new CruiseService(
        transactionExecutor,
        fundsManager,
        riskController
      );
    }
    return CruiseService.instance;
  }
  
  /**
   * Starts the Cruise Service
   */
  public async start(): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn('Cruise Service already started');
      return;
    }
    
    this.logger.info('Starting Cruise Service');
    
    try {
      await this.cruiseModule.start();
      this.isInitialized = true;
      this.logger.info('Cruise Service started successfully');
    } catch (error) {
      this.logger.error(
        'Failed to start Cruise Service: ' + (error instanceof Error ? error.message : String(error))
      );
      throw error;
    }
  }
  
  /**
   * Stops the Cruise Service
   */
  public async stop(): Promise<void> {
    if (!this.isInitialized) {
      this.logger.warn('Cruise Service not running');
      return;
    }
    
    this.logger.info('Stopping Cruise Service');
    
    try {
      await this.cruiseModule.stop();
      this.isInitialized = false;
      this.logger.info('Cruise Service stopped successfully');
    } catch (error) {
      this.logger.error(
        'Failed to stop Cruise Service: ' + (error instanceof Error ? error.message : String(error))
      );
      throw error;
    }
  }
  
  /**
   * Registers an agent with the cruise module
   */
  public registerAgent(agentId: string, stateMachine: AgentStateMachine): void {
    this.logger.info({ agentId }, 'Registering agent with Cruise Service');
    
    // Store the state machine reference
    this.agentStateMachines.set(agentId, stateMachine);
    
    // Register with cruise module
    this.cruiseModule.registerAgent(agentId, stateMachine);
  }
  
  /**
   * Unregisters an agent from the cruise module
   */
  public unregisterAgent(agentId: string): void {
    this.logger.info({ agentId }, 'Unregistering agent from Cruise Service');
    
    // Remove from internal map
    this.agentStateMachines.delete(agentId);
    
    // Unregister from cruise module
    this.cruiseModule.unregisterAgent(agentId);
  }
  
  /**
   * Gets the status of the cruise service
   */
  public getStatus(): {
    isRunning: boolean;
    agentCount: number;
  } {
    return {
      isRunning: this.isInitialized,
      agentCount: this.agentStateMachines.size
    };
  }
  
  /**
   * Triggers an immediate health check for a specific agent
   */
  public async triggerHealthCheck(agentId: string): Promise<boolean> {
    if (!this.isInitialized) {
      this.logger.warn({ agentId }, 'Cannot trigger health check - Cruise Service not running');
      return false;
    }
    
    if (!this.agentStateMachines.has(agentId)) {
      this.logger.warn({ agentId }, 'Cannot trigger health check - Agent not registered');
      return false;
    }
    
    this.logger.info({ agentId }, 'Manually triggering health check');
    
    try {
      // We need to access the private method, so this is a bit of a hack
      // In a real implementation, this could be refactored to expose a public method
      const cruiseModuleAny = this.cruiseModule as any;
      if (typeof cruiseModuleAny.performHealthCheck === 'function') {
        await cruiseModuleAny.performHealthCheck(agentId);
        return true;
      } else {
        this.logger.error({ agentId }, 'Cannot trigger health check - Method not available');
        return false;
      }
    } catch (error) {
      this.logger.error(
        { agentId, error: error instanceof Error ? error.message : String(error) },
        'Failed to trigger health check'
      );
      return false;
    }
  }
  
  /**
   * Triggers an immediate position optimization for a specific agent
   */
  public async triggerOptimization(agentId: string): Promise<boolean> {
    if (!this.isInitialized) {
      this.logger.warn({ agentId }, 'Cannot trigger optimization - Cruise Service not running');
      return false;
    }
    
    if (!this.agentStateMachines.has(agentId)) {
      this.logger.warn({ agentId }, 'Cannot trigger optimization - Agent not registered');
      return false;
    }
    
    this.logger.info({ agentId }, 'Manually triggering position optimization');
    
    try {
      // Similar hack as above
      const cruiseModuleAny = this.cruiseModule as any;
      if (typeof cruiseModuleAny.optimizePositions === 'function') {
        await cruiseModuleAny.optimizePositions(agentId);
        return true;
      } else {
        this.logger.error({ agentId }, 'Cannot trigger optimization - Method not available');
        return false;
      }
    } catch (error) {
      this.logger.error(
        { agentId, error: error instanceof Error ? error.message : String(error) },
        'Failed to trigger position optimization'
      );
      return false;
    }
  }
} 