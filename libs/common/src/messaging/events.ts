// Define all event types and their payloads for type safety

export enum EventType {
  // Agent events
  AGENT_CREATED = 'agent.created',
  AGENT_UPDATED = 'agent.updated',
  AGENT_DELETED = 'agent.deleted',
  AGENT_STARTED = 'agent.started',
  AGENT_STOPPED = 'agent.stopped',
  AGENT_ERROR = 'agent.error',
  
  // LP position events
  LP_POSITION_CREATED = 'lp.position.created',
  LP_POSITION_UPDATED = 'lp.position.updated',
  LP_POSITION_CLOSED = 'lp.position.closed',
  
  // Signal events
  SIGNAL_GENERATED = 'signal.generated',
  SIGNAL_UPDATED = 'signal.updated',
  SIGNAL_EXPIRED = 'signal.expired',
  
  // Transaction events
  TRANSACTION_CREATED = 'transaction.created',
  TRANSACTION_CONFIRMED = 'transaction.confirmed',
  TRANSACTION_FAILED = 'transaction.failed',
  
  // Market events
  MARKET_PRICE_UPDATED = 'market.price.updated',
  MARKET_LIQUIDITY_UPDATED = 'market.liquidity.updated',
  
  // System events
  SYSTEM_ERROR = 'system.error',
  SYSTEM_WARNING = 'system.warning',
  SYSTEM_INFO = 'system.info'
}

// Base event interface
export interface Event<T = any> {
  id: string;
  type: EventType;
  timestamp: number;
  payload: T;
  metadata?: Record<string, any>;
}

// Agent event payloads
export interface AgentCreatedPayload {
  agentId: string;
  userId: string;
  name: string;
  initialFunds: number;
  riskLevel: number;
  settings: Record<string, any>;
}

export interface AgentUpdatedPayload {
  agentId: string;
  changes: Partial<{
    name: string;
    riskLevel: number;
    settings: Record<string, any>;
  }>;
}

export interface AgentErrorPayload {
  agentId: string;
  errorCode: string;
  errorMessage: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, any>;
}

// LP position event payloads
export interface LpPositionCreatedPayload {
  positionId: string;
  agentId: string;
  poolAddress: string;
  tokenA: string;
  tokenB: string;
  amountA: number;
  amountB: number;
  lowerBin: number;
  upperBin: number;
  transactionHash: string;
}

export interface LpPositionUpdatedPayload {
  positionId: string;
  changes: Partial<{
    amountA: number;
    amountB: number;
    lowerBin: number;
    upperBin: number;
  }>;
  transactionHash: string;
}

export interface LpPositionClosedPayload {
  positionId: string;
  tokenAReceived: number;
  tokenBReceived: number;
  fees: {
    tokenA: number;
    tokenB: number;
  };
  profitLoss: number;
  transactionHash: string;
}

// Signal event payloads
export interface SignalGeneratedPayload {
  signalId: string;
  tokenPair: string;
  direction: 'bullish' | 'bearish' | 'neutral';
  strength: number;
  timeframe: string;
  indicators: Record<string, any>;
  confidence: number;
  expiresAt: number;
}

// Transaction event payloads
export interface TransactionCreatedPayload {
  transactionId: string;
  agentId: string;
  type: 'swap' | 'addLiquidity' | 'removeLiquidity' | 'other';
  transactionHash: string;
  params: Record<string, any>;
  status: 'pending';
  createdAt: number;
}

export interface TransactionConfirmedPayload {
  transactionId: string;
  transactionHash: string;
  blockNumber: number;
  status: 'confirmed';
  result: Record<string, any>;
  confirmedAt: number;
}

export interface TransactionFailedPayload {
  transactionId: string;
  transactionHash: string;
  status: 'failed';
  error: {
    code: string;
    message: string;
  };
  failedAt: number;
}

// Market event payloads
export interface MarketPriceUpdatedPayload {
  tokenPair: string;
  price: number;
  change24h: number;
  volume24h: number;
  updatedAt: number;
}

// Type guards for event types
export function isAgentEvent(event: Event): boolean {
  return event.type.startsWith('agent.');
}

export function isLpPositionEvent(event: Event): boolean {
  return event.type.startsWith('lp.position.');
}

export function isSignalEvent(event: Event): boolean {
  return event.type.startsWith('signal.');
}

export function isTransactionEvent(event: Event): boolean {
  return event.type.startsWith('transaction.');
}

export function isMarketEvent(event: Event): boolean {
  return event.type.startsWith('market.');
}

export function isSystemEvent(event: Event): boolean {
  return event.type.startsWith('system.');
} 