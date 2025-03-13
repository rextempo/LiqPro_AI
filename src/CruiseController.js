"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CruiseController = void 0;
/**
 * CruiseController - 巡航服务API控制器
 *
 * 提供巡航服务的REST API接口，包括：
 * - 获取巡航服务状态
 * - 获取巡航服务指标
 * - 执行代理健康检查
 * - 执行代理仓位优化
 */
class CruiseController {
    constructor(logger, cruiseService) {
        /**
         * 获取巡航服务状态
         */
        this.getStatus = async (req, res) => {
            try {
                this.logger.info('Getting cruise service status');
                const health = this.cruiseService.getHealth();
                res.status(200).json({
                    success: true,
                    data: health
                });
            }
            catch (error) {
                this.logger.error(`Error getting cruise status: ${error instanceof Error ? error.message : String(error)}`);
                res.status(500).json({
                    success: false,
                    error: 'Failed to get cruise status',
                    message: error instanceof Error ? error.message : String(error)
                });
            }
        };
        /**
         * 获取巡航服务指标
         */
        this.getMetrics = async (req, res) => {
            try {
                this.logger.info('Getting cruise service metrics');
                const metrics = this.cruiseService.getMetrics();
                res.status(200).json({
                    success: true,
                    data: metrics
                });
            }
            catch (error) {
                this.logger.error(`Error getting cruise metrics: ${error instanceof Error ? error.message : String(error)}`);
                res.status(500).json({
                    success: false,
                    error: 'Failed to get cruise metrics',
                    message: error instanceof Error ? error.message : String(error)
                });
            }
        };
        /**
         * 获取特定代理的指标
         */
        this.getAgentMetrics = async (req, res) => {
            try {
                const { agentId } = req.params;
                if (!agentId) {
                    res.status(400).json({
                        success: false,
                        error: 'Missing agent ID',
                        message: 'Agent ID is required'
                    });
                    return;
                }
                this.logger.info(`Getting metrics for agent: ${agentId}`);
                const metrics = this.cruiseService.getAgentMetrics(agentId);
                if (!metrics) {
                    res.status(404).json({
                        success: false,
                        error: 'Agent not found',
                        message: `No metrics found for agent: ${agentId}`
                    });
                    return;
                }
                res.status(200).json({
                    success: true,
                    data: metrics
                });
            }
            catch (error) {
                this.logger.error(`Error getting agent metrics: ${error instanceof Error ? error.message : String(error)}`);
                res.status(500).json({
                    success: false,
                    error: 'Failed to get agent metrics',
                    message: error instanceof Error ? error.message : String(error)
                });
            }
        };
        /**
         * 执行代理健康检查
         */
        this.performHealthCheck = async (req, res) => {
            try {
                const { agentId } = req.params;
                if (!agentId) {
                    res.status(400).json({
                        success: false,
                        error: 'Missing agent ID',
                        message: 'Agent ID is required'
                    });
                    return;
                }
                this.logger.info(`Performing health check for agent: ${agentId}`);
                const result = await this.cruiseService.performAgentHealthCheck(agentId);
                res.status(result.success ? 200 : 400).json({
                    success: result.success,
                    message: result.message
                });
            }
            catch (error) {
                this.logger.error(`Error performing health check: ${error instanceof Error ? error.message : String(error)}`);
                res.status(500).json({
                    success: false,
                    error: 'Failed to perform health check',
                    message: error instanceof Error ? error.message : String(error)
                });
            }
        };
        /**
         * 执行代理仓位优化
         */
        this.optimizePositions = async (req, res) => {
            try {
                const { agentId } = req.params;
                if (!agentId) {
                    res.status(400).json({
                        success: false,
                        error: 'Missing agent ID',
                        message: 'Agent ID is required'
                    });
                    return;
                }
                this.logger.info(`Optimizing positions for agent: ${agentId}`);
                const result = await this.cruiseService.optimizeAgentPositions(agentId);
                res.status(result.success ? 200 : 400).json({
                    success: result.success,
                    message: result.message
                });
            }
            catch (error) {
                this.logger.error(`Error optimizing positions: ${error instanceof Error ? error.message : String(error)}`);
                res.status(500).json({
                    success: false,
                    error: 'Failed to optimize positions',
                    message: error instanceof Error ? error.message : String(error)
                });
            }
        };
        this.logger = logger.child({ module: 'CruiseController' });
        this.cruiseService = cruiseService;
        this.logger.info('CruiseController initialized');
    }
}
exports.CruiseController = CruiseController;
//# sourceMappingURL=CruiseController.js.map