"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignalClient = void 0;
const base_client_1 = require("./base-client");
/**
 * 信号服务客户端
 * 用于与信号服务通信
 */
class SignalClient extends base_client_1.BaseClient {
    /**
     * 创建信号服务客户端实例
     * @param baseUrl 信号服务基础URL
     * @param timeout 请求超时时间(毫秒)
     */
    constructor(baseUrl, timeout = 10000) {
        super('Signal', baseUrl, timeout);
    }
    /**
     * 获取信号列表
     * @param options 过滤选项
     * @returns 信号列表
     */
    async getSignals(options) {
        return this.get('/signals', { params: options });
    }
    /**
     * 获取单个信号
     * @param id 信号ID
     * @returns 信号详情
     */
    async getSignal(id) {
        return this.get(`/signals/${id}`);
    }
    /**
     * 获取特定池的信号
     * @param poolAddress 池地址
     * @param options 过滤选项
     * @returns 信号列表
     */
    async getPoolSignals(poolAddress, options) {
        return this.get(`/signals/pool/${poolAddress}`, { params: options });
    }
    /**
     * 获取最新信号
     * @param options 过滤选项
     * @returns 最新信号列表
     */
    async getLatestSignals(options) {
        return this.get('/signals/latest', { params: options });
    }
    /**
     * 获取历史信号
     * @param options 过滤选项
     * @returns 历史信号列表
     */
    async getHistoricalSignals(options) {
        return this.get('/signals/historical', { params: options });
    }
    /**
     * 获取信号统计信息
     * @param poolAddress 池地址(可选)
     * @returns 信号统计信息
     */
    async getSignalStats(poolAddress) {
        const url = poolAddress ? `/signals/stats/${poolAddress}` : '/signals/stats';
        return this.get(url);
    }
}
exports.SignalClient = SignalClient;
//# sourceMappingURL=signal-client.js.map