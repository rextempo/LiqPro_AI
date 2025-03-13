import { Request, Response } from 'express';
export declare enum SystemComponent {
    DATABASE = "database",
    MESSAGE_QUEUE = "message_queue",
    API_SERVICE = "api_service",
    DATA_SERVICE = "data_service",
    SIGNAL_SERVICE = "signal_service",
    SCORING_SERVICE = "scoring_service",
    AGENT_ENGINE = "agent_engine"
}
export declare enum HealthStatus {
    HEALTHY = "healthy",
    DEGRADED = "degraded",
    UNHEALTHY = "unhealthy"
}
export interface HealthCheckResult {
    status: HealthStatus;
    details?: string;
    timestamp: number;
}
export declare function initializeHealthMonitoring(): void;
export declare function updateComponentHealth(component: SystemComponent, status: HealthStatus, details?: string): void;
export declare function getComponentHealth(component: SystemComponent): HealthCheckResult | undefined;
export declare function getAllComponentsHealth(): Record<string, HealthCheckResult>;
export declare function getSystemHealth(): HealthStatus;
export declare function healthCheckMiddleware(): (req: Request, res: Response) => Promise<void>;
export declare function setupHealthEndpoint(app: any): void;
export declare function checkMessageQueueHealth(isConnected: boolean): Promise<void>;
export declare function checkExternalServiceHealth(component: SystemComponent, url: string, timeout?: number): Promise<void>;
export declare function startHealthChecks(checkInterval?: number): NodeJS.Timeout;
export declare function stopHealthChecks(interval: NodeJS.Timeout): void;
declare const _default: {
    initializeHealthMonitoring: typeof initializeHealthMonitoring;
    updateComponentHealth: typeof updateComponentHealth;
    getComponentHealth: typeof getComponentHealth;
    getAllComponentsHealth: typeof getAllComponentsHealth;
    getSystemHealth: typeof getSystemHealth;
    healthCheckMiddleware: typeof healthCheckMiddleware;
    setupHealthEndpoint: typeof setupHealthEndpoint;
    checkMessageQueueHealth: typeof checkMessageQueueHealth;
    checkExternalServiceHealth: typeof checkExternalServiceHealth;
    startHealthChecks: typeof startHealthChecks;
    stopHealthChecks: typeof stopHealthChecks;
    SystemComponent: typeof SystemComponent;
    HealthStatus: typeof HealthStatus;
};
export default _default;
