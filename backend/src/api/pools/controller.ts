import { Request, Response } from 'express';
import { PoolService } from '../../core/data/pool-service';
import { PositionMonitor } from '../../core/data/position-monitor';
import { MeteoraService } from '../../services/meteora';
import { ApiError, ApiErrorCode, ApiResponse, PoolQueryParams, MonitoredPoolQueryParams } from '@liqpro/shared/src/types/api';
import logger from '../../utils/logger';

export class PoolController {
  private poolService: PoolService;
  private positionMonitor: PositionMonitor;
  private meteoraService: MeteoraService;

  constructor() {
    // 初始化MeteoraService
    this.meteoraService = new MeteoraService(
      process.env.METEORA_API_URL || 'https://api.meteora.ag',
      process.env.METEORA_API_KEY || ''
    );

    // 初始化PoolService
    this.poolService = new PoolService(this.meteoraService);

    // 初始化PositionMonitor
    this.positionMonitor = new PositionMonitor(this.poolService);
  }

  /**
   * 获取推荐池子列表
   * @api {get} /api/pools/recommended 获取推荐池子列表
   * @apiName GetRecommendedPools
   * @apiGroup Pools
   * @apiVersion 1.0.0
   */
  public getRecommendedPools = async (req: Request, res: Response) => {
    try {
      const query = req.query as unknown as PoolQueryParams;
      
      const pools = await this.poolService.getTop100Pools();

      const response: ApiResponse<typeof pools> = {
        success: true,
        data: pools
      };

      res.json(response);
    } catch (error) {
      logger.error('Failed to get recommended pools:', error);
      throw new ApiError(
        'Failed to get recommended pools',
        500,
        ApiErrorCode.INTERNAL_ERROR
      );
    }
  };

  /**
   * 获取池子详情
   * @api {get} /api/pools/:address 获取池子详情
   * @apiName GetPoolDetail
   * @apiGroup Pools
   * @apiVersion 1.0.0
   */
  public getPoolDetail = async (req: Request, res: Response) => {
    try {
      const { address } = req.params;
      const poolDetail = await this.poolService.getPoolDetail(address);
      
      if (!poolDetail) {
        throw new ApiError(
          'Pool not found',
          404,
          ApiErrorCode.NOT_FOUND
        );
      }

      const response: ApiResponse<typeof poolDetail> = {
        success: true,
        data: poolDetail
      };

      res.json(response);
    } catch (error) {
      logger.error('Failed to get pool detail:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        'Failed to get pool detail',
        500,
        ApiErrorCode.INTERNAL_ERROR
      );
    }
  };

  /**
   * 获取监控的池子列表
   * @api {get} /api/pools/monitored 获取监控的池子列表
   * @apiName GetMonitoredPools
   * @apiGroup Pools
   * @apiVersion 1.0.0
   */
  public getMonitoredPools = async (req: Request, res: Response) => {
    try {
      const query = req.query as unknown as MonitoredPoolQueryParams;
      
      // TODO: 从请求中获取agentAddress
      const agentAddress = req.query.agentAddress as string;
      if (!agentAddress) {
        throw new ApiError(
          'Agent address is required',
          400,
          ApiErrorCode.BAD_REQUEST
        );
      }

      const positions = await this.positionMonitor.getAgentPositions(agentAddress);

      const response: ApiResponse<typeof positions> = {
        success: true,
        data: positions
      };

      res.json(response);
    } catch (error) {
      logger.error('Failed to get monitored pools:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        'Failed to get monitored pools',
        500,
        ApiErrorCode.INTERNAL_ERROR
      );
    }
  };
} 