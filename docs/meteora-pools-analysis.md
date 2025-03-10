# Meteora DLMM 池子分析报告

## 概述

- 分析时间：2024年3月
- 总池子数量：71,912
- 分析重点：SOL-USDC 和 USDC-USDT 交易对

## API 数据结构

### Pool 数据结构

```typescript
interface MeteoraPool {
  // 基本信息
  address: string; // 池子地址
  name: string; // 池子名称 (例如: "SOL-USDC")
  mint_x: string; // X token 的 mint 地址
  mint_y: string; // Y token 的 mint 地址
  reserve_x: string; // X token 的储备账户地址
  reserve_y: string; // Y token 的储备账户地址

  // 储备量
  reserve_x_amount: number; // X token 储备量
  reserve_y_amount: number; // Y token 储备量

  // 费用配置
  bin_step: number; // bin 步长
  base_fee_percentage: string; // 基础费率
  max_fee_percentage: string; // 最大费率
  protocol_fee_percentage: string; // 协议费率

  // 池子状态
  liquidity: string; // 总流动性（美元）
  fees_24h: number; // 24小时费用收入
  trade_volume_24h: number; // 24小时交易量
  current_price: number; // 当前价格
  apr: number; // 年化收益率
  apy: number; // 年化收益率（复利）

  // 其他
  hide: boolean; // 是否隐藏
  is_blacklisted: boolean; // 是否被列入黑名单
}
```

### 示例数据

```json
{
  "address": "87ZMcNTXbG9q8Hy2sSHu1kx3fanHPaW1KfhaQPcbMG8P",
  "name": "TRUMP-SOL",
  "mint_x": "HaP8r3ksG76PhQLTqR8FYBeNiQpejcFbQmiHbg787Ut1",
  "mint_y": "So11111111111111111111111111111111111111112",
  "reserve_x": "CQ364UaiDKmTfbroRxuZdMCYdSWVVh7FNZ39g8Hk4yMQ",
  "reserve_y": "7fs9dXB9pXXazBQ4beYsFeGGnbRMbp7Zn2DPKhPYLs9G",
  "reserve_x_amount": 17489602728,
  "reserve_y_amount": 79453721,
  "bin_step": 200,
  "base_fee_percentage": "2",
  "max_fee_percentage": "8.75",
  "protocol_fee_percentage": "5",
  "liquidity": "70.364453696381",
  "fees_24h": 0.06635212044351602,
  "trade_volume_24h": 3.438880165950024,
  "current_price": 0.0025642964081894247,
  "apr": 0.09429778383531832,
  "apy": 41.06135232585682,
  "hide": false,
  "is_blacklisted": false
}
```

### SDK 数据结构

#### Active Bin 数据

```typescript
interface ActiveBin {
  binId: number; // bin ID
  price: BN; // 价格（以 lamports 为单位）
  xAmount: BN; // X token 数量
  yAmount: BN; // Y token 数量
}
```

#### Fee Info 数据

```typescript
interface FeeInfo {
  baseFeeRatePercentage: number; // 基础费率
  maxFeeRatePercentage: number; // 最大费率
  protocolFeePercentage: number; // 协议费率
}
```

## 主要池子分析

### 1. USDC-USDT (bin step: 1)

- **基本信息**

  - 流动性 (TVL): $0.004
  - 24小时交易量: $0
  - 年化收益率 (APY): 0%

- **费用结构**

  - 基础费率: 0.01%
  - 最大费率: 10%
  - 协议费率: 5%
  - 当前动态费率: 0.0001%

- **价格信息**
  - 当前价格: 1.0005 USDT/USDC
  - 活跃 bin ID: -69076

### 2. USDC-SOL (bin step: 80) 👑

- **基本信息**

  - 流动性 (TVL): $10,959.13
  - 24小时交易量: $72.15
  - 年化收益率 (APY): 0.38%

- **费用结构**

  - 基础费率: 0.15%
  - 最大费率: 10%
  - 协议费率: 5%
  - 当前动态费率: 0.001512%

- **价格信息**
  - 当前价格: 0.00745 SOL/USDC
  - 活跃 bin ID: 252

### 3. USDC-USDT (bin step: 2)

- **基本信息**

  - 流动性 (TVL): $0.047
  - 24小时交易量: $0
  - 年化收益率 (APY): 0%

- **费用结构**

  - 基础费率: 0.02%
  - 最大费率: 10%
  - 协议费率: 5%
  - 当前动态费率: 0.0002%

- **价格信息**
  - 当前价格: 1.0002 USDT/USDC
  - 活跃 bin ID: -34541

### 4. USDC-USDT (bin step: 2)

- **基本信息**

  - 流动性 (TVL): $0.013
  - 24小时交易量: $0
  - 年化收益率 (APY): 0%

- **费用结构**

  - 基础费率: 0.02%
  - 最大费率: 10%
  - 协议费率: 5%
  - 当前动态费率: 0.0002%

- **价格信息**
  - 当前价格: 1.0000 USDT/USDC
  - 活跃 bin ID: -34542

### 5. SOL-USDC (bin step: 160)

- **基本信息**

  - 流动性 (TVL): $30.25
  - 24小时交易量: $0
  - 年化收益率 (APY): 0%

- **费用结构**

  - 基础费率: 0.8%
  - 最大费率: 10%
  - 协议费率: 5%
  - 当前动态费率: 0.008%

- **价格信息**
  - 当前价格: 151.23 USDC/SOL
  - 活跃 bin ID: -119

## 市场分析

### TVL 排名前十

1. TRUMP-USDC (bin step: 50)

   - TVL: $373,579,109
   - 24h 交易量: $51,396,984
   - APY: 4.99%
   - 价格: $11.29/TRUMP

2. MELANIA-USDC (bin step: 100)

   - TVL: $90,041,552
   - 24h 交易量: $1,087,516
   - APY: 5.43%
   - 价格: $0.75/MELANIA

3. LIBRA-USDC (bin step: 100)

   - TVL: $22,158,578
   - 24h 交易量: $36,351
   - APY: 0.72%
   - 价格: $0.086/LIBRA

4. MELANIA-USDC (bin step: 80)

   - TVL: $14,408,188
   - 24h 交易量: $0.45
   - APY: 0%
   - 价格: $0.74/MELANIA

5. JitoSOL-SOL (bin step: 1)
   - TVL: $14,032,466
   - 24h 交易量: $1,421,004
   - APY: 0.35%
   - 价格: 1.18 SOL/JitoSOL

### 24h 交易量排名前五

1. TRUMP-USDC (bin step: 50)

   - 交易量: $51,396,984
   - TVL: $373,579,109
   - APY: 4.99%

2. SOL-USDC (bin step: 4)

   - 交易量: $35,005,951
   - TVL: $3,246,129
   - APY: 385.22%

3. WBTC-SOL (bin step: 5)

   - 交易量: $13,953,493
   - TVL: $943,053
   - APY: 409.89%

4. KanyeWest-SOL (bin step: 100)

   - 交易量: $8,757,336
   - TVL: $1.78
   - APY: >1000%

5. pwease-SOL (bin step: 100)
   - 交易量: $8,104,990
   - TVL: $639,147
   - APY: >1000%

### 主要稳定币池分析

- FDUSD-USDC (bin step: 1)
  - TVL: $5,615,713
  - 24h 交易量: $593,060
  - APY: 0.37%
  - 价格: $0.9983 FDUSD/USDC
  - 基础费率: 0.01%

### 主要 SOL 池分析

- SOL-USDC (bin step: 4)
  - TVL: $3,246,129
  - 24h 交易量: $35,005,951
  - APY: 385.22%
  - 价格: $133.13/SOL
  - 活跃度最高的 SOL 池

### 市场特点

#### 流动性分布

- TRUMP-USDC 池占据了绝大部分市场流动性（TVL $373M）
- 稳定币池（如 FDUSD-USDC）流动性相对较低
- SOL 相关池子交易活跃，但流动性分散在不同 bin step 的池子中

#### 费用特点

- 基础费率范围：0.01% - 2%
- 大多数池子的最大费率为 10%
- 协议费率通常为 5%，部分池子为 20%
- 高交易量池子的动态费率较低，显示市场效率

#### APY 分析

- 大多数主流池子的 APY 在 0-10% 之间
- SOL-USDC 池子提供较高的 APY（最高 385.22%）
- 部分小市值代币池子显示极高 APY，但风险也相应较高

## 投资建议

### 高流动性策略

- TRUMP-USDC 池提供最稳定的流动性和适中的 APY (4.99%)
- SOL-USDC (bin step: 4) 池提供高交易量和高 APY，但波动性较大

### 稳定币策略

- FDUSD-USDC 池提供稳定的收益和低滑点
- 基础费率低 (0.01%)，适合大额交易

### 风险提示

- 高 APY 池子通常伴随高风险
- 低流动性池子可能面临较大滑点
- 注意代币本身的价格风险，特别是新发行的代币

## 数据来源

- Meteora DLMM API: https://dlmm-api.meteora.ag
- 链上数据通过 Solana RPC 节点获取
- 分析时间：2024年3月
- 分析工具：自定义 TypeScript 脚本
