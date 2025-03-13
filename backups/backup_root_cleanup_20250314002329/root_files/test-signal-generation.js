const axios = require('axios');

// 测试数据
const testPoolData = {
  poolId: 'test-pool-1',
  address: '0x123...abc',
  tokenA: 'SOL',
  tokenB: 'USDC',
  price: 100.0,
  priceChange24h: 0.06,  // 6% 价格变化
  volume24h: 500000,     // 50万交易量
  liquidity: 5000000,    // 500万流动性
  fees24h: 1500,        // 1500美元费用
  yield24h: 0.008,      // 0.8% 收益率
  creationTime: '2024-02-01T00:00:00Z'  // 池子创建时间
};

async function testSignalGeneration() {
  try {
    console.log('开始测试信号生成...');
    
    // 1. 发送池数据到 data-service
    console.log('发送池数据到 data-service...');
    const dataServiceResponse = await axios.post(
      'http://localhost:3005/api/test/publish-pool-data-with-signal',
      testPoolData
    );
    console.log('data-service 响应:', dataServiceResponse.data);
    
    // 2. 等待3秒，让信号生成完成
    console.log('等待信号生成...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 3. 从 signal-service 获取生成的信号
    console.log('从 signal-service 获取信号...');
    const signalServiceResponse = await axios.get('http://localhost:3007/api/signals');
    console.log('signal-service 响应:', JSON.stringify(signalServiceResponse.data, null, 2));
    
    return {
      success: true,
      dataServiceResponse: dataServiceResponse.data,
      signals: signalServiceResponse.data
    };
  } catch (error) {
    console.error('测试失败:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// 运行测试
testSignalGeneration()
  .then(result => {
    console.log('测试完成:', result);
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('测试执行错误:', error);
    process.exit(1);
  }); 