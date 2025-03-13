/**
 * Signal Controller
 * Handles API requests related to trading signals
 */
import { Request, Response } from 'express';
export declare class SignalController {
    /**
     * Get all signals with optional filtering
     */
    getAllSignals(req: Request, res: Response): Promise<void>;
    /**
     * Get a specific signal by ID
     */
    getSignalById(req: Request, res: Response): Promise<void>;
    /**
     * Get signals for a specific pool
     */
    getSignalsByPool(req: Request, res: Response): Promise<void>;
    /**
     * Get latest signals
     */
    getLatestSignals(req: Request, res: Response): Promise<void>;
}
export default SignalController;
