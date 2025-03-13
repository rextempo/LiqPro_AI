"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StrategyService = void 0;
/**
 * Strategy Service
 * Handles communication with the strategy service and data processing
 */
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
class StrategyService {
    constructor() {
        this.baseUrl = config_1.config.signalServiceUrl;
        logger_1.logger.info('StrategyService initialized', { baseUrl: this.baseUrl });
    }
    /**
     * Get strategies with optional filtering
     */
    async getStrategies(filter) {
        try {
            logger_1.logger.info('Fetching strategies with filter', { filter });
            const response = await axios_1.default.get(`${this.baseUrl}/strategies`, {
                params: {
                    type: filter.type,
                    isActive: filter.isActive,
                    limit: filter.limit,
                    offset: filter.offset
                }
            });
            return response.data.data;
        }
        catch (error) {
            logger_1.logger.error('Error fetching strategies', {
                error: error.message,
                filter
            });
            throw error;
        }
    }
    /**
     * Get a strategy by ID
     */
    async getStrategyById(id) {
        try {
            logger_1.logger.info('Fetching strategy by ID', { id });
            const response = await axios_1.default.get(`${this.baseUrl}/strategies/${id}`);
            return response.data.data;
        }
        catch (error) {
            // If 404, return null instead of throwing
            if (axios_1.default.isAxiosError(error) && error.response?.status === 404) {
                logger_1.logger.warn('Strategy not found', { id });
                return null;
            }
            logger_1.logger.error('Error fetching strategy by ID', {
                id,
                error: error.message
            });
            throw error;
        }
    }
    /**
     * Create a new strategy
     */
    async createStrategy(strategyData) {
        try {
            logger_1.logger.info('Creating new strategy', { strategyData });
            const response = await axios_1.default.post(`${this.baseUrl}/strategies`, strategyData);
            return response.data.data;
        }
        catch (error) {
            logger_1.logger.error('Error creating strategy', {
                error: error.message,
                strategyData
            });
            throw error;
        }
    }
    /**
     * Update an existing strategy
     */
    async updateStrategy(id, strategyData) {
        try {
            logger_1.logger.info('Updating strategy', { id, strategyData });
            const response = await axios_1.default.put(`${this.baseUrl}/strategies/${id}`, strategyData);
            return response.data.data;
        }
        catch (error) {
            logger_1.logger.error('Error updating strategy', {
                id,
                error: error.message,
                strategyData
            });
            throw error;
        }
    }
    /**
     * Delete a strategy
     */
    async deleteStrategy(id) {
        try {
            logger_1.logger.info('Deleting strategy', { id });
            await axios_1.default.delete(`${this.baseUrl}/strategies/${id}`);
        }
        catch (error) {
            logger_1.logger.error('Error deleting strategy', {
                id,
                error: error.message
            });
            throw error;
        }
    }
    /**
     * Evaluate a strategy's performance
     */
    async evaluateStrategy(id, options) {
        try {
            logger_1.logger.info('Evaluating strategy', { id, options });
            const response = await axios_1.default.post(`${this.baseUrl}/strategies/${id}/evaluate`, options);
            return response.data.data;
        }
        catch (error) {
            logger_1.logger.error('Error evaluating strategy', {
                id,
                options,
                error: error.message
            });
            throw error;
        }
    }
    /**
     * Optimize a strategy's parameters
     */
    async optimizeStrategy(id, options) {
        try {
            logger_1.logger.info('Optimizing strategy', { id, options });
            const response = await axios_1.default.post(`${this.baseUrl}/strategies/${id}/optimize`, options);
            return response.data.data;
        }
        catch (error) {
            logger_1.logger.error('Error optimizing strategy', {
                id,
                options,
                error: error.message
            });
            throw error;
        }
    }
}
exports.StrategyService = StrategyService;
//# sourceMappingURL=strategy-service.js.map