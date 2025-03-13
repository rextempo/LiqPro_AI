import { Request, Response } from 'express';
import { Logger } from '../../utils/logger';
import { CruiseService } from '../../core/cruise/CruiseService';
/**
 * CruiseController - 巡航服务API控制器
 *
 * 提供巡航服务的REST API接口，包括：
 * - 获取巡航服务状态
 * - 获取巡航服务指标
 * - 执行代理健康检查
 * - 执行代理仓位优化
 */
export declare class CruiseController {
    private logger;
    private cruiseService;
    constructor(logger: Logger, cruiseService: CruiseService);
    /**
     * 获取巡航服务状态
     */
    getStatus: (req: Request, res: Response) => Promise<void>;
    /**
     * 获取巡航服务指标
     */
    getMetrics: (req: Request, res: Response) => Promise<void>;
    /**
     * 获取特定代理的指标
     */
    getAgentMetrics: (req: Request, res: Response) => Promise<void>;
    /**
     * 执行代理健康检查
     */
    performHealthCheck: (req: Request, res: Response) => Promise<void>;
    /**
     * 执行代理仓位优化
     */
    optimizePositions: (req: Request, res: Response) => Promise<void>;
}
