import { Repository, Between, LessThan } from 'typeorm';
import { BaseService } from './base.service';
import { Agent } from '../entities/agent.entity';
import { DatabaseError } from '../index';

export class AgentService extends BaseService<Agent> {
    constructor(repository: Repository<Agent>) {
        super(repository);
    }

    async findByUserId(userId: string): Promise<Agent[]> {
        try {
            return await this.repository.find({
                where: { userId },
                order: { createdAt: 'DESC' }
            });
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async findByStatus(status: string): Promise<Agent[]> {
        try {
            return await this.repository.find({
                where: { status },
                order: { updatedAt: 'DESC' }
            });
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async findByHealthScoreRange(minScore: number, maxScore: number): Promise<Agent[]> {
        try {
            return await this.repository.find({
                where: {
                    healthScore: Between(minScore, maxScore)
                },
                order: { healthScore: 'ASC' }
            });
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async findRiskyAgents(threshold: number): Promise<Agent[]> {
        try {
            return await this.repository.find({
                where: {
                    healthScore: LessThan(threshold),
                    status: 'RUNNING'
                },
                order: { healthScore: 'ASC' }
            });
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async updateHealthScore(id: string, healthScore: number): Promise<Agent | null> {
        try {
            await this.repository.update(id, { healthScore });
            return this.findById(id);
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async updateStatus(id: string, status: string): Promise<Agent | null> {
        try {
            await this.repository.update(id, { status });
            return this.findById(id);
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async updatePositions(id: string, positions: Record<string, any>[]): Promise<Agent | null> {
        try {
            await this.repository.update(id, { positions });
            return this.findById(id);
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async updateBalances(
        id: string, 
        totalValue: number, 
        availableBalance: number
    ): Promise<Agent | null> {
        try {
            await this.repository.update(id, { totalValue, availableBalance });
            return this.findById(id);
        } catch (error) {
            throw this.handleError(error);
        }
    }
} 