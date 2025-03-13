/**
 * Reconnect Manager
 * Utility for handling WebSocket reconnection with exponential backoff
 */

export interface ReconnectOptions {
  initialDelay: number;       // Initial delay in ms
  maxDelay: number;           // Maximum delay in ms
  factor: number;             // Backoff factor
  jitter: boolean;            // Whether to add jitter
  maxAttempts: number;        // Maximum reconnection attempts (0 = unlimited)
  onReconnect?: (attempt: number, delay: number) => void; // Callback on reconnect
  onMaxAttemptsReached?: () => void; // Callback when max attempts reached
}

export class ReconnectManager {
  private options: ReconnectOptions;
  private attempts: number = 0;
  private timer: NodeJS.Timeout | null = null;
  private reconnecting: boolean = false;

  /**
   * Constructor
   * @param options Reconnect options
   */
  constructor(options: Partial<ReconnectOptions> = {}) {
    this.options = {
      initialDelay: options.initialDelay || 1000,
      maxDelay: options.maxDelay || 30000,
      factor: options.factor || 2,
      jitter: options.jitter !== undefined ? options.jitter : true,
      maxAttempts: options.maxAttempts !== undefined ? options.maxAttempts : 0,
      onReconnect: options.onReconnect,
      onMaxAttemptsReached: options.onMaxAttemptsReached
    };
  }

  /**
   * Start reconnection process
   * @param reconnectFn Function to call for reconnection
   * @returns Promise that resolves when reconnection is successful
   */
  reconnect(reconnectFn: () => Promise<boolean>): Promise<boolean> {
    if (this.reconnecting) {
      return Promise.resolve(false);
    }

    this.reconnecting = true;
    return this.attemptReconnect(reconnectFn);
  }

  /**
   * Attempt reconnection with exponential backoff
   * @param reconnectFn Function to call for reconnection
   * @returns Promise that resolves when reconnection is successful
   */
  private async attemptReconnect(reconnectFn: () => Promise<boolean>): Promise<boolean> {
    // Check if max attempts reached
    if (this.options.maxAttempts > 0 && this.attempts >= this.options.maxAttempts) {
      this.reconnecting = false;
      if (this.options.onMaxAttemptsReached) {
        this.options.onMaxAttemptsReached();
      }
      return false;
    }

    // Calculate delay with exponential backoff
    const delay = this.calculateDelay();
    
    // Wait for delay
    await new Promise(resolve => {
      this.timer = setTimeout(resolve, delay);
    });

    // Increment attempts
    this.attempts++;
    
    // Call reconnect callback
    if (this.options.onReconnect) {
      this.options.onReconnect(this.attempts, delay);
    }

    try {
      // Attempt reconnection
      const success = await reconnectFn();
      
      if (success) {
        // Reset on successful reconnection
        this.reset();
        return true;
      } else {
        // Try again
        return this.attemptReconnect(reconnectFn);
      }
    } catch (error) {
      // Try again on error
      return this.attemptReconnect(reconnectFn);
    }
  }

  /**
   * Calculate delay with exponential backoff
   * @returns Delay in ms
   */
  private calculateDelay(): number {
    // Calculate exponential delay
    let delay = this.options.initialDelay * Math.pow(this.options.factor, this.attempts);
    
    // Cap at max delay
    delay = Math.min(delay, this.options.maxDelay);
    
    // Add jitter if enabled (±20%)
    if (this.options.jitter) {
      const jitterFactor = 0.8 + (Math.random() * 0.4); // 0.8-1.2
      delay = Math.floor(delay * jitterFactor);
    }
    
    return delay;
  }

  /**
   * Reset reconnection state
   */
  reset(): void {
    this.attempts = 0;
    this.reconnecting = false;
    
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /**
   * Stop reconnection process
   */
  stop(): void {
    this.reconnecting = false;
    
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
} 