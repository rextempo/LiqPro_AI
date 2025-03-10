/**
 * Meteora DLMM 池监控模块
 * 
 * 该模块负责监控 Meteora DLMM 池的实时数据变化
 */

import { Connection, PublicKey } from '@solana/web3.js';
import pkg from '@meteora-ag/dlmm';
import { logger } from '../utils/logger.js';
import { withRetry } from '../utils/retry.js';
import { getPoolByAddress } from './pools.js';
import { config } from '../config.js';

const DLMM = pkg.default;

/**
 * 监控池数据变化
 * 
 * @param {Connection} connection - Solana 连接实例
 * @param {Array} poolAddresses - 要监控的池地址数组
 * @param {Object} options - 监控选项
 * @param {number} options.interval - 监控间隔（毫秒）
 * @param {Function} options.onUpdate - 数据更新回调函数
 * @param {Function} options.onError - 错误回调函数
 * @returns {Object} 监控控制对象
 */
export function monitorPools(connection, poolAddresses, options = {}) {
  const {
    interval = 60000, // 默认 1 分钟
    onUpdate = () => {},
    onError = (error) => logger.error('池监控错误', { error: error.message, stack: error.stack })
  } = options;
  
  logger.info(`开始监控 ${poolAddresses.length} 个池，间隔 ${interval}ms`);
  
  let isRunning = true;
  let timeoutId = null;
  
  // 存储上一次的数据，用于比较变化
  const lastData = new Map();
  
  // 监控函数
  async function monitor() {
    if (!isRunning) return;
    
    try {
      // 并行获取所有池的数据
      const poolDataPromises = poolAddresses.map(address => 
        getPoolByAddress(connection, address)
          .catch(error => {
            logger.warn(`获取池 ${address} 数据失败`, { error: error.message });
            return null;
          })
      );
      
      const poolsData = await Promise.all(poolDataPromises);
      
      // 过滤掉失败的请求
      const validPoolsData = poolsData.filter(Boolean);
      
      logger.debug(`成功获取 ${validPoolsData.length}/${poolAddresses.length} 个池的数据`);
      
      // 检测变化并触发回调
      validPoolsData.forEach(poolData => {
        const address = poolData.address;
        
        if (!lastData.has(address)) {
          // 首次获取数据
          lastData.set(address, poolData);
          onUpdate(poolData, null, 'initial');
          return;
        }
        
        const previousData = lastData.get(address);
        const changes = detectChanges(previousData, poolData);
        
        if (changes.length > 0) {
          // 数据有变化
          lastData.set(address, poolData);
          onUpdate(poolData, previousData, 'update', changes);
        }
      });
      
      // 安排下一次监控
      if (isRunning) {
        timeoutId = setTimeout(monitor, interval);
      }
    } catch (error) {
      onError(error);
      
      // 出错后仍然继续监控
      if (isRunning) {
        timeoutId = setTimeout(monitor, interval);
      }
    }
  }
  
  // 开始监控
  monitor();
  
  // 返回控制对象
  return {
    stop: () => {
      isRunning = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      logger.info('停止池监控');
    },
    isRunning: () => isRunning,
    getLastData: () => new Map(lastData)
  };
}

/**
 * 监控特定池的 bin 变化
 * 
 * @param {Connection} connection - Solana 连接实例
 * @param {string|PublicKey} poolAddress - 池地址
 * @param {Object} options - 监控选项
 * @returns {Object} 监控控制对象
 */
export function monitorPoolBins(connection, poolAddress, options = {}) {
  const {
    interval = 10000, // 默认 10 秒
    binRange = 10,    // 监控活跃 bin 周围的 bin 数量
    onUpdate = () => {},
    onError = (error) => logger.error('池 bin 监控错误', { error: error.message, stack: error.stack })
  } = options;
  
  const pubkey = typeof poolAddress === 'string' ? new PublicKey(poolAddress) : poolAddress;
  
  logger.info(`开始监控池 ${pubkey.toString()} 的 bin 变化，间隔 ${interval}ms`);
  
  let isRunning = true;
  let timeoutId = null;
  let dlmmInstance = null;
  
  // 存储上一次的数据
  let lastActiveBin = null;
  let lastBinsData = null;
  
  // 监控函数
  async function monitor() {
    if (!isRunning) return;
    
    try {
      // 如果还没有 DLMM 实例，创建一个
      if (!dlmmInstance) {
        dlmmInstance = await withRetry(() => DLMM.create(connection, pubkey));
        logger.debug(`成功创建池 ${pubkey.toString()} 的 DLMM 实例`);
      }
      
      // 获取活跃 bin
      const activeBin = await dlmmInstance.getActiveBin();
      
      // 获取 bin 周围的流动性分布
      const binsAroundActive = await dlmmInstance.getBinsAroundActiveBin(binRange, binRange);
      
      // 检测活跃 bin 变化
      if (lastActiveBin && activeBin.id !== lastActiveBin.id) {
        logger.info(`池 ${pubkey.toString()} 的活跃 bin 变化: ${lastActiveBin.id} -> ${activeBin.id}`);
        onUpdate({
          type: 'activeBinChange',
          poolAddress: pubkey.toString(),
          previous: lastActiveBin,
          current: activeBin,
          timestamp: new Date().toISOString()
        });
      }
      
      // 检测 bin 流动性变化
      if (lastBinsData) {
        const changes = detectBinChanges(lastBinsData, binsAroundActive);
        
        if (changes.length > 0) {
          logger.debug(`池 ${pubkey.toString()} 的 bin 流动性变化: ${changes.length} 个 bin`);
          onUpdate({
            type: 'binLiquidityChange',
            poolAddress: pubkey.toString(),
            changes,
            timestamp: new Date().toISOString()
          });
        }
      }
      
      // 更新上一次的数据
      lastActiveBin = activeBin;
      lastBinsData = binsAroundActive;
      
      // 安排下一次监控
      if (isRunning) {
        timeoutId = setTimeout(monitor, interval);
      }
    } catch (error) {
      onError(error);
      
      // 出错后仍然继续监控
      if (isRunning) {
        timeoutId = setTimeout(monitor, interval);
      }
    }
  }
  
  // 开始监控
  monitor();
  
  // 返回控制对象
  return {
    stop: () => {
      isRunning = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      logger.info(`停止池 ${pubkey.toString()} 的 bin 监控`);
    },
    isRunning: () => isRunning,
    getLastActiveBin: () => lastActiveBin,
    getLastBinsData: () => lastBinsData
  };
}

/**
 * 检测池数据变化
 * 
 * @param {Object} previous - 上一次的数据
 * @param {Object} current - 当前数据
 * @returns {Array} 变化列表
 */
function detectChanges(previous, current) {
  const changes = [];
  
  // 要检测变化的关键字段
  const keyFields = [
    'tvl',
    'volume24h',
    'fees_24h',
    'apr',
    'apy',
    'price',
    'activeBin'
  ];
  
  keyFields.forEach(field => {
    // 检查字段是否存在于两个对象中
    if (field in previous && field in current) {
      const prevValue = previous[field];
      const currValue = current[field];
      
      // 对于数字类型，检查变化是否超过阈值
      if (typeof prevValue === 'number' && typeof currValue === 'number') {
        const changePercent = Math.abs((currValue - prevValue) / prevValue * 100);
        
        // 如果变化超过 1%，记录变化
        if (changePercent > 1) {
          changes.push({
            field,
            previous: prevValue,
            current: currValue,
            changePercent
          });
        }
      } 
      // 对于对象类型（如 activeBin），检查特定属性
      else if (typeof prevValue === 'object' && typeof currValue === 'object') {
        if (field === 'activeBin' && prevValue.id !== currValue.id) {
          changes.push({
            field,
            previous: prevValue.id,
            current: currValue.id
          });
        }
      }
      // 对于其他类型，直接比较
      else if (prevValue !== currValue) {
        changes.push({
          field,
          previous: prevValue,
          current: currValue
        });
      }
    }
  });
  
  return changes;
}

/**
 * 检测 bin 流动性变化
 * 
 * @param {Array} previous - 上一次的 bin 数据
 * @param {Array} current - 当前 bin 数据
 * @returns {Array} 变化列表
 */
function detectBinChanges(previous, current) {
  const changes = [];
  
  // 创建 bin ID 到 bin 数据的映射
  const prevMap = new Map();
  previous.forEach(bin => prevMap.set(bin.id.toString(), bin));
  
  // 检查每个当前 bin
  current.forEach(bin => {
    const binId = bin.id.toString();
    
    if (prevMap.has(binId)) {
      const prevBin = prevMap.get(binId);
      
      // 检查流动性变化
      if (!bin.liquidityX.eq(prevBin.liquidityX) || !bin.liquidityY.eq(prevBin.liquidityY)) {
        changes.push({
          binId,
          previous: {
            liquidityX: prevBin.liquidityX.toString(),
            liquidityY: prevBin.liquidityY.toString()
          },
          current: {
            liquidityX: bin.liquidityX.toString(),
            liquidityY: bin.liquidityY.toString()
          }
        });
      }
    } else {
      // 新增的 bin
      changes.push({
        binId,
        type: 'new',
        current: {
          liquidityX: bin.liquidityX.toString(),
          liquidityY: bin.liquidityY.toString()
        }
      });
    }
    
    // 从 prevMap 中移除已处理的 bin
    prevMap.delete(binId);
  });
  
  // 处理已删除的 bin
  prevMap.forEach((bin, binId) => {
    changes.push({
      binId,
      type: 'removed',
      previous: {
        liquidityX: bin.liquidityX.toString(),
        liquidityY: bin.liquidityY.toString()
      }
    });
  });
  
  return changes;
} 