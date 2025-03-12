# Agent Engine Monitoring Module

This module provides comprehensive monitoring capabilities for the Agent Engine service, including structured logging, metrics collection, and health monitoring.

## Features

### Structured Logging

- Uses Winston for powerful, structured logging
- Supports multiple log levels (ERROR, WARN, INFO, HTTP, DEBUG)
- Includes correlation IDs for request tracing
- Logs to both console and files with rotation
- Provides middleware for Express request logging

### Metrics Collection

- Uses Prometheus for metrics collection and exposure
- Provides HTTP metrics (request counts, durations)
- Tracks message queue operations (connection status, message counts)
- Monitors agent operations (counts, durations)
- Includes system health metrics
- Exposes metrics via `/metrics` endpoint for Prometheus scraping

### Health Monitoring

- Tracks health status of all system components
- Provides detailed health information via `/health` and `/health/detailed` endpoints
- Supports periodic health checks of external services
- Updates Prometheus metrics based on health status
- Gracefully handles service startup and shutdown

## Usage

### Initialization

```typescript
import express from 'express';
import {
  createLogger,
  metricsMiddleware,
  setupMetricsEndpoint,
  initializeHealthMonitoring,
  setupHealthEndpoint,
  startHealthChecks
} from './monitoring';

const app = express();
const logger = createLogger('MyService');

// Add metrics middleware
app.use(metricsMiddleware());

// Initialize health monitoring
initializeHealthMonitoring();

// Setup endpoints
setupMetricsEndpoint(app);
setupHealthEndpoint(app);

// Start periodic health checks
const healthCheckInterval = startHealthChecks(60000); // Check every minute
```

### Logging

```typescript
import { createLogger } from './monitoring';

const logger = createLogger('MyComponent');

logger.info('Application started', { version: '1.0.0' });
logger.error('Failed to connect to database', { error: err });
logger.debug('Processing item', { itemId: '123' });
```

### Metrics

```typescript
import {
  httpRequestsTotal,
  mqMessagesPublishedTotal,
  agentOperationsTotal
} from './monitoring';

// Increment HTTP request counter
httpRequestsTotal.inc({
  method: 'GET',
  route: '/api/agents',
  status_code: 200
});

// Increment message counter
mqMessagesPublishedTotal.inc({
  exchange: 'liqpro.events',
  routing_key: 'agent.created'
});

// Increment agent operations counter
agentOperationsTotal.inc({
  operation: 'start',
  status: 'success'
});
```

### Health Monitoring

```typescript
import {
  updateComponentHealth,
  checkExternalServiceHealth,
  SystemComponent,
  HealthStatus
} from './monitoring';

// Update component health
updateComponentHealth(
  SystemComponent.DATABASE,
  HealthStatus.HEALTHY,
  'Connected successfully'
);

// Check external service health
await checkExternalServiceHealth(
  SystemComponent.API_SERVICE,
  'http://api-service:3000/health'
);
```

## Endpoints

- `/metrics` - Prometheus metrics endpoint
- `/health` - Basic health check endpoint
- `/health/detailed` - Detailed health information

## Configuration

The monitoring module can be configured via environment variables:

- `LOG_LEVEL` - Set the logging level (default: 'info')
- `LOG_FILE_PATH` - Path for log files (default: 'logs')
- `HEALTH_CHECK_INTERVAL` - Interval for health checks in ms (default: 60000)
- `API_SERVICE_URL` - URL for API service health checks
- `DATA_SERVICE_URL` - URL for Data service health checks
- `SIGNAL_SERVICE_URL` - URL for Signal service health checks
- `SCORING_SERVICE_URL` - URL for Scoring service health checks

## Best Practices

1. **Always use structured logging** - Include relevant context in log messages
2. **Monitor critical operations** - Track important metrics for business operations
3. **Set appropriate alert thresholds** - Configure alerts based on metrics
4. **Use correlation IDs** - For tracing requests across services
5. **Check health of dependencies** - Monitor external services your application depends on 