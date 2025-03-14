const express = require('express');
const mongoose = require('mongoose');
const { MeteoraPoolCollector } = require('./src/meteora/meteora');
const logger = require('./src/utils/logger');
const rabbitmq = require('./src/utils/rabbitmq');

// 创建Express应用
const app = express();
const port = process.env.PORT || 3000;

// 中间件
app.use(express.json());

// MongoDB配置
const MONGODB_HOST = process.env.MONGODB_HOST || 'mongodb';
const MONGODB_PORT = process.env.MONGODB_PORT || '27017';
const MONGODB_USER = process.env.MONGODB_USER || 'liqpro';
const MONGODB_PASS = process.env.MONGODB_PASS || 'liqpro_password';
const MONGODB_DB = process.env.MONGODB_DB || 'liqpro';
const MONGODB_URL = `mongodb://${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_DB}`;

// 数据收集间隔（默认5分钟）
const DATA_COLLECTION_INTERVAL = parseInt(process.env.DATA_COLLECTION_INTERVAL || '300000', 10);

// Solana RPC端点
const SOLANA_RPC_ENDPOINT = process.env.SOLANA_RPC_ENDPOINT || 'https://soft-snowy-asphalt.solana-mainnet.quiknode.pro/48639631c6e4e81af5a0b8e228f6f9a0329154b7/';

// 创建Meteora池收集器
const meteoraCollector = new MeteoraPoolCollector({
  solanaRpcEndpoint: SOLANA_RPC_ENDPOINT,
  logger: logger
});

// 定义Schema
const PoolDataSchema = new mongoose.Schema({
  poolAddress: { type: String, required: true, index: true },
  tokenA: { type: String, required: true },
  tokenB: { type: String, required: true },
  timestamp: { type: Date, required: true },
  liquidity: Number,
  volume24h: Number,
  fees24h: Number,
  price: Number,
  binStep: Number,
  feeTier: Number,
  apr: Number,
  tvl: Number,
  metadata: mongoose.Schema.Types.Mixed
}, {
  timeseries: {
    timeField: 'timestamp',
    metaField: 'poolAddress',
    granularity: 'minutes'
  }
});

// 创建模型
const PoolData = mongoose.model('PoolData', PoolDataSchema);

// 定义信号Schema
const SignalSchema = new mongoose.Schema({
  id: { type: String, required: true, index: true },
  analysis_timestamp: { type: Date, required: true },
  market_condition: {
    trend: String,
    volatility: String
  },
  t1_pools: [{
    pool_address: String,
    name: String,
    token_pair: {
      token_x: {
        symbol: String,
        address: String
      },
      token_y: {
        symbol: String,
        address: String
      }
    },
    metrics: {
      liquidity: Number,
      volume_24h: Number,
      fees_24h: Number,
      daily_yield: Number,
      active_bin: {
        binId: Number,
        price: String,
        pricePerToken: String
      }
    },
    liquidity_distribution: {
      effective_liquidity_ratio: Number,
      distribution_type: String
    },
    fee_info: {
      base_fee: String,
      max_fee: String,
      current_dynamic_fee: String
    },
    stability_metrics: {
      price_volatility: Number,
      yield_stability: Number,
      stability_score: Number
    },
    risk_metrics: {
      price_risk: Number,
      liquidity_risk: Number,
      overall_risk: Number
    },
    scores: {
      base_performance_score: Number,
      liquidity_distribution_score: Number,
      fee_efficiency_score: Number,
      stability_score: Number,
      risk_score: Number,
      final_score: Number
    },
    recommendation: {
      position_size: String,
      price_range: {
        min: Number,
        max: Number,
        current: Number,
        optimal_range_percentage: Number
      },
      bin_distribution: String,
      bin_step: Number
    },
    tier: String
  }],
  t2_pools: [mongoose.Schema.Types.Mixed],
  t3_pools: [mongoose.Schema.Types.Mixed],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// 创建信号模型
const Signal = mongoose.model('Signal', SignalSchema);

// 连接MongoDB
async function connectToMongoDB() {
  try {
    logger.info('正在连接到MongoDB...');
    await mongoose.connect(MONGODB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    logger.info('MongoDB连接成功');
    return true;
  } catch (error) {
    logger.error('MongoDB连接失败:', error);
    setTimeout(connectToMongoDB, 5000);
    return false;
  }
}

// 存储池数据到MongoDB
async function storePoolData(poolData) {
  try {
    const documents = Array.isArray(poolData) ? poolData : [poolData];
    const timestamp = new Date();

    const bulkOps = documents.map(pool => ({
      insertOne: {
        document: {
          poolAddress: pool.address,
          tokenA: pool.tokenA || pool.token0 || 'Unknown',
          tokenB: pool.tokenB || pool.token1 || 'Unknown',
          timestamp,
          liquidity: pool.liquidity || pool.tvl || 0,
          volume24h: pool.volume24h || 0,
          fees24h: pool.fees?.total24h || 0,
          price: pool.currentPrice || pool.price || 0,
          binStep: pool.binStep || 0,
          feeTier: pool.feeTier || 0,
          apr: pool.yields?.apr || 0,
          tvl: pool.liquidity || pool.tvl || 0,
          metadata: {
            reserves: pool.reserves || {},
            fees: pool.fees || {},
            volumeHistory: pool.volumeHistory || {},
            yields: pool.yields || {}
          }
        }
      }
    }));

    if (bulkOps.length > 0) {
      const result = await PoolData.bulkWrite(bulkOps);
      logger.info(`已存储${result.insertedCount}条池数据记录`);
      return result.insertedCount;
    }
    
    return 0;
  } catch (error) {
    logger.error('存储池数据失败:', error);
    throw error;
  }
}

// 获取历史数据
async function getHistoricalData(poolAddress, startTime, endTime) {
  try {
    const query = {
      poolAddress,
      timestamp: {
        $gte: startTime,
        $lte: endTime
      }
    };

    const data = await PoolData.find(query).sort({ timestamp: 1 });
    return data;
  } catch (error) {
    logger.error(`获取池${poolAddress}的历史数据失败:`, error);
    throw error;
  }
}

/**
 * 收集并发布池数据
 */
async function collectAndPublishPoolData() {
  logger.info('开始收集并发布池数据');
  
  try {
    // 使用curl方法获取所有池数据
    logger.info('从Meteora获取所有池数据');
    const allPools = await meteoraCollector.getAllPools();
    
    if (!allPools || allPools.length === 0) {
      logger.error('未能获取到任何池数据');
      return;
    }
    
    logger.info(`成功获取${allPools.length}个池数据，开始筛选高活跃度池`);
    
    // 筛选TVL大于$10,000且24小时交易量大于$20,000的池
    const filteredPools = allPools.filter(pool => {
      // 解析TVL和交易量
      const tvl = parseFloat(pool.liquidity || 0);
      const volume24h = parseFloat(pool.volume_24h || pool.trade_volume_24h || pool.volume24h || 0);
      
      // 检查是否满足条件
      return tvl >= 10000 && volume24h >= 20000;
    });
    
    logger.info(`筛选出${filteredPools.length}个满足条件的池`);
    
    // 按24小时交易量排序
    const sortedPools = filteredPools.sort((a, b) => {
      const volumeA = parseFloat(a.volume_24h || a.trade_volume_24h || a.volume24h || 0);
      const volumeB = parseFloat(b.volume_24h || b.trade_volume_24h || b.volume24h || 0);
      return volumeB - volumeA;
    });
    
    // 获取前100个高活跃度池
    const topPools = sortedPools.slice(0, 100);
    
    logger.info(`选出前${topPools.length}个高活跃度池`);
    
    // 处理池数据，使用新的格式
    const processedPools = meteoraCollector.processPoolData(topPools);
    
    // 准备MongoDB批量写入操作
    const bulkOps = processedPools.map(pool => {
      return {
        insertOne: {
          document: {
            poolAddress: pool.address,
            tokenA: pool.token_pair.token_x.symbol,
            tokenB: pool.token_pair.token_y.symbol,
            timestamp: new Date(),
            liquidity: pool.tvl,
            volume24h: pool.volume_24h,
            fees24h: pool.fees_24h,
            price: pool.current_price,
            binStep: pool.fee_structure.bin_step,
            feeTier: parseFloat(pool.fee_structure.base_fee),
            apr: pool.apr,
            tvl: pool.tvl,
            metadata: {
              fees: {
                min_30: pool.fees_24h / 48, // 估算30分钟费用
                hour_1: pool.fees_24h / 24, // 估算1小时费用
                hour_2: pool.fees_24h / 12, // 估算2小时费用
                hour_4: pool.fees_24h / 6,  // 估算4小时费用
                hour_12: pool.fees_24h / 2, // 估算12小时费用
                hour_24: pool.fees_24h      // 24小时费用
              },
              name: pool.name,
              token_pair: pool.token_pair,
              fee_structure: pool.fee_structure,
              fee_to_tvl_ratio_24h: pool.fee_to_tvl_ratio_24h,
              is_blacklisted: pool.is_blacklisted,
              hide: pool.hide,
              reserves: pool.reserves
            }
          }
        }
      };
    });
    
    // 执行MongoDB批量写入
    if (bulkOps.length > 0) {
      try {
        const result = await PoolData.bulkWrite(bulkOps);
        logger.info(`MongoDB批量写入成功: ${JSON.stringify(result.insertedCount || result)}`);
      } catch (dbError) {
        logger.error(`MongoDB批量写入失败: ${dbError.message}`);
        if (dbError.stack) {
          logger.error(dbError.stack);
        }
      }
    }
    
    // 发布到RabbitMQ
    try {
      // 使用rabbitmq工具类的publishPoolData方法发布消息
      await rabbitmq.publishPoolData(processedPools);
      
      logger.info(`成功发布${processedPools.length}个高活跃度池数据到RabbitMQ`);
    } catch (mqError) {
      logger.error(`RabbitMQ发布失败: ${mqError.message}`);
      if (mqError.stack) {
        logger.error(mqError.stack);
      }
    }
    
    logger.info('池数据收集和发布完成');
  } catch (error) {
    logger.error(`池数据收集和发布过程中发生错误: ${error.message}`);
    if (error.stack) {
      logger.error(error.stack);
    }
  }
}

/**
 * 筛选出前100个活跃池
 * @param {Array} pools - 所有池数据
 * @returns {Array} - 前100个活跃池
 */
function selectTop100ActivePools(pools) {
  // 过滤掉黑名单和隐藏池子
  const filteredPools = pools.filter(pool => {
    return !pool.blacklisted && !pool.is_blacklisted && !pool.hidden && !pool.hide;
  });
  
  // 过滤掉TVL小于10000美元和交易量小于20000美元的池子
  const activePoolsWithHighTVL = filteredPools.filter(pool => {
    // 解析数值，确保是数字类型
    const parseNumericValue = (value) => {
      if (value === null || value === undefined) return 0;
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        const parsed = parseFloat(value.replace(/[^0-9.eE-]/g, ''));
        return isNaN(parsed) ? 0 : parsed;
      }
      return 0;
    };
    
    const tvl = parseNumericValue(pool.liquidity) || parseNumericValue(pool.tvl) || 0;
    const price = parseNumericValue(pool.price) || parseNumericValue(pool.currentPrice) || 1;
    const tvlUsd = tvl * price;
    
    const volume24h = parseNumericValue(pool.volume24h) || parseNumericValue(pool.volume_24h) || parseNumericValue(pool.trade_volume_24h) || 0;
    
    return tvlUsd >= 10000 && volume24h >= 20000;
  });
  
  // 按24小时交易量排序
  const sortedPools = activePoolsWithHighTVL.sort((a, b) => {
    const volumeA = parseFloat(a.volume24h || a.volume_24h || a.trade_volume_24h || 0);
    const volumeB = parseFloat(b.volume24h || b.volume_24h || b.trade_volume_24h || 0);
    return volumeB - volumeA;
  });
  
  // 返回前100个池子
  return sortedPools.slice(0, 100);
}

// 发布池数据到RabbitMQ
async function publishPoolData(poolData) {
  try {
    if (!poolData || poolData.length === 0) {
      logger.warn('没有池数据需要发布到RabbitMQ');
      return;
    }
    
    // 发布到RabbitMQ
    await rabbitmq.publishToExchange('pool_data', {
      type: 'pool_data_update',
      timestamp: new Date().toISOString(),
      count: poolData.length,
      data: poolData
    });
    
    logger.info(`已发布${poolData.length}条池数据到RabbitMQ`);
    return true;
  } catch (error) {
    logger.error('发布池数据到RabbitMQ失败:', error);
    throw error;
  }
}

// 处理接收到的信号
async function handleSignal(signal) {
  try {
    logger.info(`处理信号: ${signal.id}`);
    
    // 检查信号是否已存在
    const existingSignal = await Signal.findOne({ id: signal.id });
    if (existingSignal) {
      logger.info(`信号 ${signal.id} 已存在，跳过处理`);
      return;
    }
    
    // 存储信号到数据库
    const newSignal = new Signal(signal);
    await newSignal.save();
    
    logger.info(`信号 ${signal.id} 已存储到数据库`);
    
    // 这里可以添加其他处理逻辑，例如分析信号、触发交易等
  } catch (error) {
    logger.error(`处理信号 ${signal.id} 失败:`, error);
    throw error;
  }
}

// API路由
// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'data-service-real',
    timestamp: new Date().toISOString()
  });
});

// 获取最新池数据
app.get('/api/pools', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '100', 10);
    
    // 获取所有池数据
    const allPools = await meteoraCollector.getAllPools();
    
    // 筛选活跃池
    const activePools = selectTop100ActivePools(allPools);
    
    // 处理池数据，使用新的格式
    const processedPools = meteoraCollector.processPoolData(activePools);
    
    // 如果请求的限制小于活跃池数量，则只返回请求的数量
    const pools = processedPools.slice(0, limit);
    
    res.json({ success: true, data: pools });
  } catch (error) {
    logger.error('获取池数据失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取特定池的历史数据
app.get('/api/pools/:address/history', async (req, res) => {
  try {
    const { address } = req.params;
    const { start, end } = req.query;
    
    const startTime = start ? new Date(start) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const endTime = end ? new Date(end) : new Date();
    
    const historicalData = await getHistoricalData(address, startTime, endTime);
    res.json({ success: true, data: historicalData });
  } catch (error) {
    logger.error(`获取池${req.params.address}的历史数据失败:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 手动触发数据收集
app.post('/api/collect', async (req, res) => {
  try {
    logger.info('手动触发数据收集');
    await collectAndPublishPoolData();
    res.json({ success: true, message: '数据收集已触发' });
  } catch (error) {
    logger.error('手动触发数据收集失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取单个池详情
app.get('/api/pools/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    // 首先尝试从链上获取池详情
    try {
      const chainPoolDetail = await meteoraCollector.getPoolDetailFromChain(address);
      if (chainPoolDetail) {
        // 将链上数据转换为新格式
        const formattedPoolDetail = {
          address: chainPoolDetail.address,
          name: chainPoolDetail.name || `${chainPoolDetail.tokenA}-${chainPoolDetail.tokenB}`,
          token_pair: {
            token_x: {
              address: chainPoolDetail.tokenAAddress,
              symbol: chainPoolDetail.tokenA
            },
            token_y: {
              address: chainPoolDetail.tokenBAddress,
              symbol: chainPoolDetail.tokenB
            }
          },
          tvl: chainPoolDetail.tvl || chainPoolDetail.liquidity,
          volume_24h: chainPoolDetail.volume24h,
          fees_24h: chainPoolDetail.fees24h,
          current_price: chainPoolDetail.price,
          apr: chainPoolDetail.apr,
          fee_to_tvl_ratio_24h: chainPoolDetail.tvl > 0 ? chainPoolDetail.fees24h / chainPoolDetail.tvl : 0,
          fee_structure: {
            bin_step: chainPoolDetail.binStep,
            base_fee: chainPoolDetail.feeTier.toString(),
            max_fee: (chainPoolDetail.fees?.max || 0).toString(),
            protocol_fee: "5"
          },
          is_blacklisted: false,
          hide: false,
          timestamp: chainPoolDetail.timestamp,
          reserves: {
            token_x: chainPoolDetail.reserves?.tokenA || 0,
            token_y: chainPoolDetail.reserves?.tokenB || 0
          }
        };
        return res.json({ success: true, data: formattedPoolDetail });
      }
    } catch (chainError) {
      logger.warn(`从链上获取池${address}详情失败: ${chainError.message}`);
    }
    
    // 如果链上获取失败，尝试从API获取的所有池数据中查找
    const allPools = await meteoraCollector.getAllPools();
    const poolDetail = allPools.find(pool => pool.address === address);
    
    if (!poolDetail) {
      return res.status(404).json({ success: false, error: '未找到池数据' });
    }
    
    // 处理池数据以确保格式一致
    const processedPoolDetail = meteoraCollector.processPoolData([poolDetail])[0];
    
    res.json({ success: true, data: processedPoolDetail });
  } catch (error) {
    logger.error(`获取池${req.params.address}详情失败: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取信号数据
app.get('/api/signals', async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    
    // 从数据库获取信号数据
    const signals = await Signal.find()
      .sort({ analysis_timestamp: -1 })
      .skip(Number(offset))
      .limit(Number(limit));
    
    // 获取总数
    const total = await Signal.countDocuments();
    
    res.json({
      success: true,
      data: signals,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset)
      }
    });
  } catch (error) {
    logger.error('获取信号数据失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取特定信号
app.get('/api/signals/:id', async (req, res) => {
  try {
    const signal = await Signal.findOne({ id: req.params.id });
    
    if (!signal) {
      return res.status(404).json({ success: false, error: '信号未找到' });
    }
    
    res.json({ success: true, data: signal });
  } catch (error) {
    logger.error(`获取信号 ${req.params.id} 失败:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 启动服务器
app.listen(port, async () => {
  logger.info(`数据服务已启动，监听端口${port}`);
  
  // 连接到MongoDB
  await connectToMongoDB();
  
  // 连接到RabbitMQ
  await rabbitmq.connect();
  
  // 开始消费信号队列
  await rabbitmq.consumeSignals(handleSignal);
  
  // 设置定期更新任务
  logger.info(`启动Meteora数据收集任务，间隔: ${DATA_COLLECTION_INTERVAL}ms`);
  
  // 立即执行一次数据收集
  collectAndPublishPoolData().catch(error => {
    logger.error('初始数据收集失败', { error: error.message });
  });
  
  // 设置定期更新
  setInterval(() => {
    collectAndPublishPoolData().catch(error => {
      logger.error('定期数据收集失败', { error: error.message });
    });
  }, DATA_COLLECTION_INTERVAL);
});

// 处理进程终止信号
process.on('SIGINT', async () => {
  logger.info('接收到SIGINT信号，正在关闭服务...');
  await rabbitmq.close();
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('接收到SIGTERM信号，正在关闭服务...');
  await rabbitmq.close();
  await mongoose.connection.close();
  process.exit(0);
}); 