"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CruiseService = void 0;
const logger_1 = require("../utils/logger");
const CruiseModule_1 = require("../core/cruise/CruiseModule");
const config_1 = require("../config");
/**
 * Cruise Service
 * Manages the lifecycle of the cruise module and provides API access to its functionality
 */
class CruiseService {
    constructor(transactionExecutor, fundsManager, riskController) {
        this.transactionExecutor = transactionExecutor;
        this.fundsManager = fundsManager;
        this.riskController = riskController;
        this.agentStateMachines = new Map();
        this.isInitialized = false;
        this.logger = new logger_1.Logger({ module: 'CruiseService' });
        // Initialize the cruise module
        this.cruiseModule = new CruiseModule_1.CruiseModule(this.logger, this.transactionExecutor, this.fundsManager, this.riskController, config_1.config.scoringServiceUrl);
        this.logger.info('Cruise Service initialized');
    }
    /**
     * Gets the singleton instance
     */
    static getInstance(transactionExecutor, fundsManager, riskController) {
        if (!CruiseService.instance) {
            CruiseService.instance = new CruiseService(transactionExecutor, fundsManager, riskController);
        }
        return CruiseService.instance;
    }
    /**
     * Starts the Cruise Service
     */
    async start() {
        if (this.isInitialized) {
            this.logger.warn('Cruise Service already started');
            return;
        }
        this.logger.info('Starting Cruise Service');
        try {
            await this.cruiseModule.start();
            this.isInitialized = true;
            this.logger.info('Cruise Service started successfully');
        }
        catch (error) {
            this.logger.error('Failed to start Cruise Service: ' + (error instanceof Error ? error.message : String(error)));
            throw error;
        }
    }
    /**
     * Stops the Cruise Service
     */
    async stop() {
        if (!this.isInitialized) {
            this.logger.warn('Cruise Service not running');
            return;
        }
        this.logger.info('Stopping Cruise Service');
        try {
            await this.cruiseModule.stop();
            this.isInitialized = false;
            this.logger.info('Cruise Service stopped successfully');
        }
        catch (error) {
            this.logger.error('Failed to stop Cruise Service: ' + (error instanceof Error ? error.message : String(error)));
            throw error;
        }
    }
    /**
     * Registers an agent with the cruise module
     */
    registerAgent(agentId, stateMachine) {
        this.logger.info({ agentId }, 'Registering agent with Cruise Service');
        // Store the state machine reference
        this.agentStateMachines.set(agentId, stateMachine);
        // Register with cruise module
        this.cruiseModule.registerAgent(agentId, stateMachine);
    }
    /**
     * Unregisters an agent from the cruise module
     */
    unregisterAgent(agentId) {
        this.logger.info({ agentId }, 'Unregistering agent from Cruise Service');
        // Remove from internal map
        this.agentStateMachines.delete(agentId);
        // Unregister from cruise module
        this.cruiseModule.unregisterAgent(agentId);
    }
    /**
     * Gets the status of the cruise service
     */
    getStatus() {
        return {
            isRunning: this.isInitialized,
            agentCount: this.agentStateMachines.size
        };
    }
    /**
     * Triggers an immediate health check for a specific agent
     */
    async triggerHealthCheck(agentId) {
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
            const cruiseModuleAny = this.cruiseModule;
            if (typeof cruiseModuleAny.performHealthCheck === 'function') {
                await cruiseModuleAny.performHealthCheck(agentId);
                return true;
            }
            else {
                this.logger.error({ agentId }, 'Cannot trigger health check - Method not available');
                return false;
            }
        }
        catch (error) {
            this.logger.error({ agentId, error: error instanceof Error ? error.message : String(error) }, 'Failed to trigger health check');
            return false;
        }
    }
    /**
     * Triggers an immediate position optimization for a specific agent
     */
    async triggerOptimization(agentId) {
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
            const cruiseModuleAny = this.cruiseModule;
            if (typeof cruiseModuleAny.optimizePositions === 'function') {
                await cruiseModuleAny.optimizePositions(agentId);
                return true;
            }
            else {
                this.logger.error({ agentId }, 'Cannot trigger optimization - Method not available');
                return false;
            }
        }
        catch (error) {
            this.logger.error({ agentId, error: error instanceof Error ? error.message : String(error) }, 'Failed to trigger position optimization');
            return false;
        }
    }
}
exports.CruiseService = CruiseService;
//# sourceMappingURL=CruiseService.js.map