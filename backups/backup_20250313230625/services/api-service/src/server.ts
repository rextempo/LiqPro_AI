import { createLogger } from '@liqpro/monitoring';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import http from 'http';
import { createApiRoutes, setupWebSocket } from './routes/api';
import { DataController } from './modules/data-controller';
import { MongoDBStorage } from './modules/storage/mongodb-storage';
import { Finality } from '@solana/web3.js';
import mongoose from 'mongoose';
import axios from 'axios';

// Load environment variables
dotenv.config();

const logger = createLogger({
  serviceName: 'api-service:server',
  level: 'info',
  console: true
});

// Configuration
const config = {
  port: parseInt(process.env.PORT || '3000'),
  rpcEndpoint: process.env.SOLANA_RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com',
  rpcBackupEndpoint: process.env.SOLANA_RPC_BACKUP_ENDPOINT || 'https://soft-snowy-asphalt.solana-mainnet.quiknode.pro/48639631c6e4e81af5a0b8e228f6f9a0329154b7/',
  rpcCommitment: (process.env.SOLANA_RPC_COMMITMENT || 'confirmed') as Finality,
  meteoraProgramId:
    process.env.METEORA_PROGRAM_ID || '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/liqpro',
    dbName: process.env.MONGODB_DB_NAME || 'liqpro',
  },
  services: {
    dataServiceUrl: process.env.DATA_SERVICE_URL || 'http://data-service:3000',
    signalServiceUrl: process.env.SIGNAL_SERVICE_URL || 'http://signal-service:3000',
    scoringServiceUrl: process.env.SCORING_SERVICE_URL || 'http://scoring-service:3000',
    agentServiceUrl: process.env.AGENT_SERVICE_URL || 'http://agent-engine:3000',
  }
};

// Initialize storage
const storage = new MongoDBStorage({
  uri: config.mongodb.uri,
  dbName: config.mongodb.dbName,
  collections: {
    users: 'users',
    agents: 'agents',
    strategies: 'strategies',
    transactions: 'transactions',
    notifications: 'notifications',
  },
  indexes: {
    enabled: true,
    ttl: {
      notifications: 60 * 60 * 24 * 30, // 30 days
    },
  },
});

// Initialize data controller
const dataController = new DataController({
  rpcEndpoint: config.rpcEndpoint,
  rpcBackupEndpoint: config.rpcBackupEndpoint,
  rpcCommitment: config.rpcCommitment,
  meteoraProgramId: config.meteoraProgramId,
  services: config.services,
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

// Health check endpoint
app.get('/health', async (req: express.Request, res: express.Response) => {
  try {
    // 检查 MongoDB 连接
    const isMongoConnected = mongoose.connection.readyState === 1;
    
    // 检查依赖服务
    const services = {
      dataService: await checkServiceHealth(config.services.dataServiceUrl),
      signalService: await checkServiceHealth(config.services.signalServiceUrl),
      scoringService: await checkServiceHealth(config.services.scoringServiceUrl),
      agentService: await checkServiceHealth(config.services.agentServiceUrl),
    };
    
    const allServicesHealthy = Object.values(services).every(status => status === 'ok');
    
    res.status(200).json({
      status: isMongoConnected && allServicesHealthy ? 'ok' : 'degraded',
      service: 'api-service',
      version: process.env.npm_package_version || '1.0.0',
      timestamp: new Date().toISOString(),
      dependencies: {
        mongodb: isMongoConnected ? 'ok' : 'error',
        ...services
      }
    });
  } catch (error) {
    logger.error('Health check failed', { error });
    
    res.status(500).json({
      status: 'error',
      service: 'api-service',
      timestamp: new Date().toISOString(),
      error: 'Failed to perform health check'
    });
  }
});

/**
 * Check the health of a service
 */
async function checkServiceHealth(url: string): Promise<'ok' | 'error'> {
  try {
    const response = await axios.get(`${url}/health`, { timeout: 2000 });
    return response.status === 200 && response.data.status === 'ok' ? 'ok' : 'error';
  } catch (error) {
    return 'error';
  }
}

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
    await storage.connect();
    
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
      await storage.disconnect();
      
      logger.info('Shutdown complete');
      process.exit(0);
    };
    
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// Start server
startServer(); 