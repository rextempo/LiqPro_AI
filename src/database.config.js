"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisConfig = exports.mongoConfig = exports.postgresConfig = void 0;
const dotenv_1 = require("dotenv");
const agent_entity_1 = require("../entities/agent.entity");
const transaction_entity_1 = require("../entities/transaction.entity");
// 加载环境变量
(0, dotenv_1.config)();
// PostgreSQL配置
exports.postgresConfig = {
    type: 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    username: process.env.POSTGRES_USER || 'admin',
    password: process.env.POSTGRES_PASSWORD || 'secret',
    database: process.env.POSTGRES_DB || 'liqpro',
    entities: [agent_entity_1.Agent, transaction_entity_1.Transaction],
    migrations: ['src/migrations/*.ts'],
    synchronize: false,
    logging: process.env.NODE_ENV === 'development',
    ssl: process.env.POSTGRES_SSL === 'true'
        ? {
            rejectUnauthorized: false,
        }
        : false,
};
// MongoDB配置
exports.mongoConfig = {
    url: process.env.MONGODB_URL || 'mongodb://admin:secret@localhost:27017/liqpro',
    options: {
        useUnifiedTopology: true,
    },
};
// Redis配置
exports.redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => Math.min(times * 50, 2000),
};
//# sourceMappingURL=database.config.js.map