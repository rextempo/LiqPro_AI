#!/bin/bash

# 创建必要的目录
mkdir -p production/services/data-service/src/meteora

# 复制meteora相关文件
cp src/meteora.js production/services/data-service/src/meteora/
cp src/meteora.d.ts production/services/data-service/src/meteora/
cp src/meteora-example.js production/services/data-service/src/meteora/ 2>/dev/null || :
cp src/meteora-example.d.ts production/services/data-service/src/meteora/ 2>/dev/null || :

# 创建一个简单的index.ts文件，导出meteora模块
cat > production/services/data-service/src/meteora/index.ts << 'EOF'
/**
 * Meteora DLMM 数据服务模块
 * 
 * 该模块提供了与 Meteora DLMM 池交互的功能
 */

// 导入meteora模块
import * as meteora from './meteora';

// 导出meteora模块
export default meteora;

/**
 * 启动数据收集任务
 * @param interval 数据收集间隔（毫秒）
 * @returns 数据收集任务对象
 */
export function startDataCollectionTask(interval = 300000) {
  console.log(`启动 Meteora 数据收集任务，间隔: ${interval}ms`);
  
  // 创建一个定时器，定期收集数据
  const timer = setInterval(() => {
    console.log('执行 Meteora 数据收集...');
    // 这里将调用meteora模块的方法收集数据
  }, interval);
  
  // 返回一个对象，用于控制数据收集任务
  return {
    stop: () => {
      console.log('停止 Meteora 数据收集任务');
      clearInterval(timer);
    }
  };
}
EOF

# 重启data-service容器
cd /Users/rex/Documents/LiqPro/production
docker-compose -f docker-compose-local-prod.yml restart data-service

echo "Meteora文件已复制并重启服务" 