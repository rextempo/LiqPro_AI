/**
 * Meteora DLMM Pool Collector
 * 负责从 Meteora DLMM 池收集数据
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { DLMM, DLMMPoolInfo } from '@meteora-ag/dlmm';
import logger from '../utils/logger';

/**
 * Meteora DLMM Pool Collector
 * 负责从 Meteora DLMM 池收集数据
 */
export class MeteoraPoolCollector {
  private connection: Connection;
  private dlmm: DLMM;
  private poolCache: Map<string, DLMMPoolInfo> = new Map();
  private lastUpdateTime: Map<string, number> = new Map();
  private updateInterval: number = 60 * 1000; // 1 分钟（毫秒）

  /**
   * 创建一个新的 Meteora Pool Collector
   * @param rpcEndpoint Solana RPC 端点
   * @param commitment 确认级别
   */
  constructor(
    rpcEndpoint: string,
    commitment: 'processed' | 'confirmed' | 'finalized' = 'confirmed'
  ) {
    this.connection = new Connection(rpcEndpoint, commitment);
    this.dlmm = new DLMM(this.connection);
    logger.info('Meteora Pool Collector 已初始化');
  }

  /**
   * 获取特定池的信息
   * @param poolAddress 池地址
   * @param forceRefresh 强制刷新数据，即使缓存有效
   * @returns 池信息
   */
  async getPoolInfo(poolAddress: string, forceRefresh = false): Promise<DLMMPoolInfo> {
    const now = Date.now();
    const lastUpdate = this.lastUpdateTime.get(poolAddress) || 0;

    // 检查是否需要刷新数据
    if (
      forceRefresh ||
      !this.poolCache.has(poolAddress) ||
      now - lastUpdate > this.updateInterval
    ) {
      try {
        logger.info(`获取池信息: ${poolAddress}`);
        const poolPublicKey = new PublicKey(poolAddress);
        const poolInfo = await this.dlmm.getPoolInfo(poolPublicKey);
        
        // 更新缓存
        this.poolCache.set(poolAddress, poolInfo);
        this.lastUpdateTime.set(poolAddress, now);
        
        return poolInfo;
      } catch (error) {
        logger.error(`获取池信息失败: ${poolAddress}`, { error });
        throw error;
      }
    }
    
    // 返回缓存的数据
    return this.poolCache.get(poolAddress)!;
  }

  /**
   * 获取特定代币对的所有池
   * @param tokenX 代币 X 地址
   * @param tokenY 代币 Y 地址
   * @returns 池地址数组
   */
  async getPoolsForTokenPair(tokenX: string, tokenY: string): Promise<string[]> {
    try {
      logger.info(`获取代币对 ${tokenX}/${tokenY} 的所有池`);
      const pools = await this.dlmm.getAllPools(new PublicKey(tokenX), new PublicKey(tokenY));

      return pools.map(pool => pool.toString());
    } catch (error) {
      logger.error(`获取代币对 ${tokenX}/${tokenY} 的所有池失败`, { error });
      throw error;
    }
  }

  /**
   * 获取池的流动性分布
   * @param poolAddress 池地址
   * @returns 流动性分布数据
   */
  async getLiquidityDistribution(poolAddress: string): Promise<any> {
    try {
      const poolInfo = await this.getPoolInfo(poolAddress);
      const binArrays = await this.dlmm.getBinArrays(new PublicKey(poolAddress));

      // 处理 bin 数据以获取流动性分布
      const liquidityDistribution = binArrays.map(binArray => {
        return {
          binId: binArray.publicKey.toString(),
          bins: binArray.bins.map(bin => ({
            index: bin.index,
            price: this.calculateBinPrice(bin.index, poolInfo),
            liquidityX: bin.amountX.toString(),
            liquidityY: bin.amountY.toString(),
            totalLiquidity: bin.liquiditySupply.toString(),
          })),
        };
      });

      return liquidityDistribution;
    } catch (error) {
      logger.error(`获取池 ${poolAddress} 的流动性分布失败`, { error });
      throw error;
    }
  }

  /**
   * 计算特定 bin 的价格
   * @param binIndex bin 索引
   * @param poolInfo 池信息
   * @returns bin 的价格
   */
  private calculateBinPrice(binIndex: number, poolInfo: DLMMPoolInfo): number {
    const binStep = poolInfo.binStep;
    const basePrice = poolInfo.price;

    // 根据 bin 索引和 bin 步长计算价格
    // 价格 = 基础价格 * (1 + binStep/10000)^binIndex
    return basePrice * Math.pow(1 + binStep / 10000, binIndex);
  }

  /**
   * 监控大额 LP 移除
   * @param poolAddress 池地址
   * @param thresholdPercentage 阈值百分比（0-100），视为大额移除
   * @returns 如果检测到，则返回移除数据对象，否则返回 null
   */
  async monitorLargeRemovals(
    poolAddress: string,
    thresholdPercentage = 10
  ): Promise<any | null> {
    try {
      // 获取当前池信息
      const currentPoolInfo = await this.getPoolInfo(poolAddress, true);

      // 从缓存中获取之前的池信息（刷新前）
      const previousPoolInfo = this.poolCache.get(poolAddress);

      if (!previousPoolInfo) {
        return null; // 没有之前的数据可比较
      }

      // 计算总流动性变化
      const previousLiquidity = previousPoolInfo.totalLiquidity.toNumber();
      const currentLiquidity = currentPoolInfo.totalLiquidity.toNumber();

      const liquidityChange = previousLiquidity - currentLiquidity;
      const changePercentage = (liquidityChange / previousLiquidity) * 100;

      // 检查变化是否超过阈值
      if (changePercentage >= thresholdPercentage) {
        logger.warn(`在池 ${poolAddress} 中检测到大额 LP 移除`, {
          previousLiquidity,
          currentLiquidity,
          liquidityChange,
          changePercentage,
        });

        return {
          poolAddress,
          previousLiquidity,
          currentLiquidity,
          liquidityChange,
          changePercentage,
          timestamp: Date.now(),
        };
      }

      return null;
    } catch (error) {
      logger.error(`监控池 ${poolAddress} 的大额移除时出错`, { error });
      return null;
    }
  }

  /**
   * 设置缓存更新间隔
   * @param intervalMs 间隔（毫秒）
   */
  setUpdateInterval(intervalMs: number): void {
    this.updateInterval = intervalMs;
    logger.info(`更新间隔设置为 ${intervalMs}ms`);
  }

  /**
   * 清除特定池或所有池的缓存
   * @param poolAddress 可选的池地址，用于清除特定缓存
   */
  clearCache(poolAddress?: string): void {
    if (poolAddress) {
      this.poolCache.delete(poolAddress);
      this.lastUpdateTime.delete(poolAddress);
      logger.info(`已清除池 ${poolAddress} 的缓存`);
    } else {
      this.poolCache.clear();
      this.lastUpdateTime.clear();
      logger.info('已清除所有池缓存');
    }
  }
} 