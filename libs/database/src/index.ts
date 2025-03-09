import { DataSource, Repository } from 'typeorm';
import { postgresConfig, mongoConfig, redisConfig } from './config/database.config';
import { Agent } from './entities/agent.entity';
import { Transaction } from './entities/transaction.entity';
import { Redis } from 'ioredis';
import { MongoClient } from 'mongodb';
import { DatabaseServices } from './services';

// PostgreSQL数据源
export const postgresDataSource = new DataSource(postgresConfig);

// MongoDB客户端
export const mongoClient = new MongoClient(mongoConfig.url, mongoConfig.options);

// Redis客户端
export const redisClient = new Redis(redisConfig);

// 导出实体
export * from './entities/agent.entity';
export * from './entities/transaction.entity';

// 导出服务
export * from './services';

// 导出配置
export { postgresConfig, mongoConfig, redisConfig };

// 初始化函数
export async function initializeDatabase(): Promise<DatabaseServices> {
    try {
        // 初始化PostgreSQL连接
        await postgresDataSource.initialize();
        console.warn('PostgreSQL connection initialized');

        // 初始化MongoDB连接
        await mongoClient.connect();
        console.warn('MongoDB connection initialized');

        // Redis连接已在创建时自动初始化
        console.warn('Redis connection initialized');

        // 初始化服务
        return DatabaseServices.initialize(postgresDataSource);
    } catch (error) {
        console.error('Error during database initialization:', error);
        throw error;
    }
}

// 关闭函数
export async function closeDatabase(): Promise<void> {
    try {
        await postgresDataSource.destroy();
        await mongoClient.close();
        await redisClient.quit();
    } catch (error) {
        console.error('Error during database shutdown:', error);
        throw error;
    }
}

export interface HealthCheck {
    status: 'ok' | 'error';
    message: string;
}

export async function checkDatabaseConnection(): Promise<HealthCheck> {
    try {
        await postgresDataSource.query('SELECT 1');
        await mongoClient.db().command({ ping: 1 });
        await redisClient.ping();
        
        return {
            status: 'ok',
            message: 'Database connection successful'
        };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            status: 'error',
            message: `Database connection failed: ${errorMessage}`
        };
    }
}

// Error handling types
export interface DatabaseError extends Error {
    code?: string;
    detail?: string;
}

// Re-export TypeORM essentials
export { DataSource, Repository };

// Error handling
export function handleDatabaseError(error: unknown): DatabaseError {
    const dbError: DatabaseError = {
        name: 'DatabaseError',
        message: 'An unknown database error occurred',
    };

    if (error instanceof Error) {
        dbError.message = error.message;
        dbError.stack = error.stack;
        if ('code' in error) {
            dbError.code = (error as any).code;
        }
        if ('detail' in error) {
            dbError.detail = (error as any).detail;
        }
    }

    return dbError;
} 