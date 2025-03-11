/**
 * Signal Service Configuration
 */
import dotenv from 'dotenv';
import { SignalServiceConfig } from './types/config';

// Load environment variables
dotenv.config();

/**
 * Signal service configuration
 */
export const config: SignalServiceConfig = {
  // Server configuration
  port: parseInt(process.env.PORT || '3002', 10),
  host: process.env.HOST || '0.0.0.0',
  
  // Signal generation configuration
  signalGenerationInterval: parseInt(process.env.SIGNAL_GENERATION_INTERVAL || '300000', 10), // Default: 5 minutes
  strategyUpdateInterval: parseInt(process.env.STRATEGY_UPDATE_INTERVAL || '3600000', 10), // Default: 1 hour
  
  // API configuration
  dataServiceUrl: process.env.DATA_SERVICE_URL || 'http://localhost:3001',
  meteoraServiceUrl: process.env.METEORA_SERVICE_URL || 'http://localhost:3002',
  jupiterServiceUrl: process.env.JUPITER_SERVICE_URL || 'http://localhost:3003',
  
  // Cache configuration
  cacheEnabled: process.env.CACHE_ENABLED === 'true',
  cacheExpiry: parseInt(process.env.CACHE_EXPIRY || '300000', 10), // Default: 5 minutes
  redisUrl: process.env.REDIS_URL,
  redisOptions: {
    maxRetries: parseInt(process.env.REDIS_MAX_RETRIES || '10', 10),
    connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '5000', 10)
  },
  
  // HTTP client configuration
  maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
  timeout: parseInt(process.env.TIMEOUT || '30000', 10), // Default: 30 seconds
  
  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // Default: 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000', 10) // Default: 1000 requests per window
  },
  
  // Authentication
  auth: {
    enabled: process.env.AUTH_ENABLED === 'true',
    jwtSecret: process.env.JWT_SECRET || 'your-jwt-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },
  
  // CORS configuration
  cors: {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
    credentials: process.env.CORS_CREDENTIALS === 'true'
  },
  
  // Monitoring
  monitoring: {
    enabled: process.env.MONITORING_ENABLED === 'true',
    interval: parseInt(process.env.MONITORING_INTERVAL || '60000', 10) // Default: 1 minute
  },
  
  // Alerts
  alerts: {
    enabled: process.env.ALERTS_ENABLED === 'true',
    channels: process.env.ALERTS_CHANNELS ? JSON.parse(process.env.ALERTS_CHANNELS) : ['email']
  },
  
  // Security configuration
  apiKeys: (process.env.API_KEYS || '').split(',').filter(Boolean),
  
  // Logging configuration
  logLevel: process.env.LOG_LEVEL || 'info'
};

export default config; 