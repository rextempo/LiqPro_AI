import express from 'express';
import http from 'http';
import WebSocket from 'ws';
import { createLogger } from '@liqpro/monitoring';
import { DataController } from '../modules/data-controller';

const logger = createLogger({
  serviceName: 'api-service:routes',
  level: 'info',
  console: true
});

/**
 * Create API routes
 */
export function createApiRoutes(dataController: DataController): express.Router {
  const router = express.Router();

  // Pools routes
  router.get('/pools', async (req: express.Request, res: express.Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      
      const pools = await dataController.getPools({ limit, offset });
      
      res.status(200).json(pools);
    } catch (error) {
      logger.error('Failed to get pools', { error });
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('connect ECONNREFUSED') || 
          errorMessage.includes('getaddrinfo') || errorMessage.includes('network error')) {
        res.status(503).json({ 
          error: 'Data service is currently unavailable',
          code: 'SERVICE_UNAVAILABLE'
        });
      } else {
        res.status(500).json({ 
          error: 'Failed to get pools',
          code: 'INTERNAL_SERVER_ERROR'
        });
      }
    }
  });

  router.get('/pools/:address', async (req: express.Request, res: express.Response) => {
    try {
      const { address } = req.params;
      
      const pool = await dataController.getPoolByAddress(address);
      
      if (!pool) {
        res.status(404).json({ 
          error: 'Pool not found',
          code: 'RESOURCE_NOT_FOUND'
        });
        return;
      }
      
      res.status(200).json(pool);
    } catch (error) {
      logger.error('Failed to get pool by address', { error });
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('connect ECONNREFUSED') || 
          errorMessage.includes('getaddrinfo') || errorMessage.includes('network error')) {
        res.status(503).json({ 
          error: 'Data service is currently unavailable',
          code: 'SERVICE_UNAVAILABLE'
        });
      } else {
        res.status(500).json({ 
          error: 'Failed to get pool by address',
          code: 'INTERNAL_SERVER_ERROR'
        });
      }
    }
  });

  router.get('/pools/:address/liquidity', async (req: express.Request, res: express.Response) => {
    try {
      const { address } = req.params;
      
      const liquidity = await dataController.getPoolLiquidityDistribution(address);
      
      if (!liquidity) {
        res.status(404).json({ 
          error: 'Liquidity distribution not found',
          code: 'RESOURCE_NOT_FOUND'
        });
        return;
      }
      
      res.status(200).json(liquidity);
    } catch (error) {
      logger.error('Failed to get pool liquidity distribution', { error });
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('connect ECONNREFUSED') || 
          errorMessage.includes('getaddrinfo') || errorMessage.includes('network error')) {
        res.status(503).json({ 
          error: 'Data service is currently unavailable',
          code: 'SERVICE_UNAVAILABLE'
        });
      } else {
        res.status(500).json({ 
          error: 'Failed to get pool liquidity distribution',
          code: 'INTERNAL_SERVER_ERROR'
        });
      }
    }
  });

  // Signals routes
  router.get('/signals', async (req: express.Request, res: express.Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      
      const signals = await dataController.getSignals({ limit, offset });
      
      res.status(200).json(signals);
    } catch (error) {
      logger.error('Failed to get signals', { error });
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('connect ECONNREFUSED') || 
          errorMessage.includes('getaddrinfo') || errorMessage.includes('network error')) {
        res.status(503).json({ 
          error: 'Signal service is currently unavailable',
          code: 'SERVICE_UNAVAILABLE'
        });
      } else {
        res.status(500).json({ 
          error: 'Failed to get signals',
          code: 'INTERNAL_SERVER_ERROR'
        });
      }
    }
  });

  router.get('/signals/:id', async (req: express.Request, res: express.Response) => {
    try {
      const { id } = req.params;
      
      const signal = await dataController.getSignalById(id);
      
      if (!signal) {
        res.status(404).json({ 
          error: 'Signal not found',
          code: 'RESOURCE_NOT_FOUND'
        });
        return;
      }
      
      res.status(200).json(signal);
    } catch (error) {
      logger.error('Failed to get signal by ID', { error });
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('connect ECONNREFUSED') || 
          errorMessage.includes('getaddrinfo') || errorMessage.includes('network error')) {
        res.status(503).json({ 
          error: 'Signal service is currently unavailable',
          code: 'SERVICE_UNAVAILABLE'
        });
      } else {
        res.status(500).json({ 
          error: 'Failed to get signal by ID',
          code: 'INTERNAL_SERVER_ERROR'
        });
      }
    }
  });

  // Strategies routes
  router.get('/strategies', async (req: express.Request, res: express.Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      
      const strategies = await dataController.getStrategies({ limit, offset });
      
      res.status(200).json(strategies);
    } catch (error) {
      logger.error('Failed to get strategies', { error });
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('connect ECONNREFUSED') || 
          errorMessage.includes('getaddrinfo') || errorMessage.includes('network error')) {
        res.status(503).json({ 
          error: 'Signal service is currently unavailable',
          code: 'SERVICE_UNAVAILABLE'
        });
      } else {
        res.status(500).json({ 
          error: 'Failed to get strategies',
          code: 'INTERNAL_SERVER_ERROR'
        });
      }
    }
  });

  router.get('/strategies/:id', async (req: express.Request, res: express.Response) => {
    try {
      const { id } = req.params;
      
      const strategy = await dataController.getStrategyById(id);
      
      if (!strategy) {
        res.status(404).json({ 
          error: 'Strategy not found',
          code: 'RESOURCE_NOT_FOUND'
        });
        return;
      }
      
      res.status(200).json(strategy);
    } catch (error) {
      logger.error('Failed to get strategy by ID', { error });
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('connect ECONNREFUSED') || 
          errorMessage.includes('getaddrinfo') || errorMessage.includes('network error')) {
        res.status(503).json({ 
          error: 'Signal service is currently unavailable',
          code: 'SERVICE_UNAVAILABLE'
        });
      } else {
        res.status(500).json({ 
          error: 'Failed to get strategy by ID',
          code: 'INTERNAL_SERVER_ERROR'
        });
      }
    }
  });

  // Agents routes
  router.get('/agents', async (req: express.Request, res: express.Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      
      const agents = await dataController.getAgents({ limit, offset });
      
      res.status(200).json(agents);
    } catch (error) {
      logger.error('Failed to get agents', { error });
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('connect ECONNREFUSED') || 
          errorMessage.includes('getaddrinfo') || errorMessage.includes('network error')) {
        res.status(503).json({ 
          error: 'Agent service is currently unavailable',
          code: 'SERVICE_UNAVAILABLE'
        });
      } else {
        res.status(500).json({ 
          error: 'Failed to get agents',
          code: 'INTERNAL_SERVER_ERROR'
        });
      }
    }
  });

  router.get('/agents/:id', async (req: express.Request, res: express.Response) => {
    try {
      const { id } = req.params;
      
      const agent = await dataController.getAgentById(id);
      
      if (!agent) {
        res.status(404).json({ 
          error: 'Agent not found',
          code: 'RESOURCE_NOT_FOUND'
        });
        return;
      }
      
      res.status(200).json(agent);
    } catch (error) {
      logger.error('Failed to get agent by ID', { error });
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('connect ECONNREFUSED') || 
          errorMessage.includes('getaddrinfo') || errorMessage.includes('network error')) {
        res.status(503).json({ 
          error: 'Agent service is currently unavailable',
          code: 'SERVICE_UNAVAILABLE'
        });
      } else {
        res.status(500).json({ 
          error: 'Failed to get agent by ID',
          code: 'INTERNAL_SERVER_ERROR'
        });
      }
    }
  });

  return router;
}

/**
 * Setup WebSocket server
 */
export function setupWebSocket(server: http.Server, dataController: DataController): WebSocket.Server {
  const wss = new WebSocket.Server({ server });
  
  wss.on('connection', (ws) => {
    logger.info('WebSocket client connected');
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        logger.debug('WebSocket message received', { data });
        
        // Handle message
        handleWebSocketMessage(ws, data, dataController);
      } catch (error) {
        logger.error('Failed to handle WebSocket message', { error });
        
        ws.send(JSON.stringify({
          type: 'error',
          error: 'Failed to handle message',
        }));
      }
    });
    
    ws.on('close', () => {
      logger.info('WebSocket client disconnected');
    });
    
    // Send welcome message
    ws.send(JSON.stringify({
      type: 'welcome',
      message: 'Connected to LiqPro API',
    }));
  });
  
  return wss;
}

/**
 * Handle WebSocket message
 */
function handleWebSocketMessage(
  ws: WebSocket,
  data: any,
  dataController: DataController
): void {
  switch (data.type) {
    case 'ping':
      ws.send(JSON.stringify({
        type: 'pong',
        timestamp: Date.now(),
      }));
      break;
      
    case 'subscribe':
      // Handle subscription
      handleSubscription(ws, data, dataController);
      break;
      
    default:
      logger.warn('Unknown WebSocket message type', { type: data.type });
      
      ws.send(JSON.stringify({
        type: 'error',
        error: 'Unknown message type',
      }));
      break;
  }
}

/**
 * Handle WebSocket subscription
 */
function handleSubscription(
  ws: WebSocket,
  data: any,
  dataController: DataController
): void {
  const { channel } = data;
  
  switch (channel) {
    case 'pools':
      // Subscribe to pools updates
      logger.info('Client subscribed to pools updates');
      
      ws.send(JSON.stringify({
        type: 'subscription',
        channel: 'pools',
        status: 'subscribed',
      }));
      break;
      
    case 'signals':
      // Subscribe to signals updates
      logger.info('Client subscribed to signals updates');
      
      ws.send(JSON.stringify({
        type: 'subscription',
        channel: 'signals',
        status: 'subscribed',
      }));
      break;
      
    default:
      logger.warn('Unknown subscription channel', { channel });
      
      ws.send(JSON.stringify({
        type: 'error',
        error: 'Unknown subscription channel',
      }));
      break;
  }
} 