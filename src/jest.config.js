module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json',
      diagnostics: {
        ignoreCodes: [7016, 2724, 2582, 2304, 2339, 2694, 6059, 2345]
      },
      useESM: false
    }]
  },
  transformIgnorePatterns: [
    'node_modules/(?!(uuid|@solana/web3.js|jayson|superstruct|@noble|bn.js|buffer|borsh|bs58|rpc-websockets|eventemitter3|node-fetch|web-encoding|ws)/)'
  ],
  globals: {
    'ts-jest': {
      isolatedModules: true,
      tsconfig: 'tsconfig.test.json',
      useESM: false
    }
  },
  testTimeout: 30000, // 30 seconds
  verbose: true,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
}; 