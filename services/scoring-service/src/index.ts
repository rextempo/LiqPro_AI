import express from 'express';
import { createLogger } from '@liqpro/monitoring';
import { ScoringController } from './controllers/scoring-controller';
import { createApiRoutes } from './routes/api';
import { ScoringServiceConfig } from './types';

const logger = createLogger('scoring-service');
const app = express();
const port = process.env.PORT || 3003;

// Configure middleware
app.use(express.json());

// Configure scoring service
const config: ScoringServiceConfig = {
  dataServiceUrl: process.env.DATA_SERVICE_URL || 'http://localhost:3001',
  signalServiceUrl: process.env.SIGNAL_SERVICE_URL || 'http://localhost:3002',
  scoringInterval: parseInt(process.env.SCORING_INTERVAL || '300000'), // 5 minutes by default
  historyRetentionPeriod: parseInt(process.env.HISTORY_RETENTION_PERIOD || '86400000'), // 24 hours by default
  riskThresholds: {
    extremelyLowRisk: parseFloat(process.env.THRESHOLD_EXTREMELY_LOW_RISK || '4.5'),
    lowRisk: parseFloat(process.env.THRESHOLD_LOW_RISK || '3.5'),
    mediumRisk: parseFloat(process.env.THRESHOLD_MEDIUM_RISK || '2.5'),
    highRisk: parseFloat(process.env.THRESHOLD_HIGH_RISK || '1.5'),
  },
  actionThresholds: {
    monitor: parseFloat(process.env.THRESHOLD_ACTION_MONITOR || '3.5'),
    rebalance: parseFloat(process.env.THRESHOLD_ACTION_REBALANCE || '3.0'),
    partialExit: parseFloat(process.env.THRESHOLD_ACTION_PARTIAL_EXIT || '2.5'),
    fullExit: parseFloat(process.env.THRESHOLD_ACTION_FULL_EXIT || '1.5'),
  },
};

// Initialize scoring controller
const scoringController = new ScoringController(config);

// Set up API routes
app.use('/api', createApiRoutes(scoringController));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'scoring-service',
  });
});

// Start the service
app.listen(port, async () => {
  logger.info(`Scoring service listening at http://localhost:${port}`);
  
  try {
    // Start the scoring controller
    await scoringController.start();
    logger.info('Scoring controller started successfully');
  } catch (error) {
    logger.error(`Failed to start scoring controller: ${error}`);
  }
});

// Handle shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  scoringController.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  scoringController.stop();
  process.exit(0);
});
