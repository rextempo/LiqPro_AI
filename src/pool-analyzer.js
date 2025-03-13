import { Connection, PublicKey } from '@solana/web3.js';
import pkg from '@meteora-ag/dlmm';
import anchorPkg from '@coral-xyz/anchor';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const DLMM = pkg.default;
const BN = anchorPkg.BN;

// 配置
const RPC_ENDPOINT = 'https://soft-snowy-asphalt.solana-mainnet.quiknode.pro/48639631c6e4e81af5a0b8e228f6f9a0329154b7/';
const API_BASE = 'https://dlmm-api.meteora.ag';
const METEORA_PROGRAM_ID = new PublicKey('LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo');
const MAX_RETRIES = 3;
const INITIAL_BACKOFF = 1000; // 1 second

// 辅助函数
async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function withRetry(operation, retries = MAX_RETRIES, backoff = INITIAL_BACKOFF) {
  try {
    return await operation();
  } catch (error) {
    if (retries === 0) throw error;
    
    console.log(`操作失败，${backoff}ms 后重试... (剩余重试次数: ${retries})`);
    console.log(`错误: ${error.message}`);
    await sleep(backoff);
    
    return withRetry(operation, retries - 1, backoff * 2);
  }
}

/**
 * 从 API 获取所有池子数据
 */
async function getAllPoolsFromAPI() {
  try {
    // 尝试不同的 API 端点
    const endpoints = [
      `${API_BASE}/pair/all`,
      `${API_BASE}/pool/all`,
      `${API_BASE}/v1/dlmm/pairs`,
      'https://api.meteora.ag/v1/dlmm/pairs'
    ];
    
    for (const endpoint of endpoints) {
      console.log(`正在从 API 端点 ${endpoint} 获取所有池子数据...`);
      try {
        const response = await fetch(endpoint);
        
        if (!response.ok) {
          console.log(`获取池子数据失败，状态码: ${response.status}`);
          continue;
        }
        
        const responseData = await response.json();
        let pools = [];
        
        // 处理不同的响应格式
        if (Array.isArray(responseData)) {
          pools = responseData;
        } else if (responseData.data && Array.isArray(responseData.data)) {
          pools = responseData.data;
        } else {
          console.log('未知的响应格式');
          continue;
        }
        
        console.log(`成功从 ${endpoint} 获取 ${pools.length} 个池子的数据`);
        return pools;
      } catch (error) {
        console.error(`从 ${endpoint} 获取池子数据时出错: ${error.message}`);
      }
    }
    
    console.log('所有 API 端点都失败了');
    return [];
  } catch (error) {
    console.error(`获取池子数据时出错: ${error.message}`);
    return [];
  }
}

/**
 * 使用 SDK 获取所有池子数据
 */
async function getAllPoolsFromSDK(connection) {
  try {
    console.log('正在使用 SDK 获取所有池子数据...');
    const allPools = await DLMM.getLbPairs(connection);
    console.log(`成功获取 ${allPools.length} 个池子的数据`);
    
    // 转换 SDK 返回的数据为更易处理的格式
    const processedPools = allPools.map(pool => {
      try {
        return {
          address: pool.pubkey?.toString() || '',
          tokenX: pool.tokenX?.toString() || '',
          tokenY: pool.tokenY?.toString() || '',
          binStep: pool.binStep?.toString() || '',
          activeId: pool.activeId?.toString() || ''
        };
      } catch (error) {
        console.error(`处理池子数据时出错: ${error.message}`);
        return null;
      }
    }).filter(Boolean);
    
    return processedPools;
  } catch (error) {
    console.error(`使用 SDK 获取池子数据时出错: ${error.message}`);
    return [];
  }
}

/**
 * 使用 RPC 获取所有池子账户
 */
async function getAllPoolsFromRPC(connection) {
  try {
    console.log('正在使用 RPC 获取所有池子账户...');
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
    console.log(`成功获取 ${accounts.length} 个池子账户`);
    
    // 转换 RPC 返回的数据为更易处理的格式
    const processedAccounts = accounts.map(account => ({
      address: account.pubkey.toString()
    }));
    
    return processedAccounts;
  } catch (error) {
    console.error(`使用 RPC 获取池子账户时出错: ${error.message}`);
    return [];
  }
}

/**
 * 处理池子数据，提取关键信息
 */
function processPoolData(pools) {
  console.log('正在处理池子数据...');
  const processedData = [];
  
  for (const pool of pools) {
    try {
      // 提取基本信息
      const address = pool.address || '';
      const name = pool.name || '';
      const tokenXMint = pool.mint_x || '';
      const tokenYMint = pool.mint_y || '';
      const tokenXSymbol = name.split('-')[0] || '';
      const tokenYSymbol = name.split('-')[1] || '';
      const binStep = parseFloat(pool.bin_step) || 0;
      const price = parseFloat(pool.current_price) || 0;
      
      // 提取流动性和价格信息
      const volume24h = parseFloat(pool.trade_volume_24h) || 0;
      const fees24h = parseFloat(pool.fees_24h) || 0;
      const tvl = parseFloat(pool.reserve_x_amount) * price + parseFloat(pool.reserve_y_amount) || 0;
      const fee = parseFloat(pool.base_fee_percentage) || 0;
      const apr = parseFloat(pool.apr) || 0;
      
      // 计算费用率
      const feeRate = fee / 100; // 假设 fee 是百分比
      
      // 计算费用/TVL比率
      const feeTvlRatio = tvl > 0 ? (fees24h / tvl) : 0;
      
      // 计算无常损失风险
      const normalizedBinStep = binStep / 100; // 将基点转换为百分比
      const priceVolatility = 1.0; // 默认为高波动性
      const ilRisk = normalizedBinStep > 0 
        ? Math.min(1.0, Math.max(0.0, priceVolatility / (normalizedBinStep * 2)))
        : Math.min(1.0, priceVolatility * 2);
      
      // 计算估计 APR (基于费用)
      const estimatedApr = apr || (tvl > 0 ? (fees24h * 365 / tvl) : 0);
      
      // 计算风险调整后的 APR
      const riskAdjustedApr = estimatedApr * (1 - ilRisk * 0.5);
      
      // 计算综合评分
      const finalScore = riskAdjustedApr * 0.5; // 风险调整后收益占 50%
      
      processedData.push({
        address,
        name,
        tokenXMint,
        tokenYMint,
        tokenXSymbol,
        tokenYSymbol,
        binStep,
        price,
        volume24h,
        tvl,
        fee,
        feeRate,
        feeTvlRatio,
        apr,
        ilRisk,
        estimatedApr,
        riskAdjustedApr,
        finalScore
      });
    } catch (error) {
      console.error(`处理池子数据时出错: ${error.message}`);
    }
  }
  
  console.log(`成功处理 ${processedData.length} 个池子的数据`);
  return processedData;
}

/**
 * 筛选高活跃度的池子
 */
function filterHighActivityPools(pools, minTvl = 1000, minVolume = 100, minFeeTvlRatio = 0.0001) {
  console.log('正在筛选高活跃度池子...');
  
  const filteredPools = pools.filter(pool => 
    pool.tvl >= minTvl && 
    pool.volume24h >= minVolume && 
    pool.feeTvlRatio >= minFeeTvlRatio
  );
  
  // 按最终评分排序
  filteredPools.sort((a, b) => b.finalScore - a.finalScore);
  
  console.log(`筛选出 ${filteredPools.length} 个高活跃度池子`);
  return filteredPools;
}

/**
 * 识别每个交易对中最佳的池子
 */
function identifyBestPoolsPerPair(pools) {
  console.log('正在识别每个交易对中最佳的池子...');
  
  // 按交易对名称分组
  const poolsByName = {};
  for (const pool of pools) {
    if (!pool.name) continue;
    
    if (!poolsByName[pool.name]) {
      poolsByName[pool.name] = [];
    }
    poolsByName[pool.name].push(pool);
  }
  
  // 选择每组中评分最高的池子
  const bestPools = [];
  for (const name in poolsByName) {
    const pairPools = poolsByName[name];
    pairPools.sort((a, b) => b.finalScore - a.finalScore);
    bestPools.push(pairPools[0]);
  }
  
  // 按评分排序
  bestPools.sort((a, b) => b.finalScore - a.finalScore);
  
  console.log(`识别出 ${bestPools.length} 个最佳池子`);
  return bestPools;
}

/**
 * 保存数据到 CSV 文件
 */
function saveToCSV(data, filename) {
  if (!data || data.length === 0) {
    console.log(`没有数据可保存到 ${filename}`);
    return;
  }
  
  try {
    // 获取所有字段名
    const fields = Object.keys(data[0]);
    
    // 创建 CSV 内容
    let csvContent = fields.join(',') + '\n';
    
    // 添加每行数据
    for (const item of data) {
      const row = fields.map(field => {
        const value = item[field];
        // 处理包含逗号的字符串
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`;
        }
        return value;
      }).join(',');
      csvContent += row + '\n';
    }
    
    // 写入文件
    fs.writeFileSync(filename, csvContent);
    console.log(`数据已保存到 ${filename}`);
  } catch (error) {
    console.error(`保存数据到 ${filename} 时出错: ${error.message}`);
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    // 初始化连接
    console.log('初始化连接到 Solana 主网...');
    const connection = new Connection(RPC_ENDPOINT, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000
    });
    
    // 验证连接
    console.log('验证连接...');
    const version = await withRetry(() => connection.getVersion());
    console.log('已连接到 Solana 节点版本:', version);
    
    // 获取池子数据
    const apiPools = await getAllPoolsFromAPI();
    const sdkPools = await getAllPoolsFromSDK(connection);
    const rpcPools = await getAllPoolsFromRPC(connection);
    
    // 处理池子数据
    let processedPools = [];
    if (apiPools.length > 0) {
      processedPools = processPoolData(apiPools);
    } else if (sdkPools.length > 0) {
      // 如果 API 数据获取失败，尝试使用 SDK 数据
      processedPools = processPoolData(sdkPools);
    } else {
      console.log('无法获取池子数据，退出程序');
      return;
    }
    
    // 创建输出目录
    const outputDir = path.join(process.cwd(), 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }
    
    // 生成时间戳
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // 保存所有池子数据
    const allPoolsFile = path.join(outputDir, `meteora_all_pools_${timestamp}.csv`);
    saveToCSV(processedPools, allPoolsFile);
    
    // 筛选高活跃度池子
    const highActivityPools = filterHighActivityPools(processedPools);
    const highActivityFile = path.join(outputDir, `meteora_high_activity_pools_${timestamp}.csv`);
    saveToCSV(highActivityPools, highActivityFile);
    
    // 识别每个交易对中最佳的池子
    const bestPools = identifyBestPoolsPerPair(highActivityPools);
    const bestPoolsFile = path.join(outputDir, `meteora_best_pools_${timestamp}.csv`);
    saveToCSV(bestPools, bestPoolsFile);
    
    // 显示前 10 个最佳池子
    console.log('\n前 10 个最佳 LP 投资机会:');
    const topPools = bestPools.slice(0, 10);
    for (let i = 0; i < topPools.length; i++) {
      const pool = topPools[i];
      console.log(`${i+1}. ${pool.name}: 风险调整 APR ${pool.riskAdjustedApr.toFixed(2)}%, 无常损失风险 ${pool.ilRisk.toFixed(2)}, 评分 ${pool.finalScore.toFixed(2)}`);
    }
    
    console.log('\n分析完成！');
  } catch (error) {
    console.error('程序执行出错:', error);
  }
}

// 运行主函数
main().catch(console.error); 