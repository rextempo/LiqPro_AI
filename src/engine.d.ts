/**
 * 执行策略回测
 *
 * @param {Array} strategies - 策略数组
 * @param {Connection} connection - Solana 连接实例
 * @param {Object} options - 回测选项
 * @returns {Promise<Object>} 回测结果
 */
export function backtest(strategies: any[], connection: Connection, options?: any): Promise<any>;
/**
 * 评估策略性能
 *
 * @param {Object} backtestResults - 回测结果
 * @returns {Object} 性能评估结果
 */
export function evaluatePerformance(backtestResults: any): any;
/**
 * 优化策略参数
 *
 * @param {Array} strategies - 策略数组
 * @param {Object} backtestResults - 回测结果
 * @returns {Array} 优化后的策略数组
 */
export function optimizeParameters(strategies: any[], backtestResults: any): any[];
