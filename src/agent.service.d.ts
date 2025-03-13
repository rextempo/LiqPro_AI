import { Repository } from 'typeorm';
import { BaseService } from './base.service';
import { Agent } from '../entities/agent.entity';
export declare class AgentService extends BaseService<Agent> {
  constructor(repository: Repository<Agent>);
  findByUserId(userId: string): Promise<Agent[]>;
  findByStatus(status: string): Promise<Agent[]>;
  findByHealthScoreRange(minScore: number, maxScore: number): Promise<Agent[]>;
  findRiskyAgents(threshold: number): Promise<Agent[]>;
  updateHealthScore(id: string, healthScore: number): Promise<Agent | null>;
  updateStatus(id: string, status: string): Promise<Agent | null>;
  updatePositions(id: string, positions: Record<string, any>[]): Promise<Agent | null>;
  updateBalances(id: string, totalValue: number, availableBalance: number): Promise<Agent | null>;
}
//# sourceMappingURL=agent.service.d.ts.map
