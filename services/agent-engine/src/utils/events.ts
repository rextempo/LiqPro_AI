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
  userId?: string;
  name: string;
  initialFunds: number;
  riskLevel: number;
  settings?: Record<string, any>;
} 