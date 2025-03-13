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
export function withRetry(operation: Function, options?: {
    maxRetries: number;
    initialDelay: number;
    maxDelay: number;
    shouldRetry: Function;
}): Promise<any>;
/**
 * 延迟指定的毫秒数
 *
 * @param {number} ms - 延迟毫秒数
 * @returns {Promise<void>}
 */
export function sleep(ms: number): Promise<void>;
/**
 * 创建一个带有超时的 Promise
 *
 * @param {Promise} promise - 原始 Promise
 * @param {number} timeoutMs - 超时时间（毫秒）
 * @param {string} errorMessage - 超时错误消息
 * @returns {Promise} 带有超时的 Promise
 */
export function withTimeout(promise: Promise<any>, timeoutMs: number, errorMessage?: string): Promise<any>;
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
export function processBatches(items: any[], processFn: Function, options?: {
    batchSize: number;
    delayBetweenBatches: number;
}): Promise<any[]>;
