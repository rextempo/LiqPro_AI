# Meteora DLMM SDK 集成指南

本文档介绍如何使用 Meteora 的 DLMM SDK 来获取池子信息和执行交易操作。

## 安装依赖

```bash
npm install @meteora-ag/dlmm @coral-xyz/anchor @solana/web3.js axios
```

## 获取所有池子信息

可以通过 Meteora 的 API 获取所有池子的信息：

```typescript
import axios from 'axios';

async function getAllPools() {
  try {
    const response = await axios.get('https://dlmm-api.meteora.ag/v1/pair/all');
    const pools = response.data.data;

    console.log(`Found ${pools.length} pools`);
    pools.forEach(pool => {
      console.log({
        address: pool.address,
        tokenX: {
          symbol: pool.tokenX.symbol,
          address: pool.tokenX.address,
        },
        tokenY: {
          symbol: pool.tokenY.symbol,
          address: pool.tokenY.address,
        },
        binStep: pool.binStep,
        activeBin: pool.activeBin,
        tvl: pool.tvl,
        volume24h: pool.volume24h,
        apy24h: pool.apy24h,
      });
    });

    return pools;
  } catch (error) {
    console.error('Error fetching pools:', error);
    throw error;
  }
}
```

### Pool 数据结构

```typescript
interface MeteoraPool {
  address: string; // 池子地址
  tokenX: {
    address: string; // X token 地址
    symbol: string; // X token 符号
    decimals: number; // X token 小数位数
  };
  tokenY: {
    address: string; // Y token 地址
    symbol: string; // Y token 符号
    decimals: number; // Y token 小数位数
  };
  binStep: number; // bin 步长
  baseFee: number; // 基础费率
  maxFee: number; // 最大费率
  activeBin: number; // 当前活跃 bin
  binCount: number; // bin 总数
  tvl: number; // 总锁仓价值(USD)
  volume24h: number; // 24小时交易量
  volumeTotal: number; // 总交易量
  apy24h: number; // 24小时年化收益率
}
```

### 示例返回数据

```json
{
  "address": "ARwi1S4DaiTG5DX7S4M4ZsrXqpMD1MrTmbu9ue2tpmEq",
  "tokenX": {
    "address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "symbol": "USDC",
    "decimals": 6
  },
  "tokenY": {
    "address": "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    "symbol": "USDT",
    "decimals": 6
  },
  "binStep": 1,
  "baseFee": 0.0001,
  "maxFee": 0.1,
  "activeBin": 2,
  "binCount": 100,
  "tvl": 1234567.89,
  "volume24h": 987654.32,
  "volumeTotal": 9876543.21,
  "apy24h": 12.34
}
```

## 单个池子详细信息

## 基本用法

```typescript
import { Connection, PublicKey } from '@solana/web3.js';
import DLMM from '@meteora-ag/dlmm';

async function getDLMMPoolInfo() {
  // 初始化 Solana 连接
  const connection = new Connection('YOUR_RPC_ENDPOINT');

  // USDC/USDT 池子地址
  const USDC_USDT_POOL = new PublicKey('ARwi1S4DaiTG5DX7S4M4ZsrXqpMD1MrTmbu9ue2tpmEq');

  // 创建 DLMM 实例
  const dlmmPool = await DLMM.create(connection, USDC_USDT_POOL);

  // 1. 获取活跃 bin 信息
  const activeBin = await dlmmPool.getActiveBin();
  console.log('Active bin:', {
    binId: activeBin.binId,
    price: activeBin.price.toString(),
    pricePerToken: dlmmPool.fromPricePerLamport(Number(activeBin.price)),
  });

  // 2. 获取周围的 bins
  const BINS_TO_FETCH = 5; // 上下各获取5个bin
  const { bins } = await dlmmPool.getBinsAroundActiveBin(BINS_TO_FETCH, BINS_TO_FETCH);

  // 3. 获取费用信息
  const feeInfo = dlmmPool.getFeeInfo();

  // 4. 获取当前动态费用
  const dynamicFee = dlmmPool.getDynamicFee();
}
```

## 数据结构

### 活跃 Bin

```typescript
interface ActiveBin {
  binId: number; // bin的ID
  price: string; // 原始价格（lamports）
}
```

### Bin 信息

```typescript
interface BinLiquidity {
  binId: number; // bin的ID
  price: string; // 价格
  xAmount: string; // X token的数量
  yAmount: string; // Y token的数量
}
```

### 费用信息

```typescript
interface FeeInfo {
  baseFeeRatePercentage: number; // 基础费率
  maxFeeRatePercentage: number; // 最大费率
  protocolFeePercentage: number; // 协议费率
}
```

## 示例返回数据

### 活跃 Bin

```json
{
  "binId": 2,
  "price": "1.00020001",
  "pricePerToken": "1.00020001"
}
```

### Bins 分布

```json
[
  {
    "binId": -1,
    "price": "0.99990000999900009999",
    "xAmount": "0",
    "yAmount": "104495567807"
  },
  {
    "binId": 0,
    "price": "1",
    "xAmount": "0",
    "yAmount": "118843619920"
  }
]
```

### 费用信息

```json
{
  "baseFeeRatePercentage": 0.01,
  "maxFeeRatePercentage": 10,
  "protocolFeePercentage": 5
}
```

## 注意事项

1. 需要可靠的 RPC 节点来确保稳定的连接
2. 价格和金额都以字符串形式返回，需要自行转换为数字进行计算
3. bin 的 ID 可以为负数，表示低于中心价格的区间
4. 动态费用会根据市场波动情况在基础费率和最大费率之间变化

## TRUMP-USDC 池子分析方法

### 测试脚本结构

```typescript
// 基础接口定义
interface MeteoraPool {
  address: string; // 池子地址
  name: string; // 池子名称
  mint_x: string; // X token 的 mint 地址
  mint_y: string; // Y token 的 mint 地址
  reserve_x: string; // X token 的储备账户地址
  reserve_y: string; // Y token 的储备账户地址
  reserve_x_amount: number; // X token 储备量
  reserve_y_amount: number; // Y token 储备量
  bin_step: number; // bin 步长
  base_fee_percentage: string; // 基础费率
  max_fee_percentage: string; // 最大费率
  protocol_fee_percentage: string; // 协议费率
  liquidity: string; // 总流动性（美元）
  fees_24h: number; // 24小时费用收入
  trade_volume_24h: number; // 24小时交易量
  current_price: number; // 当前价格
  apr: number; // 年化收益率
  apy: number; // 年化收益率（复利）
  hide: boolean; // 是否隐藏
  is_blacklisted: boolean; // 是否被列入黑名单
}

// 分组统计接口
interface BinStepGroup {
  count: number; // 池子数量
  tvl: number; // 总流动性
  volume: number; // 交易量
  pools: MeteoraPool[]; // 池子列表
}

interface BinStepGroups {
  [key: number]: BinStepGroup;
}
```

### 数据获取方法

1. **API 调用**

```typescript
const API_BASE = 'https://dlmm-api.meteora.ag';
const response = await axios.get<MeteoraPool[]>(`${API_BASE}/pair/all`);
```

2. **链上数据获取**

```typescript
const connection = new Connection('https://soft-snowy-asphalt.solana-mainnet.quiknode.pro/...');
const dlmmPool = await DLMM.create(connection, new PublicKey(pool.address));
```

### 分析维度

1. 总体统计：TVL 和交易量
2. 按 bin step 分组统计
3. 单个池子详细信息：
   - 活跃 bin 信息
   - 周围 bins 分布
   - 费用结构
   - 价格信息

## 测试结果

### 总体数据

- 总池子数量：75 个
- 总 TVL：$374,101,540
- 总24h交易量：$51,548,592

### 主要 Bin Step 分布

#### Bin Step 50 (主要池子)

```json
{
  "count": 4,
  "tvl": 373595829.145,
  "volume": 51493163.594,
  "percentage": {
    "tvl": "99.86%",
    "volume": "99.89%"
  },
  "topPool": {
    "address": "9d9mb8kooFfaD3SctgZtkxQypkshx6ezhbKio89ixyy2",
    "tvl": 373595209.066,
    "volume24h": 51493163.594,
    "apy": 5.0,
    "baseFee": 0.1,
    "maxFee": 1.6625,
    "price": 11.2903
  }
}
```

#### Bin Step 100

```json
{
  "count": 18,
  "tvl": 398262.133,
  "volume": 20612.209,
  "percentage": {
    "tvl": "0.11%",
    "volume": "0.04%"
  },
  "topPool": {
    "address": "A8nPhpCJqtqHdqUk35Uj9Hy2YsGXFkCZGuNwvkD3k7VC",
    "tvl": 373628.813,
    "volume24h": 897.738,
    "apy": 0.7,
    "baseFee": 1.0,
    "maxFee": 1.0,
    "price": 11.3348
  }
}
```

### 活跃 Bin 数据结构

```typescript
interface ActiveBin {
  binId: number;      // bin ID
  price: BN;         // 价格（以 lamports 为单位）
  xAmount: BN;       // X token 数量
  yAmount: BN;       // Y token 数量
}

// 示例数据
{
  "binId": 486,
  "price": "11.290313823498132626",
  "pricePerToken": "11.290313823498133"
}
```

### 周围 Bins 数据结构

```typescript
interface BinData {
  binId: number;
  price: string;
  xAmount: string;
  yAmount: string;
}

// 示例数据（主池子）
[
  {
    binId: 482,
    price: '11.06730214471401',
    xAmount: '0',
    yAmount: '337966703060',
  },
  {
    binId: 483,
    price: '11.12263865543758',
    xAmount: '0',
    yAmount: '337980667459',
  },
  // ... 更多 bins
];
```

### 费用信息数据结构

```typescript
interface FeeInfo {
  baseFeeRatePercentage: number;    // 基础费率
  maxFeeRatePercentage: number;     // 最大费率
  protocolFeePercentage: number;    // 协议费率
  currentDynamicFee: number;        // 当前动态费率
}

// 示例数据（主池子）
{
  "baseFeeRate": "0.1%",
  "maxFeeRate": "10%",
  "protocolFee": "5%",
  "currentDynamicFee": "0.001%"
}
```

## 分析结论

1. **流动性分布**

   - 99.86% 的流动性集中在 bin step 50 的池子
   - bin step 100 的池子数量最多（18个），但流动性占比仅 0.11%
   - 其他 bin step 的池子流动性占比不足 0.1%

2. **交易活跃度**

   - 99.89% 的交易量来自 bin step 50 的池子
   - bin step 10 的池子虽然 TVL 较小但交易相对活跃
   - 大多数小 bin step 的池子几乎没有交易活动

3. **价格稳定性**

   - 主要交易价格维持在 $11.29-11.33 区间
   - 不同 bin step 的池子之间存在小幅价差
   - 主池子（bin step 50）价格最稳定，波动最小

4. **费用结构**
   - 基础费率范围：0.01% - 5%
   - 最大费率普遍为 10%
   - 协议费率主要为 5%，部分池子为 20%
   - 动态费率随交易量变化，主池子维持在较低水平

## 测试工具和环境

- Meteora DLMM SDK: @meteora-ag/dlmm
- Solana Web3.js: @solana/web3.js
- API 环境: mainnet
- RPC 节点: Quicknode
- 测试时间: 2024年3月
