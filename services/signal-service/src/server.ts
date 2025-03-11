/**
 * Signal Service Entry Point
 */
import { createServer } from 'http';
import { app, signalController, cacheService } from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { WebSocketService } from './services/websocket-service';

// Create HTTP server
const httpServer = createServer(app);

// Create WebSocket service
const webSocketService = new WebSocketService(httpServer);

// Start server
const server = httpServer.listen(config.port, config.host, async () => {
  logger.info(`Signal service started: http://${config.host}:${config.port}`);
  
  try {
    // Start signal controller
    await signalController.start();
    logger.info('Signal controller started');
    
    // Set WebSocket broadcast for generated signals
    signalController.onSignalsGenerated = (signals) => {
      webSocketService.broadcastSignals(signals);
    };
    
    // Warm up cache with empty data initially
    await cacheService.warmUp({
      signals: []
    });
    logger.info('Cache initialized');
    
    // Broadcast system message
    webSocketService.broadcastSystemMessage('Signal service started', 'info');
    
    // Log service info
    logger.info('Service information', {
      websocketClients: webSocketService.getConnectedClientsCount(),
      cacheMetrics: cacheService.getMetrics()
    });
  } catch (error) {
    logger.error('Failed to start signal controller', { error });
    // Close server if signal controller fails to start
    server.close();
  }
});

// Handle process termination signals
process.on('SIGTERM', () => {
  logger.info('Received SIGTERM signal, gracefully shutting down');
  
  // Broadcast system message
  webSocketService.broadcastSystemMessage('Signal service is shutting down', 'warning');
  
  // Stop signal controller
  signalController.stop();
  
  // Close cache service
  cacheService.close().catch(err => {
    logger.error('Error closing cache service', { error: err });
  });
  
  // Close server
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
  
  // Force exit if not closed within 10 seconds
  setTimeout(() => {
    logger.error('Server shutdown timed out, forcing exit');
    process.exit(1);
  }, 10000);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error });
  
  // Broadcast system message
  webSocketService.broadcastSystemMessage('Server error occurred, restarting soon', 'error');
  
  // Stop signal controller
  signalController.stop();
  
  // Close cache service
  cacheService.close().catch(err => {
    logger.error('Error closing cache service', { error: err });
  });
  
  // Close server
  server.close(() => {
    logger.info('Server closed');
    process.exit(1);
  });
  
  // Force exit if not closed within 10 seconds
  setTimeout(() => {
    logger.error('Server shutdown timed out, forcing exit');
    process.exit(1);
  }, 10000);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection', { reason, promise });
}); 