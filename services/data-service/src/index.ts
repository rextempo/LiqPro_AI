import express, { Request, Response } from 'express';
import { DEFAULT_HEALTH_CHECK } from '@liqpro/common';
import { checkDatabaseConnection } from '@liqpro/database';
import app from './app';
import { createLogger } from '@liqpro/monitoring';

const logger = createLogger('data-service:index');
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.get('/health', async (_req: Request, res: Response) => {
  const dbHealth = await checkDatabaseConnection();
  res.json({
    ...DEFAULT_HEALTH_CHECK,
    database: dbHealth,
  });
});

// Start the server
app.listen(PORT, () => {
  logger.info(`Data service listening on port ${PORT}`);
});

// Handle uncaught exceptions
process.on('uncaughtException', error => {
  logger.error('Uncaught exception', { error });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection', { reason });
  process.exit(1);
});
