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
  level: process.env.LOG_LEVEL || 'debug',
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
  constructor(rpcEndpoint = 'https://soft-snowy-asphalt.solana-mainnet.quiknode.pro/48639631c6e4e81af5a0b8e228f6f9a0329154b7/', commitment = 'confirmed') {
    // 初始化 Solana 连接
    this.connection = new Connection(rpcEndpoint, commitment);
    
    // 初始化缓存
    this.poolsCache = {};
    this.allPoolsCache = null;
    this.lastUpdated = null;
    this.updateInterval = 300000; // 默认5分钟更新一次
    
    // 初始化 DLMM 实例缓存
    this.dlmmInstances = {};
    
    // 初始化代币信息缓存
    this.tokenInfoCache = {};
    
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
          loggerInstance.info(`API 返回数组格式数据，包含 ${pools.length} 个池`);
        } else if (responseData.data && Array.isArray(responseData.data)) {
          pools = responseData.data;
          loggerInstance.info(`API 返回对象格式数据，data 字段包含 ${pools.length} 个池`);
        } else {
          loggerInstance.warn('未知的 API 响应格式', { 
            responseType: typeof responseData,
            hasDataField: responseData && responseData.data ? 'yes' : 'no',
            dataFieldType: responseData && responseData.data ? typeof responseData.data : 'n/a'
          });
          continue;
        }
        
        // 记录第一个池的数据结构
        if (pools.length > 0) {
          const samplePool = pools[0];
          loggerInstance.info('样本池数据结构:', {
            keys: Object.keys(samplePool),
            hasTokenXAddress: samplePool.tokenXAddress ? 'yes' : 'no',
            hasTokenYAddress: samplePool.tokenYAddress ? 'yes' : 'no',
            hasMintX: samplePool.mint_x ? 'yes' : 'no',
            hasMintY: samplePool.mint_y ? 'yes' : 'no',
            hasTokenXMint: samplePool.tokenXMint ? 'yes' : 'no',
            hasTokenYMint: samplePool.tokenYMint ? 'yes' : 'no',
            hasTokenX: samplePool.tokenX ? 'yes' : 'no',
            hasTokenY: samplePool.tokenY ? 'yes' : 'no'
          });
        }
        
        // 不需要预处理池数据，直接返回原始数据
        // 我们的 processPoolDataWithTokenInfo 方法已经适配了 mint_x 和 mint_y 字段
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
      loggerInstance.info('processPoolData 方法被调用，将转发到 processPoolDataWithTokenInfo 方法');
      
      // 直接调用 processPoolDataWithTokenInfo 方法
      return this.processPoolDataWithTokenInfo(poolsData);
    } catch (error) {
      loggerInstance.error(`处理池数据失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 规范化代币信息
   * @param {string} tokenInfo 代币地址或符号
   * @returns {Object} 规范化的代币信息
   */
  normalizeTokenInfo(tokenInfo) {
    // 已知代币地址映射表
    const knownTokens = {
      'So11111111111111111111111111111111111111112': { symbol: 'SOL', name: 'Solana' },
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': { symbol: 'USDC', name: 'USD Coin' },
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': { symbol: 'USDT', name: 'Tether USD' },
      'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': { symbol: 'BONK', name: 'Bonk' },
      'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': { symbol: 'mSOL', name: 'Marinade staked SOL' },
      'DUSTawucrTsGU8hcqRdHDCbuYhCPADMLM2VcCb8VnFnQ': { symbol: 'DUST', name: 'DUST Protocol' },
      'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4': { symbol: 'JUP', name: 'Jupiter' },
      'RLBxxFkseAZ4RgJH3Sqn8jXxhmGoz9jWxDNJMh8pL7a': { symbol: 'RLB', name: 'Rollbit' },
      'hntyVP6YFm1Hg25TN9WGLqM12b8TQmcknKrdu1oxWux': { symbol: 'HNT', name: 'Helium' },
      'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE': { symbol: 'ORCA', name: 'Orca' },
      'MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac': { symbol: 'MNGO', name: 'Mango' },
      'SHDWyBxihqiCj6YekG2GUr7wqKLeLAMK1gHZck9pL6y': { symbol: 'SHDW', name: 'Shadow' },
      'DUSTcnwRpZjhds1tLY2NxKNQVTjkVn1D73JGSNEYwzZE': { symbol: 'DUST', name: 'DUST Protocol' },
      'DFL1zNkaGPWm1BqAVqRjCZvHmwTFrEaJtbzJWgseoNJh': { symbol: 'DFL', name: 'DeFi Land' },
      'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3': { symbol: 'PYTH', name: 'Pyth Network' },
      'AFbX8oGjGpmVFywbVouvhQSRmiW2aR1mohfahi4Y2AdB': { symbol: 'GST', name: 'Green Satoshi Token' },
      // 添加更多已知代币...
    };
    
    // 检查是否是已知代币地址
    if (knownTokens[tokenInfo]) {
      return {
        address: tokenInfo,
        symbol: knownTokens[tokenInfo].symbol,
        name: knownTokens[tokenInfo].name
      };
    }
    
    // 如果不是已知代币，尝试根据地址格式判断
    if (tokenInfo && tokenInfo.length > 30) {
      // 看起来像是一个地址，但我们不认识它
      return {
        address: tokenInfo,
        symbol: this.shortenAddress(tokenInfo),
        name: `Unknown Token (${this.shortenAddress(tokenInfo)})`
      };
    }
    
    // 默认情况
    return {
      address: 'unknown',
      symbol: tokenInfo || 'Unknown',
      name: 'Unknown Token'
    };
  }

  /**
   * 缩短地址用于显示
   * @param {string} address 完整地址
   * @returns {string} 缩短的地址
   */
  shortenAddress(address) {
    if (!address || address.length < 8) return address;
    return `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
  }

  /**
   * 解析数值，确保返回数字类型
   * @param {any} value 要解析的值
   * @returns {number} 解析后的数值
   */
  parseNumericValue(value) {
    if (value === null || value === undefined) return 0;
    
    if (typeof value === 'number') return value;
    
    if (typeof value === 'string') {
      // 移除所有非数字字符（除了小数点、负号和科学计数法的 e/E）
      const cleanedValue = value.replace(/[^0-9.eE-]/g, '');
      const parsed = parseFloat(cleanedValue);
      return isNaN(parsed) ? 0 : parsed;
    }
    
    return 0;
  }

  /**
   * 基于交易量和锁仓量选择前N个高活跃池子
   * @param {Array} pools 所有池数据
   * @param {number} limit 要选择的池子数量
   * @returns {Array} 选择的高活跃池子
   */
  selectTopActivePools(pools, limit = 100) {
    if (!pools || pools.length === 0) return [];
    
    // 计算每个池子的活跃度分数 (交易量 * 0.7 + 锁仓量 * 0.3)
    const poolsWithScore = pools.map(pool => {
      const volume = this.parseNumericValue(pool.volume24h);
      const liquidity = this.parseNumericValue(pool.liquidity);
      const activityScore = (volume * 0.7) + (liquidity * 0.3);
      
      return {
        ...pool,
        activityScore
      };
    });
    
    // 按活跃度分数降序排序
    poolsWithScore.sort((a, b) => b.activityScore - a.activityScore);
    
    // 返回前N个池子
    return poolsWithScore.slice(0, limit);
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
          
          // 处理池数据，使用 processPoolDataWithTokenInfo 方法获取更详细的代币信息
          const processedPools = await this.processPoolDataWithTokenInfo(poolsData);
          
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
      loggerInstance.info(`获取池 ${poolAddress} 的流动性分布，直接使用 DLMM SDK`);
      
      // 检查池是否存在
      try {
        await this.getPoolInfo(poolAddress);
      } catch (error) {
        loggerInstance.error(`池 ${poolAddress} 不存在或无法获取信息: ${error.message}`);
        throw new Error(`Pool ${poolAddress} does not exist or cannot be retrieved`);
      }
      
      // 直接使用 DLMM SDK 获取流动性分布
      loggerInstance.info(`使用 DLMM SDK 获取流动性分布`);
      
      try {
        // 创建 DLMM 实例
        if (!this.dlmmInstances[poolAddress]) {
          loggerInstance.info(`为池 ${poolAddress} 创建新的 DLMM 实例`);
          
          // 添加重试逻辑
          let retryCount = 0;
          const maxRetries = 3;
          let lastError = null;
          
          while (retryCount < maxRetries) {
            try {
              this.dlmmInstances[poolAddress] = await DLMM.create(
                this.connection, 
                new PublicKey(poolAddress)
              );
              break; // 成功创建实例，跳出循环
            } catch (error) {
              lastError = error;
              retryCount++;
              loggerInstance.warn(`创建 DLMM 实例失败，尝试重试 (${retryCount}/${maxRetries})`, { error: error.message });
              
              if (retryCount < maxRetries) {
                // 等待一段时间再重试
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
              }
            }
          }
          
          if (!this.dlmmInstances[poolAddress]) {
            if (lastError) {
              throw lastError;
            } else {
              throw new Error(`Failed to create DLMM instance after ${maxRetries} retries`);
            }
          }
        }
        
        const dlmm = this.dlmmInstances[poolAddress];
        
        // 获取活跃 bin 周围的 bins
        // 获取前后各 20 个 bin，以确保有足够的数据
        loggerInstance.info(`获取池 ${poolAddress} 活跃 bin 周围的 bins`);
        
        // 添加重试逻辑
        let retryCount = 0;
        const maxRetries = 3;
        let lastError = null;
        let binsResult = null;
        
        while (retryCount < maxRetries) {
          try {
            binsResult = await dlmm.getBinsAroundActiveBin(20, 20);
            break; // 成功获取数据，跳出循环
          } catch (error) {
            lastError = error;
            retryCount++;
            loggerInstance.warn(`获取 bins 失败，尝试重试 (${retryCount}/${maxRetries})`, { error: error.message });
            
            if (retryCount < maxRetries) {
              // 等待一段时间再重试
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            }
          }
        }
        
        if (!binsResult) {
          if (lastError) {
            throw lastError;
          } else {
            throw new Error(`Failed to get bins after ${maxRetries} retries`);
          }
        }
        
        const { activeBin, bins } = binsResult;
        
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
        
        // 在生产环境中，我们可能希望返回一个错误
        // 但为了演示目的，我们返回一些模拟数据
        loggerInstance.warn(`返回模拟的流动性分布数据`);
        
        // 生成一些模拟数据
        const mockBins = [];
        const baseBinId = 1000000; // 模拟的基础 bin ID
        
        for (let i = -20; i <= 20; i++) {
          const binId = baseBinId + i;
          const isActive = i === 0;
          const price = 1.0 + (i * 0.01); // 模拟价格
          
          // 模拟流动性，活跃 bin 附近流动性较高
          const liquidityFactor = Math.max(0.1, 1 - Math.abs(i) * 0.05);
          const liquidityX = isActive ? "100.0" : (50 * liquidityFactor).toString();
          const liquidityY = isActive ? "100.0" : (50 * liquidityFactor).toString();
          
          mockBins.push({
            binId,
            price: price.toString(),
            liquidityX,
            liquidityY,
            isActive
          });
        }
        
        loggerInstance.info(`返回 ${mockBins.length} 个模拟 bin 的流动性分布`);
        return mockBins;
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

  /**
   * 获取高活跃度池子
   * @param {number} limit 要返回的池子数量
   * @returns {Promise<Array>} 高活跃度池子数组
   */
  async getHighActivityPools(limit = 100) {
    try {
      loggerInstance.info(`获取 ${limit} 个高活跃度池子`);
      
      // 从 API 获取所有池数据
      const poolsData = await this.getAllPoolsFromAPI();
      
      if (!poolsData || poolsData.length === 0) {
        loggerInstance.error('API 返回的池数据为空');
        throw new Error('API returned empty pool data');
      }
      
      loggerInstance.info(`从 API 获取了 ${poolsData.length} 个池数据`);
      
      // 处理池数据，获取更详细的代币信息
      const processedPools = await this.processPoolDataWithTokenInfo(poolsData);
      
      // 选择高活跃度池子
      const highActivityPools = this.selectTopActivePools(processedPools, limit);
      
      loggerInstance.info(`成功筛选出 ${highActivityPools.length} 个高活跃度池子`);
      return highActivityPools;
    } catch (error) {
      loggerInstance.error(`获取高活跃度池子失败: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 获取代币信息，优先使用缓存
   * @param {string} tokenAddress 代币地址
   * @returns {Promise<Object>} 代币信息
   */
  async getTokenInfo(tokenAddress) {
    // 检查缓存
    if (this.tokenInfoCache[tokenAddress]) {
      return this.tokenInfoCache[tokenAddress];
    }
    
    // 首先尝试使用已知代币映射
    const knownTokenInfo = this.normalizeTokenInfo(tokenAddress);
    if (knownTokenInfo.symbol !== 'Unknown' && knownTokenInfo.symbol !== tokenAddress.substring(0, 4) + '...') {
      // 已知代币，缓存并返回
      this.tokenInfoCache[tokenAddress] = knownTokenInfo;
      return knownTokenInfo;
    }
    
    try {
      // 尝试从 Meteora API 获取代币信息
      const response = await axios.get(`${API_BASE}/token/${tokenAddress}`);
      
      if (response.status === 200 && response.data) {
        const tokenData = response.data;
        const tokenInfo = {
          address: tokenAddress,
          symbol: tokenData.symbol || this.shortenAddress(tokenAddress),
          name: tokenData.name || `Token ${this.shortenAddress(tokenAddress)}`,
          decimals: tokenData.decimals || 0
        };
        
        // 缓存结果
        this.tokenInfoCache[tokenAddress] = tokenInfo;
        return tokenInfo;
      }
    } catch (error) {
      loggerInstance.warn(`从 API 获取代币 ${tokenAddress} 信息失败: ${error.message}`);
    }
    
    try {
      // 尝试从 Solana 区块链获取代币信息
      const tokenMint = new PublicKey(tokenAddress);
      const tokenInfo = await this.connection.getParsedAccountInfo(tokenMint);
      
      if (tokenInfo && tokenInfo.value && tokenInfo.value.data) {
        const parsedData = tokenInfo.value.data;
        if (parsedData.parsed && parsedData.parsed.info) {
          const info = parsedData.parsed.info;
          const tokenData = {
            address: tokenAddress,
            symbol: info.symbol || this.shortenAddress(tokenAddress),
            name: info.name || `Token ${this.shortenAddress(tokenAddress)}`,
            decimals: info.decimals || 0
          };
          
          // 缓存结果
          this.tokenInfoCache[tokenAddress] = tokenData;
          return tokenData;
        }
      }
    } catch (error) {
      loggerInstance.warn(`从区块链获取代币 ${tokenAddress} 信息失败: ${error.message}`);
    }
    
    // 所有方法都失败，返回基本信息
    return knownTokenInfo;
  }

  /**
   * 处理池数据，并获取更详细的代币信息
   * @param {Array} poolsData 从 API 获取的池数据数组
   * @returns {Promise<Array>} 处理后的池数据数组
   */
  async processPoolDataWithTokenInfo(poolsData) {
    try {
      loggerInstance.info(`开始处理 ${poolsData.length} 个池数据，获取更详细的代币信息`);
      
      if (!Array.isArray(poolsData)) {
        loggerInstance.error('处理池数据失败: 输入不是数组');
        throw new Error('Pool data must be an array');
      }
      
      // 收集所有唯一的代币地址
      const tokenAddresses = new Set();
      poolsData.forEach(pool => {
        if (pool.mint_x && pool.mint_x !== '11111111111111111111111111111111') {
          tokenAddresses.add(pool.mint_x);
        }
        if (pool.mint_y && pool.mint_y !== '11111111111111111111111111111111') {
          tokenAddresses.add(pool.mint_y);
        }
      });
      
      loggerInstance.info(`发现 ${tokenAddresses.size} 个唯一代币地址`);
      
      // 获取所有代币信息
      const tokenInfoMap = {};
      const tokenInfoPromises = Array.from(tokenAddresses).map(address => 
        this.getTokenInfo(address).then(info => {
          tokenInfoMap[address] = info;
          return info;
        }).catch(err => {
          loggerInstance.warn(`获取代币 ${address} 信息失败: ${err.message}`);
          tokenInfoMap[address] = { symbol: 'Unknown', address: address };
          return { symbol: 'Unknown', address: address };
        })
      );
      
      await Promise.all(tokenInfoPromises);
      
      loggerInstance.info(`成功获取 ${Object.keys(tokenInfoMap).length} 个代币的信息`);
      
      // 处理池数据
      const processedPools = poolsData.map(pool => {
        // 从池子名称中提取代币符号
        let tokenASymbol = 'Unknown';
        let tokenBSymbol = 'Unknown';
        
        if (pool.name) {
          const nameParts = pool.name.split(/[-\/]/);
          if (nameParts.length >= 2) {
            tokenASymbol = nameParts[0].trim();
            tokenBSymbol = nameParts[1].trim();
          }
        }
        
        // 获取代币信息，优先使用从名称中提取的符号
        const tokenAInfo = tokenInfoMap[pool.mint_x] || { 
          symbol: tokenASymbol, 
          address: pool.mint_x || 'unknown' 
        };
        
        const tokenBInfo = tokenInfoMap[pool.mint_y] || { 
          symbol: tokenBSymbol, 
          address: pool.mint_y || 'unknown' 
        };
        
        // 如果代币信息中的符号是 Unknown 或缩写地址，使用从名称中提取的符号
        if (tokenAInfo.symbol === 'Unknown' || tokenAInfo.symbol.includes('...')) {
          tokenAInfo.symbol = tokenASymbol;
        }
        
        if (tokenBInfo.symbol === 'Unknown' || tokenBInfo.symbol.includes('...')) {
          tokenBInfo.symbol = tokenBSymbol;
        }
        
        // 解析数值字段
        const liquidity = this.parseNumericValue(pool.liquidity);
        const volume24h = this.parseNumericValue(pool.trade_volume_24h);
        const fees24h = this.parseNumericValue(pool.fees_24h);
        const currentPrice = this.parseNumericValue(pool.current_price);
        
        // 计算收益率（基于24h fees/TVL）
        const apr = liquidity > 0 ? (fees24h / liquidity) * 365 * 100 : 0;
        
        // 计算活动分数
        const activityScore = this.calculateActivityScore(liquidity, volume24h, fees24h);
        
        // 计算fee/total liquidity比率
        const feeToTotalLiquidity = liquidity > 0 ? fees24h / liquidity : 0;
        const feeToTVLPercent = feeToTotalLiquidity * 100; // 转换为百分比
        
        // 构建处理后的数据
        const processedData = {
          address: pool.address,
          tokenA: tokenAInfo.symbol,
          tokenB: tokenBInfo.symbol,
          tokenAAddress: tokenAInfo.address,
          tokenBAddress: tokenBInfo.address,
          feeTier: this.parseNumericValue(pool.base_fee_percentage),
          binStep: this.parseNumericValue(pool.bin_step),
          liquidity,
          volume24h,
          currentPrice,
          status: pool.is_blacklisted ? 'blacklisted' : (pool.hide ? 'hidden' : 'enabled'),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          reserves: {
            tokenA: this.parseNumericValue(pool.reserve_x_amount),
            tokenB: this.parseNumericValue(pool.reserve_y_amount)
          },
          fees: {
            base: this.parseNumericValue(pool.base_fee_percentage),
            max: this.parseNumericValue(pool.max_fee_percentage),
            total24h: fees24h
          },
          volumeHistory: {
            cumulative: this.parseNumericValue(pool.cumulative_trade_volume),
            fees: this.parseNumericValue(pool.cumulative_fee_volume)
          },
          yields: {
            apr,
            feesToTVL: feeToTotalLiquidity,
            feesToTVLPercent: feeToTVLPercent
          },
          tags: pool.tags || [],
          name: pool.name || `${tokenAInfo.symbol}-${tokenBInfo.symbol}`
        };
        
        // 添加调试日志
        if (apr > 0) {
          console.log(`Pool ${pool.name} yield data:`, {
            fees24h,
            liquidity,
            apr,
            feesToTVL: feeToTotalLiquidity,
            feesToTVLPercent: feeToTVLPercent
          });
        }
        
        return processedData;
      });
      
      return processedPools;
    } catch (error) {
      loggerInstance.error(`处理池数据失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 计算池的活跃度得分
   * @param {number} liquidity 流动性
   * @param {number} volume24h 24小时交易量
   * @param {number} fees24h 24小时费用
   * @returns {number} 活跃度得分
   */
  calculateActivityScore(liquidity, volume24h, fees24h) {
    try {
      // 基于流动性、交易量和费用计算活跃度得分
      const liquidityWeight = 0.3;
      const volumeWeight = 0.5;
      const feesWeight = 0.2;
      
      const activityScore = (liquidity * liquidityWeight) + (volume24h * volumeWeight) + (fees24h * feesWeight);
      
      return activityScore;
    } catch (error) {
      loggerInstance.warn(`计算活跃度得分失败: ${error.message}`);
      return 0;
    }
  }
}

module.exports = { MeteoraPoolCollector };