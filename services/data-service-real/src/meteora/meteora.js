const axios = require('axios');
const { Connection, PublicKey } = require('@solana/web3.js');
const meteoraModule = require('@meteora-ag/dlmm');
const DLMM = meteoraModule.default;

/**
 * Meteora池数据收集器
 * 负责从Meteora API和Solana区块链获取DLMM池数据
 */
class MeteoraPoolCollector {
  constructor(options = {}) {
    // 使用Meteora的正确API端点
    this.apiBaseUrl = options.apiBaseUrl || 'https://dlmm-api.meteora.ag';
    this.solanaRpcEndpoint = options.solanaRpcEndpoint || 'https://soft-snowy-asphalt.solana-mainnet.quiknode.pro/48639631c6e4e81af5a0b8e228f6f9a0329154b7/';
    this.logger = options.logger || console;
    
    // 初始化Solana连接，使用更多选项
    this.connection = new Connection(this.solanaRpcEndpoint, {
      commitment: 'confirmed',
      disableRetryOnRateLimit: false,
      httpHeaders: {
        'Content-Type': 'application/json',
        'User-Agent': 'LiqPro/1.0'
      }
    });
    
    // 初始化缓存
    this.poolsCache = {};
    this.allPoolsCache = null;
    this.lastUpdated = null;
    this.updateInterval = 300000; // 默认5分钟更新一次
    
    // 初始化DLMM实例缓存
    this.dlmmInstances = {};
    
    // Meteora程序ID
    this.meteoraProgramId = new PublicKey('LBUZKhRxPF3XoTQpjVJ3XQPoJER6HADJAKRbWGVzMZ7');
    
    // 创建axios实例，设置超时和重试
    this.api = axios.create({
      baseURL: this.apiBaseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'LiqPro/1.0'
      }
    });
    
    this.logger.info('MeteoraPoolCollector初始化成功');
  }

  /**
   * 获取高活跃度池列表
   * @param {number} limit - 返回的池数量限制
   * @returns {Promise<Array>} - 池数据数组
   */
  async getHighActivityPools(limit = 100) {
    try {
      this.logger.info(`正在获取Meteora高活跃度池数据，限制: ${limit}个`);
      
      // 直接从Meteora API获取池数据
      try {
        // 根据Meteora API文档，使用正确的端点
        const response = await this.api.get('/pair/all');
        
        if (response.status === 200 && response.data) {
          let pools = response.data;
          if (!Array.isArray(pools)) {
            if (pools.data && Array.isArray(pools.data)) {
              pools = pools.data;
            } else if (pools.pairs && Array.isArray(pools.pairs)) {
              pools = pools.pairs;
            } else if (pools.pools && Array.isArray(pools.pools)) {
              pools = pools.pools;
            } else {
              throw new Error('API返回的数据格式不正确');
            }
          }
          
          this.logger.info(`成功从Meteora API获取${pools.length}个池数据`);
          
          // 处理池数据
          const processedPools = this.processPoolData(pools);
          
          // 按交易量排序
          const sortedPools = processedPools
            .filter(pool => pool.volume24h && pool.volume24h > 0)
            .sort((a, b) => b.volume24h - a.volume24h);
          
          // 返回前N个高活跃度池
          return sortedPools.slice(0, limit);
        } else {
          throw new Error('Meteora API返回的数据格式不正确');
        }
      } catch (apiError) {
        this.logger.warn(`从Meteora API获取高活跃度池数据失败: ${apiError.message}`);
        
        // 尝试从另一个API端点获取
        try {
          const response = await this.api.get('/pools');
          
          if (response.status === 200 && response.data) {
            let pools = response.data;
            if (!Array.isArray(pools)) {
              if (pools.data && Array.isArray(pools.data)) {
                pools = pools.data;
              } else if (pools.pairs && Array.isArray(pools.pairs)) {
                pools = pools.pairs;
              } else if (pools.pools && Array.isArray(pools.pools)) {
                pools = pools.pools;
              } else {
                throw new Error('API返回的数据格式不正确');
              }
            }
            
            this.logger.info(`成功从Meteora API备用端点获取${pools.length}个池数据`);
            
            // 处理池数据
            const processedPools = this.processPoolData(pools);
            
            // 按交易量排序
            const sortedPools = processedPools
              .filter(pool => pool.volume24h && pool.volume24h > 0)
              .sort((a, b) => b.volume24h - a.volume24h);
            
            // 返回前N个高活跃度池
            return sortedPools.slice(0, limit);
          } else {
            throw new Error('Meteora API备用端点返回的数据格式不正确');
          }
        } catch (backupError) {
          this.logger.warn(`从Meteora API备用端点获取高活跃度池数据失败: ${backupError.message}`);
          
          // 如果API获取失败，尝试从链上获取
          this.logger.info('尝试从链上获取Meteora池数据');
          
          // 使用getProgramAccounts获取池数据
          const accounts = await this.connection.getProgramAccounts(this.meteoraProgramId, {
            filters: [
              {
                dataSize: 976, // DLMM池账户大小
              },
            ],
            commitment: 'confirmed'
          });
          
          this.logger.info(`从链上找到${accounts.length}个可能的Meteora池账户`);
          
          if (accounts.length === 0) {
            throw new Error('从链上未找到任何Meteora池账户');
          }
          
          // 解析每个账户数据
          const pools = [];
          const maxAccounts = Math.min(accounts.length, limit);
          
          for (const account of accounts.slice(0, maxAccounts)) {
            try {
              const poolAddress = account.pubkey.toString();
              this.logger.info(`尝试从链上获取池${poolAddress}的详情`);
              
              const poolData = await this.getPoolDetailFromChain(poolAddress);
              if (poolData) {
                pools.push(poolData);
                this.logger.info(`成功获取池${poolAddress}的详情`);
              }
            } catch (error) {
              this.logger.warn(`解析池账户数据失败: ${error.message}`);
            }
          }
          
          if (pools.length === 0) {
            throw new Error('无法从链上解析任何池数据');
          }
          
          this.logger.info(`成功从链上解析${pools.length}个Meteora池数据`);
          return pools;
        }
      }
    } catch (error) {
      this.logger.error('获取高活跃度池失败:', error.message);
      throw new Error(`获取高活跃度池失败: ${error.message}`);
    }
  }

  /**
   * 获取所有Meteora池
   * @returns {Promise<Array>} - 池数据数组
   */
  async getAllPools(forceRefresh = false) {
    try {
      const now = Date.now();
      
      // 检查是否需要刷新数据
      if (forceRefresh || !this.allPoolsCache || !this.lastUpdated || now - this.lastUpdated > this.updateInterval) {
        this.logger.info('从API获取所有Meteora池数据');
        
        // 尝试不同的API端点
        const endpoints = [
          '/pair/all',
          '/pools',
          '/v1/pools',
          '/v1/pairs'
        ];
        
        let pools = null;
        let successEndpoint = null;
        
        // 尝试从API获取
        for (const endpoint of endpoints) {
          try {
            const fullEndpoint = `${this.apiBaseUrl}${endpoint}`;
            this.logger.info(`尝试从${fullEndpoint}获取池数据`);
            
            const response = await axios.get(fullEndpoint, {
              timeout: 15000,
              headers: {
                'User-Agent': 'LiqPro/1.0',
                'Accept': 'application/json'
              }
            });
            
            if (response.status !== 200) {
              this.logger.warn(`API请求失败，状态码: ${response.status}`, { endpoint: fullEndpoint });
              continue;
            }
            
            const responseData = response.data;
            
            // 处理不同的响应格式
            if (Array.isArray(responseData)) {
              pools = responseData;
              successEndpoint = fullEndpoint;
              this.logger.info(`成功从${fullEndpoint}获取${pools.length}个池数据`);
              break;
            } else if (responseData.pools && Array.isArray(responseData.pools)) {
              pools = responseData.pools;
              successEndpoint = fullEndpoint;
              this.logger.info(`成功从${fullEndpoint}获取${pools.length}个池数据`);
              break;
            } else if (responseData.pairs && Array.isArray(responseData.pairs)) {
              pools = responseData.pairs;
              successEndpoint = fullEndpoint;
              this.logger.info(`成功从${fullEndpoint}获取${pools.length}个池数据`);
              break;
            } else if (responseData.data && Array.isArray(responseData.data)) {
              pools = responseData.data;
              successEndpoint = fullEndpoint;
              this.logger.info(`成功从${fullEndpoint}获取${pools.length}个池数据`);
              break;
            } else {
              this.logger.warn('未知的API响应格式', { endpoint: fullEndpoint });
            }
          } catch (error) {
            this.logger.warn(`从${this.apiBaseUrl}${endpoint}获取池数据失败: ${error.message}`);
          }
        }
        
        if (!pools || pools.length === 0) {
          this.logger.info('API获取失败，尝试从链上获取');
          
          // 使用getProgramAccounts获取池数据
          const accounts = await this.connection.getProgramAccounts(this.meteoraProgramId, {
            filters: [
              {
                dataSize: 976, // DLMM池账户大小
              },
            ],
            commitment: 'confirmed'
          });
          
          this.logger.info(`从链上找到${accounts.length}个可能的Meteora池账户`);
          
          if (accounts.length === 0) {
            throw new Error('从链上未找到任何Meteora池账户');
          }
          
          // 解析每个账户数据
          const chainPools = [];
          const maxAccounts = Math.min(accounts.length, 100);
          
          for (const account of accounts.slice(0, maxAccounts)) {
            try {
              const poolAddress = account.pubkey.toString();
              this.logger.info(`尝试从链上获取池${poolAddress}的详情`);
              
              const poolData = await this.getPoolDetailFromChain(poolAddress);
              if (poolData) {
                chainPools.push(poolData);
                this.logger.info(`成功获取池${poolAddress}的详情`);
              }
            } catch (error) {
              this.logger.warn(`解析池账户数据失败: ${error.message}`);
            }
          }
          
          if (chainPools.length === 0) {
            throw new Error('无法从链上解析任何池数据');
          }
          
          pools = chainPools;
        }
        
        // 处理池数据
        const processedPools = this.processPoolData(pools);
        
        // 更新缓存
        this.allPoolsCache = processedPools;
        this.lastUpdated = now;
        
        return processedPools;
      }
      
      // 返回缓存的数据
      return this.allPoolsCache;
    } catch (error) {
      this.logger.error('获取所有Meteora池数据失败:', error.message);
      throw new Error(`获取所有池数据失败: ${error.message}`);
    }
  }

  /**
   * 从链上获取单个池详情
   * @param {string} poolAddress - 池地址
   * @returns {Promise<Object>} - 池详情
   */
  async getPoolDetailFromChain(poolAddress) {
    try {
      // 创建DLMM实例
      if (!this.dlmmInstances[poolAddress]) {
        this.dlmmInstances[poolAddress] = await DLMM.create(
          this.connection, 
          new PublicKey(poolAddress)
        );
      }
      
      const dlmm = this.dlmmInstances[poolAddress];
      
      // 获取活跃bin
      const activeBin = await dlmm.getActiveBin();
      
      if (!activeBin) {
        throw new Error(`无法获取池${poolAddress}的活跃bin`);
      }
      
      // 获取代币信息
      const tokenX = dlmm.lbPair.tokenX.toString();
      const tokenY = dlmm.lbPair.tokenY.toString();
      
      // 尝试获取代币符号（如果有必要）
      let tokenASymbol = 'Unknown';
      let tokenBSymbol = 'Unknown';
      
      // 尝试从代币地址推断符号
      try {
        // 这里可以添加一些常见代币地址的映射
        const tokenMap = {
          'So11111111111111111111111111111111111111112': 'SOL',
          'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
          'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
          '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs': 'ETH',
          '9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E': 'BTC',
          'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 'BONK',
          'jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL': 'JTO',
          'rndrizKT3MJ1zzgNDj5Vybg2oy3q3Q6YErAEaAE1JYw': 'RNDR',
          '4dmKkXNHdgYsXqBHCuMikNQWwVomZURhYvkkX5c4pQ7y': 'PYTH',
          '7zBWymxbZt7PVHQzfi3i85fH7NzLf2t7h42syQcRLKdZ': 'BOME'
        };
        
        tokenASymbol = tokenMap[tokenX] || 'Unknown';
        tokenBSymbol = tokenMap[tokenY] || 'Unknown';
      } catch (error) {
        this.logger.warn(`获取代币符号失败: ${error.message}`);
      }
      
      // 获取池统计数据
      let volume24h = 0;
      let fees24h = 0;
      
      try {
        // 尝试从API获取池统计数据
        const response = await this.api.get(`/pools/${poolAddress}/stats`);
        if (response.status === 200 && response.data) {
          volume24h = this.parseNumericValue(response.data.volume24h);
          fees24h = this.parseNumericValue(response.data.fees24h);
        }
      } catch (error) {
        this.logger.warn(`获取池${poolAddress}统计数据失败: ${error.message}`);
      }
      
      const liquidity = parseFloat(dlmm.lbPair.totalLiquidity.toString());
      
      // 返回池详情
      return {
        address: poolAddress,
        tokenA: tokenASymbol,
        tokenB: tokenBSymbol,
        tokenAAddress: tokenX,
        tokenBAddress: tokenY,
        feeTier: dlmm.lbPair.feeRate / 10000,
        liquidity: liquidity,
        volume24h: volume24h,
        fees24h: fees24h,
        price: dlmm.fromPricePerLamport(Number(activeBin.price)),
        binStep: dlmm.lbPair.binStep,
        apr: fees24h > 0 && liquidity > 0 ? (fees24h / liquidity) * 365 * 100 : 0,
        tvl: liquidity,
        timestamp: new Date().toISOString(),
        reserves: {
          tokenA: 0, // 需要从链上获取
          tokenB: 0  // 需要从链上获取
        },
        fees: {
          total24h: fees24h
        },
        yields: {
          apr: fees24h > 0 && liquidity > 0 ? (fees24h / liquidity) * 365 * 100 : 0
        }
      };
    } catch (error) {
      this.logger.warn(`从链上获取池${poolAddress}详情失败:`, error.message);
      return null;
    }
  }

  /**
   * 处理池数据，统一格式
   * @param {Array} poolsData - 从API获取的池数据数组
   * @returns {Array} - 处理后的池数据数组
   */
  processPoolData(poolsData) {
    try {
      return poolsData.map(pool => {
        // 提取代币符号
        let tokenA = 'Unknown';
        let tokenB = 'Unknown';
        
        if (pool.name) {
          const nameParts = pool.name.split(/[-\/]/);
          if (nameParts.length >= 2) {
            tokenA = nameParts[0].trim();
            tokenB = nameParts[1].trim();
          }
        }
        
        // 如果已经有tokenA和tokenB，直接使用
        if (pool.tokenA && pool.tokenB) {
          tokenA = pool.tokenA;
          tokenB = pool.tokenB;
        } else if (pool.token0 && pool.token1) {
          tokenA = pool.token0;
          tokenB = pool.token1;
        } else if (pool.tokenX && pool.tokenY) {
          tokenA = pool.tokenX;
          tokenB = pool.tokenY;
        }
        
        // 解析数值字段
        const liquidity = this.parseNumericValue(pool.liquidity || pool.tvl);
        const volume24h = this.parseNumericValue(pool.volume24h || pool.trade_volume_24h);
        const fees24h = this.parseNumericValue(pool.fees24h || pool.fees_24h || (pool.fees && pool.fees.total24h));
        const currentPrice = this.parseNumericValue(pool.currentPrice || pool.price);
        
        // 计算收益率
        const apr = liquidity > 0 ? (fees24h / liquidity) * 365 * 100 : 0;
        
        return {
          address: pool.address || pool.id,
          tokenA: tokenA,
          tokenB: tokenB,
          tokenAAddress: pool.tokenAAddress || pool.tokenXAddress || pool.mint_x || pool.token0Address,
          tokenBAddress: pool.tokenBAddress || pool.tokenYAddress || pool.mint_y || pool.token1Address,
          liquidity: liquidity,
          volume24h: volume24h,
          fees24h: fees24h,
          price: currentPrice,
          binStep: this.parseNumericValue(pool.binStep || pool.bin_step),
          feeTier: this.parseNumericValue(pool.feeTier || pool.base_fee_percentage || pool.fee),
          apr: apr,
          tvl: liquidity,
          timestamp: new Date().toISOString(),
          reserves: {
            tokenA: this.parseNumericValue(pool.reserves?.tokenA || pool.reserve_x_amount || (pool.reserves && pool.reserves[0])),
            tokenB: this.parseNumericValue(pool.reserves?.tokenB || pool.reserve_y_amount || (pool.reserves && pool.reserves[1]))
          },
          fees: {
            total24h: fees24h
          },
          yields: {
            apr: apr
          }
        };
      });
    } catch (error) {
      this.logger.error('处理池数据失败:', error.message);
      throw new Error(`处理池数据失败: ${error.message}`);
    }
  }

  /**
   * 解析数值，确保返回数字类型
   * @param {any} value - 要解析的值
   * @returns {number} - 解析后的数值
   */
  parseNumericValue(value) {
    if (value === null || value === undefined) return 0;
    
    if (typeof value === 'number') return value;
    
    if (typeof value === 'string') {
      const parsed = parseFloat(value.replace(/[^0-9.eE-]/g, ''));
      return isNaN(parsed) ? 0 : parsed;
    }
    
    return 0;
  }

  /**
   * 获取特定池的详细信息
   * @param {string} poolAddress - 池地址
   * @returns {Promise<Object>} - 池详细信息
   */
  async getPoolDetail(poolAddress) {
    try {
      // 尝试从API获取池详情
      try {
        const response = await this.api.get(`/pools/${poolAddress}`);
        if (response.status === 200 && response.data) {
          return this.processPoolData([response.data])[0];
        }
        throw new Error('API返回的数据格式不正确');
      } catch (apiError) {
        this.logger.warn(`从API获取池${poolAddress}详情失败:`, apiError.message);
        
        // 如果API失败，尝试使用DLMM SDK获取
        const chainData = await this.getPoolDetailFromChain(poolAddress);
        if (!chainData) {
          throw new Error(`无法获取池${poolAddress}的数据`);
        }
        return chainData;
      }
    } catch (error) {
      this.logger.error(`获取池${poolAddress}详情失败:`, error.message);
      throw error;
    }
  }

  /**
   * 获取高质量池列表
   * @param {Object} options - 筛选选项
   * @param {number} options.minLiquidity - 最小流动性 (默认: 10000)
   * @param {number} options.minVolume24h - 最小24h交易量 (默认: 3000)
   * @param {number} options.minApr - 最小年化收益率 (默认: 0)
   * @param {number} options.limit - 返回池的数量限制 (默认: 100)
   * @returns {Promise<Array>} - 高质量池数组
   */
  async getHighQualityPools(options = {}) {
    try {
      const {
        minLiquidity = 10000,
        minVolume24h = 3000,
        minApr = 0,
        limit = 100
      } = options;

      // 获取所有池数据
      const allPools = await this.getAllPools(true);

      // 应用筛选条件
      const filteredPools = allPools.filter(pool => 
        pool.liquidity > minLiquidity &&
        pool.volume24h > minVolume24h &&
        pool.yields.apr > minApr &&
        pool.status !== 'disabled'
      );

      // 按交易量降序排序并限制数量
      return filteredPools
        .sort((a, b) => b.volume24h - a.volume24h)
        .slice(0, limit);
    } catch (error) {
      this.logger.error('获取高质量池失败:', error.message);
      throw new Error(`获取高质量池失败: ${error.message}`);
    }
  }

  /**
   * 获取特定代币的池列表
   * @param {string} tokenSymbol - 代币符号
   * @param {Object} options - 筛选选项
   * @returns {Promise<Array>} - 包含指定代币的池数组
   */
  async getTokenPools(tokenSymbol, options = {}) {
    try {
      const {
        minLiquidity = 10000,
        minVolume24h = 3000,
        limit = 100
      } = options;

      const allPools = await this.getAllPools(true);

      // 筛选包含指定代币的池
      const tokenPools = allPools.filter(pool =>
        (pool.tokenA === tokenSymbol || pool.tokenB === tokenSymbol) &&
        pool.liquidity > minLiquidity &&
        pool.volume24h > minVolume24h
      );

      // 按交易量降序排序并限制数量
      return tokenPools
        .sort((a, b) => b.volume24h - a.volume24h)
        .slice(0, limit);
    } catch (error) {
      this.logger.error(`获取${tokenSymbol}池失败:`, error.message);
      throw new Error(`获取${tokenSymbol}池失败: ${error.message}`);
    }
  }

  /**
   * 计算池的风险指标
   * @param {Object} pool - 池数据
   * @returns {Object} - 风险指标
   */
  calculateRiskMetrics(pool) {
    const volumeToLiquidity = pool.liquidity > 0 ? pool.volume24h / pool.liquidity : 0;
    const utilizationRate = volumeToLiquidity;
    const concentrationRisk = pool.liquidity > 0 ? pool.reserves.tokenA / pool.liquidity : 0;

    return {
      volumeToLiquidity,
      priceVolatility: pool.binStep,
      utilizationRate,
      concentrationRisk,
      riskAdjustedYield: pool.yields.apr > 0 ? pool.yields.apr / volumeToLiquidity : 0
    };
  }

  /**
   * 格式化池数据以便显示
   * @param {Object} pool - 池数据
   * @returns {Object} - 格式化后的池数据
   */
  formatPoolData(pool) {
    const formatNumber = (num, decimals = 2) => {
      if (num >= 1e9) return (num / 1e9).toFixed(decimals) + 'B';
      if (num >= 1e6) return (num / 1e6).toFixed(decimals) + 'M';
      if (num >= 1e3) return (num / 1e3).toFixed(decimals) + 'K';
      return num.toFixed(decimals);
    };

    const formatPercent = (num) => num.toFixed(2) + '%';

    return {
      name: pool.name,
      address: pool.address,
      tokens: {
        tokenA: pool.tokenA,
        tokenB: pool.tokenB,
        tokenAAddress: pool.tokenAAddress,
        tokenBAddress: pool.tokenBAddress
      },
      metrics: {
        price: pool.price.toFixed(6),
        liquidity: formatNumber(pool.liquidity),
        volume24h: formatNumber(pool.volume24h),
        apr: formatPercent(pool.yields.apr),
        feesToTVL: formatPercent(pool.yields.feesToTVLPercent || 0)
      },
      tradingMetrics: {
        volume24h: formatNumber(pool.volume24h),
        volumePerLiquidity: formatNumber(pool.volume24h / pool.liquidity, 4),
        feeEfficiency: formatNumber(pool.fees.total24h / pool.volume24h, 4),
        priceImpact: formatPercent(pool.binStep / 100)
      },
      yieldMetrics: {
        apr: formatPercent(pool.yields.apr),
        feesToTVL: formatPercent(pool.yields.feesToTVLPercent || 0),
        riskAdjustedYield: formatNumber(this.calculateRiskMetrics(pool).riskAdjustedYield, 4),
        dailyYield: formatPercent(pool.yields.apr / 365)
      },
      riskMetrics: this.calculateRiskMetrics(pool),
      fees: {
        base: formatPercent(pool.fees.base * 100),
        max: formatPercent(pool.fees.max * 100),
        total24h: formatNumber(pool.fees.total24h)
      },
      reserves: {
        tokenA: formatNumber(pool.reserves.tokenA),
        tokenB: formatNumber(pool.reserves.tokenB)
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 导出池数据为CSV格式
   * @param {Array} pools - 池数据数组
   * @returns {string} - CSV格式的数据
   */
  exportToCSV(pools) {
    const headers = [
      'Name',
      'Liquidity',
      'Volume24h',
      'APR',
      'FeesToTVL%',
      'Price',
      'TokenA',
      'TokenB',
      'BinStep',
      'FeeBase'
    ].join(',');

    const rows = pools.map(pool => [
      pool.name,
      pool.liquidity,
      pool.volume24h,
      pool.yields.apr,
      pool.yields.feesToTVLPercent || 0,
      pool.price,
      pool.tokenA,
      pool.tokenB,
      pool.binStep,
      pool.fees.base
    ].join(','));

    return [headers, ...rows].join('\n');
  }

  /**
   * 按收益率排序池数据
   * @param {Array} pools - 池数据数组
   * @returns {Array} - 排序后的池数组
   */
  sortByAPR(pools) {
    return pools
      .sort((a, b) => b.yields.apr - a.yields.apr)
      .map(pool => ({
        name: pool.name,
        apr: pool.yields.apr,
        volume: pool.volume24h,
        liquidity: pool.liquidity
      }));
  }

  /**
   * 按流动性排序池数据
   * @param {Array} pools - 池数据数组
   * @returns {Array} - 排序后的池数组
   */
  sortByLiquidity(pools) {
    return pools
      .sort((a, b) => b.liquidity - a.liquidity)
      .map(pool => ({
        name: pool.name,
        liquidity: pool.liquidity,
        volume24h: pool.volume24h,
        apr: pool.yields.apr
      }));
  }

  /**
   * 按交易量排序池数据
   * @param {Array} pools - 池数据数组
   * @returns {Array} - 排序后的池数组
   */
  sortByVolume(pools) {
    return pools
      .sort((a, b) => b.volume24h - a.volume24h)
      .map(pool => ({
        name: pool.name,
        volume24h: pool.volume24h,
        liquidity: pool.liquidity,
        apr: pool.yields.apr
      }));
  }

  /**
   * 按费用效率排序池数据
   * @param {Array} pools - 池数据数组
   * @returns {Array} - 排序后的池数组
   */
  sortByFeeEfficiency(pools) {
    return pools
      .filter(pool => pool.liquidity > 0)
      .sort((a, b) => (b.yields.feesToTVLPercent || 0) - (a.yields.feesToTVLPercent || 0))
      .map(pool => ({
        name: pool.name,
        feesToTVLPercent: pool.yields.feesToTVLPercent || 0,
        total24hFees: pool.fees.total24h,
        liquidity: pool.liquidity
      }));
  }

  /**
   * 分析池的交易效率
   * @param {Object} pool - 池数据
   * @returns {Object} - 交易效率分析
   */
  analyzeTradingEfficiency(pool) {
    const volumePerLiquidity = pool.liquidity > 0 ? pool.volume24h / pool.liquidity : 0;
    const feesPerLiquidity = pool.liquidity > 0 ? pool.fees.total24h / pool.liquidity : 0;

    return {
      name: pool.name,
      volumePerLiquidity,
      feesPerLiquidity,
      liquidity: pool.liquidity,
      volume24h: pool.volume24h,
      fees24h: pool.fees.total24h,
      efficiency: {
        volumeEfficiency: volumePerLiquidity,
        feeEfficiency: feesPerLiquidity,
        utilizationRate: volumePerLiquidity
      }
    };
  }

  /**
   * 分析池的价格区间
   * @param {Object} pool - 池数据
   * @returns {Object} - 价格区间分析
   */
  analyzePriceRange(pool) {
    const binStepPercent = pool.binStep / 100;
    const upperPrice = pool.price * (1 + binStepPercent);
    const lowerPrice = pool.price * (1 - binStepPercent);

    return {
      name: pool.name,
      currentPrice: pool.price,
      binStep: pool.binStep,
      priceRange: {
        upper: upperPrice,
        lower: lowerPrice,
        spread: binStepPercent * 200, // 总价格范围百分比
        median: (upperPrice + lowerPrice) / 2
      }
    };
  }

  /**
   * 生成池的完整分析报告
   * @param {Object} pool - 池数据
   * @returns {Object} - 完整分析报告
   */
  generatePoolAnalysis(pool) {
    const tradingEfficiency = this.analyzeTradingEfficiency(pool);
    const priceAnalysis = this.analyzePriceRange(pool);
    const riskMetrics = this.calculateRiskMetrics(pool);
    
    return {
      poolInfo: this.formatPoolData(pool),
      tradingAnalysis: {
        efficiency: tradingEfficiency.efficiency,
        priceRange: priceAnalysis.priceRange
      },
      riskAnalysis: riskMetrics,
      performanceMetrics: {
        apr: pool.yields.apr,
        feesToTVL: pool.yields.feesToTVLPercent || 0,
        volumeToLiquidity: tradingEfficiency.volumePerLiquidity,
        riskAdjustedYield: riskMetrics.riskAdjustedYield
      },
      recommendations: {
        isHighQuality: 
          pool.liquidity > 10000 &&
          pool.volume24h > 3000 &&
          pool.yields.apr > 0 &&
          pool.status !== 'disabled',
        riskLevel:
          riskMetrics.concentrationRisk > 0.8 ? 'high' :
          riskMetrics.concentrationRisk > 0.5 ? 'medium' : 'low',
        tradingEfficiency:
          tradingEfficiency.efficiency.volumeEfficiency > 0.1 ? 'high' :
          tradingEfficiency.efficiency.volumeEfficiency > 0.05 ? 'medium' : 'low'
      }
    };
  }
}

module.exports = {
  MeteoraPoolCollector
}; 