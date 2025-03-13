const meteora = require('./src/meteora/meteora');
function startDataCollectionTask(interval = 300000) {
  console.log(`启动 Meteora 数据收集任务，间隔: ${interval}ms`);
  const collector = new meteora.MeteoraPoolCollector('https://api.mainnet-beta.solana.com');
  const timer = setInterval(async () => {
    console.log('执行 Meteora 数据收集...');
    try {
      const pools = await collector.fetchPools();
      console.log(`获取到 ${pools.length} 个池`);
    } catch (error) {
      console.error('数据收集失败:', error);
    }
  }, interval);
  return {
    stop: () => {
      console.log('停止 Meteora 数据收集任务');
      clearInterval(timer);
    }
  };
}
module.exports = { startDataCollectionTask };
