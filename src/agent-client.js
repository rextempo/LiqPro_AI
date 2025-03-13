"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentClient = exports.AgentType = exports.AgentStatus = void 0;
const base_client_1 = require("./base-client");
/**
 * Agent状态枚举
 */
var AgentStatus;
(function (AgentStatus) {
    AgentStatus["RUNNING"] = "running";
    AgentStatus["PAUSED"] = "paused";
    AgentStatus["STOPPED"] = "stopped";
    AgentStatus["RISK_CONTROL"] = "risk_control";
    AgentStatus["OBSERVING"] = "observing";
})(AgentStatus || (exports.AgentStatus = AgentStatus = {}));
/**
 * Agent类型枚举
 */
var AgentType;
(function (AgentType) {
    AgentType["CONSERVATIVE"] = "conservative";
    AgentType["BALANCED"] = "balanced";
    AgentType["AGGRESSIVE"] = "aggressive";
    AgentType["CUSTOM"] = "custom";
})(AgentType || (exports.AgentType = AgentType = {}));
/**
 * Agent引擎客户端
 * 用于与Agent服务通信
 */
class AgentClient extends base_client_1.BaseClient {
    /**
     * 创建Agent引擎客户端实例
     * @param baseUrl Agent服务基础URL
     * @param timeout 请求超时时间(毫秒)
     */
    constructor(baseUrl, timeout = 10000) {
        super('Agent', baseUrl, timeout);
    }
    /**
     * 获取Agent列表
     * @param userId 用户ID
     * @param status 状态过滤
     * @returns Agent列表
     */
    async getAgents(userId, status) {
        return this.get('/agents', { params: { userId, status } });
    }
    /**
     * 获取单个Agent
     * @param agentId Agent ID
     * @returns Agent详情
     */
    async getAgent(agentId) {
        return this.get(`/agents/${agentId}`);
    }
    /**
     * 创建Agent
     * @param userId 用户ID
     * @param params 创建参数
     * @returns 创建的Agent
     */
    async createAgent(userId, params) {
        return this.post('/agents', { userId, ...params });
    }
    /**
     * 更新Agent状态
     * @param agentId Agent ID
     * @param status 新状态
     * @returns 更新后的Agent
     */
    async updateAgentStatus(agentId, status) {
        return this.put(`/agents/${agentId}/status`, { status });
    }
    /**
     * 获取Agent交易历史
     * @param agentId Agent ID
     * @param limit 限制数量
     * @param offset 偏移量
     * @returns 交易历史
     */
    async getAgentTransactions(agentId, limit = 10, offset = 0) {
        return this.get(`/agents/${agentId}/transactions`, {
            params: { limit, offset }
        });
    }
    /**
     * 充值资金到Agent
     * @param agentId Agent ID
     * @param amount 金额
     * @returns 更新后的Agent
     */
    async depositFunds(agentId, amount) {
        return this.post(`/agents/${agentId}/deposit`, { amount });
    }
    /**
     * 从Agent提取资金
     * @param agentId Agent ID
     * @param amount 金额
     * @returns 更新后的Agent
     */
    async withdrawFunds(agentId, amount) {
        return this.post(`/agents/${agentId}/withdraw`, { amount });
    }
    /**
     * 紧急清仓
     * @param agentId Agent ID
     * @returns 操作结果
     */
    async emergencyExit(agentId) {
        return this.post(`/agents/${agentId}/emergency-exit`, {});
    }
}
exports.AgentClient = AgentClient;
//# sourceMappingURL=agent-client.js.map