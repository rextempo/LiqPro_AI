import { Repository } from 'typeorm';
import { BaseService } from './base.service';
import { Transaction } from '../entities/transaction.entity';
export declare class TransactionService extends BaseService<Transaction> {
  constructor(repository: Repository<Transaction>);
  findByAgentId(agentId: string): Promise<Transaction[]>;
  findByPoolAddress(poolAddress: string): Promise<Transaction[]>;
  findByDateRange(startDate: Date, endDate: Date): Promise<Transaction[]>;
  findByType(type: string): Promise<Transaction[]>;
  findByStatus(status: string): Promise<Transaction[]>;
  findPendingTransactions(): Promise<Transaction[]>;
  updateStatus(
    id: string,
    status: string,
    metadata?: Record<string, any>
  ): Promise<Transaction | null>;
  getAgentTransactionStats(agentId: string): Promise<{
    totalTransactions: number;
    totalAmount: number;
    successRate: number;
  }>;
  getPoolTransactionStats(poolAddress: string): Promise<{
    totalTransactions: number;
    totalAmount: number;
    averagePriceImpact: number;
  }>;
}
//# sourceMappingURL=transaction.service.d.ts.map
