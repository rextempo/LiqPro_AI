/**
 * Signal Service Routes
 */
import { Router } from 'express';
import { SignalController } from '../controllers/signal-controller';
import { HistoryController } from '../controllers/history-controller';
import { CacheService } from '../services/cache-service';
import { logger } from '../utils/logger';

// Initialize services
const cacheService = new CacheService();

// Initialize controllers
const signalController = new SignalController();
const historyController = new HistoryController(cacheService);

// Create router instance
const router = Router();

/**
 * Signal routes
 */
// Get signals
router.get('/signals', signalController.getSignals);

// Get signal by ID
router.get('/signals/:id', signalController.getSignalById);

// Generate signals manually
router.post('/signals/generate', signalController.generateSignals);

/**
 * History routes
 */
// Get historical signals with filtering
router.get('/history/signals', historyController.getHistoricalSignals);

// Get pool performance metrics
router.get('/history/performance/:poolAddress', historyController.getPoolPerformance);

// Get signal accuracy metrics
router.get('/history/accuracy', historyController.getSignalAccuracy);

/**
 * Strategy routes
 */
// Get strategies
router.get('/strategies', signalController.getStrategies);

// Get strategy by ID
router.get('/strategies/:id', signalController.getStrategyById);

// Create strategy
router.post('/strategies', signalController.createStrategy);

// Update strategy
router.put('/strategies/:id', signalController.updateStrategy);

// Delete strategy
router.delete('/strategies/:id', signalController.deleteStrategy);

// Evaluate strategy performance
router.post('/strategies/:id/evaluate', signalController.evaluateStrategyPerformance);

// Optimize strategy parameters
router.post('/strategies/:id/optimize', signalController.optimizeStrategyParameters);

// Log route registration
logger.info('Signal service routes registered');

export default router; 