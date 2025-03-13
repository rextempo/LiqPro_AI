"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataClient = void 0;
const base_client_1 = require("./base-client");
/**
 * 数据服务客户端
 * 用于与数据服务通信
 */
class DataClient extends base_client_1.BaseClient {
    /**
     * 创建数据服务客户端实例
     * @param baseUrl 数据服务基础URL
     * @param timeout 请求超时时间(毫秒)
     */
    constructor(baseUrl, timeout = 10000) {
        super('Data', baseUrl, timeout);
    }
    /**
     * 获取池列表
     * @returns 池信息列表
     */
    async getPools() {
        return this.get('/pools');
    }
    /**
     * 获取池信息
     * @param poolAddress 池地址
     * @returns 池信息
     */
    async getPool(poolAddress) {
        return this.get(`/pools/${poolAddress}`);
    }
    /**
     * 获取价格数据
     * @param poolAddress 池地址
     * @param options 过滤选项
     * @returns 价格数据点列表
     */
    async getPriceData(poolAddress, options) {
        return this.get(`/market-data/${poolAddress}/price`, { params: options });
    }
    /**
     * 获取流动性数据
     * @param poolAddress 池地址
     * @param options 过滤选项
     * @returns 流动性数据点列表
     */
    async getLiquidityData(poolAddress, options) {
        return this.get(`/market-data/${poolAddress}/liquidity`, { params: options });
    }
    /**
     * 获取多个池的价格数据
     * @param poolAddresses 池地址列表
     * @param options 过滤选项
     * @returns 按池地址分组的价格数据
     */
    async getBulkPriceData(poolAddresses, options) {
        return this.post('/market-data/bulk/price', {
            poolAddresses,
            ...options
        });
    }
    /**
     * 获取市场概览数据
     * @returns 市场概览数据
     */
    async getMarketOverview() {
        return this.get('/market-data/overview');
    }
}
exports.DataClient = DataClient;
//# sourceMappingURL=data-client.js.map