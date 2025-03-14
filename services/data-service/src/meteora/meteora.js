const axios = require('axios');
const { Connection, PublicKey } = require('@solana/web3.js');

/**
 * Meteora池数据收集器
 * 负责从Meteora API获取DLMM池数据
 */
class MeteoraPoolCollector {
  constructor(options = {}) {
    this.apiBaseUrl = options.apiBaseUrl || 'https://dlmm-api.meteora.ag';
    this.solanaRpcEndpoint = options.solanaRpcEndpoint || 'https://soft-snowy-asphalt.solana-mainnet.quiknode.pro/48639631c6e4e81af5a0b8e228f6f9a0329154b7/';
    this.solanaWssEndpoint = options.solanaWssEndpoint || 'wss://soft-snowy-asphalt.solana-mainnet.quiknode.pro/48639631c6e4e81af5a0b8e228f6f9a0329154b7/';
    this.logger = options.logger || console;
    this.connection = new Connection(this.solanaRpcEndpoint);
    this.lastUpdated = null;
    this.updateInterval = 300000; // 默认5分钟更新一次
    
    // Meteora程序ID
    this.meteoraProgramId = new PublicKey('LBUZKhRxPF3XoTQpjVJ3XQPoJER6HADJAKRbWGVzMZ7');
    
    // 创建axios实例，设置超时和重试
    this.api = axios.create({
      baseURL: this.apiBaseUrl,
      timeout: 60000, // 增加超时时间到60秒
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
        'Origin': 'https://app.meteora.ag',
        'Referer': 'https://app.meteora.ag/',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    
    this.logger.info('MeteoraPoolCollector初始化成功');
    this.logger.info(`使用Solana RPC端点: ${this.solanaRpcEndpoint}`);
  }

  /**
   * 获取所有池数据
   * @returns {Promise<Array>} 所有池数据
   */
  async getAllPools() {
    try {
      // 实现指数退避重试
      let retryCount = 0;
      const maxRetries = 5;
      const baseDelay = 2000; // 2秒
      const maxDelay = 30000; // 最大30秒
      
      while (retryCount < maxRetries) {
        try {
          // 使用axios发送请求
          const response = await axios({
            method: 'get',
            url: `${this.apiBaseUrl}/pair/all`,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
              'Accept': 'application/json, text/plain, */*',
              'Accept-Language': 'en-US,en;q=0.9',
              'Origin': 'https://app.meteora.ag',
              'Referer': 'https://app.meteora.ag/',
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            },
            timeout: 60000,
            params: {
              _t: Date.now() // 添加时间戳避免缓存
            }
          });
          
          if (response.status === 200 && Array.isArray(response.data)) {
            const allPools = response.data;
            this.logger.info(`成功获取${allPools.length}个池数据`);
            return allPools;
          } else {
            throw new Error('API返回的数据格式不正确');
          }
        } catch (error) {
          retryCount++;
          
          // 计算退避时间
          const delay = Math.min(baseDelay * Math.pow(2, retryCount - 1), maxDelay);
          
          if (error.response && error.response.status === 429) {
            this.logger.warn(`API请求限制，等待${delay}ms后重试... (尝试 ${retryCount}/${maxRetries})`);
          } else if (retryCount < maxRetries) {
            this.logger.warn(`API请求失败: ${error.message}，等待${delay}ms后重试... (尝试 ${retryCount}/${maxRetries})`);
          } else {
            this.logger.error(`在${maxRetries}次尝试后仍未能获取池数据: ${error.message}`);
            throw error;
          }
          
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      throw new Error(`在${maxRetries}次尝试后仍未能获取池数据`);
    } catch (error) {
      this.logger.error(`获取所有池数据失败: ${error.message}`);
      if (error.stack) {
        this.logger.error(error.stack);
      }
      return [];
    }
  }

  /**
   * 获取高活跃度池
   * @param {number} limit 限制数量
   * @returns {Promise<Array>} 池数组
   */
  async getHighActivityPools(limit = 100) {
    try {
      this.logger.info(`正在获取Meteora高活跃度池数据，限制: ${limit}个`);
      
      // 获取所有池数据
      const allPools = await this.getAllPools();
      
      if (allPools.length === 0) {
        throw new Error('无法获取池数据');
      }
      
      // 处理池数据
      const processedPools = this.processPoolData(allPools);
      
      // 按交易量排序并限制数量
      const filteredPools = processedPools
        .sort((a, b) => b.volume_24h - a.volume_24h)
        .slice(0, limit);
      
      this.logger.info(`成功获取并处理${filteredPools.length}个高活跃度池数据`);
      return filteredPools;
    } catch (error) {
      this.logger.warn(`从Meteora API获取高活跃度池数据失败: ${error.message}`);
      throw error;
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
   * 处理池数据
   * @param {Array} poolsData - 池数据数组
   * @returns {Array} - 处理后的池数据数组
   */
  processPoolData(poolsData) {
    if (!Array.isArray(poolsData)) {
      this.logger.error('处理池数据失败: 输入不是数组');
      return [];
    }
    
    // 处理池数据 - 完全在本地进行
    return poolsData.map(pool => {
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
      
      // 解析数值字段
      const liquidity = this.parseNumericValue(pool.liquidity || pool.tvl);
      const volume24h = this.parseNumericValue(pool.volume_24h || pool.trade_volume_24h || pool.volume24h);
      const fees24h = this.parseNumericValue(pool.fees24h || pool.fees_24h || (pool.fees && pool.fees.total24h));
      const currentPrice = this.parseNumericValue(pool.currentPrice || pool.price || pool.current_price);
      
      // 计算收益率和费用比率
      const apr = liquidity > 0 ? (fees24h / liquidity) * 365 * 100 : 0;
      const feeToTvlRatio24h = liquidity > 0 ? fees24h / liquidity : 0;
      
      // 返回符合指定格式的池数据结构
      return {
        // 池子唯一标识地址
        address: pool.address || pool.id,
        
        // 池子名称
        name: pool.name || `${tokenASymbol}-${tokenBSymbol}`,
        
        // 代币对信息
        token_pair: {
          token_x: {
            address: tokenAAddress || 'unknown',
            symbol: tokenASymbol
          },
          token_y: {
            address: tokenBAddress || 'unknown',
            symbol: tokenBSymbol
          }
        },
        
        // 池子总锁仓量(USD)
        tvl: liquidity,
        
        // 24小时交易量(USD)
        volume_24h: volume24h,
        
        // 24小时手续费收入(USD)
        fees_24h: fees24h,
        
        // 当前交易价格
        current_price: currentPrice,
        
        // 年化收益率(不考虑复利)
        apr: apr,
        
        // 24小时费用/TVL比率
        fee_to_tvl_ratio_24h: feeToTvlRatio24h,
        
        // 费率结构
        fee_structure: {
          bin_step: this.parseNumericValue(pool.binStep || pool.bin_step),
          base_fee: (this.parseNumericValue(pool.base_fee_percentage || pool.feeTier || pool.fee) || 0).toString(),
          max_fee: (this.parseNumericValue(pool.max_fee_percentage) || 0).toString(),
          protocol_fee: (this.parseNumericValue(pool.protocol_fee_percentage) || 5).toString()
        },
        
        // 是否被列入黑名单
        is_blacklisted: !!pool.is_blacklisted,
        
        // 是否在UI中隐藏
        hide: !!pool.hide,
        
        // 保留原始数据中的其他有用字段
        timestamp: new Date().toISOString(),
        reserves: {
          token_x: this.parseNumericValue(pool.reserves?.tokenA || pool.reserve_x_amount || (pool.reserves && pool.reserves[0])),
          token_y: this.parseNumericValue(pool.reserves?.tokenB || pool.reserve_y_amount || (pool.reserves && pool.reserves[1]))
        }
      };
    });
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
}

module.exports = {
  MeteoraPoolCollector
}; 