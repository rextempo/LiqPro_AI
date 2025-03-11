/**
 * Signal Service Application
 */
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import signalRoutes from './routes/signal-routes';
import { logger } from './utils/logger';
import { config } from './config';
import { SignalController } from './controllers/signal-controller';
import { CacheService } from './services/cache-service';
import { apiKeyAuth } from './middleware/auth';

// Create Express application
const app = express();

// Configure middleware
app.use(helmet()); // Security headers
app.use(compression()); // Response compression
app.use(cors({
  origin: config.cors.origin,
  credentials: config.cors.credentials
})); // CORS support
app.use(express.json()); // JSON parsing
app.use(express.urlencoded({ extended: true })); // URL encoding parsing

// Rate limiting
app.use(rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    error: 'Too many requests',
    message: 'Please try again later'
  }
}));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'signal-service',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Metrics endpoint
app.get('/metrics', apiKeyAuth, (req: Request, res: Response) => {
  const cacheService = app.get('cacheService') as CacheService;
  const cacheMetrics = cacheService ? cacheService.getMetrics() : null;
  
  res.status(200).json({
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cache: cacheMetrics
  });
});

// Register routes with API key authentication
app.use('/api', apiKeyAuth, signalRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  logger.warn(`Route not found: ${req.method} ${req.url}`);
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.url} does not exist`,
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error('Application error', { error: err });
  res.status(500).json({
    error: 'Server Error',
    message: 'An internal server error occurred',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

// Initialize services
const cacheService = new CacheService();
app.set('cacheService', cacheService);

// Create signal controller instance
const signalController = new SignalController();

// Export application and controller
export { app, signalController, cacheService }; 
