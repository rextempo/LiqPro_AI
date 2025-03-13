/**
 * History Controller
 * Handles API requests related to historical data
 */
import { Request, Response } from 'express';
export declare class HistoryController {
    /**
     * Get historical signals with optional filtering
     */
    getSignalHistory(req: Request, res: Response): Promise<void>;
    /**
     * Get performance metrics for a specific pool
     */
    getPoolPerformance(req: Request, res: Response): Promise<void>;
    /**
     * Get accuracy metrics for signals
     */
    getAccuracyMetrics(req: Request, res: Response): Promise<void>;
    /**
     * Get trend analysis for signals
     */
    getTrendAnalysis(req: Request, res: Response): Promise<void>;
    /**
     * Export historical data
     */
    exportData(req: Request, res: Response): Promise<void>;
}
export default HistoryController;
