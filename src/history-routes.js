"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * History Routes
 * Handles API endpoints for historical data
 */
const express_1 = require("express");
const history_controller_1 = __importDefault(require("../controllers/history-controller"));
const validator_1 = require("../middleware/validator");
const error_handler_1 = require("../middleware/error-handler");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
const historyController = new history_controller_1.default();
/**
 * @swagger
 * /api/history/signals:
 *   get:
 *     summary: Get historical signals with optional filtering
 *     tags: [History]
 *     parameters:
 *       - in: query
 *         name: poolAddress
 *         schema:
 *           type: string
 *         description: Filter by pool address
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for filtering (ISO format)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for filtering (ISO format)
 *       - in: query
 *         name: signalType
 *         schema:
 *           type: string
 *           enum: [buy, sell, hold]
 *         description: Filter by signal type
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *         description: Number of signals to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: Offset for pagination
 *     responses:
 *       200:
 *         description: List of historical signals
 *       500:
 *         description: Server error
 */
router.get('/signals', (0, validator_1.validate)(validator_1.schemas.history.getSignals, 'query'), (0, error_handler_1.asyncHandler)(historyController.getSignalHistory));
/**
 * @swagger
 * /api/history/performance/{poolAddress}:
 *   get:
 *     summary: Get performance metrics for a specific pool
 *     tags: [History]
 *     parameters:
 *       - in: path
 *         name: poolAddress
 *         required: true
 *         schema:
 *           type: string
 *         description: Pool address
 *     responses:
 *       200:
 *         description: Pool performance metrics
 *       404:
 *         description: Pool not found
 *       500:
 *         description: Server error
 */
router.get('/performance/:poolAddress', (0, validator_1.validate)(validator_1.schemas.history.getPerformance, 'params'), (0, error_handler_1.asyncHandler)(historyController.getPoolPerformance));
/**
 * @swagger
 * /api/history/accuracy:
 *   get:
 *     summary: Get accuracy metrics for signals
 *     tags: [History]
 *     parameters:
 *       - in: query
 *         name: strategyId
 *         schema:
 *           type: string
 *         description: Filter by strategy ID
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [1d, 7d, 30d, 90d, all]
 *           default: 30d
 *         description: Timeframe for accuracy metrics
 *     responses:
 *       200:
 *         description: Accuracy metrics
 *       500:
 *         description: Server error
 */
router.get('/accuracy', (0, validator_1.validate)(validator_1.schemas.history.getAccuracy, 'query'), (0, error_handler_1.asyncHandler)(historyController.getAccuracyMetrics));
/**
 * @swagger
 * /api/history/trends:
 *   get:
 *     summary: Get trend analysis for signals
 *     tags: [History]
 *     parameters:
 *       - in: query
 *         name: metric
 *         schema:
 *           type: string
 *           enum: [signal_count, accuracy, profit]
 *           default: signal_count
 *         description: Metric to analyze
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [1d, 7d, 30d, 90d]
 *           default: 30d
 *         description: Timeframe for trend analysis
 *     responses:
 *       200:
 *         description: Trend analysis data
 *       500:
 *         description: Server error
 */
router.get('/trends', (0, validator_1.validate)(validator_1.schemas.history.getTrends, 'query'), (0, error_handler_1.asyncHandler)(historyController.getTrendAnalysis));
/**
 * @swagger
 * /api/history/export:
 *   post:
 *     summary: Export historical data
 *     tags: [History]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - startDate
 *               - endDate
 *             properties:
 *               poolAddresses:
 *                 type: array
 *                 items:
 *                   type: string
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               format:
 *                 type: string
 *                 enum: [csv, json]
 *                 default: csv
 *     responses:
 *       200:
 *         description: Export details with download link
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Server error
 */
router.post('/export', (0, validator_1.validate)(validator_1.schemas.history.export), (0, error_handler_1.asyncHandler)(historyController.exportData));
logger_1.logger.info('History routes registered');
exports.default = router;
//# sourceMappingURL=history-routes.js.map