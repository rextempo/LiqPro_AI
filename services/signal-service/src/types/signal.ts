import { 
  SignalType, 
  SignalStrength, 
  SignalTimeframe, 
  SignalReliability 
} from './index';

/**
 * Interface for signal factor information
 */
export interface SignalFactorInfo {
  factorId: string;
  value: number;
  description: string;
  weight: number;
  confidence: number;
}

/**
 * Interface for signal data
 */
export interface Signal {
  id: string;                         // Signal ID
  poolAddress: string;                // Pool address
  tokenPair: string;                  // Token pair
  type: SignalType;                   // Signal type
  strength: SignalStrength;           // Signal strength
  timeframe: SignalTimeframe;         // Timeframe
  reliability: SignalReliability;     // Reliability
  timestamp: number;                  // Generation timestamp
  expirationTimestamp?: number;       // Expiration timestamp
  description: string;                // Description
  suggestedAction: string;            // Suggested action
  factors: SignalFactorInfo[];        // Signal factors
  metadata?: Record<string, any>;     // Metadata
}

/**
 * Interface for signal filter options
 */
export interface SignalFilterOptions {
  poolAddresses?: string[];           // Pool address filter
  signalTypes?: SignalType[];         // Signal type filter
  minStrength?: SignalStrength;       // Minimum signal strength
  timeframes?: SignalTimeframe[];     // Timeframe filter
  minReliability?: SignalReliability; // Minimum reliability
  fromTimestamp?: number;             // Start timestamp
  toTimestamp?: number;               // End timestamp
} 