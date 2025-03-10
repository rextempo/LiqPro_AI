import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createLogger } from '@liqpro/monitoring';
import { createApiRoutes, setupWebSocket } from './routes/api';
import { DataController } from './modules/data-controller';
import { MongoDBStorage } from './modules/storage/mongodb-storage';
import { Finality } from '@solana/web3.js';
import http from 'http';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const logger = createLogger('data-service:app');

// Configuration
const config = {
  port: parseInt(process.env.PORT || '3001'),
  rpcEndpoint: process.env.SOLANA_RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com',
  rpcCommitment: (process.env.SOLANA_RPC_COMMITMENT || 'confirmed') as Finality,
  meteoraProgramId: process.env.METEORA_PROGRAM_ID || '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    dbName: process.env.MONGODB_DB_NAME || 'liqpro_data',
  },
  collectionIntervals: {
    poolData: parseInt(process.env.POOL_DATA_INTERVAL || '60000'),
    events: parseInt(process.env.EVENTS_INTERVAL || '30000'),
    marketPrices: parseInt(process.env.MARKET_PRICES_INTERVAL || '300000'),
  },
  whaleThresholds: {
    swapUsdValue: parseInt(process.env.WHALE_SWAP_THRESHOLD || '10000'),
    depositUsdValue: parseInt(process.env.WHALE_DEPOSIT_THRESHOLD || '50000'),
    withdrawUsdValue: parseInt(process.env.WHALE_WITHDRAW_THRESHOLD || '50000'),
  }
};

// Initialize storage
const storage = new MongoDBStorage({
  uri: config.mongodb.uri,
  dbName: config.mongodb.dbName,
  collections: {
    poolData: 'pool_data',
    poolMetadata: 'pool_metadata',
    events: 'events',
    tokenPrices: 'token_prices',
    tokenMetadata: 'token_metadata',
    whaleActivities: 'whale_activities',
  },
  indexes: {
    enabled: true,
    ttl: {
      poolData: 60 * 60 * 24 * 30, // 30 days
      events: 60 * 60 * 24 * 90, // 90 days
      tokenPrices: 60 * 60 * 24 * 30, // 30 days
    }
  }
});

// Initialize data controller
const dataController = new DataController({
  rpcEndpoint: config.rpcEndpoint,
  rpcCommitment: config.rpcCommitment,
  meteoraProgramId: config.meteoraProgramId,
  collectionIntervals: config.collectionIntervals,
  whaleThresholds: config.whaleThresholds,
  storage,
});

// Create Express app
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api', createApiRoutes(dataController));

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', { error: err });
  res.status(500).json({ error: 'Internal server error' });
});

// Create HTTP server
const server = http.createServer(app);

// Setup WebSocket server
const wss = setupWebSocket(server, dataController);

// Start server
async function startServer() {
  try {
    // Connect to MongoDB
    await (storage as MongoDBStorage).connect();
    
    // Start data controller
    await dataController.start();
    
    // Start server
    server.listen(config.port, () => {
      logger.info(`Server started on port ${config.port}`);
    });
    
    // Handle shutdown
    const shutdown = async () => {
      logger.info('Shutting down...');
      
      // Stop data controller
      dataController.stop();
      
      // Close WebSocket server
      wss.close();
      
      // Close HTTP server
      server.close();
      
      // Disconnect from MongoDB
      await (storage as MongoDBStorage).disconnect();
      
      logger.info('Shutdown complete');
      process.exit(0);
    };
    
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error: any) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// Start server
startServer(); 