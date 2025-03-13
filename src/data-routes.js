"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 数据服务路由
 */
const express_1 = require("express");
const logger_1 = require("../utils/logger");
const service_manager_1 = require("../clients/service-manager");
const router = (0, express_1.Router)();
const logger = new logger_1.Logger('DataRoutes');
/**
 * 获取所有池列表
 */
router.get('/pools', async (req, res, next) => {
    try {
        const dataClient = service_manager_1.ServiceManager.getInstance().getDataClient();
        logger.info('获取所有池列表');
        const pools = await dataClient.getPools();
        res.json({
            status: 'success',
            data: {
                pools,
                count: pools.length
            }
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`获取所有池列表失败: ${errorMessage}`);
        next(error);
    }
});
/**
 * 获取单个池信息
 */
router.get('/pools/:address', async (req, res, next) => {
    try {
        const { address } = req.params;
        const dataClient = service_manager_1.ServiceManager.getInstance().getDataClient();
        logger.info(`获取池信息，地址: ${address}`);
        const pool = await dataClient.getPool(address);
        res.json({
            status: 'success',
            data: { pool }
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`获取池信息失败: ${errorMessage}`);
        next(error);
    }
});
/**
 * 获取价格数据
 */
router.get('/price/:address', async (req, res, next) => {
    try {
        const { address } = req.params;
        const dataClient = service_manager_1.ServiceManager.getInstance().getDataClient();
        // 从查询参数构建过滤选项
        const filterOptions = {};
        if (req.query.fromTimestamp) {
            filterOptions.fromTimestamp = parseInt(req.query.fromTimestamp, 10);
        }
        if (req.query.toTimestamp) {
            filterOptions.toTimestamp = parseInt(req.query.toTimestamp, 10);
        }
        if (req.query.interval) {
            filterOptions.interval = req.query.interval;
        }
        if (req.query.limit) {
            filterOptions.limit = parseInt(req.query.limit, 10);
        }
        if (req.query.offset) {
            filterOptions.offset = parseInt(req.query.offset, 10);
        }
        logger.info(`获取价格数据，池地址: ${address}，过滤选项: ${JSON.stringify(filterOptions)}`);
        const priceData = await dataClient.getPriceData(address, filterOptions);
        res.json({
            status: 'success',
            data: {
                poolAddress: address,
                priceData,
                count: priceData.length
            }
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`获取价格数据失败: ${errorMessage}`);
        next(error);
    }
});
/**
 * 获取流动性数据
 */
router.get('/liquidity/:address', async (req, res, next) => {
    try {
        const { address } = req.params;
        const dataClient = service_manager_1.ServiceManager.getInstance().getDataClient();
        // 从查询参数构建过滤选项
        const filterOptions = {};
        if (req.query.fromTimestamp) {
            filterOptions.fromTimestamp = parseInt(req.query.fromTimestamp, 10);
        }
        if (req.query.toTimestamp) {
            filterOptions.toTimestamp = parseInt(req.query.toTimestamp, 10);
        }
        if (req.query.interval) {
            filterOptions.interval = req.query.interval;
        }
        if (req.query.limit) {
            filterOptions.limit = parseInt(req.query.limit, 10);
        }
        if (req.query.offset) {
            filterOptions.offset = parseInt(req.query.offset, 10);
        }
        logger.info(`获取流动性数据，池地址: ${address}，过滤选项: ${JSON.stringify(filterOptions)}`);
        const liquidityData = await dataClient.getLiquidityData(address, filterOptions);
        res.json({
            status: 'success',
            data: {
                poolAddress: address,
                liquidityData,
                count: liquidityData.length
            }
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`获取流动性数据失败: ${errorMessage}`);
        next(error);
    }
});
/**
 * 批量获取价格数据
 */
router.post('/price/bulk', async (req, res, next) => {
    try {
        const { poolAddresses } = req.body;
        if (!poolAddresses || !Array.isArray(poolAddresses) || poolAddresses.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: '请提供有效的池地址数组'
            });
        }
        const dataClient = service_manager_1.ServiceManager.getInstance().getDataClient();
        // 从查询参数构建过滤选项
        const filterOptions = {};
        if (req.query.fromTimestamp) {
            filterOptions.fromTimestamp = parseInt(req.query.fromTimestamp, 10);
        }
        if (req.query.toTimestamp) {
            filterOptions.toTimestamp = parseInt(req.query.toTimestamp, 10);
        }
        if (req.query.interval) {
            filterOptions.interval = req.query.interval;
        }
        if (req.query.limit) {
            filterOptions.limit = parseInt(req.query.limit, 10);
        }
        if (req.query.offset) {
            filterOptions.offset = parseInt(req.query.offset, 10);
        }
        logger.info(`批量获取价格数据，池地址: ${poolAddresses.join(',')}，过滤选项: ${JSON.stringify(filterOptions)}`);
        const bulkPriceData = await dataClient.getBulkPriceData(poolAddresses, filterOptions);
        res.json({
            status: 'success',
            data: { bulkPriceData }
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`批量获取价格数据失败: ${errorMessage}`);
        next(error);
    }
});
/**
 * 获取市场概览
 */
router.get('/overview', async (req, res, next) => {
    try {
        const dataClient = service_manager_1.ServiceManager.getInstance().getDataClient();
        logger.info('获取市场概览');
        const overview = await dataClient.getMarketOverview();
        res.json({
            status: 'success',
            data: { overview }
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`获取市场概览失败: ${errorMessage}`);
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=data-routes.js.map