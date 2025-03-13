/**
 * Strategy Controller
 * Handles API requests related to trading strategies
 */
import { Request, Response } from 'express';
export declare class StrategyController {
    /**
     * Get all strategies with optional filtering
     */
    getAllStrategies(req: Request, res: Response): Promise<void>;
    /**
     * Get a specific strategy by ID
     */
    getStrategyById(req: Request, res: Response): Promise<void>;
    /**
     * Create a new strategy
     */
    createStrategy(req: Request, res: Response): Promise<void>;
    /**
     * Update an existing strategy
     */
    updateStrategy(req: Request, res: Response): Promise<void>;
    /**
     * Delete a strategy
     */
    deleteStrategy(req: Request, res: Response): Promise<void>;
    /**
     * Evaluate a strategy's performance
     */
    evaluateStrategy(req: Request, res: Response): Promise<void>;
    /**
     * Optimize a strategy's parameters
     */
    optimizeStrategy(req: Request, res: Response): Promise<void>;
}
export default StrategyController;
