/**
 * LiqPro Data Service
 * 
 * 数据服务负责从各种来源收集数据，包括 Meteora DLMM 池，
 * 并提供 API 端点供其他服务访问这些数据。
 */

const express = require('express');
const { startDataCollectionTask } = require('./meteora');

// 配置
const PORT = process.env.PORT || 3000;
const DATA_COLLECTION_INTERVAL = parseInt(process.env.DATA_COLLECTION_INTERVAL || '300000', 10); // 默认 5 分钟

// 创建 Express 应用
const app = express();

// 中间件
app.use(express.json());

// 路由
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'data-service' });
});

app.get('/api/v1/meteora/pools', (req, res) => {
  // 这里将从数据库返回池数据
  // 目前返回模拟数据
  res.status(200).json({
    status: 'success',
    data: {
      pools: [
        {
          address: '8JUjWjAyXTMB4ZXs1sNv3jfcuPoRRpS7vJ7GQgJiKTmJ',
          name: 'SOL-USDC',
          tokenX: 'SOL',
          tokenY: 'USDC',
          liquidity: 1000000,
          volume24h: 500000,
          fee: 0.05
        },
        {
          address: '6UczejMUv1tzdvUzKpULKHxrK9sqLmjgUZ8nqXUj7UZv',
          name: 'BTC-USDC',
          tokenX: 'BTC',
          tokenY: 'USDC',
          liquidity: 2000000,
          volume24h: 800000,
          fee: 0.03
        }
      ],
      timestamp: Date.now()
    }
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误', err);
  res.status(500).json({
    status: 'error',
    message: '服务器内部错误'
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`数据服务已启动，监听端口 ${PORT}`);
  
  // 启动数据收集任务
  console.log(`启动 Meteora 数据收集任务，间隔: ${DATA_COLLECTION_INTERVAL}ms`);
  const dataCollectionTask = startDataCollectionTask(DATA_COLLECTION_INTERVAL);
  
  // 优雅关闭
  process.on('SIGTERM', () => {
    console.log('收到 SIGTERM 信号，正在关闭服务...');
    dataCollectionTask.stop();
    process.exit(0);
  });
  
  process.on('SIGINT', () => {
    console.log('收到 SIGINT 信号，正在关闭服务...');
    dataCollectionTask.stop();
    process.exit(0);
  });
});
