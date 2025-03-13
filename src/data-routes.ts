/**
 * 数据服务路由
 */
import { Router, Request, Response, NextFunction } from 'express';
import { Logger } from '../utils/logger';
import { ServiceManager } from '../clients/service-manager';
import { MarketDataFilterOptions } from '../clients/data-client';

const router = Router();
const logger = new Logger('DataRoutes');

/**
 * 获取所有池列表
 */
router.get('/pools', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dataClient = ServiceManager.getInstance().getDataClient();
    
    logger.info('获取所有池列表');
    const pools = await dataClient.getPools();
    
    res.json({
      status: 'success',
      data: {
        pools,
        count: pools.length
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`获取所有池列表失败: ${errorMessage}`);
    next(error);
  }
});

/**
 * 获取单个池信息
 */
router.get('/pools/:address', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { address } = req.params;
    const dataClient = ServiceManager.getInstance().getDataClient();
    
    logger.info(`获取池信息，地址: ${address}`);
    const pool = await dataClient.getPool(address);
    
    res.json({
      status: 'success',
      data: { pool }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`获取池信息失败: ${errorMessage}`);
    next(error);
  }
});

/**
 * 获取价格数据
 */
router.get('/price/:address', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { address } = req.params;
    const dataClient = ServiceManager.getInstance().getDataClient();
    
    // 从查询参数构建过滤选项
    const filterOptions: Omit<MarketDataFilterOptions, 'poolAddresses'> = {};
    
    if (req.query.fromTimestamp) {
      filterOptions.fromTimestamp = parseInt(req.query.fromTimestamp as string, 10);
    }
    
    if (req.query.toTimestamp) {
      filterOptions.toTimestamp = parseInt(req.query.toTimestamp as string, 10);
    }
    
    if (req.query.interval) {
      filterOptions.interval = req.query.interval as string;
    }
    
    if (req.query.limit) {
      filterOptions.limit = parseInt(req.query.limit as string, 10);
    }
    
    if (req.query.offset) {
      filterOptions.offset = parseInt(req.query.offset as string, 10);
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
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`获取价格数据失败: ${errorMessage}`);
    next(error);
  }
});

/**
 * 获取流动性数据
 */
router.get('/liquidity/:address', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { address } = req.params;
    const dataClient = ServiceManager.getInstance().getDataClient();
    
    // 从查询参数构建过滤选项
    const filterOptions: Omit<MarketDataFilterOptions, 'poolAddresses'> = {};
    
    if (req.query.fromTimestamp) {
      filterOptions.fromTimestamp = parseInt(req.query.fromTimestamp as string, 10);
    }
    
    if (req.query.toTimestamp) {
      filterOptions.toTimestamp = parseInt(req.query.toTimestamp as string, 10);
    }
    
    if (req.query.interval) {
      filterOptions.interval = req.query.interval as string;
    }
    
    if (req.query.limit) {
      filterOptions.limit = parseInt(req.query.limit as string, 10);
    }
    
    if (req.query.offset) {
      filterOptions.offset = parseInt(req.query.offset as string, 10);
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
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`获取流动性数据失败: ${errorMessage}`);
    next(error);
  }
});

/**
 * 批量获取价格数据
 */
router.post('/price/bulk', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { poolAddresses } = req.body;
    
    if (!poolAddresses || !Array.isArray(poolAddresses) || poolAddresses.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: '请提供有效的池地址数组'
      });
    }
    
    const dataClient = ServiceManager.getInstance().getDataClient();
    
    // 从查询参数构建过滤选项
    const filterOptions: Omit<MarketDataFilterOptions, 'poolAddresses'> = {};
    
    if (req.query.fromTimestamp) {
      filterOptions.fromTimestamp = parseInt(req.query.fromTimestamp as string, 10);
    }
    
    if (req.query.toTimestamp) {
      filterOptions.toTimestamp = parseInt(req.query.toTimestamp as string, 10);
    }
    
    if (req.query.interval) {
      filterOptions.interval = req.query.interval as string;
    }
    
    if (req.query.limit) {
      filterOptions.limit = parseInt(req.query.limit as string, 10);
    }
    
    if (req.query.offset) {
      filterOptions.offset = parseInt(req.query.offset as string, 10);
    }
    
    logger.info(`批量获取价格数据，池地址: ${poolAddresses.join(',')}，过滤选项: ${JSON.stringify(filterOptions)}`);
    const bulkPriceData = await dataClient.getBulkPriceData(poolAddresses, filterOptions);
    
    res.json({
      status: 'success',
      data: { bulkPriceData }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`批量获取价格数据失败: ${errorMessage}`);
    next(error);
  }
});

/**
 * 获取市场概览
 */
router.get('/overview', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dataClient = ServiceManager.getInstance().getDataClient();
    
    logger.info('获取市场概览');
    const overview = await dataClient.getMarketOverview();
    
    res.json({
      status: 'success',
      data: { overview }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`获取市场概览失败: ${errorMessage}`);
    next(error);
  }
});

export default router; 