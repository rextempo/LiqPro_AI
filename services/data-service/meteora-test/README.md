# Meteora DLMM 数据收集测试

这个项目展示了如何使用 Meteora DLMM SDK 获取 Solana 上 Meteora 流动性池的数据。

## 安装

首先，安装必要的依赖：

```bash
npm install
```

或者手动安装：

```bash
npm i @meteora-ag/dlmm @coral-xyz/anchor @solana/web3.js node-fetch
```

## 使用方法

运行测试脚本：

```bash
npm test
```

## 代码示例

### 获取所有池数据

有三种方法可以获取所有 Meteora DLMM 池数据：

#### 1. 使用 DLMM SDK 的 getLbPairs 方法（推荐）

```javascript
import { Connection } from '@solana/web3.js';
import pkg from '@meteora-ag/dlmm';

const DLMM = pkg.default;
const connection = new Connection(RPC_ENDPOINT, { commitment: 'confirmed' });

// 获取所有池数据
const allPools = await DLMM.getLbPairs(connection);
console.log(`找到 ${allPools.length} 个池`);

// 显示池信息
const poolSummary = allPools.map(pool => ({
  address: pool.pubkey.toString(),
  tokenX: pool.tokenX.toString(),
  tokenY: pool.tokenY.toString(),
  binStep: pool.binStep.toString(),
  activeId: pool.activeId.toString()
}));
console.table(poolSummary);
```

#### 2. 使用 Solana getProgramAccounts 方法

```javascript
import { Connection, PublicKey } from '@solana/web3.js';

const connection = new Connection(RPC_ENDPOINT, { commitment: 'confirmed' });
const METEORA_PROGRAM_ID = new PublicKey('LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo');

// 获取所有池账户
const accounts = await connection.getProgramAccounts(
  METEORA_PROGRAM_ID,
  {
    filters: [
      {
        memcmp: {
          offset: 8, // 跳过 discriminator
          bytes: '3' // LbPair account discriminator
        }
      }
    ],
    dataSlice: { offset: 0, length: 0 } // 只获取地址，不获取数据
  }
);
console.log(`找到 ${accounts.length} 个池账户`);
```

#### 3. 使用 Meteora API 获取所有池数据

```javascript
import fetch from 'node-fetch';

// 获取所有池数据
const response = await fetch('https://dlmm-api.meteora.ag/pool/all');
if (response.ok) {
  const { data: pools } = await response.json();
  console.log(`API 返回 ${pools.length} 个池`);
  
  // 显示池信息
  const apiPoolSummary = pools.map(pool => ({
    address: pool.address,
    tokenX: pool.tokenX,
    tokenY: pool.tokenY,
    tokenXSymbol: pool.tokenXSymbol,
    tokenYSymbol: pool.tokenYSymbol,
    binStep: pool.binStep,
    price: pool.price
  }));
  console.table(apiPoolSummary);
}
```

### 初始化 DLMM 实例

```javascript
import { Connection, PublicKey } from '@solana/web3.js';
import pkg from '@meteora-ag/dlmm';

const DLMM = pkg.default;

// 初始化连接
const connection = new Connection(RPC_ENDPOINT, {
  commitment: 'confirmed'
});

// 池地址
const POOL_ADDRESS = new PublicKey("ARwi1S4DaiTG5DX7S4M4ZsrXqpMD1MrTmbu9ue2tpmEq");

// 创建 DLMM 实例
const dlmmPool = await DLMM.create(connection, POOL_ADDRESS);
```

### 获取活跃 bin 信息

```javascript
const activeBin = await dlmmPool.getActiveBin();
console.log('活跃 bin ID:', activeBin.binId);
console.log('活跃 bin 价格:', activeBin.price.toString());
console.log('每代币价格:', activeBin.pricePerToken);
console.log('X 数量:', activeBin.xAmount.toString());
console.log('Y 数量:', activeBin.yAmount.toString());
```

### 获取 bin 周围的流动性分布

```javascript
const binsAroundActive = await dlmmPool.getBinsAroundActiveBin(5, 5);
console.log(`在活跃 bin 周围找到 ${binsAroundActive.bins.length} 个 bin`);

// 显示流动性分布
const binDistribution = binsAroundActive.bins.map(bin => ({
  binId: bin.binId,
  price: bin.price,
  xAmount: bin.xAmount.toString(),
  yAmount: bin.yAmount.toString()
}));
console.table(binDistribution);
```

### 获取费用信息

```javascript
const feeInfo = await dlmmPool.getFeeInfo();
console.log('基础费率:', `${feeInfo.baseFeeRatePercentage * 100}%`);
console.log('最大费率:', `${feeInfo.maxFeeRatePercentage}%`);
console.log('协议费率:', `${feeInfo.protocolFeePercentage}%`);

// 获取动态费用
const dynamicFee = await dlmmPool.getDynamicFee();
console.log('当前动态费用:', `${dynamicFee * 100}%`);
```

### 获取用户持仓信息

```javascript
const userKey = new PublicKey('用户钱包地址');
const positions = await dlmmPool.getPositionsByUserAndLbPair(userKey);
console.log(`找到 ${positions.userPositions.length} 个用户持仓`);
```

### 获取交易报价

```javascript
import anchorPkg from '@coral-xyz/anchor';
const BN = anchorPkg.BN;

// 获取交易所需的 bin 数组
const swapYtoX = true; // 从 Y 代币交换到 X 代币
const binArrays = await dlmmPool.getBinArrayForSwap(swapYtoX);

// 模拟交换 100 个代币
const swapAmount = new BN(100 * 1000000); // 假设 6 位小数
const slippage = new BN(10); // 1% 滑点

const swapQuote = await dlmmPool.swapQuote(
  swapAmount,
  swapYtoX,
  slippage,
  binArrays
);

console.log('交换报价:', {
  inAmount: swapQuote.inAmount.toString(),
  outAmount: swapQuote.outAmount.toString(),
  minOutAmount: swapQuote.minOutAmount.toString(),
  fee: swapQuote.fee.toString(),
  priceImpact: swapQuote.priceImpact.toString()
});
```

## 官方文档

更多信息请参考 Meteora DLMM SDK 的官方文档：

- NPM: https://www.npmjs.com/package/@meteora-ag/dlmm
- SDK: https://github.com/MeteoraAg/dlmm-sdk
- Discord: https://discord.com/channels/841152225564950528/864859354335412224
- API: https://dlmm-api.meteora.ag/swagger-ui/

## 注意事项

- 确保使用正确的 RPC 端点，以获得最佳性能和稳定性
- 对于高频操作，建议实现重试机制和错误处理
- 在处理大量数据时，注意内存使用和性能优化 