/**
 * Alert Service
 * Handles communication with the alert service and data processing
 */
import axios from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';

// Define interfaces
export interface Alert {
  id: string;
  userId: string;
  alertType: 'price' | 'signal' | 'performance' | 'system';
  poolAddress?: string;
  conditions: Record<string, any>;
  status: 'active' | 'triggered' | 'dismissed';
  notificationChannels: ('email' | 'push' | 'webhook')[];
  createdAt: number;
  updatedAt: number;
  triggeredAt?: number;
  dismissedAt?: number;
}

export interface AlertFilter {
  userId?: string;
  poolAddress?: string;
  alertType?: string;
  status?: string;
  startTime?: number;
  endTime?: number;
  limit: number;
  offset: number;
}

export interface AlertSettings {
  userId: string;
  defaultChannels: ('email' | 'push' | 'webhook')[];
  emailSettings?: {
    email: string;
    verified: boolean;
    frequency: 'immediate' | 'hourly' | 'daily';
    digest: boolean;
  };
  pushSettings?: {
    deviceTokens: string[];
    enabled: boolean;
    quietHours?: {
      start: string;
      end: string;
      timezone: string;
    };
  };
  webhookSettings?: {
    urls: string[];
    secret?: string;
    format: 'json' | 'form';
  };
  createdAt: number;
  updatedAt: number;
}

export class AlertService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.signalServiceUrl;
    logger.info('AlertService initialized', { baseUrl: this.baseUrl });
  }

  /**
   * Get alerts with optional filtering
   */
  public async getAlerts(filter: AlertFilter): Promise<Alert[]> {
    try {
      logger.info('Fetching alerts with filter', { filter });
      
      const response = await axios.get(`${this.baseUrl}/alerts`, {
        params: filter
      });

      return response.data.data;
    } catch (error) {
      logger.error('Error fetching alerts', { 
        error: (error as Error).message,
        filter 
      });
      throw error;
    }
  }

  /**
   * Get an alert by ID
   */
  public async getAlertById(id: string): Promise<Alert | null> {
    try {
      logger.info('Fetching alert by ID', { id });
      
      const response = await axios.get(`${this.baseUrl}/alerts/${id}`);
      
      return response.data.data;
    } catch (error) {
      // If 404, return null instead of throwing
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        logger.warn('Alert not found', { id });
        return null;
      }
      
      logger.error('Error fetching alert by ID', { 
        id, 
        error: (error as Error).message 
      });
      throw error;
    }
  }

  /**
   * Create a new alert
   */
  public async createAlert(alertData: Partial<Alert>): Promise<Alert> {
    try {
      logger.info('Creating new alert', { alertData });
      
      const response = await axios.post(`${this.baseUrl}/alerts`, alertData);
      
      return response.data.data;
    } catch (error) {
      logger.error('Error creating alert', { 
        error: (error as Error).message,
        alertData 
      });
      throw error;
    }
  }

  /**
   * Update an existing alert
   */
  public async updateAlert(id: string, alertData: Partial<Alert>): Promise<Alert> {
    try {
      logger.info('Updating alert', { id, alertData });
      
      const response = await axios.put(`${this.baseUrl}/alerts/${id}`, alertData);
      
      return response.data.data;
    } catch (error) {
      logger.error('Error updating alert', { 
        id,
        error: (error as Error).message,
        alertData 
      });
      throw error;
    }
  }

  /**
   * Delete an alert
   */
  public async deleteAlert(id: string): Promise<void> {
    try {
      logger.info('Deleting alert', { id });
      
      await axios.delete(`${this.baseUrl}/alerts/${id}`);
    } catch (error) {
      logger.error('Error deleting alert', { 
        id,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Dismiss an alert
   */
  public async dismissAlert(id: string): Promise<Alert> {
    try {
      logger.info('Dismissing alert', { id });
      
      const response = await axios.post(`${this.baseUrl}/alerts/${id}/dismiss`);
      
      return response.data.data;
    } catch (error) {
      logger.error('Error dismissing alert', { 
        id,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Get alert settings for a user
   */
  public async getAlertSettings(userId: string): Promise<AlertSettings | null> {
    try {
      logger.info('Fetching alert settings', { userId });
      
      const response = await axios.get(`${this.baseUrl}/alerts/settings`, {
        params: { userId }
      });
      
      return response.data.data;
    } catch (error) {
      // If 404, return null instead of throwing
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        logger.warn('Alert settings not found', { userId });
        return null;
      }
      
      logger.error('Error fetching alert settings', { 
        userId, 
        error: (error as Error).message 
      });
      throw error;
    }
  }

  /**
   * Update alert settings for a user
   */
  public async updateAlertSettings(userId: string, settingsData: Partial<AlertSettings>): Promise<AlertSettings> {
    try {
      logger.info('Updating alert settings', { userId, settingsData });
      
      const response = await axios.put(`${this.baseUrl}/alerts/settings`, {
        userId,
        ...settingsData
      });
      
      return response.data.data;
    } catch (error) {
      logger.error('Error updating alert settings', { 
        userId,
        error: (error as Error).message,
        settingsData 
      });
      throw error;
    }
  }
} 