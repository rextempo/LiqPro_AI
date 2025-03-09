import { DataSourceOptions } from 'typeorm';
import { MongoClientOptions } from 'mongodb';
import { config } from 'dotenv';
import { Agent } from '../entities/agent.entity';
import { Transaction } from '../entities/transaction.entity';

// 加载环境变量
config();

// PostgreSQL配置
export const postgresConfig: DataSourceOptions = {
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  username: process.env.POSTGRES_USER || 'admin',
  password: process.env.POSTGRES_PASSWORD || 'secret',
  database: process.env.POSTGRES_DB || 'liqpro',
  entities: [Agent, Transaction],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  ssl: process.env.POSTGRES_SSL === 'true' ? {
    rejectUnauthorized: false
  } : false
};

// MongoDB配置
export const mongoConfig = {
  url: process.env.MONGODB_URL || 'mongodb://admin:secret@localhost:27017/liqpro',
  options: {
    useUnifiedTopology: true
  } as MongoClientOptions
};

// Redis配置
export const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => Math.min(times * 50, 2000)
}; 