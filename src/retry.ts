import { ConsumeMessage } from 'amqplib';
import { createLogger } from '../utils/logger';

const logger = createLogger('MessageQueueRetry');

export interface RetryOptions {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryHeaderName?: string;
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 5,
  initialDelay: 1000, // 1 second
  maxDelay: 60000, // 1 minute
  backoffFactor: 2,
  retryHeaderName: 'x-retry-count'
};

/**
 * Calculate the delay for the next retry attempt using exponential backoff
 */
export function calculateBackoff(attempt: number, options: RetryOptions): number {
  const delay = Math.min(
    options.initialDelay * Math.pow(options.backoffFactor, attempt),
    options.maxDelay
  );
  
  // Add some jitter to prevent thundering herd problem
  return delay * (0.8 + Math.random() * 0.4);
}

/**
 * Get the current retry count from a message
 */
export function getRetryCount(message: ConsumeMessage, options: RetryOptions = DEFAULT_RETRY_OPTIONS): number {
  const headers = message.properties.headers || {};
  return (headers[options.retryHeaderName || 'x-retry-count'] as number) || 0;
}

/**
 * Set the retry count on a message
 */
export function setRetryCount(message: ConsumeMessage, count: number, options: RetryOptions = DEFAULT_RETRY_OPTIONS): void {
  if (!message.properties.headers) {
    message.properties.headers = {};
  }
  
  message.properties.headers[options.retryHeaderName || 'x-retry-count'] = count;
}

/**
 * Check if a message has exceeded the maximum number of retries
 */
export function hasExceededRetries(message: ConsumeMessage, options: RetryOptions = DEFAULT_RETRY_OPTIONS): boolean {
  const retryCount = getRetryCount(message, options);
  return retryCount >= options.maxRetries;
}

/**
 * Handle a failed message processing with retry logic
 */
export async function handleMessageFailure(
  message: ConsumeMessage,
  error: Error,
  republishCallback: (message: ConsumeMessage, delay: number) => Promise<void>,
  deadLetterCallback: (message: ConsumeMessage, error: Error) => Promise<void>,
  options: RetryOptions = DEFAULT_RETRY_OPTIONS
): Promise<void> {
  const retryCount = getRetryCount(message, options);
  
  if (retryCount < options.maxRetries) {
    // Increment retry count
    setRetryCount(message, retryCount + 1, options);
    
    // Calculate delay for next retry
    const delay = calculateBackoff(retryCount, options);
    
    logger.info(`Retrying message (attempt ${retryCount + 1}/${options.maxRetries}) after ${delay}ms delay`, {
      messageId: message.properties.messageId,
      error: error.message,
      retryCount: retryCount + 1,
      delay
    });
    
    // Republish the message with delay
    await republishCallback(message, delay);
  } else {
    logger.warn(`Message exceeded max retries (${options.maxRetries}), sending to dead letter queue`, {
      messageId: message.properties.messageId,
      error: error.message,
      retryCount
    });
    
    // Send to dead letter queue
    await deadLetterCallback(message, error);
  }
} 