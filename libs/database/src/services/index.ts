import { DataSource } from 'typeorm';
import { Agent } from '../entities/agent.entity';
import { Transaction } from '../entities/transaction.entity';
import { AgentService } from './agent.service';
import { TransactionService } from './transaction.service';

export * from './agent.service';
export * from './transaction.service';

export class DatabaseServices {
    private static instance: DatabaseServices;
    private agentService: AgentService;
    private transactionService: TransactionService;

    private constructor(dataSource: DataSource) {
        this.agentService = new AgentService(dataSource.getRepository(Agent));
        this.transactionService = new TransactionService(dataSource.getRepository(Transaction));
    }

    static initialize(dataSource: DataSource): DatabaseServices {
        if (!DatabaseServices.instance) {
            DatabaseServices.instance = new DatabaseServices(dataSource);
        }
        return DatabaseServices.instance;
    }

    static getInstance(): DatabaseServices {
        if (!DatabaseServices.instance) {
            throw new Error('DatabaseServices not initialized. Call initialize() first.');
        }
        return DatabaseServices.instance;
    }

    getAgentService(): AgentService {
        return this.agentService;
    }

    getTransactionService(): TransactionService {
        return this.transactionService;
    }
} 