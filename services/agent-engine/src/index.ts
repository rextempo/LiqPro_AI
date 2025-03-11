import express, { Request, Response } from 'express';
import { DEFAULT_HEALTH_CHECK } from '@liqpro/common';
import { CruiseService } from './services/CruiseService';
import { config } from './config';
import { Logger } from './utils/logger';
import { TransactionExecutor } from './core/TransactionExecutor';
import { FundsManager } from './core/FundsManager';
import { RiskController, AgentRiskController } from './core/RiskController';

// Initialize logger
const logger = new Logger({ module: 'AgentEngine' });

// Initialize core components
const transactionExecutor = new TransactionExecutor();
const fundsManager = new FundsManager();
const riskController = new AgentRiskController(
  logger,
  transactionExecutor,
  fundsManager
);

// Initialize services
const cruiseService = CruiseService.getInstance(
  transactionExecutor,
  fundsManager,
  riskController
);

// Initialize Express app
const app = express();
const port = config.service.port;

app.use(express.json());

// Health check endpoint
app.get('/health', async (_req: Request, res: Response) => {
  res.json({
    ...DEFAULT_HEALTH_CHECK,
    service: 'agent-engine',
    cruise: cruiseService.getStatus()
  });
});

// Cruise service endpoints
app.post('/cruise/start', async (_req: Request, res: Response) => {
  try {
    await cruiseService.start();
    res.json({ success: true, message: 'Cruise service started' });
  } catch (error) {
    logger.error('Failed to start cruise service', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start cruise service',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

app.post('/cruise/stop', async (_req: Request, res: Response) => {
  try {
    await cruiseService.stop();
    res.json({ success: true, message: 'Cruise service stopped' });
  } catch (error) {
    logger.error('Failed to stop cruise service', error);
    res.status(500).json({
      success: false,
      message: 'Failed to stop cruise service',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

app.post('/cruise/agent/:agentId/health-check', async (req: Request, res: Response) => {
  const { agentId } = req.params;
  try {
    const result = await cruiseService.triggerHealthCheck(agentId);
    if (result) {
      res.json({ success: true, message: 'Health check triggered' });
    } else {
      res.status(400).json({ success: false, message: 'Failed to trigger health check' });
    }
  } catch (error) {
    logger.error(`Failed to trigger health check for agent ${agentId}`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger health check',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

app.post('/cruise/agent/:agentId/optimize', async (req: Request, res: Response) => {
  const { agentId } = req.params;
  try {
    const result = await cruiseService.triggerOptimization(agentId);
    if (result) {
      res.json({ success: true, message: 'Optimization triggered' });
    } else {
      res.status(400).json({ success: false, message: 'Failed to trigger optimization' });
    }
  } catch (error) {
    logger.error(`Failed to trigger optimization for agent ${agentId}`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger optimization',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Start the server
const server = app.listen(port, async () => {
  logger.info(`Agent engine listening at http://localhost:${port}`);
  
  // Start the cruise service
  try {
    await cruiseService.start();
    logger.info('Cruise service started automatically on server startup');
  } catch (error) {
    logger.error('Failed to start cruise service on server startup', error);
  }
});

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  // Stop the cruise service
  try {
    await cruiseService.stop();
    logger.info('Cruise service stopped successfully');
  } catch (error) {
    logger.error('Error stopping cruise service', error);
  }
  
  // Close the server
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
  
  // Force close after 10s
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
});
