export interface HealthCheck {
  status: 'ok' | 'error';
  message?: string;
}
export declare const DEFAULT_HEALTH_CHECK: HealthCheck;
export declare function isHealthy(check: HealthCheck): boolean;
