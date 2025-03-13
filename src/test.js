import { Connection, PublicKey } from '@solana/web3.js';
import pkg from '@meteora-ag/dlmm';
import anchorPkg from '@coral-xyz/anchor';
import fetch from 'node-fetch';

const DLMM = pkg.default;
const BN = anchorPkg.BN;

const RPC_ENDPOINT = 'https://soft-snowy-asphalt.solana-mainnet.quiknode.pro/48639631c6e4e81af5a0b8e228f6f9a0329154b7/';
const MAX_RETRIES = 3;
const INITIAL_BACKOFF = 1000; // 1 second

// 已知的 USDC-USDT 池地址
const USDC_USDT_POOL = new PublicKey("ARwi1S4DaiTG5DX7S4M4ZsrXqpMD1MrTmbu9ue2tpmEq");
// Meteora 程序 ID
const METEORA_PROGRAM_ID = new PublicKey('LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function withRetry(operation, retries = MAX_RETRIES, backoff = INITIAL_BACKOFF) {
  try {
    return await operation();
  } catch (error) {
    if (retries === 0) throw error;
    
    console.log(`Operation failed, retrying in ${backoff}ms... (${retries} retries left)`);
    console.log(`Error: ${error.message}`);
    await sleep(backoff);
    
    return withRetry(operation, retries - 1, backoff * 2);
  }
}

/**
 * 获取所有 Meteora DLMM 池数据
 * 
 * 有两种方法获取所有池数据：
 * 1. 使用 DLMM.getLbPairs 方法（推荐）
 * 2. 使用 Solana getProgramAccounts 方法
 */
async function getAllPools(connection) {
  console.log('获取所有 Meteora DLMM 池数据...');
  
  try {
    // 方法1：使用 DLMM SDK 的 getLbPairs 方法（推荐）
    console.log('\n方法1：使用 DLMM SDK 的 getLbPairs 方法');
    const allPools = await DLMM.getLbPairs(connection);
    console.log(`找到 ${allPools.length} 个池`);
    
    // 显示前 5 个池的信息
    console.log('\n前 5 个池的信息:');
    const poolSummary = allPools.slice(0, 5).map(pool => ({
      address: pool.pubkey?.toString() || 'unknown',
      tokenX: pool.tokenX?.toString() || 'unknown',
      tokenY: pool.tokenY?.toString() || 'unknown',
      binStep: pool.binStep?.toString() || 'unknown',
      activeId: pool.activeId?.toString() || 'unknown'
    }));
    console.table(poolSummary);
    
    // 方法2：使用 Solana getProgramAccounts 方法
    console.log('\n方法2：使用 Solana getProgramAccounts 方法');
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
    
    // 方法3：使用 Meteora API 获取所有池数据
    console.log('\n方法3：使用 Meteora API 获取所有池数据');
    try {
      const response = await fetch('https://dlmm-api.meteora.ag/pool/all');
      if (response.ok) {
        const { data: pools } = await response.json();
        console.log(`API 返回 ${pools.length} 个池`);
        
        // 显示前 5 个池的信息
        console.log('\nAPI 返回的前 5 个池信息:');
        const apiPoolSummary = pools.slice(0, 5).map(pool => ({
          address: pool.address || 'unknown',
          tokenX: pool.tokenX || 'unknown',
          tokenY: pool.tokenY || 'unknown',
          tokenXSymbol: pool.tokenXSymbol || 'unknown',
          tokenYSymbol: pool.tokenYSymbol || 'unknown',
          binStep: pool.binStep || 'unknown',
          price: pool.price || 'unknown'
        }));
        console.table(apiPoolSummary);
        
        return {
          sdkPools: allPools,
          rpcPools: accounts,
          apiPools: pools
        };
      } else {
        console.log(`API 请求失败，状态码: ${response.status}`);
      }
    } catch (error) {
      console.log('API 请求出错:', error.message);
    }
    
    return {
      sdkPools: allPools,
      rpcPools: accounts
    };
  } catch (error) {
    console.error('获取所有池数据失败:', error);
    throw error;
  }
}

/**
 * 测试 Meteora DLMM 数据收集
 * 
 * 本测试展示如何使用 Meteora DLMM SDK 获取池数据，包括：
 * 1. 初始化 DLMM 实例
 * 2. 获取池基本信息
 * 3. 获取活跃 bin 信息
 * 4. 获取 bin 周围的流动性分布
 * 5. 获取费用信息
 */
async function testMeteoraDataCollection() {
  try {
    console.log('初始化连接到 Solana 主网...');
    const connection = new Connection(RPC_ENDPOINT, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000,
      wsEndpoint: RPC_ENDPOINT.replace('https://', 'wss://')
    });

    // 验证连接
    console.log('验证连接...');
    const version = await withRetry(() => connection.getVersion());
    console.log('已连接到 Solana 节点版本:', version);
    
    // 获取所有池数据
    await getAllPools(connection);

    // 初始化 DLMM 实例
    console.log('\n初始化 DLMM 实例...');
    const dlmmPool = await withRetry(() => DLMM.create(connection, USDC_USDT_POOL));
    
    if (dlmmPool) {
      console.log('DLMM 实例创建成功');
      
      // 获取池基本信息
      console.log('\n获取池基本信息:');
      console.log('池地址:', dlmmPool.pubkey.toString());
      console.log('代币 X:', dlmmPool.tokenX?.toString() || '未知');
      console.log('代币 Y:', dlmmPool.tokenY?.toString() || '未知');
      
      // 获取活跃 bin 信息
      console.log('\n获取活跃 bin 信息:');
      const activeBin = await dlmmPool.getActiveBin();
      console.log('活跃 bin ID:', activeBin.binId);
      console.log('活跃 bin 价格:', activeBin.price.toString());
      console.log('每代币价格:', activeBin.pricePerToken);
      console.log('X 数量:', activeBin.xAmount.toString());
      console.log('Y 数量:', activeBin.yAmount.toString());
      
      // 获取 bin 周围的流动性分布
      console.log('\n获取 bin 周围的流动性分布:');
      const binsAroundActive = await dlmmPool.getBinsAroundActiveBin(5, 5);
      console.log(`在活跃 bin 周围找到 ${binsAroundActive.bins.length} 个 bin`);
      
      // 显示流动性分布
      console.log('\n流动性分布:');
      const binDistribution = binsAroundActive.bins.map(bin => ({
        binId: bin.binId,
        price: bin.price,
        xAmount: bin.xAmount.toString(),
        yAmount: bin.yAmount.toString()
      }));
      console.table(binDistribution);
      
      // 获取费用信息
      console.log('\n获取费用信息:');
      const feeInfo = await dlmmPool.getFeeInfo();
      console.log('基础费率:', `${feeInfo.baseFeeRatePercentage * 100}%`);
      console.log('最大费率:', `${feeInfo.maxFeeRatePercentage}%`);
      console.log('协议费率:', `${feeInfo.protocolFeePercentage}%`);
      
      // 获取动态费用
      console.log('\n获取动态费用:');
      const dynamicFee = await dlmmPool.getDynamicFee();
      console.log('当前动态费用:', `${dynamicFee * 100}%`);
    } else {
      console.log('创建 DLMM 实例失败');
    }

    console.log('\n测试成功完成');
  } catch (error) {
    console.error('测试失败:', error);
    throw error;
  }
}

// 运行测试
testMeteoraDataCollection().catch(console.error); 