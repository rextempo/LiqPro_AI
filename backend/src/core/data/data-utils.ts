/**
 * @file 数据与监控模块的工具类
 * @module core/data/data-utils
 */

import { PublicKey } from '@solana/web3.js';
import { PoolData, TokenInfo, MarketMetrics } from './data-types';

/**
 * 数据工具类
 * 提供数据格式化、验证、计算和比较等功能
 */
export class DataUtils {
  /**
   * 格式化价格
   * @param price - 价格数值
   * @param decimals - 精度
   * @returns 格式化后的价格字符串
   */
  static formatPrice(price: number, decimals: number): string {
    if (typeof price !== 'number' || typeof decimals !== 'number') {
      throw new Error('Invalid parameters: price and decimals must be numbers');
    }
    if (decimals < 0) {
      throw new Error('Invalid decimals: must be non-negative');
    }
    return price.toFixed(decimals);
  }

  /**
   * 格式化交易量
   * @param volume - 交易量数值
   * @returns 格式化后的交易量字符串（K/M/B）
   */
  static formatVolume(volume: number): string {
    if (typeof volume !== 'number') {
      throw new Error('Invalid parameter: volume must be a number');
    }
    if (volume < 0) {
      throw new Error('Invalid volume: must be non-negative');
    }
    if (volume >= 1e9) {
      return `${(volume / 1e9).toFixed(2)}B`;
    }
    if (volume >= 1e6) {
      return `${(volume / 1e6).toFixed(2)}M`;
    }
    if (volume >= 1e3) {
      return `${(volume / 1e3).toFixed(2)}K`;
    }
    return volume.toFixed(2);
  }

  /**
   * 验证Solana公钥地址
   * @param address - 公钥地址字符串
   * @returns 是否为有效的公钥地址
   */
  static isValidPublicKey(address: string): boolean {
    if (typeof address !== 'string') {
      return false;
    }
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 验证池子数据
   * @param data - 池子数据对象
   * @returns 是否为有效的池子数据
   */
  static isValidPoolData(data: PoolData): boolean {
    return (
      typeof data.id === 'string' &&
      typeof data.address === 'string' &&
      typeof data.name === 'string' &&
      this.isValidTokenInfo(data.tokens.tokenX) &&
      this.isValidTokenInfo(data.tokens.tokenY) &&
      typeof data.fees.last24h === 'number' &&
      typeof data.liquidity.total === 'string' &&
      typeof data.yields.apr === 'number' &&
      typeof data.lastUpdate === 'string'
    );
  }

  /**
   * 验证代币信息
   * @param data - 代币信息对象
   * @returns 是否为有效的代币信息
   */
  static isValidTokenInfo(data: TokenInfo): boolean {
    return (
      typeof data.mint === 'string' &&
      typeof data.reserve === 'string' &&
      typeof data.amount === 'number' &&
      typeof data.symbol === 'string' &&
      typeof data.decimals === 'number' &&
      typeof data.price === 'number'
    );
  }

  /**
   * 验证市场指标
   * @param data - 市场指标对象
   * @returns 是否为有效的市场指标
   */
  static isValidMarketMetrics(data: MarketMetrics): boolean {
    return (
      typeof data.poolId === 'string' &&
      data.timestamp instanceof Date &&
      typeof data.price === 'number' &&
      typeof data.volume === 'number' &&
      typeof data.liquidity === 'number' &&
      typeof data.fees === 'number'
    );
  }

  /**
   * 计算年化收益率(APR)
   * @param fees24h - 24小时费用
   * @param liquidity - 流动性
   * @returns 年化收益率
   */
  static calculateAPR(fees24h: number, liquidity: number): number {
    if (liquidity === 0) return 0;
    return (fees24h * 365 * 100) / liquidity;
  }

  /**
   * 计算价格影响
   * @param amount - 交易数量
   * @param liquidity - 流动性
   * @param price - 价格
   * @returns 价格影响百分比
   */
  static calculatePriceImpact(
    amount: number,
    liquidity: number,
    price: number
  ): number {
    if (liquidity === 0) return 0;
    return (amount * price * 100) / liquidity;
  }

  /**
   * 比较池子数据（按流动性排序）
   * @param a - 第一个池子数据
   * @param b - 第二个池子数据
   * @returns 比较结果
   */
  static comparePoolData(a: PoolData, b: PoolData): number {
    return parseFloat(b.liquidity.total) - parseFloat(a.liquidity.total);
  }

  /**
   * 比较代币交易量
   * @param a - 第一个代币信息
   * @param b - 第二个代币信息
   * @returns 比较结果
   */
  static compareTokenVolume(a: TokenInfo, b: TokenInfo): number {
    return b.amount - a.amount;
  }
} 