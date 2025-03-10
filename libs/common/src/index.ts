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
