/**
 * 重试工具函数
 * 
 * 该模块提供重试机制，用于处理网络请求和 RPC 调用的临时失败
 */

import { logger } from './logger.js';

/**
 * 使用指数退避策略执行可能失败的操作并自动重试
 * 
 * @param {Function} operation - 要执行的操作函数
 * @param {Object} options - 重试选项
 * @param {number} options.maxRetries - 最大重试次数
 * @param {number} options.initialDelay - 初始延迟（毫秒）
 * @param {number} options.maxDelay - 最大延迟（毫秒）
 * @param {Function} options.shouldRetry - 决定是否应该重试的函数
 * @returns {Promise<any>} 操作结果
 */
export async function withRetry(operation, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    shouldRetry = (error) => true
  } = options;
  
  let retries = 0;
  let delay = initialDelay;
  
  while (true) {
    try {
      return await operation();
    } catch (error) {
      retries++;
      
      // 如果达到最大重试次数或不应该重试，则抛出错误
      if (retries > maxRetries || !shouldRetry(error)) {
        throw error;
      }
      
      // 计算下一次重试的延迟时间（指数退避）
      delay = Math.min(delay * 2, maxDelay);
      
      logger.debug(`操作失败，将在 ${delay}ms 后重试 (${retries}/${maxRetries})`, {
        error: error.message,
        retries,
        maxRetries,
        delay
      });
      
      // 等待延迟时间
      await sleep(delay);
    }
  }
}

/**
 * 延迟指定的毫秒数
 * 
 * @param {number} ms - 延迟毫秒数
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 创建一个带有超时的 Promise
 * 
 * @param {Promise} promise - 原始 Promise
 * @param {number} timeoutMs - 超时时间（毫秒）
 * @param {string} errorMessage - 超时错误消息
 * @returns {Promise} 带有超时的 Promise
 */
export function withTimeout(promise, timeoutMs, errorMessage = '操作超时') {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ]);
}

/**
 * 批量处理数组，避免一次处理过多项目
 * 
 * @param {Array} items - 要处理的项目数组
 * @param {Function} processFn - 处理函数，接收一个批次的项目
 * @param {Object} options - 批处理选项
 * @param {number} options.batchSize - 每批的大小
 * @param {number} options.delayBetweenBatches - 批次之间的延迟（毫秒）
 * @returns {Promise<Array>} 处理结果数组
 */
export async function processBatches(items, processFn, options = {}) {
  const {
    batchSize = 10,
    delayBetweenBatches = 1000
  } = options;
  
  const results = [];
  
  // 将项目分成批次
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    logger.debug(`处理批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(items.length / batchSize)}, 大小: ${batch.length}`);
    
    // 处理当前批次
    const batchResults = await processFn(batch);
    results.push(...batchResults);
    
    // 如果不是最后一批，等待指定的延迟时间
    if (i + batchSize < items.length) {
      await sleep(delayBetweenBatches);
    }
  }
  
  return results;
} 