import { Connection, PublicKey, ConfirmedSignatureInfo } from '@solana/web3.js';
import { createLogger } from '@liqpro/monitoring';

const logger = createLogger('data-service:pool-events-collector');

/**
 * Pool Event Types
 */
export enum PoolEventType {
  SWAP = 'swap',
  DEPOSIT = 'deposit',
  WITHDRAW = 'withdraw',
  POSITION_CREATED = 'position_created',
  POSITION_MODIFIED = 'position_modified',
  POSITION_CLOSED = 'position_closed',
  FEE_COLLECTION = 'fee_collection',
  UNKNOWN = 'unknown',
}

/**
 * Pool Event Interface
 */
export interface PoolEvent {
  type: PoolEventType;
  signature: string;
  poolAddress: string;
  blockTime: number;
  slot: number;
  data?: any;
}

/**
 * Meteora Pool Events Collector
 * Responsible for monitoring events in Meteora DLMM pools
 */
export class PoolEventsCollector {
  private connection: Connection;
  private eventListeners: Map<string, number> = new Map();
  private eventCallbacks: Map<string, ((event: PoolEvent) => void)[]> = new Map();
  private lastSignatures: Map<string, string> = new Map();
  private pollingInterval: number = 10000; // 10 seconds in milliseconds
  private isPolling: Map<string, boolean> = new Map();

  /**
   * Create a new Pool Events Collector
   * @param rpcEndpoint Solana RPC endpoint
   * @param commitment Commitment level
   */
  constructor(
    rpcEndpoint: string,
    commitment: 'processed' | 'confirmed' | 'finalized' = 'confirmed'
  ) {
    this.connection = new Connection(rpcEndpoint, commitment);
    logger.info('Pool Events Collector initialized');
  }

  /**
   * Start monitoring events for a specific pool
   * @param poolAddress Pool address
   * @param callback Callback function to handle events
   * @returns Subscription ID
   */
  startMonitoring(poolAddress: string, callback: (event: PoolEvent) => void): number {
    const subscriptionId = Date.now();
    const key = `${poolAddress}:${subscriptionId}`;

    // Store callback
    if (!this.eventCallbacks.has(poolAddress)) {
      this.eventCallbacks.set(poolAddress, []);
    }
    this.eventCallbacks.get(poolAddress)!.push(callback);

    // Store subscription
    this.eventListeners.set(key, subscriptionId);

    // Start polling if not already polling for this pool
    if (!this.isPolling.get(poolAddress)) {
      this.startPolling(poolAddress);
    }

    logger.info(
      `Started monitoring events for pool ${poolAddress} with subscription ${subscriptionId}`
    );
    return subscriptionId;
  }

  /**
   * Stop monitoring events for a specific subscription
   * @param poolAddress Pool address
   * @param subscriptionId Subscription ID
   */
  stopMonitoring(poolAddress: string, subscriptionId: number): void {
    const key = `${poolAddress}:${subscriptionId}`;

    // Remove subscription
    this.eventListeners.delete(key);

    // Check if there are any remaining subscriptions for this pool
    let hasRemainingSubscriptions = false;
    for (const k of this.eventListeners.keys()) {
      if (k.startsWith(`${poolAddress}:`)) {
        hasRemainingSubscriptions = true;
        break;
      }
    }

    // If no remaining subscriptions, stop polling
    if (!hasRemainingSubscriptions) {
      this.isPolling.set(poolAddress, false);

      // Remove callbacks
      this.eventCallbacks.delete(poolAddress);
    }

    logger.info(
      `Stopped monitoring events for pool ${poolAddress} with subscription ${subscriptionId}`
    );
  }

  /**
   * Start polling for events
   * @param poolAddress Pool address
   */
  private async startPolling(poolAddress: string): Promise<void> {
    this.isPolling.set(poolAddress, true);

    // Get initial signatures
    try {
      const signatures = await this.connection.getSignaturesForAddress(new PublicKey(poolAddress), {
        limit: 1,
      });

      if (signatures.length > 0) {
        this.lastSignatures.set(poolAddress, signatures[0].signature);
      }
    } catch (error) {
      logger.error(`Error getting initial signatures for pool ${poolAddress}`, { error });
    }

    // Start polling loop
    this.poll(poolAddress);
  }

  /**
   * Poll for new events
   * @param poolAddress Pool address
   */
  private async poll(poolAddress: string): Promise<void> {
    if (!this.isPolling.get(poolAddress)) {
      return;
    }

    try {
      // Get last processed signature
      const lastSignature = this.lastSignatures.get(poolAddress);

      // Get new signatures
      const options: any = { limit: 10 };
      if (lastSignature) {
        options.until = lastSignature;
      }

      const signatures = await this.connection.getSignaturesForAddress(
        new PublicKey(poolAddress),
        options
      );

      // Process new signatures (in reverse order to process oldest first)
      for (let i = signatures.length - 1; i >= 0; i--) {
        const signature = signatures[i];

        // Skip already processed signatures
        if (signature.signature === lastSignature) {
          continue;
        }

        // Process transaction
        await this.processTransaction(poolAddress, signature);
      }

      // Update last signature
      if (signatures.length > 0) {
        this.lastSignatures.set(poolAddress, signatures[0].signature);
      }
    } catch (error) {
      logger.error(`Error polling events for pool ${poolAddress}`, { error });
    }

    // Schedule next poll
    setTimeout(() => this.poll(poolAddress), this.pollingInterval);
  }

  /**
   * Process a transaction
   * @param poolAddress Pool address
   * @param signature Signature info
   */
  private async processTransaction(
    poolAddress: string,
    signature: ConfirmedSignatureInfo
  ): Promise<void> {
    try {
      // Get transaction details
      const transaction = await this.connection.getTransaction(signature.signature, {
        maxSupportedTransactionVersion: 0,
      });

      if (!transaction) {
        return;
      }

      // Determine event type based on transaction data
      const eventType = this.determineEventType(transaction);

      // Create event object
      const event: PoolEvent = {
        type: eventType,
        signature: signature.signature,
        poolAddress,
        blockTime: transaction.blockTime || 0,
        slot: transaction.slot,
        data: this.extractEventData(transaction, eventType),
      };

      // Notify callbacks
      const callbacks = this.eventCallbacks.get(poolAddress) || [];
      for (const callback of callbacks) {
        try {
          callback(event);
        } catch (error) {
          logger.error(`Error in event callback for pool ${poolAddress}`, { error });
        }
      }

      logger.info(`Processed ${eventType} event for pool ${poolAddress}`, {
        signature: signature.signature,
        slot: transaction.slot,
      });
    } catch (error) {
      logger.error(`Error processing transaction ${signature.signature} for pool ${poolAddress}`, {
        error,
      });
    }
  }

  /**
   * Determine event type based on transaction data
   * @param transaction Transaction data
   * @returns Event type
   */
  private determineEventType(transaction: any): PoolEventType {
    // This is a simplified implementation
    // In a real implementation, you would need to analyze the transaction logs
    // and instruction data to determine the exact event type

    // For now, we'll use a simple heuristic based on the program ID and instruction data
    try {
      const logMessages = transaction.meta?.logMessages || [];

      // Check for specific log messages
      for (const message of logMessages) {
        if (message.includes('Instruction: Swap')) {
          return PoolEventType.SWAP;
        } else if (message.includes('Instruction: Deposit')) {
          return PoolEventType.DEPOSIT;
        } else if (message.includes('Instruction: Withdraw')) {
          return PoolEventType.WITHDRAW;
        } else if (message.includes('Instruction: OpenPosition')) {
          return PoolEventType.POSITION_CREATED;
        } else if (message.includes('Instruction: ModifyPosition')) {
          return PoolEventType.POSITION_MODIFIED;
        } else if (message.includes('Instruction: ClosePosition')) {
          return PoolEventType.POSITION_CLOSED;
        } else if (message.includes('Instruction: CollectFees')) {
          return PoolEventType.FEE_COLLECTION;
        }
      }
    } catch (error) {
      logger.error('Error determining event type', { error });
    }

    return PoolEventType.UNKNOWN;
  }

  /**
   * Extract event data from transaction
   * @param transaction Transaction data
   * @param eventType Event type
   * @returns Event data
   */
  private extractEventData(transaction: any, eventType: PoolEventType): any {
    // This is a simplified implementation
    // In a real implementation, you would need to decode the instruction data
    // and extract relevant information based on the event type

    try {
      const logMessages = transaction.meta?.logMessages || [];
      const postTokenBalances = transaction.meta?.postTokenBalances || [];
      const preTokenBalances = transaction.meta?.preTokenBalances || [];

      // Basic data extraction based on event type
      switch (eventType) {
        case PoolEventType.SWAP:
          return {
            tokenBalances: {
              pre: preTokenBalances,
              post: postTokenBalances,
            },
            logs: logMessages,
          };

        case PoolEventType.DEPOSIT:
        case PoolEventType.WITHDRAW:
          return {
            tokenBalances: {
              pre: preTokenBalances,
              post: postTokenBalances,
            },
            logs: logMessages,
          };

        case PoolEventType.POSITION_CREATED:
        case PoolEventType.POSITION_MODIFIED:
        case PoolEventType.POSITION_CLOSED:
          return {
            tokenBalances: {
              pre: preTokenBalances,
              post: postTokenBalances,
            },
            logs: logMessages,
          };

        case PoolEventType.FEE_COLLECTION:
          return {
            tokenBalances: {
              pre: preTokenBalances,
              post: postTokenBalances,
            },
            logs: logMessages,
          };

        default:
          return {
            logs: logMessages,
          };
      }
    } catch (error) {
      logger.error('Error extracting event data', { error });
      return {};
    }
  }

  /**
   * Set the polling interval
   * @param intervalMs Interval in milliseconds
   */
  setPollingInterval(intervalMs: number): void {
    this.pollingInterval = intervalMs;
    logger.info(`Polling interval set to ${intervalMs}ms`);
  }
}
