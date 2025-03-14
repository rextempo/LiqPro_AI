const express = require('express');
const amqp = require('amqplib');
const { v4: uuidv4 } = require('uuid');

// 创建 Express 应用
const app = express();
const PORT = process.env.PORT || 3002;

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 信号存储
const signals = new Map();

// RabbitMQ 配置
const RABBITMQ_HOST = process.env.RABBITMQ_HOST || 'rabbitmq';
const RABBITMQ_PORT = process.env.RABBITMQ_PORT || '5672';
const RABBITMQ_USER = process.env.RABBITMQ_USER || 'liqpro';
const RABBITMQ_PASS = process.env.RABBITMQ_PASS || 'liqpro_password';

// 队列名称
const POOL_DATA_QUEUE = 'pool_data_queue';
const SIGNAL_QUEUE = 'signal_queue';

// 连接 URL
const connectionURL = `amqp://${RABBITMQ_USER}:${RABBITMQ_PASS}@${RABBITMQ_HOST}:${RABBITMQ_PORT}`;

// 连接和通道
let connection = null;
let channel = null;

// 工具函数
function calculateStandardDeviation(values) {
  const avg = calculateAverage(values);
  const squareDiffs = values.map(value => Math.pow(value - avg, 2));
  const avgSquareDiff = calculateAverage(squareDiffs);
  return Math.sqrt(avgSquareDiff);
}

function calculateAverage(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function calculateCoefficientOfVariation(values) {
  const avg = calculateAverage(values);
  if (avg === 0) return 0;
  const stdDev = calculateStandardDeviation(values);
  return stdDev / avg;
}

function calculateDailyChangeRate(values) {
  if (values.length < 2) return 0;
  
  let totalChangeRate = 0;
  for (let i = 1; i < values.length; i++) {
    const prevValue = values[i-1];
    if (prevValue === 0) continue;
    
    const changeRate = Math.abs((values[i] - prevValue) / prevValue);
    totalChangeRate += changeRate;
  }
  
  return totalChangeRate / (values.length - 1);
}

function mapToScore(value, minValue, maxValue, minScore, maxScore) {
  if (value <= minValue) return minScore;
  if (value >= maxValue) return maxScore;
  
  const valueRange = maxValue - minValue;
  const scoreRange = maxScore - minScore;
  
  return minScore + ((value - minValue) / valueRange) * scoreRange;
}

// 评分系统函数
function calculateBasePerformanceScore(pool) {
  // 流动性评分 (35%) - 优化范围和权重
  const liquidityScore = mapToScore(
    pool.liquidity || 0,
    50000,     // 最小有效流动性降低到5万
    100000000, // 最高流动性提升到1亿
    0,         // 最低分
    100        // 最高分
  );
  
  // 交易量评分 (35%) - 优化范围
  const volumeScore = mapToScore(
    pool.volume24h || 0,
    5000,      // 最小有效交易量降低到5千
    50000000,  // 最高交易量调整到5千万
    0,         // 最低分
    100        // 最高分
  );
  
  // 费用收益评分 (30%) - 提高权重
  const feesScore = mapToScore(
    pool.fees24h || 0,
    50,       // 最小有效费用降低到50
    200000,   // 最高费用提升到20万
    0,        // 最低分
    100       // 最高分
  );
  
  // 计算加权总分
  const weightedScore = 
    liquidityScore * 0.35 +
    volumeScore * 0.35 +
    feesScore * 0.30;
  
  return {
    liquidityScore,
    volumeScore,
    feesScore,
    finalScore: weightedScore,
    details: {
      liquidity: pool.liquidity || 0,
      volume24h: pool.volume24h || 0,
      fees24h: pool.fees24h || 0
    }
  };
}

function calculateStabilityScore(pool) {
  // 基于当前数据计算保守的稳定性评分
  const baseScore = calculateBasePerformanceScore(pool).finalScore;
  const conservativeScore = Math.min(70, baseScore * 0.7);  // 最高保守分数为70
  
  // 计算简单的价格稳定性 (基于当前价格变化)
  const priceVolatility = pool.priceChange24h ? Math.min(100, 100 - Math.abs(pool.priceChange24h) * 100) : 50;
  
  // 计算简单的收益稳定性 (基于当前APR)
  const yieldStability = pool.apr ? Math.min(100, 100 - (pool.apr > 100 ? 50 : 0)) : 50;
  
  // 计算简单的交易量一致性 (基于当前交易量)
  const volumeConsistency = pool.volume24h ? Math.min(100, pool.volume24h > 10000 ? 80 : 50) : 40;
  
  // 计算简单的流动性稳定性 (基于当前流动性)
  const liquidityStability = pool.liquidity ? Math.min(100, pool.liquidity > 50000 ? 80 : 50) : 40;
  
  // 计算加权总分
  const stabilityScore = (
    priceVolatility * 0.4 +
    yieldStability * 0.3 +
    volumeConsistency * 0.2 +
    liquidityStability * 0.1
  );
  
  return {
    priceVolatility,
    yieldStability,
    volumeConsistency,
    liquidityStability,
    stabilityScore,
    dataCompleteness: 1  // 由于使用当前数据，完整性设为1
  };
}

function calculateRiskScore(pool) {
  // 基础风险评估
  const baseRisk = calculateBaseRiskScore(pool);
  
  // 计算高级风险指标
  const advancedRisk = {
    // 价格趋势风险 (基于24小时价格变化)
    priceTrendRisk: pool.priceChange24h ? Math.min(100, Math.abs(pool.priceChange24h) * 200) : 50,
    
    // 流动性集中度风险 (基于当前流动性)
    liquidityConcentrationRisk: pool.liquidity ? Math.max(0, 100 - (pool.liquidity / 100000)) : 70,
    
    // 交易对相关性风险 (使用保守估计)
    correlationRisk: 50,
    
    // 计算高级风险评分
    advancedRiskScore: 0  // 将在下面计算
  };
  
  // 计算高级风险评分
  advancedRisk.advancedRiskScore = (
    advancedRisk.priceTrendRisk * 0.4 +
    advancedRisk.liquidityConcentrationRisk * 0.3 +
    advancedRisk.correlationRisk * 0.3
  );
  
  // 综合评分 (60% 基础风险 + 40% 高级风险)
  return {
    ...baseRisk,
    ...advancedRisk,
    finalRiskScore: baseRisk.baseRiskScore * 0.6 + advancedRisk.advancedRiskScore * 0.4
  };
}

// 新增：计算波动性评分
function calculateVolatilityScore(values) {
  const volatility = calculateCoefficientOfVariation(values);
  return mapToScore(volatility, 0.5, 0, 0, 100);  // 波动性越低分数越高
}

// 新增：计算收益稳定性评分
function calculateYieldStabilityScore(historicalData) {
  const yields = historicalData.map(d => d.yield24h || 0);
  const yieldVolatility = calculateCoefficientOfVariation(yields);
  return mapToScore(yieldVolatility, 0.3, 0, 0, 100);  // 收益波动性越低分数越高
}

// 新增：计算一致性评分
function calculateConsistencyScore(values) {
  const changeRate = calculateDailyChangeRate(values);
  return mapToScore(changeRate, 0.3, 0, 0, 100);  // 变化率越低分数越高
}

// 新增：计算基础风险评分
function calculateBaseRiskScore(pool) {
  // 价格风险 (35%)
  const priceRisk = pool.priceChange24h ? Math.abs(pool.priceChange24h) * 50 : 50;
  
  // 流动性风险 (35%)
  const liquidityRisk = pool.liquidity ? mapToScore(pool.liquidity, 50000, 100000000, 100, 0) : 70;
  
  // 池子年龄风险 (30%)
  const ageRisk = pool.creationTime 
    ? mapToScore(
        (Date.now() - new Date(pool.creationTime).getTime()) / (1000 * 60 * 60 * 24),
        1,     // 最小天数要求降低到1天
        14,    // 理想天数要求调整到14天
        100,   // 新池子高风险
        20     // 老池子低风险
      )
    : 80;
  
  const baseRiskScore = 
    priceRisk * 0.35 +
    liquidityRisk * 0.35 +
    ageRisk * 0.30;
  
  return {
    priceRisk,
    liquidityRisk,
    ageRisk,
    baseRiskScore
  };
}

/**
 * 设置 RabbitMQ 连接和通道
 */
const setupRabbitMQ = async () => {
  try {
    console.log('正在连接到 RabbitMQ...');
    console.log(`RabbitMQ 连接 URL: amqp://${RABBITMQ_USER}:***@${RABBITMQ_HOST}:${RABBITMQ_PORT}`);
    
    // 创建连接
    connection = await amqp.connect(connectionURL);
    console.log('RabbitMQ 连接成功');
    
    // 处理连接关闭
    connection.on('close', () => {
      console.warn('RabbitMQ 连接已关闭，尝试重新连接...');
      setTimeout(setupRabbitMQ, 5000);
    });
    
    // 创建通道
    channel = await connection.createChannel();
    console.log('RabbitMQ 通道创建成功');
    
    // 确保队列存在
    await channel.assertQueue(POOL_DATA_QUEUE, { durable: true });
    await channel.assertQueue(SIGNAL_QUEUE, { durable: true });
    console.log(`队列 ${POOL_DATA_QUEUE} 和 ${SIGNAL_QUEUE} 已确认`);
    
    // 设置消费者
    await setupConsumers();
    
    console.log('RabbitMQ 设置完成');
    return true;
  } catch (error) {
    console.error('RabbitMQ 设置失败:', error);
    return false;
  }
};

/**
 * 设置消息消费者
 */
const setupConsumers = async () => {
  if (!channel) {
    throw new Error('RabbitMQ 通道未初始化');
  }
  
  // 消费池数据队列
  channel.consume(POOL_DATA_QUEUE, async (msg) => {
    if (msg) {
      try {
        const content = msg.content.toString();
        console.log(`收到池数据消息: ${content.substring(0, 100)}...`);
        
        // 处理池数据
        await processPoolData(JSON.parse(content));
        
        // 确认消息
        channel.ack(msg);
      } catch (error) {
        console.error('处理池数据消息失败:', error);
        // 拒绝消息并重新排队
        channel.nack(msg, false, true);
      }
    }
  });
  
  console.log(`已设置 ${POOL_DATA_QUEUE} 队列的消费者`);
};

/**
 * 发布信号到队列
 */
const publishSignal = async (signal) => {
  if (!channel) {
    console.warn('RabbitMQ 通道未初始化，无法发布信号');
    return;
  }
  
  try {
    const message = JSON.stringify(signal);
    channel.publish('', SIGNAL_QUEUE, Buffer.from(message));
    console.log(`信号已发布到 ${SIGNAL_QUEUE} 队列`);
  } catch (error) {
    console.error('发布信号失败:', error);
  }
};

/**
 * 处理池数据并生成信号
 */
const processPoolData = async (poolData) => {
  try {
    // 检查消息格式
    if (poolData.type === 'pool_data' && Array.isArray(poolData.data)) {
      // 使用data字段中的池数据
      const pools = poolData.data;
      
      console.log(`收到数组格式的池数据，包含 ${pools.length} 个池`);
      
      // 处理所有池数据并生成分级信号
      await generateTieredSignals(pools);
    } else if (poolData.type === 'pool_data' && poolData.data) {
      // 如果data不是数组但存在，则视为单个池数据
      console.log(`收到单个池数据对象: ${poolData.data.id || poolData.data.address || 'unknown'}`);
      
      // 创建一个只包含这个池的数组
      await generateTieredSignals([poolData.data]);
    } else if (Array.isArray(poolData)) {
      // 兼容直接发送数组格式的情况
      console.log(`收到数组格式的池数据，包含 ${poolData.length} 个池`);
      
      // 处理所有池数据并生成分级信号
      await generateTieredSignals(poolData);
    } else {
      // 兼容直接发送单个池数据的情况
      console.log(`收到单个池数据: ${poolData.id || poolData.address || 'unknown'}`);
      
      // 创建一个只包含这个池的数组
      await generateTieredSignals([poolData]);
    }
  } catch (error) {
    console.error('处理池数据失败:', error);
  }
};

/**
 * 生成分级信号（T1、T2、T3）
 */
const generateTieredSignals = async (poolsData) => {
  try {
    console.log(`开始为 ${poolsData.length} 个池生成分级信号`);
    
    // 计算每个池的评分
    const poolsWithScores = [];
    
    for (const pool of poolsData) {
      try {
        const poolId = pool.id || pool.address || 'unknown';
        const tokenA = pool.tokenA || pool.tokenX || 'Unknown';
        const tokenB = pool.tokenB || pool.tokenY || 'Unknown';
        
        console.log(`计算池 ${poolId} 的评分`);
        
        // 计算性能评分
        const performanceScore = calculateBasePerformanceScore(pool);
        
        // 计算稳定性评分 (不再需要历史数据)
        const stabilityScore = calculateStabilityScore(pool);
        
        // 计算风险评分 (不再需要历史数据)
        const riskScore = calculateRiskScore(pool);
        
        // 计算最终评分 (40% 性能 + 40% 稳定性 + 20% 风险)
        const finalScore = (
          performanceScore.finalScore * 0.4 + 
          stabilityScore.stabilityScore * 0.4 + 
          (100 - riskScore.finalRiskScore) * 0.2
        );
        
        // 添加到池数组
        poolsWithScores.push({
          pool,
          poolId,
          tokenA,
          tokenB,
          performanceScore,
          stabilityScore,
          riskScore,
          finalScore
        });
      } catch (error) {
        console.error(`计算池 ${pool.id || pool.address || 'unknown'} 评分失败:`, error);
      }
    }
    
    // 按最终评分排序
    poolsWithScores.sort((a, b) => b.finalScore - a.finalScore);
    
    console.log(`已计算 ${poolsWithScores.length} 个池的评分并排序`);
    
    // 选择T1、T2、T3池子
    const t1Count = Math.min(3, poolsWithScores.length);
    const t2Count = Math.min(5, poolsWithScores.length - t1Count);
    const t3Count = Math.min(7, poolsWithScores.length - t1Count - t2Count);
    
    const t1Pools = poolsWithScores.slice(0, t1Count);
    const t2Pools = poolsWithScores.slice(t1Count, t1Count + t2Count);
    const t3Pools = poolsWithScores.slice(t1Count + t2Count, t1Count + t2Count + t3Count);
    
    console.log(`已选择 ${t1Pools.length} 个T1池子, ${t2Pools.length} 个T2池子, ${t3Pools.length} 个T3池子`);
    
    // 创建信号对象
    const signalId = uuidv4();
    const signal = createTieredSignal(t1Pools, t2Pools, t3Pools);
    
    // 设置信号ID
    signal.id = signalId;
    
    // 存储信号
    signals.set(signalId, signal);
    
    // 发布信号到队列
    await publishSignal(signal);
    
    console.log(`分级信号已生成并发布: ${signalId}`);
  } catch (error) {
    console.error('生成分级信号失败:', error);
  }
};

/**
 * 创建分级信号对象
 */
const createTieredSignal = (t1Pools, t2Pools, t3Pools) => {
  // 确定市场状况
  const marketCondition = determineMarketCondition(t1Pools);
  
  // 创建信号对象
  return {
    analysis_timestamp: new Date().toISOString(),
    market_condition: marketCondition,
    t1_pools: t1Pools.map(poolData => formatPoolData(poolData, 'T1')),
    t2_pools: t2Pools.map(poolData => formatPoolData(poolData, 'T2')),
    t3_pools: t3Pools.map(poolData => formatPoolData(poolData, 'T3'))
  };
};

/**
 * 确定市场状况
 */
const determineMarketCondition = (topPools) => {
  // 分析顶级池子的价格变化来确定趋势
  let priceChangeSum = 0;
  let volatilitySum = 0;
  let count = 0;
  
  for (const poolData of topPools) {
    const pool = poolData.pool;
    if (pool.priceChange24h) {
      priceChangeSum += pool.priceChange24h;
      volatilitySum += Math.abs(pool.priceChange24h);
      count++;
    }
  }
  
  // 确定趋势
  let trend = '稳定';
  if (count > 0) {
    const avgPriceChange = priceChangeSum / count;
    if (avgPriceChange > 0.03) trend = '上升';
    else if (avgPriceChange < -0.03) trend = '下降';
  }
  
  // 确定波动性
  let volatility = '低';
  if (count > 0) {
    const avgVolatility = volatilitySum / count;
    if (avgVolatility > 0.1) volatility = '高';
    else if (avgVolatility > 0.05) volatility = '中等';
  }
  
  return {
    trend,
    volatility
  };
};

/**
 * 格式化池数据为所需格式
 */
const formatPoolData = (poolData, tier) => {
  const pool = poolData.pool;
  const performanceScore = poolData.performanceScore;
  const stabilityScore = poolData.stabilityScore;
  const riskScore = poolData.riskScore;
  const finalScore = poolData.finalScore;
  
  // 确定代币地址
  const tokenXAddress = pool.tokenAAddress || 'unknown';
  const tokenYAddress = pool.tokenBAddress || 'unknown';
  
  // 确定价格区间
  const currentPrice = pool.price || pool.currentPrice || 0;
  const priceRangePercentage = stabilityScore.priceVolatility > 0.1 ? 0.08 : 0.05;
  
  // 确定仓位大小建议
  let positionSize = '中';
  if (finalScore > 80) positionSize = '高';
  else if (finalScore < 60) positionSize = '低';
  
  // 确定分布类型
  let distributionType = '平衡';
  if (stabilityScore.priceVolatility < 0.05) distributionType = '集中式';
  else if (stabilityScore.priceVolatility > 0.1) distributionType = '分散式';
  
  return {
    pool_address: poolData.poolId,
    name: `${poolData.tokenA}-${poolData.tokenB}`,
    token_pair: {
      token_x: {
        symbol: poolData.tokenA,
        address: tokenXAddress
      },
      token_y: {
        symbol: poolData.tokenB,
        address: tokenYAddress
      }
    },
    metrics: {
      liquidity: pool.liquidity || 0,
      volume_24h: pool.volume24h || 0,
      fees_24h: pool.fees24h || 0,
      daily_yield: pool.yield24h || 0,
      active_bin: {
        binId: pool.currentBinId || 0,
        price: String(currentPrice),
        pricePerToken: String(currentPrice)
      }
    },
    liquidity_distribution: {
      effective_liquidity_ratio: 0.85, // 默认值，实际应从池数据计算
      distribution_type: distributionType
    },
    fee_info: {
      base_fee: `${(pool.feeTier || 0.1).toFixed(1)}%`,
      max_fee: "10%", // 默认值
      current_dynamic_fee: `${((pool.feeTier || 0.1) * 1.5).toFixed(2)}%`
    },
    stability_metrics: {
      price_volatility: stabilityScore.priceVolatility || 0,
      yield_stability: stabilityScore.yieldStability || 0,
      stability_score: stabilityScore.stabilityScore
    },
    risk_metrics: {
      price_risk: riskScore.priceRisk,
      liquidity_risk: riskScore.liquidityRisk,
      overall_risk: riskScore.finalRiskScore
    },
    scores: {
      base_performance_score: performanceScore.finalScore,
      liquidity_distribution_score: performanceScore.liquidityScore * 100,
      fee_efficiency_score: performanceScore.feesScore,
      stability_score: stabilityScore.stabilityScore,
      risk_score: riskScore.finalRiskScore,
      final_score: finalScore
    },
    recommendation: {
      position_size: positionSize,
      price_range: {
        min: currentPrice * (1 - priceRangePercentage),
        max: currentPrice * (1 + priceRangePercentage),
        current: currentPrice,
        optimal_range_percentage: priceRangePercentage * 100
      },
      bin_distribution: distributionType,
      bin_step: pool.binStep || 50
    },
    tier: tier
  };
};

// 健康检查路由
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'signal-service' });
});

// API 路由
app.get('/api/signals', async (req, res) => {
  try {
    // 获取所有信号并按时间戳排序，最新的排在前面
    const allSignals = Array.from(signals.values());
    allSignals.sort((a, b) => {
      const dateA = new Date(a.analysis_timestamp || a.timestamp);
      const dateB = new Date(b.analysis_timestamp || b.timestamp);
      return dateB - dateA; // 降序排列，最新的在前
    });
    
    res.status(200).json(allSignals);
  } catch (error) {
    console.error('获取信号失败:', error);
    res.status(500).json({ error: '获取信号失败' });
  }
});

app.get('/api/signals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const signal = signals.get(id);
    
    if (signal) {
      res.status(200).json(signal);
    } else {
      res.status(404).json({ error: '信号未找到' });
    }
  } catch (error) {
    console.error('获取特定信号失败:', error);
    res.status(500).json({ error: '获取特定信号失败' });
  }
});

// 添加一个测试路由，用于发布测试信号
app.post('/api/test/publish-signal', async (req, res) => {
  try {
    const testSignal = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      poolId: 'test-pool',
      tokenA: 'SOL',
      tokenB: 'USDC',
      action: 'BUY',
      confidence: 0.8,
      price: 100.0,
      reason: '测试信号',
      metadata: {
        test: true
      }
    };
    
    // 存储信号
    signals.set(testSignal.id, testSignal);
    
    // 发布信号到队列
    if (channel) {
      await publishSignal(testSignal);
      res.status(200).json({ success: true, message: '测试信号已发布', signal: testSignal });
    } else {
      res.status(500).json({ success: false, message: 'RabbitMQ未连接，无法发布信号' });
    }
  } catch (error) {
    console.error('发布测试信号失败:', error);
    res.status(500).json({ error: '发布测试信号失败' });
  }
});

// 清理过期信号
const cleanupExpiredSignals = () => {
  const now = new Date();
  let cleanupCount = 0;
  
  signals.forEach((signal, id) => {
    const signalDate = new Date(signal.timestamp);
    const ageInHours = (now.getTime() - signalDate.getTime()) / (1000 * 60 * 60);
    
    // 删除超过24小时的信号
    if (ageInHours > 24) {
      signals.delete(id);
      cleanupCount++;
    }
  });
  
  if (cleanupCount > 0) {
    console.log(`已清理 ${cleanupCount} 个过期信号`);
  }
};

// 设置定期清理过期信号的间隔
const cleanupInterval = setInterval(cleanupExpiredSignals, 3600000); // 每小时清理一次

// 启动服务器
const startServer = async () => {
  try {
    console.log('信号服务启动中...');
    console.log(`环境变量: PORT=${PORT}, RABBITMQ_HOST=${RABBITMQ_HOST}, RABBITMQ_USER=${RABBITMQ_USER}`);
    
    // 设置 RabbitMQ
    const rabbitConnected = await setupRabbitMQ();
    if (!rabbitConnected) {
      console.warn('RabbitMQ 连接失败，但服务将继续运行');
    }
    
    // 启动 HTTP 服务器
    app.listen(PORT, () => {
      console.log(`信号服务运行在端口 ${PORT}`);
    });
    
    console.log('信号服务已启动');
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
};

// 处理进程终止信号
process.on('SIGINT', async () => {
  console.log('接收到 SIGINT 信号，正在关闭服务...');
  clearInterval(cleanupInterval);
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('接收到 SIGTERM 信号，正在关闭服务...');
  clearInterval(cleanupInterval);
  process.exit(0);
});

// 启动服务器
startServer(); 