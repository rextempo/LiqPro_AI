import { createLogger, LoggerConfig } from './logger';

export interface HealthCheckConfig {
  serviceName: string;
  version: string;
  dependencies?: {
    [key: string]: () => Promise<boolean>;
  };
  logger?: ReturnType<typeof createLogger>;
}

export interface HealthStatus {
  status: 'ok' | 'error';
  service: string;
  version: string;
  timestamp: string;
  dependencies?: {
    [key: string]: boolean;
  };
  error?: string;
}

/**
 * Creates a health check function for the service
 * @param config Health check configuration
 * @returns Function that returns the health status
 */
export function createHealthCheck(config: HealthCheckConfig) {
  const { serviceName, version, dependencies = {}, logger } = config;
  
  return async (): Promise<HealthStatus> => {
    try {
      const dependencyStatus: { [key: string]: boolean } = {};
      
      // Check all dependencies
      if (Object.keys(dependencies).length > 0) {
        await Promise.all(
          Object.entries(dependencies).map(async ([name, check]) => {
            try {
              dependencyStatus[name] = await check();
            } catch (error) {
              logger?.error(`Health check for dependency ${name} failed`, { error });
              dependencyStatus[name] = false;
            }
          })
        );
      }
      
      // If any dependency check failed, return error status
      const hasDependencyFailure = Object.values(dependencyStatus).some(status => !status);
      
      return {
        status: hasDependencyFailure ? 'error' : 'ok',
        service: serviceName,
        version,
        timestamp: new Date().toISOString(),
        dependencies: Object.keys(dependencies).length > 0 ? dependencyStatus : undefined
      };
    } catch (error) {
      logger?.error('Health check failed', { error });
      
      return {
        status: 'error',
        service: serviceName,
        version,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error)
      };
    }
  };
} 