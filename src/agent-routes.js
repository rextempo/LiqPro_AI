"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 代理服务路由
 */
const express_1 = require("express");
const logger_1 = require("../utils/logger");
const service_manager_1 = require("../clients/service-manager");
const agent_client_1 = require("../clients/agent-client");
const router = (0, express_1.Router)();
const logger = new logger_1.Logger('AgentRoutes');
/**
 * 获取用户的所有代理
 */
router.get('/', async (req, res, next) => {
    try {
        const userId = req.query.userId;
        if (!userId) {
            return res.status(400).json({
                status: 'error',
                message: '请提供用户ID'
            });
        }
        const status = req.query.status;
        const agentClient = service_manager_1.ServiceManager.getInstance().getAgentClient();
        logger.info(`获取用户代理列表，用户ID: ${userId}${status ? `，状态: ${status}` : ''}`);
        const agents = await agentClient.getAgents(userId, status);
        res.json({
            status: 'success',
            data: {
                agents,
                count: agents.length
            }
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`获取用户代理列表失败: ${errorMessage}`);
        next(error);
    }
});
/**
 * 获取单个代理详情
 */
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const agentClient = service_manager_1.ServiceManager.getInstance().getAgentClient();
        logger.info(`获取代理详情，ID: ${id}`);
        const agent = await agentClient.getAgent(id);
        res.json({
            status: 'success',
            data: { agent }
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`获取代理详情失败: ${errorMessage}`);
        next(error);
    }
});
/**
 * 创建新代理
 */
router.post('/', async (req, res, next) => {
    try {
        const userId = req.body.userId;
        const params = req.body.params;
        if (!userId) {
            return res.status(400).json({
                status: 'error',
                message: '请提供用户ID'
            });
        }
        if (!params || !params.name || !params.type || params.initialFunds === undefined || params.riskLevel === undefined) {
            return res.status(400).json({
                status: 'error',
                message: '请提供有效的代理创建参数'
            });
        }
        const agentClient = service_manager_1.ServiceManager.getInstance().getAgentClient();
        logger.info(`创建代理，用户ID: ${userId}，代理名称: ${params.name}`);
        const agent = await agentClient.createAgent(userId, params);
        res.status(201).json({
            status: 'success',
            data: { agent }
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`创建代理失败: ${errorMessage}`);
        next(error);
    }
});
/**
 * 更新代理状态
 */
router.put('/:id/status', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!status || !Object.values(agent_client_1.AgentStatus).includes(status)) {
            return res.status(400).json({
                status: 'error',
                message: '请提供有效的代理状态'
            });
        }
        const agentClient = service_manager_1.ServiceManager.getInstance().getAgentClient();
        logger.info(`更新代理状态，ID: ${id}，新状态: ${status}`);
        const agent = await agentClient.updateAgentStatus(id, status);
        res.json({
            status: 'success',
            data: { agent }
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`更新代理状态失败: ${errorMessage}`);
        next(error);
    }
});
/**
 * 获取代理交易历史
 */
router.get('/:id/transactions', async (req, res, next) => {
    try {
        const { id } = req.params;
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
        const offset = req.query.offset ? parseInt(req.query.offset, 10) : 0;
        const agentClient = service_manager_1.ServiceManager.getInstance().getAgentClient();
        logger.info(`获取代理交易历史，ID: ${id}，限制: ${limit}，偏移: ${offset}`);
        const transactions = await agentClient.getAgentTransactions(id, limit, offset);
        res.json({
            status: 'success',
            data: {
                transactions,
                count: transactions.length
            }
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`获取代理交易历史失败: ${errorMessage}`);
        next(error);
    }
});
/**
 * 向代理存入资金
 */
router.post('/:id/deposit', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { amount } = req.body;
        if (amount === undefined || isNaN(amount) || amount <= 0) {
            return res.status(400).json({
                status: 'error',
                message: '请提供有效的存款金额'
            });
        }
        const agentClient = service_manager_1.ServiceManager.getInstance().getAgentClient();
        logger.info(`向代理存入资金，ID: ${id}，金额: ${amount}`);
        const agent = await agentClient.depositFunds(id, amount);
        res.json({
            status: 'success',
            data: { agent }
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`向代理存入资金失败: ${errorMessage}`);
        next(error);
    }
});
/**
 * 从代理提取资金
 */
router.post('/:id/withdraw', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { amount } = req.body;
        if (amount === undefined || isNaN(amount) || amount <= 0) {
            return res.status(400).json({
                status: 'error',
                message: '请提供有效的提款金额'
            });
        }
        const agentClient = service_manager_1.ServiceManager.getInstance().getAgentClient();
        logger.info(`从代理提取资金，ID: ${id}，金额: ${amount}`);
        const agent = await agentClient.withdrawFunds(id, amount);
        res.json({
            status: 'success',
            data: { agent }
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`从代理提取资金失败: ${errorMessage}`);
        next(error);
    }
});
/**
 * 紧急退出
 */
router.post('/:id/emergency-exit', async (req, res, next) => {
    try {
        const { id } = req.params;
        const agentClient = service_manager_1.ServiceManager.getInstance().getAgentClient();
        logger.info(`代理紧急退出，ID: ${id}`);
        const result = await agentClient.emergencyExit(id);
        res.json({
            status: 'success',
            data: result
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`代理紧急退出失败: ${errorMessage}`);
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=agent-routes.js.map