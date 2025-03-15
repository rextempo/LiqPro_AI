/**
 * 数据验证错误类
 * 创建于: 2025-03-16
 */

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
} 