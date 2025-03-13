export interface Signal {
    id: string;
    poolAddress: string;
    signalType: string;
    timeframe: string;
    strength: number;
    reliability: number;
    timestamp: number;
    parameters: Record<string, any>;
    message: string;
    source: string;
}
export interface SignalFilter {
    poolAddress?: string;
    signalType?: string;
    minStrength?: number;
    limit: number;
    offset: number;
}
export declare class SignalService {
    private baseUrl;
    constructor();
    /**
     * Get signals with optional filtering
     */
    getSignals(filter: SignalFilter): Promise<Signal[]>;
    /**
     * Get a signal by ID
     */
    getSignalById(id: string): Promise<Signal | null>;
    /**
     * Get latest signals
     */
    getLatestSignals(limit: number): Promise<Signal[]>;
    /**
     * Process and enrich signal data
     * This can be expanded to add additional information or formatting
     */
    private processSignalData;
}
