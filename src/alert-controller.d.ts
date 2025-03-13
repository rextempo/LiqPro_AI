/**
 * Alert Controller
 * Handles API requests related to alerts and notifications
 */
import { Request, Response } from 'express';
export declare class AlertController {
    /**
     * Get all alerts with optional filtering
     */
    getAllAlerts(req: Request, res: Response): Promise<void>;
    /**
     * Get a specific alert by ID
     */
    getAlertById(req: Request, res: Response): Promise<void>;
    /**
     * Create a new alert
     */
    createAlert(req: Request, res: Response): Promise<void>;
    /**
     * Update an existing alert
     */
    updateAlert(req: Request, res: Response): Promise<void>;
    /**
     * Delete an alert
     */
    deleteAlert(req: Request, res: Response): Promise<void>;
    /**
     * Dismiss an alert
     */
    dismissAlert(req: Request, res: Response): Promise<void>;
    /**
     * Get alert settings
     */
    getAlertSettings(req: Request, res: Response): Promise<void>;
    /**
     * Update alert settings
     */
    updateAlertSettings(req: Request, res: Response): Promise<void>;
}
export default AlertController;
