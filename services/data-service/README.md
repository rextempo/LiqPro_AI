# LiqPro 数据服务

LiqPro 数据服务是一个用于收集、分析和监控 Solana 上 Meteora DLMM 流动性池的服务。该服务为 LiqPro 平台提供流动性池投资决策支持。

## 功能特点

- **多源数据采集**：从 Meteora API、SDK 和 Solana RPC 获取池数据
- **数据分析**：计算风险调整后的 APR、无常损失风险和综合得分
- **池筛选**：识别高活跃度池和每个交易对的最佳池
- **实时监控**：监控池数据变化和 bin 流动性分布
- **数据存储**：将分析结果保存为 CSV 文件
- **定时任务**：支持定时数据采集和分析

## 安装

1. 克隆仓库：

```bash
git clone https://github.com/yourusername/liqpro.git
cd liqpro/services/data-service
```

2. 安装依赖：

```bash
npm install
```

3. 创建 `.env` 文件并配置环境变量：

```
# Solana RPC 配置
SOLANA_RPC_ENDPOINT=https://soft-snowy-asphalt.solana-mainnet.quiknode.pro/48639631c6e4e81af5a0b8e228f6f9a0329154b7/

# 日志配置
LOG_LEVEL=info

# Meteora 配置
METEORA_UPDATE_INTERVAL=300000
```

## 使用方法

### 运行示例脚本

```bash
# 运行所有示例
node src/examples/meteora-example.js

# 仅运行特定示例
node src/examples/meteora-example.js fetch  # 获取和分析所有池数据
node src/examples/meteora-example.js details  # 获取特定池的详细信息
node src/examples/meteora-example.js monitor  # 监控池数据变化
node src/examples/meteora-example.js bins  # 监控特定池的 bin 变化
node src/examples/meteora-example.js collect  # 完整的数据采集和分析流程
node src/examples/meteora-example.js task  # 启动定时数据采集任务
```

### 在代码中使用

```javascript
import {
  initConnection,
  fetchAllPools,
  analyzePools,
  filterHighActivityPools,
  identifyBestPoolsPerPair,
  savePools,
  monitorPools
} from './src/meteora/index.js';

// 初始化连接
const connection = initConnection();

// 获取所有池数据
const poolsData = await fetchAllPools(connection);

// 分析池数据
const analyzedPools = analyzePools(poolsData);

// 筛选高活跃度池
const highActivityPools = filterHighActivityPools(analyzedPools);

// 识别最佳池
const bestPools = identifyBestPoolsPerPair(analyzedPools);

// 保存数据
await savePools(analyzedPools);

// 监控池数据变化
const monitor = monitorPools(connection, ['池地址1', '池地址2'], {
  interval: 60000, // 1 分钟
  onUpdate: (poolData, previousData, updateType, changes) => {
    console.log(`池 ${poolData.address} 数据变化`);
  }
});

// 停止监控
monitor.stop();
```

## 模块结构

- `src/meteora/index.js` - 主入口文件，导出所有功能
- `src/meteora/pools.js` - 池数据采集模块
- `src/meteora/analysis.js` - 池数据分析模块
- `src/meteora/storage.js` - 池数据存储模块
- `src/meteora/monitor.js` - 池监控模块
- `src/utils/retry.js` - 重试工具函数
- `src/utils/logger.js` - 日志工具模块
- `src/config.js` - 配置模块
- `src/examples/meteora-example.js` - 示例脚本

## 数据分析方法

### 风险调整后的 APR

风险调整后的 APR 考虑了以下因素：

- 池的交易量
- 总锁仓价值 (TVL)
- 池的年龄
- 价格波动率

### 无常损失风险

无常损失风险基于以下因素计算：

- 价格波动率
- 24 小时价格变化

### 高活跃度池筛选

高活跃度池需要满足以下条件中的至少两个：

- 24 小时交易量 >= 10,000 美元
- 总锁仓价值 >= 5,000 美元
- 24 小时费用 >= 10 美元

### 最佳池识别

对于每个交易对，选择综合得分最高的池作为最佳池。综合得分考虑了以下因素：

- 风险调整后的 APR
- 无常损失风险
- 交易量
- 总锁仓价值

## 数据存储

分析结果保存在 `data/meteora` 目录下的 CSV 文件中：

- `pools.csv` - 所有池数据
- `high_activity_pools.csv` - 高活跃度池数据
- `best_pools.csv` - 最佳池数据

## 贡献

欢迎贡献代码、报告问题或提出改进建议。请遵循以下步骤：

1. Fork 仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 许可证

[MIT](LICENSE) 