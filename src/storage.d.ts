/**
 * 保存池数据到 CSV 文件
 *
 * @param {Array} pools - 池数据数组
 * @param {string} filename - 文件名
 * @returns {Promise<string>} 保存的文件路径
 */
export function savePools(pools: any[], filename?: string): Promise<string>;
/**
 * 从 CSV 文件加载池数据
 *
 * @param {string} filename - 文件名
 * @returns {Promise<Array>} 池数据数组
 */
export function loadPools(filename?: string): Promise<any[]>;
/**
 * 保存高活跃度池数据
 *
 * @param {Array} pools - 高活跃度池数据数组
 * @returns {Promise<string>} 保存的文件路径
 */
export function saveHighActivityPools(pools: any[]): Promise<string>;
/**
 * 加载高活跃度池数据
 *
 * @returns {Promise<Array>} 高活跃度池数据数组
 */
export function loadHighActivityPools(): Promise<any[]>;
/**
 * 保存最佳池数据
 *
 * @param {Array} pools - 最佳池数据数组
 * @returns {Promise<string>} 保存的文件路径
 */
export function saveBestPools(pools: any[]): Promise<string>;
/**
 * 加载最佳池数据
 *
 * @returns {Promise<Array>} 最佳池数据数组
 */
export function loadBestPools(): Promise<any[]>;
/**
 * 保存原始 API 响应数据
 *
 * @param {Object} data - API 响应数据
 * @returns {Promise<string>} 保存的文件路径
 */
export function saveRawApiData(data: any): Promise<string>;
