// Export all modules from the common library

// Logger
export * from './logger';

// Messaging
export * from './messaging';

// HTTP utilities
export * from './http';

// Error handling
export * from './errors';

// Configuration
export * from './config';

// Utilities
export * from './utils';

// Types
export interface HealthCheck {
  status: 'ok' | 'error';
  message?: string;
}

// Constants
export const DEFAULT_HEALTH_CHECK: HealthCheck = {
  status: 'ok',
};

// Utilities
export function isHealthy(check: HealthCheck): boolean {
  return check.status === 'ok';
}
