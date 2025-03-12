/**
 * Environment configuration
 * This file provides access to environment variables with defaults
 */

export const config = {
  // API configuration
  api: {
    baseUrl: process.env.REACT_APP_API_URL || 'https://api.liqpro.com',
    wsUrl: process.env.REACT_APP_WS_URL || 'wss://api.liqpro.com/ws',
  },
  
  // Application configuration
  app: {
    version: process.env.REACT_APP_VERSION || '0.1.0',
    isTestMode: process.env.REACT_APP_TEST_MODE === 'true',
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
  },
  
  // Feature flags
  features: {
    enableWalletConnect: true,
    enableApiKeyAuth: true,
    enableAdminPanel: true,
  },
  
  // Security configuration
  security: {
    tokenRefreshThreshold: 5 * 60 * 1000, // 5 minutes in milliseconds
    maxReconnectAttempts: 5,
    reconnectInterval: 3000, // 3 seconds
  },
};

export default config; 