import { BaseClient } from './base-client';
import { Signal } from '../types/signal';
/**
 * 风险评估接口
 */
export interface RiskAssessment {
    poolAddress: string;
    timestamp: number;
    overallRisk: number;
    factors: {
        priceRisk: number;
        liquidityRisk: number;
        volatilityRisk: number;
        impermanentLossRisk: number;
        whaleActivityRisk: number;
    };
    analysis: string;
}
/**
 * 信号评分接口
 */
export interface SignalScore {
    signalId: string;
    score: number;
    confidence: number;
    factors: Record<string, number>;
    timestamp: number;
}
/**
 * 池健康度接口
 */
export interface PoolHealth {
    poolAddress: string;
    timestamp: number;
    healthScore: number;
    metrics: {
        liquidity: number;
        volume: number;
        volatility: number;
        priceStability: number;
        binDistribution: number;
    };
    recommendation: string;
}
/**
 * 评分服务客户端
 * 用于与评分服务通信
 */
export declare class ScoringClient extends BaseClient {
    /**
     * 创建评分服务客户端实例
     * @param baseUrl 评分服务基础URL
     * @param timeout 请求超时时间(毫秒)
     */
    constructor(baseUrl: string, timeout?: number);
    /**
     * 评估信号质量
     * @param signal 信号对象
     * @returns 信号评分
     */
    scoreSignal(signal: Signal): Promise<SignalScore>;
    /**
     * 批量评估信号质量
     * @param signals 信号对象数组
     * @returns 信号评分数组
     */
    scoreSignals(signals: Signal[]): Promise<SignalScore[]>;
    /**
     * 获取池风险评估
     * @param poolAddress 池地址
     * @returns 风险评估
     */
    getRiskAssessment(poolAddress: string): Promise<RiskAssessment>;
    /**
     * 获取池健康度
     * @param poolAddress 池地址
     * @returns 池健康度
     */
    getPoolHealth(poolAddress: string): Promise<PoolHealth>;
    /**
     * 获取多个池的健康度
     * @param poolAddresses 池地址数组
     * @returns 按池地址分组的健康度
     */
    getBulkPoolHealth(poolAddresses: string[]): Promise<Record<string, PoolHealth>>;
    /**
     * 获取历史信号准确率
     * @param timeframe 时间范围(天)
     * @returns 准确率数据
     */
    getSignalAccuracy(timeframe?: number): Promise<any>;
}
