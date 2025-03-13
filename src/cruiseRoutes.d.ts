import { Router } from 'express';
import { Logger } from '../../utils/logger';
import { CruiseService } from '../../core/cruise/CruiseService';
/**
 * 创建巡航服务路由
 * @param logger 日志记录器
 * @param cruiseService 巡航服务实例
 * @returns Express路由器
 */
export declare const createCruiseRoutes: (logger: Logger, cruiseService: CruiseService) => Router;
