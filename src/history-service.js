"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HistoryService = void 0;
/**
 * History Service
 * Handles communication with the data service for historical data
 */
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
class HistoryService {
    constructor() {
        this.baseUrl = config_1.config.dataServiceUrl;
        logger_1.logger.info('HistoryService initialized', { baseUrl: this.baseUrl });
    }
    /**
     * Get historical signals with filtering options
     */
    async getHistoricalSignals(filter) {
        try {
            logger_1.logger.info('Fetching historical signals with filter', { filter });
            const response = await axios_1.default.get(`${this.baseUrl}/history/signals`, {
                params: filter
            });
            return response.data.data;
        }
        catch (error) {
            logger_1.logger.error('Error fetching historical signals', {
                error: error.message,
                filter
            });
            throw error;
        }
    }
    /**
     * Get pool performance metrics
     */
    async getPoolPerformance(poolAddress, timeframe) {
        try {
            logger_1.logger.info('Fetching pool performance', { poolAddress, timeframe });
            const response = await axios_1.default.get(`${this.baseUrl}/history/performance/${poolAddress}`, {
                params: { timeframe }
            });
            return response.data.data;
        }
        catch (error) {
            // If 404, return null instead of throwing
            if (axios_1.default.isAxiosError(error) && error.response?.status === 404) {
                logger_1.logger.warn('Pool performance data not found', { poolAddress });
                return null;
            }
            logger_1.logger.error('Error fetching pool performance', {
                poolAddress,
                timeframe,
                error: error.message
            });
            throw error;
        }
    }
    /**
     * Get signal accuracy metrics
     */
    async getSignalAccuracy(options) {
        try {
            logger_1.logger.info('Fetching signal accuracy', { options });
            const response = await axios_1.default.get(`${this.baseUrl}/history/accuracy`, {
                params: options
            });
            return response.data.data;
        }
        catch (error) {
            logger_1.logger.error('Error fetching signal accuracy', {
                options,
                error: error.message
            });
            throw error;
        }
    }
    /**
     * Get market trends data
     */
    async getMarketTrends(options) {
        try {
            logger_1.logger.info('Fetching market trends', { options });
            const response = await axios_1.default.get(`${this.baseUrl}/history/trends`, {
                params: options
            });
            return response.data.data;
        }
        catch (error) {
            logger_1.logger.error('Error fetching market trends', {
                options,
                error: error.message
            });
            throw error;
        }
    }
    /**
     * Export historical data to a file
     */
    async exportData(options) {
        try {
            logger_1.logger.info('Exporting historical data', { options });
            const response = await axios_1.default.post(`${this.baseUrl}/history/export`, options, {
                responseType: 'text'
            });
            return response.data;
        }
        catch (error) {
            logger_1.logger.error('Error exporting historical data', {
                options,
                error: error.message
            });
            throw error;
        }
    }
    /**
     * Process and format historical data
     * This can be expanded to add additional processing or formatting
     */
    processHistoricalData(data) {
        // Add any processing logic here
        return data;
    }
}
exports.HistoryService = HistoryService;
//# sourceMappingURL=history-service.js.map