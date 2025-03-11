# Cruise Module

## Overview

The Cruise Module is a critical component of the LiqPro agent-engine service that manages automated operation of Agent lifecycle. It provides automatic position maintenance, health monitoring, and optimization for liquidity positions in Meteora DLMM pools on Solana.

## Core Components

The Cruise Module consists of three main components:

1. **CruiseModule**: Central control component that manages the overall automation process and coordinates with other services.
2. **ScheduledTaskManager**: Handles scheduling and execution of recurring and one-time tasks.
3. **PositionOptimizer**: Analyzes positions and calculates optimal adjustments.

## Features

The Cruise Module implements the following key features:

- **Automated Health Checks**: Periodically monitors the health of Agent positions
- **Position Optimization**: Calculates and executes optimal position adjustments based on market signals
- **Market Change Detection**: Monitors significant market changes and responds accordingly
- **State-Aware Task Management**: Adapts task execution based on Agent state (running, waiting, stopped, etc.)
- **Risk Integration**: Works in coordination with the Risk Controller to ensure positions remain safe

## Integration

The Cruise Module integrates with the following components:

- **Agent State Machine**: Monitors and responds to Agent state changes
- **Transaction Executor**: Executes position adjustment transactions
- **Funds Manager**: Tracks and manages funds and positions
- **Risk Controller**: Coordinates risk management actions
- **Scoring Service**: Obtains health metrics and recommendations

## Usage

The Cruise Module is initialized and managed through the CruiseService class, which provides a simple interface for the rest of the application.

### Starting/Stopping

```typescript
// Get the CruiseService instance
const cruiseService = CruiseService.getInstance(transactionExecutor, fundsManager, riskController);

// Start the service
await cruiseService.start();

// Stop the service
await cruiseService.stop();
```

### Registering Agents

```typescript
// Register an agent
cruiseService.registerAgent(agentId, stateMachine);

// Unregister an agent
cruiseService.unregisterAgent(agentId);
```

### Manual Operations

```typescript
// Trigger a manual health check
await cruiseService.triggerHealthCheck(agentId);

// Trigger a manual position optimization
await cruiseService.triggerOptimization(agentId);
```

## Configuration

Configuration is managed through environment variables and the `config.ts` file. Key configuration parameters:

- `CRUISE_HEALTH_CHECK_INTERVAL`: Interval between position health checks (default: 1 hour)
- `CRUISE_OPTIMIZATION_INTERVAL`: Interval between position optimizations (default: 24 hours)
- `CRUISE_ADJUSTMENT_INTERVAL`: Interval between checking for significant changes (default: 6 hours)

## API Endpoints

The Cruise Module exposes the following API endpoints:

- `POST /cruise/start`: Start the Cruise service
- `POST /cruise/stop`: Stop the Cruise service
- `POST /cruise/agent/:agentId/health-check`: Trigger a health check for a specific agent
- `POST /cruise/agent/:agentId/optimize`: Trigger position optimization for a specific agent

## Logging

All Cruise Module operations are logged with appropriate severity levels for monitoring and debugging. Log entries include:

- Task scheduling and execution
- Position adjustments
- Health check results
- Error conditions

## Security Considerations

The Cruise Module implements the following security measures:

- State validation before any position adjustment
- Transaction validation and verification
- Configurable risk thresholds and adjustment limits
- Proper exception handling to prevent service disruption

## Error Handling

The Cruise Module includes robust error handling:

- Failed transaction retry with exponential backoff
- Graceful degradation of service when external dependencies fail
- Recovery mechanisms for interrupted operations
- Detailed error logging for troubleshooting
