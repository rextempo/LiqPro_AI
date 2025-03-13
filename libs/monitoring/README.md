# @liqpro/monitoring

A comprehensive monitoring package for LiqPro services providing logging, health checks, metrics collection, and distributed tracing.

## Installation

```bash
npm install @liqpro/monitoring
```

## Features

- **Logging**: Structured logging with console and file transports
- **Health Checks**: Service health monitoring with dependency checks
- **Metrics**: Performance metrics collection and reporting
- **Tracing**: Distributed tracing for request flows

## Usage Examples

### Logging

```typescript
import { createLogger } from '@liqpro/monitoring';

const logger = createLogger({
  serviceName: 'my-service',
  logLevel: 'info',
  console: true,
  file: {
    enabled: true,
    path: './logs'
  }
});

logger.info('Application started', { version: '1.0.0' });
logger.error('Something went wrong', { error: new Error('Failed to connect') });
```

### Health Checks

```typescript
import { createHealthCheck } from '@liqpro/monitoring';

const checkHealth = createHealthCheck({
  serviceName: 'my-service',
  version: '1.0.0',
  dependencies: [
    {
      name: 'database',
      check: async () => {
        // Check database connection
        return { status: 'ok' };
      }
    },
    {
      name: 'redis',
      check: async () => {
        // Check redis connection
        return { status: 'ok' };
      }
    }
  ]
});

// In your API route handler
app.get('/health', async (req, res) => {
  const health = await checkHealth();
  res.status(health.status === 'ok' ? 200 : 500).json(health);
});
```

### Metrics

```typescript
import { MetricsCollector } from '@liqpro/monitoring';

const metrics = new MetricsCollector({
  serviceName: 'my-service'
});

// Record a metric
metrics.record('api_response_time', 120, { endpoint: '/users' });

// Increment a counter
metrics.increment('api_requests', 1, { endpoint: '/users', method: 'GET' });

// Time an async function
await metrics.timeAsync('database_query', async () => {
  // Database query logic
  return await db.query('SELECT * FROM users');
});

// Get all metrics
const allMetrics = metrics.getMetrics();
```

### Tracing

```typescript
import { Tracer } from '@liqpro/monitoring';

const tracer = new Tracer({
  serviceName: 'my-service'
});

// Trace an async function
const result = await tracer.traceAsync('process-user-request', async (context) => {
  // Add events to the span
  tracer.addEvent(context, 'validating-input', { userId: '123' });
  
  // Set tags
  tracer.setTag(context, 'userId', '123');
  
  // Your business logic
  const user = await fetchUser('123');
  
  tracer.addEvent(context, 'user-fetched');
  
  return user;
});
```

## Integration

This package can be integrated with various monitoring systems:

- Logs can be shipped to ELK stack or similar log aggregation systems
- Health checks can be used with Kubernetes liveness/readiness probes
- Metrics can be exported to Prometheus or similar monitoring systems
- Traces can be exported to distributed tracing systems like Jaeger or Zipkin

## License

MIT