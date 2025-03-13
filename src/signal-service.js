"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignalService = void 0;
/**
 * Signal Service
 * Handles communication with the signal service and data processing
 */
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
class SignalService {
    constructor() {
        this.baseUrl = config_1.config.signalServiceUrl;
        logger_1.logger.info('SignalService initialized', { baseUrl: this.baseUrl });
    }
    /**
     * Get signals with optional filtering
     */
    async getSignals(filter) {
        try {
            logger_1.logger.info('Fetching signals with filter', { filter });
            const response = await axios_1.default.get(`${this.baseUrl}/signals`, {
                params: {
                    poolAddress: filter.poolAddress,
                    signalType: filter.signalType,
                    minStrength: filter.minStrength,
                    limit: filter.limit,
                    offset: filter.offset
                }
            });
            return response.data.data;
        }
        catch (error) {
            logger_1.logger.error('Error fetching signals', {
                error: error.message,
                filter
            });
            throw error;
        }
    }
    /**
     * Get a signal by ID
     */
    async getSignalById(id) {
        try {
            logger_1.logger.info('Fetching signal by ID', { id });
            const response = await axios_1.default.get(`${this.baseUrl}/signals/${id}`);
            return response.data.data;
        }
        catch (error) {
            // If 404, return null instead of throwing
            if (axios_1.default.isAxiosError(error) && error.response?.status === 404) {
                logger_1.logger.warn('Signal not found', { id });
                return null;
            }
            logger_1.logger.error('Error fetching signal by ID', {
                id,
                error: error.message
            });
            throw error;
        }
    }
    /**
     * Get latest signals
     */
    async getLatestSignals(limit) {
        try {
            logger_1.logger.info('Fetching latest signals', { limit });
            const response = await axios_1.default.get(`${this.baseUrl}/signals/latest`, {
                params: { limit }
            });
            return response.data.data;
        }
        catch (error) {
            logger_1.logger.error('Error fetching latest signals', {
                limit,
                error: error.message
            });
            throw error;
        }
    }
    /**
     * Process and enrich signal data
     * This can be expanded to add additional information or formatting
     */
    processSignalData(signal) {
        // Add any processing logic here
        return {
            ...signal,
            // Add any enriched fields
        };
    }
}
exports.SignalService = SignalService;
//# sourceMappingURL=signal-service.js.map