import express, { Router, Request, Response, NextFunction } from 'express';
import { createLogger } from '@liqpro/monitoring';
import { DataController, TimePeriod } from '../controllers/data-controller';
import { StreamType } from '../modules/processors/data-stream';
import { WebSocketServer, WebSocket } from 'ws';
import { ErrorHandler } from '../utils/error-handler';
import { Validator } from '../utils/validator';

const logger = createLogger('data-service:api');

// Type for async request handler
type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

// Wrapper for async handlers to catch errors
const asyncHandler = (fn: AsyncHandler) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Create API routes
 * @param dataController Data controller instance
 * @returns Express router
 */
export function createApiRoutes(dataController: DataController): Router {
  const router = Router();

  // Middleware to handle async errors
  const asyncHandler = ErrorHandler.expressAsyncHandler;

  // Health check endpoint
  router.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });

  // Pool management endpoints
  router.post(
    '/pools/track',
    asyncHandler(async (req: Request, res: Response) => {
      // Validate request body
      Validator.validateBodyOrThrow(req.body, {
        poolAddress: value => Validator.isSolanaAddress(value, 'poolAddress'),
        name: value => (value ? Validator.isString(value, 'name') : { isValid: true }),
        description: value =>
          value ? Validator.isString(value, 'description') : { isValid: true },
      });

      const { poolAddress, name, description } = req.body;

      await dataController.trackPool(poolAddress, { name, description });

      logger.info(`Pool ${poolAddress} tracked successfully`, { name, description });
      res.status(200).json({ success: true, poolAddress });
    })
  );

  router.delete(
    '/pools/untrack/:poolAddress',
    asyncHandler(async (req: Request, res: Response) => {
      const { poolAddress } = req.params;

      try {
        await dataController.untrackPool(poolAddress);
        res.status(200).json({ success: true, message: 'Pool tracking stopped' });
      } catch (error: any) {
        logger.error('Failed to untrack pool', { error, poolAddress });
        res.status(500).json({ error: 'Failed to untrack pool', message: error.message });
      }
    })
  );

  router.get(
    '/pools',
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const pools = await dataController.getTrackedPools();
        res.status(200).json(pools);
      } catch (error: any) {
        logger.error('Failed to get tracked pools', { error });
        res.status(500).json({ error: 'Failed to get tracked pools', message: error.message });
      }
    })
  );

  // Data retrieval endpoints
  router.get(
    '/data/aggregated/:poolAddress',
    asyncHandler(async (req: Request, res: Response) => {
      const { poolAddress } = req.params;
      const { timeframe, resolution } = req.query;

      try {
        const data = await dataController.getAggregatedData(
          poolAddress,
          (timeframe as string) || TimePeriod.HOUR_1,
          (resolution as string) || '100'
        );
        res.status(200).json(data);
      } catch (error: any) {
        logger.error('Failed to get aggregated data', { error, poolAddress });
        res.status(500).json({ error: 'Failed to get aggregated data', message: error.message });
      }
    })
  );

  router.get(
    '/data/raw/:poolAddress',
    asyncHandler(async (req: Request, res: Response) => {
      const { poolAddress } = req.params;
      const { startTime, endTime, limit } = req.query;

      try {
        const data = await dataController.getRawData(
          poolAddress,
          startTime ? parseInt(startTime as string, 10) : undefined,
          endTime ? parseInt(endTime as string, 10) : undefined,
          limit ? parseInt(limit as string, 10) : undefined
        );
        res.status(200).json(data);
      } catch (error: any) {
        logger.error('Failed to get raw data', { error, poolAddress });
        res.status(500).json({ error: 'Failed to get raw data', message: error.message });
      }
    })
  );

  router.get(
    '/data/latest/:poolAddress',
    asyncHandler(async (req: Request, res: Response) => {
      const { poolAddress } = req.params;

      try {
        const data = await dataController.getLatestDataPoint(poolAddress);
        if (!data) {
          res.status(404).json({ error: 'No data found for pool' });
          return;
        }
        res.status(200).json(data);
      } catch (error: any) {
        logger.error('Failed to get latest data point', { error, poolAddress });
        res.status(500).json({ error: 'Failed to get latest data point', message: error.message });
      }
    })
  );

  // Whale activity endpoints
  router.get(
    '/whales/activities',
    asyncHandler(async (req: Request, res: Response) => {
      const { poolAddress, startTime, endTime, limit } = req.query;

      try {
        const activities = await dataController.getWhaleActivities(
          poolAddress as string,
          startTime ? parseInt(startTime as string, 10) : undefined,
          endTime ? parseInt(endTime as string, 10) : undefined,
          limit ? parseInt(limit as string, 10) : undefined
        );
        res.status(200).json(activities);
      } catch (error: any) {
        logger.error('Failed to get whale activities', { error });
        res.status(500).json({ error: 'Failed to get whale activities', message: error.message });
      }
    })
  );

  // Storage management endpoints
  router.get(
    '/storage/stats',
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const stats = await dataController.getStorageStats();
        res.status(200).json(stats);
      } catch (error: any) {
        logger.error('Failed to get storage stats', { error });
        res.status(500).json({ error: 'Failed to get storage stats', message: error.message });
      }
    })
  );

  // WebSocket endpoint for real-time data
  if ('ws' in router) {
    (router as any).ws('/stream', (ws: any, req: Request) => {
      logger.info('WebSocket connection established');

      ws.on('message', (msg: string) => {
        try {
          const data = JSON.parse(msg);

          if (data.type === 'subscribe' && data.poolAddress) {
            // Validate pool address
            const validationResult = Validator.isSolanaAddress(data.poolAddress, 'poolAddress');
            if (!validationResult.isValid) {
              ws.send(
                JSON.stringify({
                  type: 'error',
                  message: 'Invalid pool address',
                  details: validationResult.errors,
                })
              );
              return;
            }

            // Subscribe to pool updates
            const subscription = dataController.subscribeToPoolUpdates(data.poolAddress, update => {
              ws.send(JSON.stringify(update));
            });

            // Store subscription for cleanup
            ws.poolSubscription = subscription;
            ws.send(JSON.stringify({ type: 'subscribed', poolAddress: data.poolAddress }));
          }
        } catch (error: any) {
          logger.error('Error processing WebSocket message', { error });
          ws.send(JSON.stringify({ error: 'Invalid message format' }));
        }
      });

      ws.on('close', () => {
        logger.info('WebSocket connection closed');

        // Clean up subscription if exists
        if (ws.poolSubscription) {
          ws.poolSubscription.unsubscribe();
        }
      });
    });
  }

  // Error handler
  router.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    ErrorHandler.handleError(err, { path: req.path, method: req.method });

    if (err instanceof ErrorHandler.AppError) {
      res.status(err.statusCode).json({
        error: err.type,
        message: err.message,
        details: err.details,
      });
    } else {
      res.status(500).json({
        error: 'internal_error',
        message: 'An unexpected error occurred',
      });
    }
  });

  return router;
}

/**
 * Setup WebSocket server for real-time data
 * @param server HTTP server
 * @param dataController Data controller instance
 */
export function setupWebSocket(server: any, dataController: DataController) {
  const wss = new WebSocketServer({ server, path: '/api/ws' });

  wss.on('connection', (ws: WebSocket) => {
    logger.info('WebSocket client connected');

    let subscriptions: Set<string> = new Set();

    ws.on('message', (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());

        if (data.type === 'subscribe') {
          if (data.poolAddress) {
            // Validate pool address
            const validationResult = Validator.isSolanaAddress(data.poolAddress, 'poolAddress');
            if (!validationResult.isValid) {
              ws.send(
                JSON.stringify({
                  type: 'error',
                  message: 'Invalid pool address',
                  details: validationResult.errors,
                })
              );
              return;
            }

            subscriptions.add(data.poolAddress);
            logger.info(`Client subscribed to pool ${data.poolAddress}`);

            ws.send(
              JSON.stringify({
                type: 'subscribed',
                poolAddress: data.poolAddress,
              })
            );
          }
        } else if (data.type === 'unsubscribe') {
          if (data.poolAddress) {
            subscriptions.delete(data.poolAddress);
            logger.info(`Client unsubscribed from pool ${data.poolAddress}`);

            ws.send(
              JSON.stringify({
                type: 'unsubscribed',
                poolAddress: data.poolAddress,
              })
            );
          }
        }
      } catch (error: any) {
        logger.error('Error processing WebSocket message', { error });

        ws.send(
          JSON.stringify({
            type: 'error',
            message: 'Invalid message format',
          })
        );
      }
    });

    ws.on('close', () => {
      logger.info('WebSocket client disconnected');
      subscriptions.clear();
    });

    // Keep connection alive
    const pingInterval = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        ws.ping();
      }
    }, 30000);

    ws.on('close', () => {
      clearInterval(pingInterval);
    });
  });

  return wss;
}
