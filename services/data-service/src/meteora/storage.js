/**
 * Meteora DLMM 池数据存储模块
 * 
 * 该模块负责存储和加载 Meteora DLMM 池数据
 */

import fs from 'fs/promises';
import path from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import { parse } from 'csv-parse/sync';
import { logger } from '../utils/logger.js';
import { config } from '../config.js';

// 数据存储目录
const DATA_DIR = path.join(process.cwd(), 'data', 'meteora');

/**
 * 确保数据目录存在
 * 
 * @returns {Promise<void>}
 */
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    logger.error('创建数据目录失败', { error: error.message, stack: error.stack });
    throw new Error(`创建数据目录失败: ${error.message}`);
  }
}

/**
 * 保存池数据到 CSV 文件
 * 
 * @param {Array} pools - 池数据数组
 * @param {string} filename - 文件名
 * @returns {Promise<string>} 保存的文件路径
 */
export async function savePools(pools, filename = 'pools.csv') {
  logger.info(`开始保存 ${pools.length} 个池数据到 ${filename}`);
  
  try {
    await ensureDataDir();
    
    const filePath = path.join(DATA_DIR, filename);
    
    // 确定 CSV 头部
    const headers = determineHeaders(pools);
    
    // 创建 CSV 写入器
    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: headers.map(header => ({
        id: header,
        title: header
      }))
    });
    
    // 写入数据
    await csvWriter.writeRecords(pools);
    
    logger.info(`成功保存池数据到 ${filePath}`);
    return filePath;
  } catch (error) {
    logger.error('保存池数据失败', { error: error.message, stack: error.stack });
    throw new Error(`保存池数据失败: ${error.message}`);
  }
}

/**
 * 从 CSV 文件加载池数据
 * 
 * @param {string} filename - 文件名
 * @returns {Promise<Array>} 池数据数组
 */
export async function loadPools(filename = 'pools.csv') {
  logger.info(`开始从 ${filename} 加载池数据`);
  
  try {
    const filePath = path.join(DATA_DIR, filename);
    
    // 检查文件是否存在
    try {
      await fs.access(filePath);
    } catch (error) {
      logger.warn(`文件 ${filePath} 不存在`);
      return [];
    }
    
    // 读取文件内容
    const fileContent = await fs.readFile(filePath, 'utf-8');
    
    // 解析 CSV
    const pools = parse(fileContent, {
      columns: true,
      skip_empty_lines: true
    });
    
    logger.info(`成功从 ${filePath} 加载 ${pools.length} 个池数据`);
    return pools;
  } catch (error) {
    logger.error('加载池数据失败', { error: error.message, stack: error.stack });
    throw new Error(`加载池数据失败: ${error.message}`);
  }
}

/**
 * 保存高活跃度池数据
 * 
 * @param {Array} pools - 高活跃度池数据数组
 * @returns {Promise<string>} 保存的文件路径
 */
export async function saveHighActivityPools(pools) {
  return savePools(pools, 'high_activity_pools.csv');
}

/**
 * 加载高活跃度池数据
 * 
 * @returns {Promise<Array>} 高活跃度池数据数组
 */
export async function loadHighActivityPools() {
  return loadPools('high_activity_pools.csv');
}

/**
 * 保存最佳池数据
 * 
 * @param {Array} pools - 最佳池数据数组
 * @returns {Promise<string>} 保存的文件路径
 */
export async function saveBestPools(pools) {
  return savePools(pools, 'best_pools.csv');
}

/**
 * 加载最佳池数据
 * 
 * @returns {Promise<Array>} 最佳池数据数组
 */
export async function loadBestPools() {
  return loadPools('best_pools.csv');
}

/**
 * 保存原始 API 响应数据
 * 
 * @param {Object} data - API 响应数据
 * @returns {Promise<string>} 保存的文件路径
 */
export async function saveRawApiData(data) {
  logger.info('开始保存原始 API 响应数据');
  
  try {
    await ensureDataDir();
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = path.join(DATA_DIR, `api_data_${timestamp}.json`);
    
    // 写入数据
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    
    logger.info(`成功保存原始 API 响应数据到 ${filePath}`);
    return filePath;
  } catch (error) {
    logger.error('保存原始 API 响应数据失败', { error: error.message, stack: error.stack });
    throw new Error(`保存原始 API 响应数据失败: ${error.message}`);
  }
}

/**
 * 确定 CSV 头部
 * 
 * @param {Array} pools - 池数据数组
 * @returns {Array} 头部字段数组
 */
function determineHeaders(pools) {
  // 如果没有池数据，使用默认头部
  if (!pools || pools.length === 0) {
    return [
      'address',
      'tokenXSymbol',
      'tokenYSymbol',
      'tokenX',
      'tokenY',
      'binStep',
      'tvl',
      'volume24h',
      'fees_24h',
      'apr',
      'apy',
      'riskAdjustedAPR',
      'impermanentLossRisk',
      'score'
    ];
  }
  
  // 收集所有池中的字段
  const fieldsSet = new Set();
  
  // 优先字段（将出现在 CSV 的前面）
  const priorityFields = [
    'address',
    'tokenXSymbol',
    'tokenYSymbol',
    'tokenX',
    'tokenY',
    'binStep',
    'tvl',
    'volume24h',
    'fees_24h',
    'apr',
    'apy',
    'riskAdjustedAPR',
    'impermanentLossRisk',
    'score'
  ];
  
  // 添加优先字段
  priorityFields.forEach(field => fieldsSet.add(field));
  
  // 添加所有池中的字段
  pools.forEach(pool => {
    Object.keys(pool).forEach(key => {
      // 排除 raw 字段和函数
      if (key !== 'raw' && typeof pool[key] !== 'function') {
        fieldsSet.add(key);
      }
    });
  });
  
  // 转换为数组并确保优先字段在前面
  const allFields = Array.from(fieldsSet);
  
  // 按优先级排序
  return [
    ...priorityFields.filter(field => allFields.includes(field)),
    ...allFields.filter(field => !priorityFields.includes(field))
  ];
} 