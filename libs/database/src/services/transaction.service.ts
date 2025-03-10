import { Repository, Between, FindOptionsWhere } from 'typeorm';
import { BaseService } from './base.service';
import { Transaction } from '../entities/transaction.entity';
import { DatabaseError } from '../index';

export class TransactionService extends BaseService<Transaction> {
  constructor(repository: Repository<Transaction>) {
    super(repository);
  }

  async findByAgentId(agentId: string): Promise<Transaction[]> {
    try {
      return await this.repository.find({
        where: { agentId },
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async findByPoolAddress(poolAddress: string): Promise<Transaction[]> {
    try {
      return await this.repository.find({
        where: { poolAddress },
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<Transaction[]> {
    try {
      return await this.repository.find({
        where: {
          createdAt: Between(startDate, endDate),
        },
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async findByType(type: string): Promise<Transaction[]> {
    try {
      return await this.repository.find({
        where: { type },
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async findByStatus(status: string): Promise<Transaction[]> {
    try {
      return await this.repository.find({
        where: { status },
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async findPendingTransactions(): Promise<Transaction[]> {
    try {
      return await this.repository.find({
        where: { status: 'PENDING' },
        order: { createdAt: 'ASC' },
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateStatus(
    id: string,
    status: string,
    metadata?: Record<string, any>
  ): Promise<Transaction | null> {
    try {
      const updateData: Partial<Transaction> = { status };
      if (metadata) {
        updateData.metadata = metadata;
      }
      await this.repository.update(id, updateData);
      return this.findById(id);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getAgentTransactionStats(agentId: string): Promise<{
    totalTransactions: number;
    totalAmount: number;
    successRate: number;
  }> {
    try {
      const transactions = await this.repository.find({
        where: { agentId },
      });

      const totalTransactions = transactions.length;
      const successfulTransactions = transactions.filter(t => t.status === 'CONFIRMED').length;
      const totalAmount = transactions.reduce((sum, t) => sum + Number(t.amount), 0);

      return {
        totalTransactions,
        totalAmount,
        successRate: totalTransactions > 0 ? (successfulTransactions / totalTransactions) * 100 : 0,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getPoolTransactionStats(poolAddress: string): Promise<{
    totalTransactions: number;
    totalAmount: number;
    averagePriceImpact: number;
  }> {
    try {
      const transactions = await this.repository.find({
        where: { poolAddress },
      });

      const totalTransactions = transactions.length;
      const totalAmount = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
      const totalPriceImpact = transactions.reduce((sum, t) => sum + Number(t.priceImpact), 0);

      return {
        totalTransactions,
        totalAmount,
        averagePriceImpact: totalTransactions > 0 ? totalPriceImpact / totalTransactions : 0,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }
}
