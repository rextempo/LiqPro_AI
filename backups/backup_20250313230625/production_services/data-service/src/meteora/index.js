/**
 * Meteora DLMM 数据服务模块
 */

const meteora = require('./meteora');

/**
 * 启动数据收集任务
 * @param {number} interval 数据收集间隔（毫秒）
 * @returns 数据收集任务对象
 */
function startDataCollectionTask(interval = 300000) {
  console.log(`启动 Meteora 数据收集任务，间隔: ${interval}ms`);
  
  // 创建一个 MeteoraPoolCollector 实例
  const collector = new meteora.MeteoraPoolCollector('https://api.mainnet-beta.solana.com');
  
  // 创建一个定时器，定期收集数据
  const timer = setInterval(async () => {
    console.log('执行 Meteora 数据收集...');
    try {
      const pools = await collector.fetchPools();
      console.log(`获取到 ${pools.length} 个池`);
    } catch (error) {
      console.error('数据收集失败:', error);
    }
  }, interval);
  
  // 返回一个对象，用于控制数据收集任务
  return {
    stop: () => {
      console.log('停止 Meteora 数据收集任务');
      clearInterval(timer);
    }
  };
}

module.exports = {
  startDataCollectionTask
};
