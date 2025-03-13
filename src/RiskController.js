"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentRiskController = void 0;
const transaction_1 = require("../types/transaction");
/**
 * 风险控制器实现
 */
class AgentRiskController {
    constructor(logger, transactionExecutor, fundsManager) {
        // 风险阈值配置
        this.riskThresholds = {
            emergencyThreshold: 1.5, // 健康评分低于1.5触发紧急退出
            mediumRiskThreshold: 2.5, // 健康评分低于2.5触发部分减仓
            partialReductionPercentage: 0.3, // 部分减仓比例30%
            monitoringInterval: 5 * 60 * 1000 // 5分钟监控一次
        };
        this.logger = logger;
        this.stateMachines = new Map();
        this.transactionExecutor = transactionExecutor;
        this.fundsManager = fundsManager;
        this.monitoringTimers = new Map();
    }
    /**
     * 注册Agent状态机
     */
    registerAgent(agentId, stateMachine) {
        this.stateMachines.set(agentId, stateMachine);
        this.startMonitoring(agentId);
        this.logger.info(`Agent ${agentId} registered with risk controller`);
    }
    /**
     * 注销Agent
     */
    unregisterAgent(agentId) {
        this.stopMonitoring(agentId);
        this.stateMachines.delete(agentId);
        this.logger.info(`Agent ${agentId} unregistered from risk controller`);
    }
    /**
     * 开始风险监控
     */
    startMonitoring(agentId) {
        // 停止现有的监控
        this.stopMonitoring(agentId);
        // 创建新的监控定时器
        const timer = setInterval(async () => {
            try {
                const assessment = await this.assessRisk(agentId);
                await this.handleRisk(agentId, assessment);
            }
            catch (error) {
                this.logger.error(`Error in risk monitoring for agent ${agentId}: ${error.message}`);
            }
        }, this.riskThresholds.monitoringInterval);
        this.monitoringTimers.set(agentId, timer);
        this.logger.info(`Started risk monitoring for agent ${agentId}`);
    }
    /**
     * 停止风险监控
     */
    stopMonitoring(agentId) {
        const timer = this.monitoringTimers.get(agentId);
        if (timer) {
            clearInterval(timer);
            this.monitoringTimers.delete(agentId);
            this.logger.info(`Stopped risk monitoring for agent ${agentId}`);
        }
    }
    /**
     * 评估风险
     */
    async assessRisk(agentId) {
        this.logger.info(`Assessing risk for agent ${agentId}`);
        try {
            // 获取Agent状态机
            const stateMachine = this.stateMachines.get(agentId);
            if (!stateMachine) {
                throw new Error(`Agent ${agentId} not registered with risk controller`);
            }
            // 获取资金状态
            const fundsStatus = await this.fundsManager.getFundsStatus(agentId, stateMachine.getStatus().config.walletAddress);
            // 这里应该实现实际的风险评估逻辑
            // 可以从信号服务获取风险评估数据
            // 模拟风险评估
            // 计算健康评分（示例：基于可用SOL和总价值的比例）
            const availableRatio = fundsStatus.availableSol / fundsStatus.totalValueSol;
            let healthScore = 5.0; // 满分5.0
            // 如果可用SOL比例过低，降低健康评分
            if (availableRatio < 0.1) {
                healthScore -= (0.1 - availableRatio) * 20; // 每少0.05，扣1分
            }
            // 如果仓位过于集中，降低健康评分
            if (fundsStatus.positions.length === 1) {
                healthScore -= 1.0; // 单一仓位扣1分
            }
            // 确定风险级别
            let riskLevel;
            if (healthScore <= this.riskThresholds.emergencyThreshold) {
                riskLevel = 'high';
            }
            else if (healthScore <= this.riskThresholds.mediumRiskThreshold) {
                riskLevel = 'medium';
            }
            else {
                riskLevel = 'low';
            }
            // 创建风险评估结果
            const assessment = {
                healthScore,
                riskLevel,
                triggers: [
                    {
                        type: 'available_sol_ratio',
                        value: availableRatio,
                        threshold: 0.1
                    },
                    {
                        type: 'position_concentration',
                        value: fundsStatus.positions.length,
                        threshold: 2
                    }
                ]
            };
            this.logger.info(`Risk assessment for agent ${agentId}: health score ${healthScore}, risk level ${riskLevel}`);
            return assessment;
        }
        catch (error) {
            this.logger.error(`Failed to assess risk for agent ${agentId}: ${error.message}`);
            // 返回默认的高风险评估
            return {
                healthScore: 0,
                riskLevel: 'high',
                triggers: [
                    {
                        type: 'assessment_error',
                        value: 0,
                        threshold: 1
                    }
                ]
            };
        }
    }
    /**
     * 处理风险
     */
    async handleRisk(agentId, assessment) {
        this.logger.info(`Handling risk for agent ${agentId} with health score ${assessment.healthScore}`);
        try {
            // 获取Agent状态机
            const stateMachine = this.stateMachines.get(agentId);
            if (!stateMachine) {
                throw new Error(`Agent ${agentId} not registered with risk controller`);
            }
            // 更新状态机的风险评估
            stateMachine.handleRiskAssessment(assessment);
            // 根据风险级别采取行动
            if (assessment.riskLevel === 'high') {
                await this.executeEmergencyExit(agentId, `Health score ${assessment.healthScore} below emergency threshold ${this.riskThresholds.emergencyThreshold}`);
            }
            else if (assessment.riskLevel === 'medium') {
                await this.executePartialReduction(agentId, this.riskThresholds.partialReductionPercentage);
            }
        }
        catch (error) {
            this.logger.error(`Failed to handle risk for agent ${agentId}: ${error.message}`);
        }
    }
    /**
     * 执行紧急退出
     */
    async executeEmergencyExit(agentId, reason) {
        this.logger.warn(`Executing emergency exit for agent ${agentId}: ${reason}`);
        try {
            // 获取Agent状态机
            const stateMachine = this.stateMachines.get(agentId);
            if (!stateMachine) {
                throw new Error(`Agent ${agentId} not registered with risk controller`);
            }
            // 获取资金状态
            const fundsStatus = await this.fundsManager.getFundsStatus(agentId, stateMachine.getStatus().config.walletAddress);
            // 如果没有活跃仓位，直接返回成功
            if (fundsStatus.positions.length === 0) {
                this.logger.info(`No active positions for agent ${agentId}, emergency exit completed`);
                return true;
            }
            // 按优先级处理每个仓位
            for (const position of fundsStatus.positions) {
                try {
                    // 移除LP仓位
                    const removeLpResult = await this.transactionExecutor.executeTransaction({
                        agentId,
                        type: transaction_1.TransactionType.REMOVE_LIQUIDITY,
                        priority: transaction_1.TransactionPriority.CRITICAL,
                        data: {
                            poolAddress: position.poolAddress,
                            percentage: 100 // 完全移除
                        }
                    });
                    if (!removeLpResult.success) {
                        throw new Error(`Failed to remove LP position: ${removeLpResult.error}`);
                    }
                    // 等待一段时间确保交易确认
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    // 将获得的代币换回SOL
                    const swapResult = await this.transactionExecutor.executeTransaction({
                        agentId,
                        type: transaction_1.TransactionType.SWAP_TO_SOL,
                        priority: transaction_1.TransactionPriority.CRITICAL,
                        data: {
                            poolAddress: position.poolAddress,
                            maxSlippage: 5.0 // 紧急情况下接受更高滑点
                        }
                    });
                    if (!swapResult.success) {
                        throw new Error(`Failed to swap tokens to SOL: ${swapResult.error}`);
                    }
                }
                catch (error) {
                    this.logger.error(`Failed to process position ${position.poolAddress} during emergency exit: ${error.message}`);
                    // 继续处理其他仓位
                }
            }
            // 再次检查资金状态
            const finalStatus = await this.fundsManager.getFundsStatus(agentId, stateMachine.getStatus().config.walletAddress);
            // 验证是否所有仓位都已清空
            const success = finalStatus.positions.length === 0;
            if (success) {
                this.logger.info(`Emergency exit completed successfully for agent ${agentId}`);
            }
            else {
                this.logger.error(`Emergency exit partially failed for agent ${agentId}, ${finalStatus.positions.length} positions remaining`);
            }
            return success;
        }
        catch (error) {
            this.logger.error(`Emergency exit failed for agent ${agentId}: ${error.message}`);
            return false;
        }
    }
    /**
     * 执行部分减仓
     */
    async executePartialReduction(agentId, percentage) {
        this.logger.info(`Executing partial reduction (${percentage}%) for agent ${agentId}`);
        try {
            // 获取Agent状态机
            const stateMachine = this.stateMachines.get(agentId);
            if (!stateMachine) {
                throw new Error(`Agent ${agentId} not registered with risk controller`);
            }
            // 获取资金状态
            const fundsStatus = await this.fundsManager.getFundsStatus(agentId, stateMachine.getStatus().config.walletAddress);
            // 如果没有活跃仓位，直接返回成功
            if (fundsStatus.positions.length === 0) {
                this.logger.info(`No active positions for agent ${agentId}, partial reduction completed`);
                return true;
            }
            // 计算每个仓位需要减少的数量
            const reductionAmount = percentage / 100;
            // 按风险从高到低排序仓位
            const sortedPositions = await this.sortPositionsByRisk(fundsStatus.positions);
            // 处理每个仓位
            for (const position of sortedPositions) {
                try {
                    // 移除部分LP
                    const removeLpResult = await this.transactionExecutor.executeTransaction({
                        agentId,
                        type: transaction_1.TransactionType.REMOVE_LIQUIDITY,
                        priority: transaction_1.TransactionPriority.HIGH,
                        data: {
                            poolAddress: position.poolAddress,
                            percentage: reductionAmount * 100
                        }
                    });
                    if (!removeLpResult.success) {
                        throw new Error(`Failed to remove LP position: ${removeLpResult.error}`);
                    }
                    // 等待交易确认
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    // 将获得的代币换回SOL
                    const swapResult = await this.transactionExecutor.executeTransaction({
                        agentId,
                        type: transaction_1.TransactionType.SWAP_TO_SOL,
                        priority: transaction_1.TransactionPriority.HIGH,
                        data: {
                            poolAddress: position.poolAddress,
                            maxSlippage: 2.0 // 部分减仓可以接受较低滑点
                        }
                    });
                    if (!swapResult.success) {
                        throw new Error(`Failed to swap tokens to SOL: ${swapResult.error}`);
                    }
                }
                catch (error) {
                    this.logger.error(`Failed to process position ${position.poolAddress} during partial reduction: ${error.message}`);
                    // 继续处理其他仓位
                }
            }
            // 验证减仓结果
            const finalStatus = await this.fundsManager.getFundsStatus(agentId, stateMachine.getStatus().config.walletAddress);
            // 计算总价值变化
            const initialValue = fundsStatus.totalValueSol;
            const finalValue = finalStatus.totalValueSol;
            const actualReduction = (initialValue - finalValue) / initialValue;
            // 允许5%的误差
            const success = Math.abs(actualReduction - reductionAmount) <= 0.05;
            if (success) {
                this.logger.info(`Partial reduction completed successfully for agent ${agentId}, reduced by ${(actualReduction * 100).toFixed(2)}%`);
            }
            else {
                this.logger.warn(`Partial reduction completed with deviation for agent ${agentId}, target: ${(reductionAmount * 100).toFixed(2)}%, actual: ${(actualReduction * 100).toFixed(2)}%`);
            }
            return success;
        }
        catch (error) {
            this.logger.error(`Partial reduction failed for agent ${agentId}: ${error.message}`);
            return false;
        }
    }
    /**
     * 按风险从高到低排序仓位
     */
    async sortPositionsByRisk(positions) {
        // 这里应该实现实际的风险排序逻辑
        // 可以从信号系统获取每个池子的风险评分
        // 临时实现：按价值排序（价值越高风险越大）
        return [...positions].sort((a, b) => b.valueUsd - a.valueUsd);
    }
}
exports.AgentRiskController = AgentRiskController;
//# sourceMappingURL=RiskController.js.map