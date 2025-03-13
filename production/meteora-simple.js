/**
 * Meteora DLMM Pool Collector
 * 负责从 Meteora DLMM API 和 Solana 区块链收集数据
 * 参考: https://github.com/rextempo/meteora-lp-farmer/blob/main/meteora_comprehensive_analysis.py
 */

const { Connection, PublicKey } = require('@solana/web3.js');
const axios = require('axios');
const meteoraModule = require('@meteora-ag/dlmm');
const DLMM = meteoraModule.default;
const winston = require('winston');
const logger = require('../utils/logger');

// 创建日志记录器
const loggerInstance = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'data-service' },
  transports: [
    new winston.transports.Console()
  ]
});

// Meteora API 基础 URL
const API_BASE = "https://dlmm-api.meteora.ag";

class MeteoraPoolCollector {
  /**
   * 创建一个新的 Meteora Pool Collector
   * @param {string} rpcEndpoint Solana RPC 端点
   * @param {string} commitment 确认级别
   */
  constructor(rpcEndpoint = 'https://api.mainnet-beta.solana.com', commitment = 'confirmed') {
    // 初始化 Solana 连接
    this.connection = new Connection(rpcEndpoint, commitment);
    
    // 初始化缓存
    this.poolsCache = {};
    this.allPoolsCache = null;
    this.lastUpdated = null;
    this.updateInterval = 300000; // 默认5分钟更新一次
    
    // 初始化 DLMM 实例缓存
    this.dlmmInstances = {};
    
    loggerInstance.info('MeteoraPoolCollector 初始化成功');
  }

  /**
   * 从 Meteora API 获取所有池数据
   * @returns {Promise<Array>} 池数据数组
   */
  async getAllPoolsFromAPI() {
    // 尝试不同的 API 端点
    const endpoints = [
      `${API_BASE}/pair/all`,
      `${API_BASE}/pool/all`,
      `${API_BASE}/v1/dlmm/pairs`,
      'https://api.meteora.ag/v1/dlmm/pairs'
    ];
    
    for (const endpoint of endpoints) {
      loggerInstance.info(`尝试从 API 端点 ${endpoint} 获取所有池数据`);
      
      try {
        const response = await axios.get(endpoint);
        
        if (response.status !== 200) {
          loggerInstance.warn(`API 请求失败，状态码: ${response.status}`, { endpoint });
          continue;
        }
        
        const responseData = response.data;
        let pools = [];
        
        // 处理不同的响应格式
        if (Array.isArray(responseData)) {
          pools = responseData;
        } else if (responseData.data && Array.isArray(responseData.data)) {
          pools = responseData.data;
        } else {
          loggerInstance.warn('未知的 API 响应格式', { endpoint });
          continue;
        }
        
        loggerInstance.info(`成功从 ${endpoint} 获取 ${pools.length} 个池数据`);
        return pools;
      } catch (error) {
        loggerInstance.warn(`从 ${endpoint} 获取池数据失败: ${error.message}`);
      }
    }
    
    // 所有 API 端点都失败了
    loggerInstance.error('所有 API 端点都失败了');
    throw new Error('Failed to fetch pools from all API endpoints');
  }

  /**
   * 处理池数据，统一格式
   * @param {Array} poolsData 从 API 获取的池数据数组
   * @returns {Array} 处理后的池数据数组
   */
  processPoolData(poolsData) {
    try {
      if (!Array.isArray(poolsData)) {
        loggerInstance.error('处理池数据失败: 输入不是数组');
        throw new Error('Pool data must be an array');
      }
      
      return poolsData.map(pool => {
        try {
          // 确保所有必要的字段都存在
          if (!pool.address) {
            throw new Error('Pool address is missing');
          }
          
          return {
            address: pool.address,
            tokenX: pool.tokenX || pool.tokenXMint || 'Unknown',
            tokenY: pool.tokenY || pool.tokenYMint || 'Unknown',
            feeTier: pool.feeTier || pool.feeRate / 10000 || 0,
            liquidity: pool.liquidity || pool.totalLiquidity || '0',
            sqrtPrice: pool.sqrtPrice || pool.price || '0',
            currentBinId: pool.currentBinId || pool.activeBinId || 0,
            binStep: pool.binStep || 0,
            status: pool.status || 'enabled',
            currentPrice: pool.currentPrice || 0
          };
        } catch (error) {
          loggerInstance.error(`处理池 ${pool.address || 'unknown'} 数据失败: ${error.message}`);
          // 返回一个带有错误标记的对象，而不是跳过这个池
          return {
            address: pool.address || 'unknown',
            error: error.message,
            status: 'error'
          };
        }
      });
    } catch (error) {
      loggerInstance.error(`处理池数据失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取所有池的信息
   * @param {boolean} forceRefresh 强制刷新数据，即使缓存有效
   * @returns {Promise<Array>} 池信息数组
   */
  async getAllPools(forceRefresh = false) {
    try {
      const now = Date.now();
      
      // 检查是否需要刷新数据
      if (forceRefresh || !this.allPoolsCache || !this.lastUpdated || now - this.lastUpdated > this.updateInterval) {
        loggerInstance.info('获取所有池数据');
        
        try {
          // 尝试从 API 获取所有池数据
          const poolsData = await this.getAllPoolsFromAPI();
          
          if (!poolsData || poolsData.length === 0) {
            loggerInstance.error('API 返回的池数据为空');
            throw new Error('API returned empty pool data');
          }
          
          // 处理池数据
          const processedPools = this.processPoolData(poolsData);
          
          // 更新缓存
          this.allPoolsCache = processedPools;
          this.lastUpdated = now;
          
          loggerInstance.info(`成功获取 ${processedPools.length} 个池的数据`);
          return processedPools;
        } catch (apiError) {
          loggerInstance.error(`从 API 获取池数据失败: ${apiError.message}`);
          throw apiError; // 不返回模拟数据，而是抛出错误
        }
      }
      
      // 返回缓存的数据
      return this.allPoolsCache;
    } catch (error) {
      loggerInstance.error(`获取所有池数据失败: ${error.message}`);
      throw error; // 不返回模拟数据，而是抛出错误
    }
  }

  /**
   * 获取特定池的信息
   * @param {string} poolAddress 池地址
   * @param {boolean} forceRefresh 强制刷新数据，即使缓存有效
   * @returns {Promise<Object>} 池信息
   */
  async getPoolInfo(poolAddress, forceRefresh = false) {
    try {
      const now = Date.now();
      
      // 检查是否需要刷新数据
      if (forceRefresh || !this.poolsCache[poolAddress] || !this.lastUpdated || now - this.lastUpdated > this.updateInterval) {
        loggerInstance.info(`获取池信息: ${poolAddress}`);
        
        // 尝试从 API 获取所有池数据，然后找到特定池
        const allPools = await this.getAllPools(forceRefresh);
        const poolData = allPools.find(pool => pool.address === poolAddress);
        
        if (!poolData) {
          // 如果 API 中没有找到，尝试使用 DLMM SDK 获取
          loggerInstance.info(`API 中未找到池 ${poolAddress}，尝试使用 DLMM SDK`);
          
          try {
            // 创建 DLMM 实例
            if (!this.dlmmInstances[poolAddress]) {
              this.dlmmInstances[poolAddress] = await DLMM.create(
                this.connection, 
                new PublicKey(poolAddress)
              );
            }
            
            const dlmm = this.dlmmInstances[poolAddress];
            
            // 获取活跃 bin
            const activeBin = await dlmm.getActiveBin();
            
            if (!activeBin) {
              loggerInstance.error(`无法获取池 ${poolAddress} 的活跃 bin`);
              throw new Error(`Failed to get active bin for pool ${poolAddress}`);
            }
            
            // 获取池的基本信息
            const sdkPoolData = {
              address: poolAddress,
              tokenX: dlmm.lbPair.tokenX.toString(),
              tokenY: dlmm.lbPair.tokenY.toString(),
              feeTier: dlmm.lbPair.feeRate / 10000, // 转换为百分比
              liquidity: dlmm.lbPair.totalLiquidity.toString(),
              sqrtPrice: activeBin.price.toString(),
              currentBinId: activeBin.binId,
              binStep: dlmm.lbPair.binStep,
              status: dlmm.lbPair.pairStatus === 0 ? 'enabled' : 'disabled',
              currentPrice: dlmm.fromPricePerLamport(Number(activeBin.price))
            };
            
            // 更新缓存
            this.poolsCache[poolAddress] = sdkPoolData;
            this.lastUpdated = now;
            
            return sdkPoolData;
          } catch (sdkError) {
            loggerInstance.error(`使用 DLMM SDK 获取池 ${poolAddress} 信息失败: ${sdkError.message}`);
            throw new Error(`Pool ${poolAddress} not found in API and SDK access failed: ${sdkError.message}`);
          }
        }
        
        // 更新缓存
        this.poolsCache[poolAddress] = poolData;
        this.lastUpdated = now;
        
        return poolData;
      }
      
      // 返回缓存的数据
      return this.poolsCache[poolAddress];
    } catch (error) {
      loggerInstance.error(`获取池 ${poolAddress} 信息失败: ${error.message}`);
      throw error; // 不返回模拟数据，而是抛出错误
    }
  }

  /**
   * 获取特定代币对的所有池
   * @param {string} tokenX 代币 X 地址
   * @param {string} tokenY 代币 Y 地址
   * @returns {Promise<Array>} 池数据数组
   */
  async getPoolsForTokenPair(tokenX, tokenY) {
    try {
      loggerInstance.info(`获取代币对 ${tokenX}/${tokenY} 的所有池`);
      
      // 获取所有池
      const allPools = await this.getAllPools();
      
      // 筛选匹配的池
      const matchingPools = allPools.filter(pool => 
        (pool.tokenX === tokenX && pool.tokenY === tokenY) || 
        (pool.tokenX === tokenY && pool.tokenY === tokenX)
      );
      
      loggerInstance.info(`找到 ${matchingPools.length} 个匹配的池`);
      return matchingPools;
    } catch (error) {
      loggerInstance.error(`获取代币对 ${tokenX}/${tokenY} 的所有池失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取特定池的流动性分布
   * @param {string} poolAddress 池地址
   * @returns {Promise<Array>} 流动性分布数据
   */
  async getLiquidityDistribution(poolAddress) {
    try {
      loggerInstance.info(`获取池 ${poolAddress} 的流动性分布`);
      
      // 检查池是否存在
      try {
        await this.getPoolInfo(poolAddress);
      } catch (error) {
        loggerInstance.error(`池 ${poolAddress} 不存在或无法获取信息: ${error.message}`);
        throw new Error(`Pool ${poolAddress} does not exist or cannot be retrieved`);
      }
      
      // 尝试不同的 API 端点
      const endpoints = [
        `${API_BASE}/pool/${poolAddress}/bins`,
        `${API_BASE}/pair/${poolAddress}/bins`,
        `${API_BASE}/v1/dlmm/pair/${poolAddress}/bins`,
        `https://api.meteora.ag/v1/dlmm/pair/${poolAddress}/bins`
      ];
      
      let lastError = null;
      
      for (const endpoint of endpoints) {
        loggerInstance.info(`尝试从 API 端点 ${endpoint} 获取流动性分布`);
        
        try {
          const response = await axios.get(endpoint);
          
          if (response.status !== 200) {
            loggerInstance.warn(`API 请求失败，状态码: ${response.status}`, { endpoint });
            continue;
          }
          
          const responseData = response.data;
          let bins = [];
          
          // 处理不同的响应格式
          if (Array.isArray(responseData)) {
            bins = responseData;
          } else if (responseData.data && Array.isArray(responseData.data)) {
            bins = responseData.data;
          } else if (responseData.bins && Array.isArray(responseData.bins)) {
            bins = responseData.bins;
          } else {
            loggerInstance.warn('未知的 API 响应格式', { endpoint });
            continue;
          }
          
          loggerInstance.info(`成功从 ${endpoint} 获取 ${bins.length} 个 bin 的流动性分布`);
          
          // 格式化数据
          return bins.map(bin => ({
            binId: bin.binId || bin.id,
            price: bin.price || bin.pricePerLamport || 0,
            liquidityX: bin.liquidityX || bin.reserveX || 0,
            liquidityY: bin.liquidityY || bin.reserveY || 0,
            isActive: bin.isActive || bin.active || false
          }));
        } catch (error) {
          lastError = error;
          loggerInstance.warn(`从 ${endpoint} 获取流动性分布失败: ${error.message}`);
        }
      }
      
      // 如果所有 API 端点都失败，尝试使用 DLMM SDK
      loggerInstance.info(`所有 API 端点都失败，尝试使用 DLMM SDK 获取流动性分布`);
      
      try {
        // 创建 DLMM 实例
        if (!this.dlmmInstances[poolAddress]) {
          this.dlmmInstances[poolAddress] = await DLMM.create(
            this.connection, 
            new PublicKey(poolAddress)
          );
        }
        
        const dlmm = this.dlmmInstances[poolAddress];
        
        // 根据文档，getBinsAroundActiveBin 返回 { activeBin: number; bins: BinLiquidity[] }
        const { activeBin, bins } = await dlmm.getBinsAroundActiveBin(10, 10);
        
        if (!bins || bins.length === 0) {
          loggerInstance.error(`池 ${poolAddress} 活跃 bin 周围没有 bin`);
          throw new Error(`No bins found around active bin for pool ${poolAddress}`);
        }
        
        // 格式化数据
        const formattedBins = bins.map(bin => ({
          binId: bin.binId,
          price: bin.price ? bin.price.toString() : '0',
          liquidityX: bin.liquidityX ? bin.liquidityX.toString() : '0',
          liquidityY: bin.liquidityY ? bin.liquidityY.toString() : '0',
          isActive: bin.binId === activeBin
        }));
        
        loggerInstance.info(`成功使用 DLMM SDK 获取 ${formattedBins.length} 个 bin 的流动性分布`);
        return formattedBins;
      } catch (sdkError) {
        loggerInstance.error(`使用 DLMM SDK 获取流动性分布失败: ${sdkError.message}`);
        throw new Error(`Failed to get liquidity distribution for pool ${poolAddress}: ${sdkError.message}`);
      }
    } catch (error) {
      loggerInstance.error(`获取池 ${poolAddress} 的流动性分布失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 监控大额 LP 移除
   * @param {string} poolAddress 池地址
   * @param {number} thresholdPercentage 阈值百分比（0-100），视为大额移除
   * @returns {Promise<Object|null>} 如果检测到，则返回移除数据对象，否则返回 null
   */
  async monitorLargeRemovals(poolAddress, thresholdPercentage = 10) {
    try {
      // 获取当前池信息
      const currentPoolInfo = await this.getPoolInfo(poolAddress, true);
      
      // 从缓存中获取之前的池信息（刷新前）
      const previousPoolInfo = this.poolsCache[poolAddress];
      
      if (!previousPoolInfo) {
        loggerInstance.info(`没有池 ${poolAddress} 的历史数据，无法监控变化`);
        return null;
      }
      
      // 计算总流动性变化
      const previousLiquidity = BigInt(previousPoolInfo.liquidity);
      const currentLiquidity = BigInt(currentPoolInfo.liquidity);
      
      if (previousLiquidity > currentLiquidity) {
        const liquidityChange = Number(previousLiquidity - currentLiquidity);
        const changePercentage = (liquidityChange / Number(previousLiquidity)) * 100;
        
        // 检查变化是否超过阈值
        if (changePercentage >= thresholdPercentage) {
          loggerInstance.warn(`在池 ${poolAddress} 中检测到大额 LP 移除`, {
            previousLiquidity: previousLiquidity.toString(),
            currentLiquidity: currentLiquidity.toString(),
            liquidityChange: liquidityChange.toString(),
            changePercentage: changePercentage.toFixed(2)
          });
          
          return {
            poolAddress,
            previousLiquidity: previousLiquidity.toString(),
            currentLiquidity: currentLiquidity.toString(),
            liquidityChange: liquidityChange.toString(),
            changePercentage: changePercentage.toFixed(2),
            timestamp: Date.now(),
          };
        }
      }
      
      return null;
    } catch (error) {
      loggerInstance.error(`监控池 ${poolAddress} 的大额移除时出错: ${error.message}`);
      throw error;
    }
  }

  /**
   * 设置缓存更新间隔
   * @param {number} intervalMs 间隔（毫秒）
   */
  setUpdateInterval(intervalMs) {
    this.updateInterval = intervalMs;
    loggerInstance.info(`更新间隔设置为 ${intervalMs}ms`);
  }

  /**
   * 清除特定池或所有池的缓存
   * @param {string} [poolAddress] 可选的池地址，用于清除特定缓存
   */
  clearCache(poolAddress) {
    if (poolAddress) {
      delete this.poolsCache[poolAddress];
      delete this.dlmmInstances[poolAddress];
      loggerInstance.info(`已清除池 ${poolAddress} 的缓存`);
    } else {
      this.poolsCache = {};
      this.dlmmInstances = {};
      this.allPoolsCache = null;
      this.lastUpdated = null;
      loggerInstance.info('已清除所有池缓存');
    }
  }
}

module.exports = { MeteoraPoolCollector }; 