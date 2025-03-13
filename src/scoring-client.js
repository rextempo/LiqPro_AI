"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScoringClient = void 0;
const base_client_1 = require("./base-client");
/**
 * 评分服务客户端
 * 用于与评分服务通信
 */
class ScoringClient extends base_client_1.BaseClient {
    /**
     * 创建评分服务客户端实例
     * @param baseUrl 评分服务基础URL
     * @param timeout 请求超时时间(毫秒)
     */
    constructor(baseUrl, timeout = 10000) {
        super('Scoring', baseUrl, timeout);
    }
    /**
     * 评估信号质量
     * @param signal 信号对象
     * @returns 信号评分
     */
    async scoreSignal(signal) {
        return this.post('/score/signal', signal);
    }
    /**
     * 批量评估信号质量
     * @param signals 信号对象数组
     * @returns 信号评分数组
     */
    async scoreSignals(signals) {
        return this.post('/score/signals/batch', { signals });
    }
    /**
     * 获取池风险评估
     * @param poolAddress 池地址
     * @returns 风险评估
     */
    async getRiskAssessment(poolAddress) {
        return this.get(`/risk/${poolAddress}`);
    }
    /**
     * 获取池健康度
     * @param poolAddress 池地址
     * @returns 池健康度
     */
    async getPoolHealth(poolAddress) {
        return this.get(`/health/${poolAddress}`);
    }
    /**
     * 获取多个池的健康度
     * @param poolAddresses 池地址数组
     * @returns 按池地址分组的健康度
     */
    async getBulkPoolHealth(poolAddresses) {
        return this.post('/health/bulk', { poolAddresses });
    }
    /**
     * 获取历史信号准确率
     * @param timeframe 时间范围(天)
     * @returns 准确率数据
     */
    async getSignalAccuracy(timeframe = 30) {
        return this.get('/analytics/accuracy', { params: { timeframe } });
    }
}
exports.ScoringClient = ScoringClient;
//# sourceMappingURL=scoring-client.js.map