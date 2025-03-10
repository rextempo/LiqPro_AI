import { createLogger } from '@liqpro/monitoring';
import { Connection, PublicKey, Finality } from '@solana/web3.js';

const logger = createLogger('data-service:event-collector');

/**
 * Event types that can be monitored
 */
export enum EventType {
  SWAP = 'swap',
  DEPOSIT = 'deposit',
  WITHDRAW = 'withdraw',
  POSITION_OPEN = 'position_open',
  POSITION_CLOSE = 'position_close',
  POSITION_UPDATE = 'position_update'
}

/**
 * Event data structure
 */
export interface PoolEvent {
  id: string;
  poolAddress: string;
  type: EventType;
  signature: string;
  blockTime: number;
  slot: number;
  data: any;
}

/**
 * Configuration for the EventCollector
 */
export interface EventCollectorConfig {
  rpcEndpoint: string;
  rpcCommitment: Finality;
  interval: number;
  onEvent: (event: PoolEvent) => void;
}

/**
 * Event Collector
 * Responsible for collecting events from liquidity pools
 */
export class EventCollector {
  private connection: Connection;
  private config: EventCollectorConfig;
  private pollingTimer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private trackedPools: Map<string, { lastSignature?: string }> = new Map();
  private subscriptions: Map<string, number> = new Map();

  /**
   * Create a new Event Collector
   * @param config Collector configuration
   */
  constructor(config: EventCollectorConfig) {
    this.config = config;
    this.connection = new Connection(config.rpcEndpoint, config.rpcCommitment);
    
    logger.info('Event Collector initialized', {
      rpcEndpoint: config.rpcEndpoint,
      interval: config.interval
    });
  }

  /**
   * Start collecting events
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.info('Event Collector is already running');
      return;
    }

    logger.info('Starting Event Collector');
    
    // Start polling timer
    this.pollingTimer = setInterval(() => {
      this.pollEvents();
    }, this.config.interval);
    
    // Poll events immediately
    await this.pollEvents();
    
    this.isRunning = true;
    logger.info('Event Collector started');
  }

  /**
   * Stop collecting events
   */
  stop(): void {
    if (!this.isRunning) {
      logger.info('Event Collector is not running');
      return;
    }

    logger.info('Stopping Event Collector');
    
    // Clear polling timer
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
    
    // Unsubscribe from all WebSocket subscriptions
    for (const [poolAddress, subscriptionId] of this.subscriptions.entries()) {
      this.connection.removeAccountChangeListener(subscriptionId);
      logger.info(`Unsubscribed from pool ${poolAddress}`);
    }
    
    this.subscriptions.clear();
    this.isRunning = false;
    logger.info('Event Collector stopped');
  }

  /**
   * Track events for a pool
   * @param poolAddress Pool address
   */
  async trackPool(poolAddress: string): Promise<void> {
    if (this.trackedPools.has(poolAddress)) {
      logger.info(`Pool ${poolAddress} is already being tracked for events`);
      return;
    }

    try {
      // Add to tracked pools
      this.trackedPools.set(poolAddress, {});
      
      // Subscribe to account changes
      const publicKey = new PublicKey(poolAddress);
      const subscriptionId = this.connection.onAccountChange(
        publicKey,
        (accountInfo, context) => {
          this.handleAccountChange(poolAddress, accountInfo, context);
        },
        this.config.rpcCommitment
      );
      
      this.subscriptions.set(poolAddress, subscriptionId);
      
      // Get recent transactions to establish a baseline
      await this.getRecentTransactions(poolAddress);
      
      logger.info(`Started tracking events for pool ${poolAddress}`);
    } catch (error: any) {
      logger.error(`Failed to track events for pool ${poolAddress}`, { error });
      throw new Error(`Failed to track events: ${error.message}`);
    }
  }

  /**
   * Stop tracking events for a pool
   * @param poolAddress Pool address
   */
  untrackPool(poolAddress: string): void {
    if (!this.trackedPools.has(poolAddress)) {
      logger.info(`Pool ${poolAddress} is not being tracked for events`);
      return;
    }

    // Unsubscribe from account changes
    const subscriptionId = this.subscriptions.get(poolAddress);
    if (subscriptionId !== undefined) {
      this.connection.removeAccountChangeListener(subscriptionId);
      this.subscriptions.delete(poolAddress);
    }
    
    this.trackedPools.delete(poolAddress);
    logger.info(`Stopped tracking events for pool ${poolAddress}`);
  }

  /**
   * Poll for events for all tracked pools
   */
  private async pollEvents(): Promise<void> {
    logger.debug('Polling events for all tracked pools');
    
    const promises = Array.from(this.trackedPools.keys()).map(poolAddress => 
      this.getRecentTransactions(poolAddress).catch(error => {
        logger.error(`Error polling events for pool ${poolAddress}`, { error });
      })
    );
    
    await Promise.all(promises);
  }

  /**
   * Get recent transactions for a pool
   * @param poolAddress Pool address
   */
  private async getRecentTransactions(poolAddress: string): Promise<void> {
    try {
      const poolData = this.trackedPools.get(poolAddress);
      if (!poolData) return;
      
      const publicKey = new PublicKey(poolAddress);
      
      // Get recent transactions
      const signatures = await this.connection.getSignaturesForAddress(
        publicKey,
        { limit: 10 },
        this.config.rpcCommitment
      );
      
      // If we have no signatures, return
      if (signatures.length === 0) {
        return;
      }
      
      // If we have a last signature, only process newer transactions
      const lastSignature = poolData.lastSignature;
      const newSignatures = lastSignature
        ? signatures.filter(sig => sig.signature !== lastSignature)
        : signatures;
      
      // Process new transactions
      for (const sigInfo of newSignatures.reverse()) {
        try {
          const transaction = await this.connection.getTransaction(
            sigInfo.signature,
            { commitment: this.config.rpcCommitment }
          );
          
          if (!transaction) continue;
          
          // Process transaction
          const events = this.processTransaction(poolAddress, transaction, sigInfo);
          
          // Emit events
          for (const event of events) {
            this.config.onEvent(event);
          }
        } catch (error: any) {
          logger.error(`Error processing transaction ${sigInfo.signature}`, { error });
        }
      }
      
      // Update last signature
      if (signatures.length > 0) {
        poolData.lastSignature = signatures[0].signature;
        this.trackedPools.set(poolAddress, poolData);
      }
    } catch (error: any) {
      logger.error(`Error getting recent transactions for pool ${poolAddress}`, { error });
      throw error;
    }
  }

  /**
   * Process a transaction to extract events
   * @param poolAddress Pool address
   * @param transaction Transaction data
   * @param signatureInfo Signature information
   * @returns Array of events
   */
  private processTransaction(poolAddress: string, transaction: any, signatureInfo: any): PoolEvent[] {
    const events: PoolEvent[] = [];
    
    try {
      // Skip if no instructions
      if (!transaction.meta || !transaction.transaction || !transaction.transaction.message) {
        return events;
      }
      
      // Get transaction data
      const message = transaction.transaction.message;
      const instructions = message.instructions || [];
      
      // Process each instruction
      for (let i = 0; i < instructions.length; i++) {
        const instruction = instructions[i];
        
        // Skip if not a program instruction
        if (!instruction.programId) continue;
        
        // Determine event type based on instruction data
        const eventType = this.determineEventType(instruction, transaction);
        if (!eventType) continue;
        
        // Create event
        const event: PoolEvent = {
          id: `${signatureInfo.signature}-${i}`,
          poolAddress,
          type: eventType,
          signature: signatureInfo.signature,
          blockTime: transaction.blockTime || 0,
          slot: transaction.slot || 0,
          data: {
            instruction: i,
            accounts: instruction.accounts,
            data: instruction.data,
            programId: instruction.programId,
            logMessages: transaction.meta.logMessages || []
          }
        };
        
        events.push(event);
        logger.debug(`Detected ${eventType} event in pool ${poolAddress}`, {
          signature: signatureInfo.signature,
          slot: transaction.slot
        });
      }
    } catch (error: any) {
      logger.error(`Error processing transaction for pool ${poolAddress}`, { error });
    }
    
    return events;
  }

  /**
   * Determine the event type based on instruction data
   * @param instruction Instruction data
   * @param transaction Transaction data
   * @returns Event type or null if not recognized
   */
  private determineEventType(instruction: any, transaction: any): EventType | null {
    try {
      // This is a simplified implementation
      // In a real implementation, you would need to decode the instruction data
      // and match it against known instruction layouts for the Meteora program
      
      // For now, we'll use a simple heuristic based on log messages
      const logMessages = transaction.meta.logMessages || [];
      const logs = logMessages.join('\n');
      
      if (logs.includes('Instruction: Swap')) {
        return EventType.SWAP;
      } else if (logs.includes('Instruction: Deposit')) {
        return EventType.DEPOSIT;
      } else if (logs.includes('Instruction: Withdraw')) {
        return EventType.WITHDRAW;
      } else if (logs.includes('Instruction: OpenPosition')) {
        return EventType.POSITION_OPEN;
      } else if (logs.includes('Instruction: ClosePosition')) {
        return EventType.POSITION_CLOSE;
      } else if (logs.includes('Instruction: UpdatePosition')) {
        return EventType.POSITION_UPDATE;
      }
      
      return null;
    } catch (error: any) {
      logger.error('Error determining event type', { error });
      return null;
    }
  }

  /**
   * Handle account change event
   * @param poolAddress Pool address
   * @param accountInfo Account information
   * @param context Context information
   */
  private handleAccountChange(poolAddress: string, accountInfo: any, context: any): void {
    logger.debug(`Account change detected for pool ${poolAddress}`, {
      slot: context.slot
    });
    
    // In a real implementation, you would decode the account data
    // and emit events based on the changes
    
    // For now, we'll just trigger a poll for recent transactions
    this.getRecentTransactions(poolAddress).catch(error => {
      logger.error(`Error handling account change for pool ${poolAddress}`, { error });
    });
  }
} 