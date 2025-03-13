"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Strategy Routes
 * Handles API endpoints for strategies
 */
const express_1 = require("express");
const strategy_controller_1 = __importDefault(require("../controllers/strategy-controller"));
const validator_1 = require("../middleware/validator");
const error_handler_1 = require("../middleware/error-handler");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
const strategyController = new strategy_controller_1.default();
/**
 * @swagger
 * /api/strategies:
 *   get:
 *     summary: Get all strategies with optional filtering
 *     tags: [Strategies]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by strategy type
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of strategies to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: Offset for pagination
 *     responses:
 *       200:
 *         description: List of strategies
 *       500:
 *         description: Server error
 */
router.get('/', (0, validator_1.validate)(validator_1.schemas.strategy.getAll, 'query'), (0, error_handler_1.asyncHandler)(strategyController.getAllStrategies));
/**
 * @swagger
 * /api/strategies/{id}:
 *   get:
 *     summary: Get a specific strategy by ID
 *     tags: [Strategies]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Strategy ID
 *     responses:
 *       200:
 *         description: Strategy details
 *       404:
 *         description: Strategy not found
 *       500:
 *         description: Server error
 */
router.get('/:id', (0, validator_1.validate)(validator_1.schemas.strategy.getById, 'params'), (0, error_handler_1.asyncHandler)(strategyController.getStrategyById));
/**
 * @swagger
 * /api/strategies:
 *   post:
 *     summary: Create a new strategy
 *     tags: [Strategies]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *               - parameters
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *               parameters:
 *                 type: object
 *               isActive:
 *                 type: boolean
 *                 default: false
 *               targetPools:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Strategy created successfully
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Server error
 */
router.post('/', (0, validator_1.validate)(validator_1.schemas.strategy.create), (0, error_handler_1.asyncHandler)(strategyController.createStrategy));
/**
 * @swagger
 * /api/strategies/{id}:
 *   put:
 *     summary: Update an existing strategy
 *     tags: [Strategies]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Strategy ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               parameters:
 *                 type: object
 *               isActive:
 *                 type: boolean
 *               targetPools:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Strategy updated successfully
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: Strategy not found
 *       500:
 *         description: Server error
 */
router.put('/:id', (0, validator_1.validate)(validator_1.schemas.strategy.getById, 'params'), (0, validator_1.validate)(validator_1.schemas.strategy.update), (0, error_handler_1.asyncHandler)(strategyController.updateStrategy));
/**
 * @swagger
 * /api/strategies/{id}:
 *   delete:
 *     summary: Delete a strategy
 *     tags: [Strategies]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Strategy ID
 *     responses:
 *       200:
 *         description: Strategy deleted successfully
 *       404:
 *         description: Strategy not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', (0, validator_1.validate)(validator_1.schemas.strategy.getById, 'params'), (0, error_handler_1.asyncHandler)(strategyController.deleteStrategy));
/**
 * @swagger
 * /api/strategies/{id}/evaluate:
 *   post:
 *     summary: Evaluate the performance of a strategy
 *     tags: [Strategies]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Strategy ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               timeframe:
 *                 type: string
 *                 enum: [1d, 7d, 30d, 90d, all]
 *                 default: 30d
 *     responses:
 *       200:
 *         description: Strategy evaluation results
 *       404:
 *         description: Strategy not found
 *       500:
 *         description: Server error
 */
router.post('/:id/evaluate', (0, validator_1.validate)(validator_1.schemas.strategy.getById, 'params'), (0, validator_1.validate)(validator_1.schemas.strategy.evaluate), (0, error_handler_1.asyncHandler)(strategyController.evaluateStrategy));
/**
 * @swagger
 * /api/strategies/{id}/optimize:
 *   post:
 *     summary: Optimize the parameters of a strategy
 *     tags: [Strategies]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Strategy ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - targetMetric
 *             properties:
 *               targetMetric:
 *                 type: string
 *                 enum: [profit, accuracy, risk_adjusted_return]
 *               constraints:
 *                 type: object
 *     responses:
 *       200:
 *         description: Strategy optimization results
 *       404:
 *         description: Strategy not found
 *       500:
 *         description: Server error
 */
router.post('/:id/optimize', (0, validator_1.validate)(validator_1.schemas.strategy.getById, 'params'), (0, validator_1.validate)(validator_1.schemas.strategy.optimize), (0, error_handler_1.asyncHandler)(strategyController.optimizeStrategy));
logger_1.logger.info('Strategy routes registered');
exports.default = router;
//# sourceMappingURL=strategy-routes.js.map