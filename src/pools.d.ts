/**
 * 从多个来源获取所有 Meteora DLMM 池数据
 *
 * @param {Connection} connection - Solana 连接实例
 * @returns {Promise<Object>} 包含从不同来源获取的池数据
 */
export function fetchAllPools(connection: Connection): Promise<any>;
/**
 * 获取特定池的详细信息
 *
 * @param {Connection} connection - Solana 连接实例
 * @param {string|PublicKey} poolAddress - 池地址
 * @returns {Promise<Object>} 池详细信息
 */
export function getPoolByAddress(connection: Connection, poolAddress: string | PublicKey): Promise<any>;
import { Connection } from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js';
