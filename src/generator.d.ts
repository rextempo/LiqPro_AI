/**
 * 生成基础策略
 *
 * @param {Object} marketAnalysis - 市场分析结果
 * @param {Object} options - 策略生成选项
 * @returns {Array} 基础策略数组
 */
export function generateBaseStrategy(marketAnalysis: any, options?: any): any[];
/**
 * 调整策略参数
 *
 * @param {Array} strategies - 基础策略数组
 * @param {Object} marketAnalysis - 市场分析结果
 * @returns {Array} 调整后的策略数组
 */
export function adjustStrategyParameters(strategies: any[], marketAnalysis: any): any[];
/**
 * 组合策略
 *
 * @param {Array} strategies - 调整后的策略数组
 * @param {Object} options - 组合选项
 * @returns {Array} 组合后的策略数组
 */
export function combineStrategies(strategies: any[], options?: any): any[];
