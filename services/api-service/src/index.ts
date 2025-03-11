/**
 * API Service Entry Point
 */
import * as dotenv from 'dotenv';
import { createServer } from './server';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

// Get port from environment or use default
const PORT = process.env.PORT || 3002;

// Create and start server
const server = createServer();
server.listen(PORT, () => {
  logger.info(`API Service running on port ${PORT}`);
  logger.info(`Swagger documentation available at http://localhost:${PORT}/api-docs`);
}); 