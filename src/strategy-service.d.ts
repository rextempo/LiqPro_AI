export interface Strategy {
    id: string;
    name: string;
    description?: string;
    type: string;
    parameters: Record<string, any>;
    isActive: boolean;
    createdAt: number;
    updatedAt: number;
    createdBy?: string;
    performance?: StrategyPerformance;
}
export interface StrategyPerformance {
    winRate: number;
    profitFactor: number;
    sharpeRatio?: number;
    maxDrawdown: number;
    totalTrades: number;
    averageReturn: number;
    lastEvaluated: number;
}
export interface StrategyFilter {
    type?: string;
    isActive?: boolean;
    limit: number;
    offset: number;
}
export interface EvaluationOptions {
    timeframe: string;
    poolAddresses?: string[];
}
export interface OptimizationOptions extends EvaluationOptions {
    optimizationGoal: string;
    constraints?: Record<string, any>;
}
export interface OptimizationResult {
    originalParameters: Record<string, any>;
    optimizedParameters: Record<string, any>;
    performanceImprovement: number;
    evaluationMetrics: StrategyPerformance;
}
export declare class StrategyService {
    private baseUrl;
    constructor();
    /**
     * Get strategies with optional filtering
     */
    getStrategies(filter: StrategyFilter): Promise<Strategy[]>;
    /**
     * Get a strategy by ID
     */
    getStrategyById(id: string): Promise<Strategy | null>;
    /**
     * Create a new strategy
     */
    createStrategy(strategyData: Partial<Strategy>): Promise<Strategy>;
    /**
     * Update an existing strategy
     */
    updateStrategy(id: string, strategyData: Partial<Strategy>): Promise<Strategy>;
    /**
     * Delete a strategy
     */
    deleteStrategy(id: string): Promise<void>;
    /**
     * Evaluate a strategy's performance
     */
    evaluateStrategy(id: string, options: EvaluationOptions): Promise<StrategyPerformance>;
    /**
     * Optimize a strategy's parameters
     */
    optimizeStrategy(id: string, options: OptimizationOptions): Promise<OptimizationResult>;
}
