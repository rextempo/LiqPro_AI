"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentStateMachine = void 0;
const types_1 = require("../types");
// 内存状态持久化实现
class MemoryStatePersistence {
    constructor() {
        this.states = new Map();
    }
    async saveState(agentId, state) {
        this.states.set(agentId, state);
    }
    async loadState(agentId) {
        return this.states.get(agentId) || null;
    }
}
class AgentStateMachine {
    constructor(config, logger, persistence) {
        this.stateChangeListeners = [];
        this.stateHistory = [];
        this.riskHistory = [];
        this.recoveryAttempts = 0;
        this.MAX_RECOVERY_ATTEMPTS = 3;
        this.STATE_TIMEOUT_MS = 30 * 60 * 1000; // 30分钟状态超时
        this.state = types_1.AgentState.INITIALIZING;
        this.config = config;
        this.funds = {
            totalValueUsd: 0,
            totalValueSol: 0,
            availableSol: 0,
            positions: []
        };
        this.lastUpdate = Date.now();
        this.stateStartTime = Date.now();
        this.persistence = persistence || new MemoryStatePersistence();
        this.logger = logger;
        // 记录初始状态
        this.recordStateChange(this.state);
    }
    // 验证状态转换是否合法
    isValidTransition(currentState, event) {
        const validTransitions = {
            [types_1.AgentState.INITIALIZING]: [types_1.AgentEvent.START],
            [types_1.AgentState.RUNNING]: [types_1.AgentEvent.STOP, types_1.AgentEvent.FUNDS_LOW, types_1.AgentEvent.RISK_MEDIUM, types_1.AgentEvent.RISK_HIGH, types_1.AgentEvent.USER_EMERGENCY],
            [types_1.AgentState.WAITING]: [types_1.AgentEvent.FUNDS_SUFFICIENT, types_1.AgentEvent.STOP, types_1.AgentEvent.USER_EMERGENCY],
            [types_1.AgentState.PARTIAL_REDUCING]: [types_1.AgentEvent.RISK_RESOLVED, types_1.AgentEvent.RISK_HIGH, types_1.AgentEvent.USER_EMERGENCY, types_1.AgentEvent.STOP],
            [types_1.AgentState.EMERGENCY_EXIT]: [types_1.AgentEvent.STOP],
            [types_1.AgentState.STOPPED]: [types_1.AgentEvent.START]
        };
        return validTransitions[currentState]?.includes(event) || false;
    }
    // 检查状态超时
    checkStateTimeout() {
        const now = Date.now();
        const stateDuration = now - this.stateStartTime;
        if (stateDuration > this.STATE_TIMEOUT_MS) {
            // 状态持续时间过长，尝试恢复
            this.logger.warn(`State ${this.state} timeout after ${stateDuration}ms for agent ${this.config.name}`);
            this.attemptStateRecovery();
        }
    }
    // 尝试状态恢复
    attemptStateRecovery() {
        if (this.recoveryAttempts >= this.MAX_RECOVERY_ATTEMPTS) {
            this.logger.error(`Max recovery attempts reached for agent ${this.config.name}, forcing emergency exit`);
            this.handleEvent(types_1.AgentEvent.USER_EMERGENCY);
            return;
        }
        this.recoveryAttempts++;
        this.logger.info(`Attempting state recovery for agent ${this.config.name}, attempt ${this.recoveryAttempts}`);
        switch (this.state) {
            case types_1.AgentState.PARTIAL_REDUCING:
                // 如果部分减仓状态超时，检查当前风险评估
                const lastRiskAssessment = this.riskHistory[this.riskHistory.length - 1];
                if (lastRiskAssessment && lastRiskAssessment.assessment.healthScore > 2.5) {
                    this.handleEvent(types_1.AgentEvent.RISK_RESOLVED);
                }
                else {
                    this.handleEvent(types_1.AgentEvent.RISK_HIGH);
                }
                break;
            case types_1.AgentState.WAITING:
                // 如果等待状态超时，重新检查资金状况
                if (this.funds.availableSol >= this.config.minSolBalance) {
                    this.handleEvent(types_1.AgentEvent.FUNDS_SUFFICIENT);
                }
                break;
            case types_1.AgentState.EMERGENCY_EXIT:
                // 紧急退出状态超时，强制停止
                this.handleEvent(types_1.AgentEvent.STOP);
                break;
            default:
                // 其他状态超时，记录错误并保持当前状态
                this.logger.warn(`No recovery action defined for state ${this.state}`);
                break;
        }
    }
    // 初始化状态机
    async initialize() {
        try {
            // 尝试加载持久化状态
            const savedState = await this.persistence.loadState(this.config.walletAddress);
            if (savedState) {
                this.state = savedState.state;
                this.funds = savedState.funds;
                this.lastUpdate = savedState.lastUpdate;
                this.lastError = savedState.lastError;
                this.logger.info(`Loaded state for agent ${this.config.name}: ${this.state}`);
            }
            else {
                this.logger.info(`No saved state found for agent ${this.config.name}, starting with INITIALIZING state`);
            }
        }
        catch (error) {
            this.logger.error(`Failed to initialize state machine for agent ${this.config.name}: ${error.message}`);
            this.setError(`Initialization failed: ${error.message}`);
        }
    }
    // 获取当前状态
    getStatus() {
        return {
            state: this.state,
            config: this.config,
            funds: this.funds,
            lastUpdate: this.lastUpdate,
            lastError: this.lastError
        };
    }
    // 更新处理事件方法
    handleEvent(event) {
        const prevState = this.state;
        // 验证状态转换
        if (!this.isValidTransition(this.state, event)) {
            this.logger.warn(`Invalid state transition: ${this.state} -> ${event} for agent ${this.config.name}`);
            return false;
        }
        this.logger.info(`Processing event ${event} for agent ${this.config.name} in state ${this.state}`);
        switch (event) {
            case types_1.AgentEvent.START:
                if (this.state === types_1.AgentState.INITIALIZING || this.state === types_1.AgentState.STOPPED) {
                    this.state = types_1.AgentState.RUNNING;
                    this.recoveryAttempts = 0; // 重置恢复尝试次数
                }
                break;
            case types_1.AgentEvent.STOP:
                this.state = types_1.AgentState.STOPPED;
                this.recoveryAttempts = 0;
                break;
            case types_1.AgentEvent.FUNDS_LOW:
                if (this.state === types_1.AgentState.RUNNING) {
                    this.state = types_1.AgentState.WAITING;
                }
                break;
            case types_1.AgentEvent.FUNDS_SUFFICIENT:
                if (this.state === types_1.AgentState.WAITING) {
                    this.state = types_1.AgentState.RUNNING;
                    this.recoveryAttempts = 0;
                }
                break;
            case types_1.AgentEvent.RISK_MEDIUM:
                if (this.state === types_1.AgentState.RUNNING) {
                    this.state = types_1.AgentState.PARTIAL_REDUCING;
                    this.mediumRiskStartTime = Date.now();
                }
                break;
            case types_1.AgentEvent.RISK_HIGH:
            case types_1.AgentEvent.USER_EMERGENCY:
                this.state = types_1.AgentState.EMERGENCY_EXIT;
                this.highRiskStartTime = Date.now();
                break;
            case types_1.AgentEvent.RISK_RESOLVED:
                if (this.state === types_1.AgentState.PARTIAL_REDUCING) {
                    this.state = types_1.AgentState.RUNNING;
                    this.mediumRiskStartTime = undefined;
                    this.recoveryAttempts = 0;
                }
                break;
            default:
                return false;
        }
        const stateChanged = this.state !== prevState;
        if (stateChanged) {
            this.logger.info(`State changed from ${prevState} to ${this.state} for agent ${this.config.name}`);
            this.stateStartTime = Date.now(); // 更新状态开始时间
            this.recordStateChange(this.state);
            this.persistState();
            this.notifyStateChangeListeners();
        }
        this.lastUpdate = Date.now();
        return stateChanged;
    }
    // 更新资金状态
    updateFunds(funds) {
        this.funds = funds;
        this.lastUpdate = Date.now();
        this.logger.info(`Updated funds for agent ${this.config.name}: ${funds.availableSol} SOL available, ${funds.totalValueSol} SOL total`);
        // 检查资金是否充足
        if (funds.availableSol < this.config.minSolBalance) {
            this.logger.warn(`Funds low for agent ${this.config.name}: ${funds.availableSol} SOL < ${this.config.minSolBalance} SOL`);
            this.handleEvent(types_1.AgentEvent.FUNDS_LOW);
        }
        else if (this.state === types_1.AgentState.WAITING) {
            this.logger.info(`Funds sufficient for agent ${this.config.name}: ${funds.availableSol} SOL >= ${this.config.minSolBalance} SOL`);
            this.handleEvent(types_1.AgentEvent.FUNDS_SUFFICIENT);
        }
        this.persistState();
    }
    // 处理风险评估
    handleRiskAssessment(assessment) {
        this.logger.info(`Risk assessment for agent ${this.config.name}: score ${assessment.healthScore}, level ${assessment.riskLevel}`);
        // 记录风险评估
        this.riskHistory.push({
            assessment,
            timestamp: Date.now()
        });
        // 保持历史记录在合理范围内
        if (this.riskHistory.length > 100) {
            this.riskHistory.shift();
        }
        // 检查持续时间
        const now = Date.now();
        const tenMinutes = 10 * 60 * 1000;
        const fiveMinutes = 5 * 60 * 1000;
        if (assessment.healthScore <= this.config.emergencyThresholds.minHealthScore) {
            // 高风险
            if (!this.highRiskStartTime) {
                this.highRiskStartTime = now;
            }
            // 如果高风险持续5分钟以上，触发紧急退出
            if (now - this.highRiskStartTime >= fiveMinutes) {
                this.logger.warn(`High risk persisted for 5+ minutes for agent ${this.config.name}, triggering emergency exit`);
                this.handleEvent(types_1.AgentEvent.RISK_HIGH);
            }
        }
        else {
            this.highRiskStartTime = undefined;
            if (assessment.healthScore <= 2.5 && assessment.healthScore > this.config.emergencyThresholds.minHealthScore) {
                // 中等风险
                if (!this.mediumRiskStartTime) {
                    this.mediumRiskStartTime = now;
                }
                // 如果中等风险持续10分钟以上，触发部分减仓
                if (now - this.mediumRiskStartTime >= tenMinutes) {
                    this.logger.warn(`Medium risk persisted for 10+ minutes for agent ${this.config.name}, triggering partial reduction`);
                    this.handleEvent(types_1.AgentEvent.RISK_MEDIUM);
                }
            }
            else if (this.state === types_1.AgentState.PARTIAL_REDUCING) {
                // 风险已解决
                this.logger.info(`Risk resolved for agent ${this.config.name}, health score: ${assessment.healthScore}`);
                this.handleEvent(types_1.AgentEvent.RISK_RESOLVED);
                this.mediumRiskStartTime = undefined;
            }
            else {
                this.mediumRiskStartTime = undefined;
            }
        }
    }
    // 设置错误状态
    setError(error) {
        this.lastError = error;
        this.lastUpdate = Date.now();
        this.logger.error(`Error in agent ${this.config.name}: ${error}`);
        this.persistState();
    }
    // 清除错误状态
    clearError() {
        this.lastError = undefined;
        this.lastUpdate = Date.now();
        this.logger.info(`Cleared error state for agent ${this.config.name}`);
        this.persistState();
    }
    // 添加状态变更监听器
    addStateChangeListener(listener) {
        this.stateChangeListeners.push(listener);
    }
    // 移除状态变更监听器
    removeStateChangeListener(listener) {
        const index = this.stateChangeListeners.indexOf(listener);
        if (index !== -1) {
            this.stateChangeListeners.splice(index, 1);
        }
    }
    // 获取状态历史
    getStateHistory() {
        return [...this.stateHistory];
    }
    // 获取风险历史
    getRiskHistory() {
        return [...this.riskHistory];
    }
    // 持久化当前状态
    async persistState() {
        try {
            await this.persistence.saveState(this.config.walletAddress, this.getStatus());
        }
        catch (error) {
            this.logger.error(`Failed to persist state for agent ${this.config.name}: ${error.message}`);
        }
    }
    // 记录状态变更
    recordStateChange(state) {
        this.stateHistory.push({
            state,
            timestamp: Date.now()
        });
        // 保持历史记录在合理范围内
        if (this.stateHistory.length > 100) {
            this.stateHistory.shift();
        }
    }
    // 通知状态变更监听器
    notifyStateChangeListeners() {
        const status = this.getStatus();
        for (const listener of this.stateChangeListeners) {
            try {
                listener(status);
            }
            catch (error) {
                this.logger.error(`Error in state change listener: ${error.message}`);
            }
        }
    }
    // 定期检查状态
    periodicCheck() {
        this.checkStateTimeout();
        // 检查风险评估历史
        const recentRiskAssessments = this.riskHistory
            .filter(h => Date.now() - h.timestamp < 15 * 60 * 1000); // 最近15分钟
        if (recentRiskAssessments.length > 0) {
            const avgHealthScore = recentRiskAssessments.reduce((sum, h) => sum + h.assessment.healthScore, 0) / recentRiskAssessments.length;
            // 如果平均健康分数显著改善，考虑解除风险状态
            if (this.state === types_1.AgentState.PARTIAL_REDUCING && avgHealthScore > 3.0) {
                this.logger.info(`Average health score improved to ${avgHealthScore}, considering risk resolved`);
                this.handleEvent(types_1.AgentEvent.RISK_RESOLVED);
            }
        }
    }
    // 获取当前状态持续时间（毫秒）
    getCurrentStateDuration() {
        return Date.now() - this.stateStartTime;
    }
    // 获取恢复尝试次数
    getRecoveryAttempts() {
        return this.recoveryAttempts;
    }
    // 重置恢复尝试计数
    resetRecoveryAttempts() {
        this.recoveryAttempts = 0;
        this.logger.info(`Reset recovery attempts for agent ${this.config.name}`);
    }
}
exports.AgentStateMachine = AgentStateMachine;
//# sourceMappingURL=AgentStateMachine.js.map