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

// 收集并发布池数据
async function collectAndPublishPoolData() {
  try {
    logger.info('开始收集高活跃度池数据');
    
    // 添加重试逻辑
    let retries = 0;
    const maxRetries = 3;
    let pools = null;
    
    while (retries < maxRetries && (!pools || pools.length === 0)) {
      try {
        pools = await meteoraCollector.getHighActivityPools(100);
        
        if (!pools || pools.length === 0) {
          logger.warn(`尝试 ${retries + 1}/${maxRetries}: 未找到高活跃度池数据`);
          retries++;
          
          if (retries < maxRetries) {
            // 指数退避重试
            const delay = Math.pow(2, retries) * 1000;
            logger.info(`等待 ${delay}ms 后重试...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      } catch (error) {
        logger.error(`尝试 ${retries + 1}/${maxRetries}: 获取池数据失败:`, error);
        retries++;
        
        if (retries < maxRetries) {
          // 指数退避重试
          const delay = Math.pow(2, retries) * 1000;
          logger.info(`等待 ${delay}ms 后重试...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    if (!pools || pools.length === 0) {
      logger.error('在多次尝试后仍未找到高活跃度池数据');
      return;
    }
    
    logger.info(`成功收集 ${pools.length} 个高活跃度池数据`);
    
    // 记录一些样本数据，用于调试
    if (pools.length > 0) {
      const samplePool = pools[0];
      logger.info('样本池数据:', {
        address: samplePool.address,
        tokenA: samplePool.tokenA,
        tokenB: samplePool.tokenB,
        liquidity: samplePool.liquidity,
        volume24h: samplePool.volume24h
      });
    }
    
    // 保存到MongoDB
    try {
      // 批量操作，使用upsert确保不重复
      const bulkOps = pools.map(pool => ({
        updateOne: {
          filter: { poolAddress: pool.address },
          update: {
            $set: {
              poolAddress: pool.address,
              tokenA: pool.tokenA,
              tokenB: pool.tokenB,
              tokenAAddress: pool.tokenAAddress,
              tokenBAddress: pool.tokenBAddress,
              timestamp: new Date(),
              liquidity: pool.liquidity,
              volume24h: pool.volume24h,
              fees24h: pool.fees24h,
              price: pool.price,
              binStep: pool.binStep,
              feeTier: pool.feeTier,
              apr: pool.yields?.apr || pool.apr,
              tvl: pool.liquidity,
              metadata: {
                reserves: pool.reserves,
                fees: pool.fees,
                yields: pool.yields,
                name: pool.name
              }
            }
          },
          upsert: true
        }
      }));
      
      const result = await PoolData.bulkWrite(bulkOps);
      logger.info(`成功保存 ${result.upsertedCount} 个新池数据，更新 ${result.modifiedCount} 个现有池数据`);
    } catch (dbError) {
      logger.error('保存池数据到MongoDB失败:', dbError);
    }
    
    // 发布到RabbitMQ
    try {
      await rabbitmq.publishToQueue('pool_data_queue', pools);
      logger.info(`已发布 ${pools.length} 个池数据到RabbitMQ`);
    } catch (mqError) {
      logger.error('发布池数据到RabbitMQ失败:', mqError);
    }
  } catch (error) {
    logger.error('收集和发布池数据失败:', error);
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
    const pools = await meteoraCollector.getHighActivityPools(limit);
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
    const poolDetail = await meteoraCollector.getPoolDetail(address);
    res.json({ success: true, data: poolDetail });
  } catch (error) {
    logger.error(`获取池${req.params.address}详情失败:`, error);
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