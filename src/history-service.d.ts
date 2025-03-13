import { Signal } from './signal-service';
export interface HistoricalSignalFilter {
    poolAddress?: string;
    signalType?: string;
    timeframe?: string;
    minStrength?: number;
    minReliability?: number;
    startTime?: number;
    endTime?: number;
    limit: number;
    offset: number;
}
export interface PoolPerformance {
    poolAddress: string;
    tokenA: string;
    tokenB: string;
    timeframe: string;
    startTime: number;
    endTime: number;
    metrics: {
        volume: number;
        fees: number;
        tvl: number;
        priceChange: number;
        volatility: number;
        impermanentLoss: number;
        returns: number;
        signalAccuracy: number;
    };
    historicalData: {
        timestamp: number;
        value: number;
    }[];
}
export interface SignalAccuracy {
    signalType?: string;
    timeframe: string;
    startTime: number;
    endTime: number;
    overallAccuracy: number;
    bySignalType: Record<string, {
        accuracy: number;
        totalSignals: number;
        correctSignals: number;
    }>;
    byTimeframe: Record<string, {
        accuracy: number;
        totalSignals: number;
        correctSignals: number;
    }>;
    trend: {
        timestamp: number;
        accuracy: number;
    }[];
}
export interface MarketTrend {
    poolAddress?: string;
    timeframe: string;
    resolution: string;
    startTime: number;
    endTime: number;
    data: {
        timestamp: number;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
        signals?: Signal[];
    }[];
}
export interface ExportOptions {
    dataType: 'signals' | 'performance' | 'accuracy' | 'trends';
    format: 'csv' | 'json';
    filters?: Record<string, any>;
}
export declare class HistoryService {
    private baseUrl;
    constructor();
    /**
     * Get historical signals with filtering options
     */
    getHistoricalSignals(filter: HistoricalSignalFilter): Promise<Signal[]>;
    /**
     * Get pool performance metrics
     */
    getPoolPerformance(poolAddress: string, timeframe: string): Promise<PoolPerformance | null>;
    /**
     * Get signal accuracy metrics
     */
    getSignalAccuracy(options: {
        signalType?: string;
        timeframe: string;
    }): Promise<SignalAccuracy>;
    /**
     * Get market trends data
     */
    getMarketTrends(options: {
        poolAddress?: string;
        timeframe: string;
        resolution: string;
    }): Promise<MarketTrend>;
    /**
     * Export historical data to a file
     */
    exportData(options: ExportOptions): Promise<string>;
    /**
     * Process and format historical data
     * This can be expanded to add additional processing or formatting
     */
    private processHistoricalData;
}
