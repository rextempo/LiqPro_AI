module.exports = {
  projects: ['<rootDir>/libs/*/jest.config.js', '<rootDir>/services/*/jest.config.js'],
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov'],
  testTimeout: 30000,
  detectOpenHandles: true
}; 