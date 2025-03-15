import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// 加载环境变量
dotenv.config();

// 环境变量验证schema
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.string().transform(Number).default('5432'),
  DB_NAME: z.string(),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  SOLANA_RPC_ENDPOINT: z.string().url(),
  SOLANA_WS_ENDPOINT: z.string().url(),
  SOLANA_NETWORK: z.literal('mainnet-beta'),
  SOLANA_TIMEOUT: z.string().transform(Number).default('30000'),
  JUPITER_API_URL: z.string().url(),
  JUPITER_API_TIMEOUT: z.string().transform(Number).default('30000'),
  JUPITER_SLIPPAGE_BPS: z.string().transform(Number).default('50'),
  JUPITER_MAX_ACCOUNTS: z.string().transform(Number).default('64'),
  JUPITER_PRIORITY_FEE_LAMPORTS: z.string().transform(Number).default('10000000'),
  JUPITER_PRIORITY_LEVEL: z.enum(['low', 'medium', 'high', 'veryHigh']).default('veryHigh'),
  JUPITER_DYNAMIC_SLIPPAGE_MAX_BPS: z.string().transform(Number).default('300'),
  JUPITER_DYNAMIC_COMPUTE_UNIT_LIMIT: z.string().transform((val: string) => val === 'true').default('true'),
  JUPITER_WRAP_AND_UNWRAP_SOL: z.string().transform((val: string) => val === 'true').default('true'),
  METEORA_API_KEY: z.string(),
  METEORA_API_URL: z.string().url(),
  METEORA_API_TIMEOUT: z.string().transform(Number).default('30000'),
  METEORA_API_MAX_RETRIES: z.string().transform(Number).default('3'),
  METEORA_API_RATE_LIMIT_MAX: z.string().transform(Number).default('100'),
  METEORA_API_RATE_LIMIT_WINDOW: z.string().transform(Number).default('60000'),
  METEORA_PROGRAM_ID: z.string().default('LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo'),
  METEORA_NETWORK: z.literal('mainnet-beta').default('mainnet-beta'),
  METEORA_WALLET_PUBLIC_KEY: z.string(),
  METEORA_WALLET_SECRET_KEY: z.string(),
  METEORA_PRIORITY_FEE_LAMPORTS: z.string().transform(Number).default('10000000'),
  METEORA_PRIORITY_LEVEL: z.enum(['low', 'medium', 'high', 'veryHigh']).default('veryHigh'),
  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string().default('24h'),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().transform(Number).default('6379'),
  REDIS_PASSWORD: z.string().optional(),
  CORS_ORIGIN: z.string().url(),
  RATE_LIMIT_MAX: z.string().transform(Number).default('100'),
  ENABLE_METRICS: z.string().transform((val: string) => val === 'true').default('false'),
  ENABLE_TRACING: z.string().transform((val: string) => val === 'true').default('false'),
  JAEGER_AGENT_HOST: z.string().default('localhost'),
  JAEGER_AGENT_PORT: z.string().transform(Number).default('6832'),
});

// 验证环境变量
const env = envSchema.parse(process.env);

// 根据环境加载对应的配置文件
const configPath = path.join(__dirname, '../../config', `${env.NODE_ENV}.js`);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const config = require(configPath);

// 合并配置
const finalConfig = {
  ...config,
  env: env.NODE_ENV,
};

// 导出配置
export default finalConfig;

// 导出类型
export type Config = typeof finalConfig; 