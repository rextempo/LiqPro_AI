"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Signal Routes
 * Handles API endpoints for signals
 */
const express_1 = require("express");
const logger_1 = require("../utils/logger");
const service_manager_1 = require("../clients/service-manager");
const router = (0, express_1.Router)();
const logger = new logger_1.Logger('SignalRoutes');
/**
 * @swagger
 * /api/signals:
 *   get:
 *     summary: Get all signals with optional filtering
 *     tags: [Signals]
 *     parameters:
 *       - in: query
 *         name: poolAddresses
 *         schema:
 *           type: string
 *         description: Filter by pool addresses
 *       - in: query
 *         name: signalTypes
 *         schema:
 *           type: string
 *           enum: [buy, sell, hold]
 *         description: Filter by signal types
 *       - in: query
 *         name: minStrength
 *         schema:
 *           type: number
 *           minimum: 0
 *           maximum: 1
 *         description: Minimum signal strength
 *       - in: query
 *         name: timeframes
 *         schema:
 *           type: string
 *           enum: [1m, 5m, 15m, 30m, 1h, 5h, 15h, 30h, 1d, 5d, 15d, 30d]
 *         description: Filter by timeframes
 *       - in: query
 *         name: minReliability
 *         schema:
 *           type: number
 *           minimum: 0
 *           maximum: 1
 *         description: Minimum signal reliability
 *       - in: query
 *         name: fromTimestamp
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: Filter signals from this timestamp
 *       - in: query
 *         name: toTimestamp
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: Filter signals to this timestamp
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of signals to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: Offset for pagination
 *     responses:
 *       200:
 *         description: List of signals
 *       500:
 *         description: Server error
 */
router.get('/', async (req, res, next) => {
    try {
        const signalClient = service_manager_1.ServiceManager.getInstance().getSignalClient();
        // 从查询参数构建过滤选项
        const filterOptions = {};
        if (req.query.poolAddresses) {
            filterOptions.poolAddresses = req.query.poolAddresses.split(',');
        }
        if (req.query.signalTypes) {
            filterOptions.signalTypes = req.query.signalTypes.split(',');
        }
        if (req.query.minStrength) {
            filterOptions.minStrength = parseInt(req.query.minStrength, 10);
        }
        if (req.query.timeframes) {
            filterOptions.timeframes = req.query.timeframes.split(',');
        }
        if (req.query.minReliability) {
            filterOptions.minReliability = parseInt(req.query.minReliability, 10);
        }
        if (req.query.fromTimestamp) {
            filterOptions.fromTimestamp = parseInt(req.query.fromTimestamp, 10);
        }
        if (req.query.toTimestamp) {
            filterOptions.toTimestamp = parseInt(req.query.toTimestamp, 10);
        }
        if (req.query.limit) {
            filterOptions.limit = parseInt(req.query.limit, 10);
        }
        if (req.query.offset) {
            filterOptions.offset = parseInt(req.query.offset, 10);
        }
        logger.info(`获取信号列表，过滤选项: ${JSON.stringify(filterOptions)}`);
        const signals = await signalClient.getSignals(filterOptions);
        res.json({
            status: 'success',
            data: {
                signals,
                count: signals.length
            }
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`获取信号列表失败: ${errorMessage}`);
        next(error);
    }
});
/**
 * @swagger
 * /api/signals/{id}:
 *   get:
 *     summary: Get a specific signal by ID
 *     tags: [Signals]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Signal ID
 *     responses:
 *       200:
 *         description: Signal details
 *       404:
 *         description: Signal not found
 *       500:
 *         description: Server error
 */
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const signalClient = service_manager_1.ServiceManager.getInstance().getSignalClient();
        logger.info(`获取信号详情，ID: ${id}`);
        const signal = await signalClient.getSignal(id);
        res.json({
            status: 'success',
            data: { signal }
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`获取信号详情失败: ${errorMessage}`);
        next(error);
    }
});
/**
 * @swagger
 * /api/signals/pool/{address}:
 *   get:
 *     summary: Get signals for a specific pool
 *     tags: [Signals]
 *     parameters:
 *       - in: path
 *         name: address
 *         required: true
 *         schema:
 *           type: string
 *         description: Pool address
 *     responses:
 *       200:
 *         description: List of signals for the pool
 *       500:
 *         description: Server error
 */
router.get('/pool/:address', async (req, res, next) => {
    try {
        const { address } = req.params;
        const signalClient = service_manager_1.ServiceManager.getInstance().getSignalClient();
        // 从查询参数构建过滤选项
        const filterOptions = {};
        if (req.query.signalTypes) {
            filterOptions.signalTypes = req.query.signalTypes.split(',');
        }
        if (req.query.minStrength) {
            filterOptions.minStrength = parseInt(req.query.minStrength, 10);
        }
        if (req.query.timeframes) {
            filterOptions.timeframes = req.query.timeframes.split(',');
        }
        if (req.query.minReliability) {
            filterOptions.minReliability = parseInt(req.query.minReliability, 10);
        }
        if (req.query.fromTimestamp) {
            filterOptions.fromTimestamp = parseInt(req.query.fromTimestamp, 10);
        }
        if (req.query.toTimestamp) {
            filterOptions.toTimestamp = parseInt(req.query.toTimestamp, 10);
        }
        if (req.query.limit) {
            filterOptions.limit = parseInt(req.query.limit, 10);
        }
        if (req.query.offset) {
            filterOptions.offset = parseInt(req.query.offset, 10);
        }
        logger.info(`获取池信号，地址: ${address}，过滤选项: ${JSON.stringify(filterOptions)}`);
        const signals = await signalClient.getPoolSignals(address, filterOptions);
        res.json({
            status: 'success',
            data: {
                poolAddress: address,
                signals,
                count: signals.length
            }
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`获取池信号失败: ${errorMessage}`);
        next(error);
    }
});
/**
 * @swagger
 * /api/signals/latest:
 *   get:
 *     summary: Get the most recent signals
 *     tags: [Signals]
 *     parameters:
 *       - in: query
 *         name: poolAddresses
 *         schema:
 *           type: string
 *         description: Filter by pool addresses
 *       - in: query
 *         name: signalTypes
 *         schema:
 *           type: string
 *           enum: [buy, sell, hold]
 *         description: Filter by signal types
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Number of signals to return
 *     responses:
 *       200:
 *         description: List of latest signals
 *       500:
 *         description: Server error
 */
router.get('/latest', async (req, res, next) => {
    try {
        const signalClient = service_manager_1.ServiceManager.getInstance().getSignalClient();
        // 从查询参数构建过滤选项
        const filterOptions = {};
        if (req.query.poolAddresses) {
            filterOptions.poolAddresses = req.query.poolAddresses.split(',');
        }
        if (req.query.signalTypes) {
            filterOptions.signalTypes = req.query.signalTypes.split(',');
        }
        if (req.query.limit) {
            filterOptions.limit = parseInt(req.query.limit, 10);
        }
        logger.info(`获取最新信号，过滤选项: ${JSON.stringify(filterOptions)}`);
        const signals = await signalClient.getLatestSignals(filterOptions);
        res.json({
            status: 'success',
            data: {
                signals,
                count: signals.length
            }
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`获取最新信号失败: ${errorMessage}`);
        next(error);
    }
});
/**
 * @swagger
 * /api/signals/stats:
 *   get:
 *     summary: Get signal statistics
 *     tags: [Signals]
 *     parameters:
 *       - in: query
 *         name: poolAddress
 *         schema:
 *           type: string
 *         description: Filter by pool address
 *     responses:
 *       200:
 *         description: Signal statistics
 *       500:
 *         description: Server error
 */
router.get('/stats', async (req, res, next) => {
    try {
        const signalClient = service_manager_1.ServiceManager.getInstance().getSignalClient();
        const poolAddress = req.query.poolAddress;
        logger.info(`获取信号统计信息${poolAddress ? `，池地址: ${poolAddress}` : ''}`);
        const stats = await signalClient.getSignalStats(poolAddress);
        res.json({
            status: 'success',
            data: { stats }
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`获取信号统计信息失败: ${errorMessage}`);
        next(error);
    }
});
logger.info('Signal routes registered');
exports.default = router;
//# sourceMappingURL=signal-routes.js.map