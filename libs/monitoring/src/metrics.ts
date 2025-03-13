import { createLogger } from './logger';

export interface MetricsConfig {
  serviceName: string;
  logger?: ReturnType<typeof createLogger>;
}

export interface Metric {
  name: string;
  value: number;
  tags?: Record<string, string>;
  timestamp?: number;
}

/**
 * Simple metrics collector for tracking performance metrics
 */
export class MetricsCollector {
  private metrics: Map<string, Metric> = new Map();
  private serviceName: string;
  private logger?: ReturnType<typeof createLogger>;
  
  constructor(config: MetricsConfig) {
    this.serviceName = config.serviceName;
    this.logger = config.logger;
  }
  
  /**
   * Record a metric value
   * @param name Metric name
   * @param value Metric value
   * @param tags Optional tags for the metric
   */
  record(name: string, value: number, tags?: Record<string, string>): void {
    const metricKey = this.getMetricKey(name, tags);
    
    this.metrics.set(metricKey, {
      name,
      value,
      tags,
      timestamp: Date.now()
    });
    
    this.logger?.debug(`Recorded metric: ${name}`, { 
      metric: name, 
      value, 
      tags 
    });
  }
  
  /**
   * Increment a counter metric
   * @param name Metric name
   * @param increment Amount to increment (default: 1)
   * @param tags Optional tags for the metric
   */
  increment(name: string, increment: number = 1, tags?: Record<string, string>): void {
    const metricKey = this.getMetricKey(name, tags);
    const existing = this.metrics.get(metricKey);
    
    const newValue = (existing?.value || 0) + increment;
    
    this.metrics.set(metricKey, {
      name,
      value: newValue,
      tags,
      timestamp: Date.now()
    });
    
    this.logger?.debug(`Incremented metric: ${name}`, { 
      metric: name, 
      value: newValue, 
      increment,
      tags 
    });
  }
  
  /**
   * Time a function execution and record the duration
   * @param name Metric name
   * @param fn Function to time
   * @param tags Optional tags for the metric
   * @returns The result of the function
   */
  async timeAsync<T>(name: string, fn: () => Promise<T>, tags?: Record<string, string>): Promise<T> {
    const start = Date.now();
    try {
      return await fn();
    } finally {
      const duration = Date.now() - start;
      this.record(`${name}_duration_ms`, duration, tags);
    }
  }
  
  /**
   * Get all recorded metrics
   * @returns Array of all metrics
   */
  getMetrics(): Metric[] {
    return Array.from(this.metrics.values());
  }
  
  /**
   * Clear all recorded metrics
   */
  clear(): void {
    this.metrics.clear();
  }
  
  /**
   * Generate a unique key for a metric based on name and tags
   */
  private getMetricKey(name: string, tags?: Record<string, string>): string {
    if (!tags || Object.keys(tags).length === 0) {
      return name;
    }
    
    const sortedTags = Object.entries(tags)
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([key, value]) => `${key}:${value}`)
      .join(',');
      
    return `${name}[${sortedTags}]`;
  }
} 