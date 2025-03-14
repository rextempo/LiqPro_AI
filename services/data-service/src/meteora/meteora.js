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
    this.apiBaseUrl = options.apiBaseUrl || 'https://dlmm-api.meteora.ag';
    this.solanaRpcEndpoint = options.solanaRpcEndpoint || 'https://api.mainnet-beta.solana.com';
    this.logger = options.logger || console;
    this.connection = new Connection(this.solanaRpcEndpoint);
    this.lastUpdated = null;
    this.updateInterval = 300000; // 默认5分钟更新一次
    
    // 初始化DLMM实例缓存
    this.dlmmInstances = {};
    
    // 初始化代币信息缓存
    this.tokenInfoCache = {};
    
    // 添加API请求缓存
    this.apiCache = new Map();
    this.cacheExpiry = 60000; // 缓存有效期1分钟
    
    // 添加API请求限制计数器
    this.apiLimitCounter = 0;
    this.apiLimitResetTime = Date.now() + 10000; // 10秒重置一次
    this.apiLimitMax = 10; // 10秒内最多10个请求
    this.consecutiveErrors = 0; // 连续错误计数
    
    // Meteora程序ID
    this.meteoraProgramId = new PublicKey('LBUZKhRxPF3XoTQpjVJ3XQPoJER6HADJAKRbWGVzMZ7');
    
    // 创建axios实例，设置超时和重试
    this.api = axios.create({
      baseURL: this.apiBaseUrl,
      timeout: 60000, // 增加超时时间到60秒
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'LiqPro/1.0'
      }
    });
    
    // 添加请求拦截器，实现请求限制和缓存
    this.api.interceptors.request.use(async (config) => {
      const cacheKey = `${config.method}:${config.url}:${JSON.stringify(config.params || {})}`;
      
      // 检查缓存
      if (config.method.toLowerCase() === 'get') {
        const cachedResponse = this.apiCache.get(cacheKey);
        if (cachedResponse && cachedResponse.expiry > Date.now()) {
          // 返回缓存的响应
          return Promise.reject({
            config,
            response: {
              status: 200,
              data: cachedResponse.data,
              __fromCache: true
            }
          });
        }
      }
      
      // 检查API限制
      if (Date.now() > this.apiLimitResetTime) {
        // 重置计数器
        this.apiLimitCounter = 0;
        this.apiLimitResetTime = Date.now() + 10000;
      }
      
      if (this.apiLimitCounter >= this.apiLimitMax) {
        // 计算需要等待的时间
        const waitTime = this.apiLimitResetTime - Date.now();
        if (waitTime > 0) {
          this.logger.warn(`API请求达到限制，等待${waitTime}ms后重试...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          // 重置计数器
          this.apiLimitCounter = 0;
          this.apiLimitResetTime = Date.now() + 10000;
        }
      }
      
      // 增加计数器
      this.apiLimitCounter++;
      
      // 添加随机延迟，避免请求过于频繁
      const delay = Math.floor(Math.random() * 1000) + 500; // 500-1500ms随机延迟
      await new Promise(resolve => setTimeout(resolve, delay));
      
      return config;
    });
    
    // 添加响应拦截器，处理429错误和缓存响应
    this.api.interceptors.response.use(
      response => {
        // 重置连续错误计数
        this.consecutiveErrors = 0;
        
        // 缓存GET请求的响应
        if (response.config.method.toLowerCase() === 'get') {
          const cacheKey = `${response.config.method}:${response.config.url}:${JSON.stringify(response.config.params || {})}`;
          this.apiCache.set(cacheKey, {
            data: response.data,
            expiry: Date.now() + this.cacheExpiry
          });
        }
        
        return response;
      },
      async error => {
        // 如果是缓存响应，直接返回
        if (error.response && error.response.__fromCache) {
          return Promise.resolve(error.response);
        }
        
        // 处理429错误
        if (error.response && error.response.status === 429) {
          this.consecutiveErrors++;
          
          // 计算退避时间，使用指数退避策略
          const backoffTime = Math.min(2000 * Math.pow(2, this.consecutiveErrors - 1), 30000);
          
          this.logger.warn(`API请求限制，等待${backoffTime}ms后重试...`);
          
          // 等待退避时间后重试
          await new Promise(resolve => setTimeout(resolve, backoffTime));
          
          // 减少API限制计数器，避免连续触发限制
          this.apiLimitCounter = Math.max(0, this.apiLimitCounter - 1);
          
          return this.api.request(error.config);
        }
        
        // 处理其他错误
        this.logger.error(`API请求失败: ${error.message}`);
        throw error;
      }
    );
    
    this.logger.info('MeteoraPoolCollector初始化成功');
  }

  /**
   * 获取高活跃度池
   * @param {number} limit 限制数量
   * @returns {Promise<Array>} 池数组
   */
  async getHighActivityPools(limit = 100) {
    try {
      this.logger.info(`正在获取Meteora高活跃度池数据，限制: ${limit}个`);
      
      // 使用缓存键
      const cacheKey = `highActivityPools:${limit}`;
      const cachedData = this.apiCache.get(cacheKey);
      
      // 如果有缓存且未过期，直接返回缓存数据
      if (cachedData && cachedData.expiry > Date.now()) {
        this.logger.info(`使用缓存的高活跃度池数据，共${cachedData.data.length}个`);
        return cachedData.data;
      }
      
      // 分批获取数据，每批次最多获取20个
      const batchSize = 20;
      const batches = Math.ceil(limit / batchSize);
      let allPools = [];
      
      for (let i = 0; i < batches; i++) {
        const batchLimit = Math.min(batchSize, limit - i * batchSize);
        if (batchLimit <= 0) break;
        
        this.logger.info(`获取第${i+1}/${batches}批高活跃度池数据，批次大小: ${batchLimit}`);
        
        const response = await this.api.get('/pools', {
          params: {
            limit: batchLimit,
            offset: i * batchSize,
            sortBy: 'volume24h',
            sortDirection: 'desc'
          }
        });
        
        if (response.data && Array.isArray(response.data)) {
          allPools = allPools.concat(response.data);
          this.logger.info(`成功获取第${i+1}批高活跃度池数据，本批次: ${response.data.length}个`);
          
          // 如果不是最后一批，添加延迟避免触发限制
          if (i < batches - 1) {
            const delay = 2000 + Math.random() * 1000;
            this.logger.info(`等待${Math.round(delay)}ms后获取下一批数据...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      // 处理池数据，添加代币信息
      const processedPools = await this.processPoolDataWithTokenInfo(allPools);
      
      // 缓存处理后的数据
      this.apiCache.set(cacheKey, {
        data: processedPools,
        expiry: Date.now() + this.cacheExpiry
      });
      
      this.logger.info(`成功获取并处理${processedPools.length}个高活跃度池数据`);
      return processedPools;
    } catch (error) {
      this.logger.warn(`从Meteora API获取高活跃度池数据失败: ${error.message}`);
      
      // 如果有缓存，即使过期也返回
      const cacheKey = `highActivityPools:${limit}`;
      const cachedData = this.apiCache.get(cacheKey);
      if (cachedData) {
        this.logger.info(`使用过期的缓存数据，共${cachedData.data.length}个`);
        return cachedData.data;
      }
      
      throw error;
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
   * 缩短地址用于显示
   * @param {string} address - 要缩短的地址
   * @returns {string} - 缩短后的地址
   */
  shortenAddress(address) {
    if (!address || address.length < 10) return address;
    return `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
  }

  /**
   * 标准化代币信息
   * @param {string} tokenInfo - 代币地址或符号
   * @returns {Object} - 标准化的代币信息
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
        name: knownTokens[tokenInfo].name,
        decimals: 9 // 默认值，大多数代币是9位小数
      };
    }
    
    // 如果不是已知代币，尝试根据地址格式判断
    if (tokenInfo && tokenInfo.length > 30) {
      // 看起来像是一个地址，但我们不认识它
      return {
        address: tokenInfo,
        symbol: this.shortenAddress(tokenInfo),
        name: `Unknown Token (${this.shortenAddress(tokenInfo)})`,
        decimals: 9 // 默认值
      };
    }
    
    // 默认情况
    return {
      address: 'unknown',
      symbol: tokenInfo || 'Unknown',
      name: 'Unknown Token',
      decimals: 9 // 默认值
    };
  }

  /**
   * 获取代币信息
   * @param {string} tokenAddress - 代币地址
   * @returns {Promise<Object>} - 代币信息
   */
  async getTokenInfo(tokenAddress) {
    // 检查缓存
    if (this.tokenInfoCache[tokenAddress]) {
      return this.tokenInfoCache[tokenAddress];
    }
    
    // 首先尝试使用已知代币映射
    const knownTokenInfo = this.normalizeTokenInfo(tokenAddress);
    if (knownTokenInfo.symbol !== 'Unknown' && knownTokenInfo.symbol !== this.shortenAddress(tokenAddress)) {
      // 已知代币，缓存并返回
      this.tokenInfoCache[tokenAddress] = knownTokenInfo;
      return knownTokenInfo;
    }
    
    try {
      // 尝试从 Meteora API 获取代币信息
      const response = await this.api.get(`/token/${tokenAddress}`);
      
      if (response.status === 200 && response.data) {
        const tokenData = response.data;
        const tokenInfo = {
          address: tokenAddress,
          symbol: tokenData.symbol || this.shortenAddress(tokenAddress),
          name: tokenData.name || `Token ${this.shortenAddress(tokenAddress)}`,
          decimals: tokenData.decimals || 9
        };
        
        // 缓存结果
        this.tokenInfoCache[tokenAddress] = tokenInfo;
        return tokenInfo;
      }
    } catch (error) {
      this.logger.warn(`从 API 获取代币 ${tokenAddress} 信息失败: ${error.message}`);
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
            decimals: info.decimals || 9
          };
          
          // 缓存结果
          this.tokenInfoCache[tokenAddress] = tokenData;
          return tokenData;
        }
      }
    } catch (error) {
      this.logger.warn(`从区块链获取代币 ${tokenAddress} 信息失败: ${error.message}`);
    }
    
    // 所有方法都失败，返回基本信息
    return knownTokenInfo;
  }

  /**
   * 处理池数据，并获取更详细的代币信息
   * @param {Array} poolsData - 从 API 获取的池数据数组
   * @returns {Promise<Array>} - 处理后的池数据数组
   */
  async processPoolDataWithTokenInfo(poolsData) {
    try {
      this.logger.info(`开始处理 ${poolsData.length} 个池数据，获取更详细的代币信息`);
      
      if (!Array.isArray(poolsData)) {
        this.logger.error('处理池数据失败: 输入不是数组');
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
        if (pool.tokenAAddress && pool.tokenAAddress !== '11111111111111111111111111111111') {
          tokenAddresses.add(pool.tokenAAddress);
        }
        if (pool.tokenBAddress && pool.tokenBAddress !== '11111111111111111111111111111111') {
          tokenAddresses.add(pool.tokenBAddress);
        }
      });
      
      this.logger.info(`发现 ${tokenAddresses.size} 个唯一代币地址`);
      
      // 获取所有代币信息
      const tokenInfoMap = {};
      const tokenInfoPromises = Array.from(tokenAddresses).map(address => 
        this.getTokenInfo(address).then(info => {
          tokenInfoMap[address] = info;
          return info;
        }).catch(err => {
          this.logger.warn(`获取代币 ${address} 信息失败: ${err.message}`);
          tokenInfoMap[address] = { symbol: 'Unknown', address: address };
          return { symbol: 'Unknown', address: address };
        })
      );
      
      await Promise.all(tokenInfoPromises);
      
      this.logger.info(`成功获取 ${Object.keys(tokenInfoMap).length} 个代币的信息`);
      
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
        
        // 确定代币地址
        const tokenAAddress = pool.mint_x || pool.tokenAAddress || pool.tokenXAddress || pool.token0Address;
        const tokenBAddress = pool.mint_y || pool.tokenBAddress || pool.tokenYAddress || pool.token1Address;
        
        // 获取代币信息，优先使用从名称中提取的符号
        const tokenAInfo = tokenInfoMap[tokenAAddress] || { 
          symbol: tokenASymbol, 
          address: tokenAAddress || 'unknown' 
        };
        
        const tokenBInfo = tokenInfoMap[tokenBAddress] || { 
          symbol: tokenBSymbol, 
          address: tokenBAddress || 'unknown' 
        };
        
        // 如果代币信息中的符号是 Unknown 或缩写地址，使用从名称中提取的符号
        if (tokenAInfo.symbol === 'Unknown' || tokenAInfo.symbol.includes('...')) {
          tokenAInfo.symbol = tokenASymbol;
        }
        
        if (tokenBInfo.symbol === 'Unknown' || tokenBInfo.symbol.includes('...')) {
          tokenBInfo.symbol = tokenBSymbol;
        }
        
        // 解析数值字段
        const liquidity = this.parseNumericValue(pool.liquidity || pool.tvl);
        const volume24h = this.parseNumericValue(pool.volume24h || pool.trade_volume_24h);
        const fees24h = this.parseNumericValue(pool.fees24h || pool.fees_24h || (pool.fees && pool.fees.total24h));
        const currentPrice = this.parseNumericValue(pool.currentPrice || pool.price || pool.current_price);
        
        // 计算收益率（基于24h fees/TVL）
        const apr = liquidity > 0 ? (fees24h / liquidity) * 365 * 100 : 0;
        
        // 构建处理后的数据
        const processedData = {
          address: pool.address || pool.id,
          tokenA: tokenAInfo.symbol,
          tokenB: tokenBInfo.symbol,
          tokenAAddress: tokenAInfo.address,
          tokenBAddress: tokenBInfo.address,
          feeTier: this.parseNumericValue(pool.feeTier || pool.base_fee_percentage || pool.fee),
          binStep: this.parseNumericValue(pool.binStep || pool.bin_step),
          liquidity,
          volume24h,
          price: currentPrice,
          status: pool.is_blacklisted ? 'blacklisted' : (pool.hide ? 'hidden' : 'enabled'),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          reserves: {
            tokenA: this.parseNumericValue(pool.reserves?.tokenA || pool.reserve_x_amount || (pool.reserves && pool.reserves[0])),
            tokenB: this.parseNumericValue(pool.reserves?.tokenB || pool.reserve_y_amount || (pool.reserves && pool.reserves[1]))
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
            feesToTVL: liquidity > 0 ? fees24h / liquidity : 0,
            feesToTVLPercent: liquidity > 0 ? (fees24h / liquidity) * 100 : 0
          },
          tags: pool.tags || [],
          name: pool.name || `${tokenAInfo.symbol}-${tokenBInfo.symbol}`
        };
        
        return processedData;
      });
      
      return processedPools;
    } catch (error) {
      this.logger.error(`处理池数据失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 处理池数据
   * @param {Array} poolsData - 池数据数组
   * @returns {Array} - 处理后的池数据数组
   */
  processPoolData(poolsData) {
    try {
      // 使用增强的代币信息处理方法
      return this.processPoolDataWithTokenInfo(poolsData);
    } catch (error) {
      this.logger.error(`增强的池数据处理失败，回退到基本处理: ${error.message}`);
      
      // 回退到基本处理逻辑
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