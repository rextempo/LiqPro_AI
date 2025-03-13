declare module '@liqpro/monitoring' {
  import { RequestHandler } from 'express';

  interface Logger {
    debug(message: string, meta?: Record<string, any>): void;
    info(message: string, meta?: Record<string, any>): void;
    warn(message: string, meta?: Record<string, any>): void;
    error(message: string, meta?: Record<string, any>): void;
  }

  interface MetricsRegistry {
    contentType: string;
    metrics(): Promise<string>;
    register(name: string, help: string, labelNames?: string[]): void;
    increment(name: string, labels?: Record<string, string>, value?: number): void;
    decrement(name: string, labels?: Record<string, string>, value?: number): void;
    set(name: string, value: number, labels?: Record<string, string>): void;
    startTimer(name: string, labels?: Record<string, string>): () => void;
  }

  export function createLogger(namespace: string): Logger;
  export const metricsRegistry: MetricsRegistry;
  export function createMetricsMiddleware(serviceName: string): RequestHandler;
  export function createErrorLoggingMiddleware(serviceName: string): RequestHandler;
}
