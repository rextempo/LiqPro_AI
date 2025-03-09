import { config } from 'dotenv';

// 加载环境变量
config();

// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379'; 