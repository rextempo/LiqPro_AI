"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertService = void 0;
/**
 * Alert Service
 * Handles communication with the alert service and data processing
 */
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
class AlertService {
    constructor() {
        this.baseUrl = config_1.config.signalServiceUrl;
        logger_1.logger.info('AlertService initialized', { baseUrl: this.baseUrl });
    }
    /**
     * Get alerts with optional filtering
     */
    async getAlerts(filter) {
        try {
            logger_1.logger.info('Fetching alerts with filter', { filter });
            const response = await axios_1.default.get(`${this.baseUrl}/alerts`, {
                params: filter
            });
            return response.data.data;
        }
        catch (error) {
            logger_1.logger.error('Error fetching alerts', {
                error: error.message,
                filter
            });
            throw error;
        }
    }
    /**
     * Get an alert by ID
     */
    async getAlertById(id) {
        try {
            logger_1.logger.info('Fetching alert by ID', { id });
            const response = await axios_1.default.get(`${this.baseUrl}/alerts/${id}`);
            return response.data.data;
        }
        catch (error) {
            // If 404, return null instead of throwing
            if (axios_1.default.isAxiosError(error) && error.response?.status === 404) {
                logger_1.logger.warn('Alert not found', { id });
                return null;
            }
            logger_1.logger.error('Error fetching alert by ID', {
                id,
                error: error.message
            });
            throw error;
        }
    }
    /**
     * Create a new alert
     */
    async createAlert(alertData) {
        try {
            logger_1.logger.info('Creating new alert', { alertData });
            const response = await axios_1.default.post(`${this.baseUrl}/alerts`, alertData);
            return response.data.data;
        }
        catch (error) {
            logger_1.logger.error('Error creating alert', {
                error: error.message,
                alertData
            });
            throw error;
        }
    }
    /**
     * Update an existing alert
     */
    async updateAlert(id, alertData) {
        try {
            logger_1.logger.info('Updating alert', { id, alertData });
            const response = await axios_1.default.put(`${this.baseUrl}/alerts/${id}`, alertData);
            return response.data.data;
        }
        catch (error) {
            logger_1.logger.error('Error updating alert', {
                id,
                error: error.message,
                alertData
            });
            throw error;
        }
    }
    /**
     * Delete an alert
     */
    async deleteAlert(id) {
        try {
            logger_1.logger.info('Deleting alert', { id });
            await axios_1.default.delete(`${this.baseUrl}/alerts/${id}`);
        }
        catch (error) {
            logger_1.logger.error('Error deleting alert', {
                id,
                error: error.message
            });
            throw error;
        }
    }
    /**
     * Dismiss an alert
     */
    async dismissAlert(id) {
        try {
            logger_1.logger.info('Dismissing alert', { id });
            const response = await axios_1.default.post(`${this.baseUrl}/alerts/${id}/dismiss`);
            return response.data.data;
        }
        catch (error) {
            logger_1.logger.error('Error dismissing alert', {
                id,
                error: error.message
            });
            throw error;
        }
    }
    /**
     * Get alert settings for a user
     */
    async getAlertSettings(userId) {
        try {
            logger_1.logger.info('Fetching alert settings', { userId });
            const response = await axios_1.default.get(`${this.baseUrl}/alerts/settings`, {
                params: { userId }
            });
            return response.data.data;
        }
        catch (error) {
            // If 404, return null instead of throwing
            if (axios_1.default.isAxiosError(error) && error.response?.status === 404) {
                logger_1.logger.warn('Alert settings not found', { userId });
                return null;
            }
            logger_1.logger.error('Error fetching alert settings', {
                userId,
                error: error.message
            });
            throw error;
        }
    }
    /**
     * Update alert settings for a user
     */
    async updateAlertSettings(userId, settingsData) {
        try {
            logger_1.logger.info('Updating alert settings', { userId, settingsData });
            const response = await axios_1.default.put(`${this.baseUrl}/alerts/settings`, {
                userId,
                ...settingsData
            });
            return response.data.data;
        }
        catch (error) {
            logger_1.logger.error('Error updating alert settings', {
                userId,
                error: error.message,
                settingsData
            });
            throw error;
        }
    }
}
exports.AlertService = AlertService;
//# sourceMappingURL=alert-service.js.map