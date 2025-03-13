import { createLogger } from './logger';

export interface SpanContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
}

export interface TracingConfig {
  serviceName: string;
  logger?: ReturnType<typeof createLogger>;
}

export interface SpanOptions {
  name: string;
  context?: SpanContext;
  tags?: Record<string, string | number | boolean>;
}

export interface SpanData {
  name: string;
  context: SpanContext;
  startTime: number;
  endTime?: number;
  duration?: number;
  tags: Record<string, string | number | boolean>;
  events: Array<{
    name: string;
    timestamp: number;
    attributes?: Record<string, string | number | boolean>;
  }>;
  status: 'unfinished' | 'success' | 'error';
  error?: Error;
}

/**
 * Simple implementation of distributed tracing
 */
export class Tracer {
  private serviceName: string;
  private logger?: ReturnType<typeof createLogger>;
  private activeSpans: Map<string, SpanData> = new Map();
  
  constructor(config: TracingConfig) {
    this.serviceName = config.serviceName;
    this.logger = config.logger;
  }
  
  /**
   * Start a new span
   * @param options Span options
   * @returns The span context
   */
  startSpan(options: SpanOptions): SpanContext {
    const context = options.context || {
      traceId: this.generateId(),
      spanId: this.generateId(),
    };
    
    const spanId = this.generateId();
    const spanContext: SpanContext = {
      traceId: context.traceId,
      spanId,
      parentSpanId: options.context?.spanId,
    };
    
    const span: SpanData = {
      name: options.name,
      context: spanContext,
      startTime: Date.now(),
      tags: {
        service: this.serviceName,
        ...(options.tags || {}),
      },
      events: [],
      status: 'unfinished',
    };
    
    this.activeSpans.set(spanId, span);
    
    this.logger?.debug(`Started span: ${options.name}`, {
      traceId: spanContext.traceId,
      spanId: spanContext.spanId,
      parentSpanId: spanContext.parentSpanId,
    });
    
    return spanContext;
  }
  
  /**
   * End a span
   * @param context The span context
   * @param error Optional error if the span failed
   */
  endSpan(context: SpanContext, error?: Error): void {
    const span = this.activeSpans.get(context.spanId);
    
    if (!span) {
      this.logger?.warn(`Attempted to end non-existent span`, {
        spanId: context.spanId,
        traceId: context.traceId,
      });
      return;
    }
    
    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;
    span.status = error ? 'error' : 'success';
    
    if (error) {
      span.error = error;
      span.tags.error = true;
      span.tags.errorMessage = error.message;
    }
    
    this.logger?.debug(`Ended span: ${span.name}`, {
      traceId: context.traceId,
      spanId: context.spanId,
      duration: span.duration,
      status: span.status,
      error: error?.message,
    });
    
    this.activeSpans.delete(context.spanId);
  }
  
  /**
   * Add an event to a span
   * @param context The span context
   * @param name Event name
   * @param attributes Optional event attributes
   */
  addEvent(
    context: SpanContext, 
    name: string, 
    attributes?: Record<string, string | number | boolean>
  ): void {
    const span = this.activeSpans.get(context.spanId);
    
    if (!span) {
      this.logger?.warn(`Attempted to add event to non-existent span`, {
        spanId: context.spanId,
        traceId: context.traceId,
        eventName: name,
      });
      return;
    }
    
    span.events.push({
      name,
      timestamp: Date.now(),
      attributes,
    });
    
    this.logger?.debug(`Added event to span: ${name}`, {
      traceId: context.traceId,
      spanId: context.spanId,
      eventName: name,
    });
  }
  
  /**
   * Add a tag to a span
   * @param context The span context
   * @param key Tag key
   * @param value Tag value
   */
  setTag(
    context: SpanContext, 
    key: string, 
    value: string | number | boolean
  ): void {
    const span = this.activeSpans.get(context.spanId);
    
    if (!span) {
      this.logger?.warn(`Attempted to set tag on non-existent span`, {
        spanId: context.spanId,
        traceId: context.traceId,
        key,
      });
      return;
    }
    
    span.tags[key] = value;
  }
  
  /**
   * Trace an async function execution
   * @param name Span name
   * @param fn Function to trace
   * @param options Optional span options
   * @returns The result of the function
   */
  async traceAsync<T>(
    name: string, 
    fn: (context: SpanContext) => Promise<T>, 
    options: Omit<SpanOptions, 'name'> = {}
  ): Promise<T> {
    const context = this.startSpan({ name, ...options });
    
    try {
      const result = await fn(context);
      this.endSpan(context);
      return result;
    } catch (error) {
      this.endSpan(context, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
  
  /**
   * Generate a random ID for traces and spans
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
}