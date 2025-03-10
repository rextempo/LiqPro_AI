# Meteora DLMM 池子分析工具

这个工具用于获取和分析 Solana 上 Meteora DLMM 流动性池的数据，帮助用户找到最佳的 LP 投资机会。

## 功能

1. 从多个来源获取 Meteora DLMM 池数据：
   - Meteora API
   - Meteora DLMM SDK
   - Solana RPC

2. 分析池子数据，计算关键指标：
   - 交易量和 TVL
   - 费用收入和费用率
   - 无常损失风险
   - 风险调整后的 APR
   - 综合评分

3. 筛选高活跃度池子，并识别每个交易对中最佳的池子

4. 将分析结果保存为 CSV 文件，方便进一步分析

## 安装

首先，安装必要的依赖：

```bash
npm install @meteora-ag/dlmm @coral-xyz/anchor @solana/web3.js node-fetch fs path
```

## 使用方法

运行分析脚本：

```bash
node pool-analyzer.js
```

脚本会生成三个 CSV 文件：

1. `meteora_all_pools_[timestamp].csv` - 所有池子的数据
2. `meteora_high_activity_pools_[timestamp].csv` - 高活跃度池子的数据
3. `meteora_best_pools_[timestamp].csv` - 每个交易对中最佳的池子数据

## 分析方法

### 数据获取

脚本尝试从多个来源获取池子数据，优先使用 Meteora API，如果 API 不可用，则使用 Meteora DLMM SDK 或 Solana RPC。

### 指标计算

- **无常损失风险**：基于 binStep 和价格波动性计算
- **估计 APR**：基于 24 小时费用收入和 TVL 计算
- **风险调整后的 APR**：考虑无常损失风险后的 APR
- **综合评分**：基于风险调整后的 APR 计算

### 池子筛选

脚本使用以下条件筛选高活跃度池子：

- TVL >= 1000
- 24 小时交易量 >= 100
- 费用/TVL 比率 >= 0.0001

## 输出示例

```
前 10 个最佳 LP 投资机会:
1. BITDOG-SOL: 风险调整 APR 74858499323.23%, 无常损失风险 0.20, 评分 37429249661.62
2. MELANIA-SOL: 风险调整 APR 14566361869.11%, 无常损失风险 0.40, 评分 7283180934.56
3. TRUMPLEY-SOL: 风险调整 APR 4870840602.62%, 无常损失风险 0.50, 评分 2435420301.31
4. DRIDDY-SOL: 风险调整 APR 2343085413.21%, 无常损失风险 0.20, 评分 1171542706.61
5. WIF-SOL: 风险调整 APR 1767954360.74%, 无常损失风险 0.40, 评分 883977180.37
...
```

## 注意事项

- APR 数值可能非常高，这通常是由于新池子的交易量突然增加或 TVL 较低导致的
- 无常损失风险是基于 binStep 估算的，实际风险可能因市场条件而异
- 在做投资决策前，请进行充分的研究和风险评估

## 进一步改进

- 添加历史数据分析，以识别稳定的高收益池子
- 实现自动化投资策略，定期再平衡 LP 仓位
- 添加更多风险指标，如价格波动性和流动性深度
- 集成其他 DEX 的数据，进行跨平台比较 