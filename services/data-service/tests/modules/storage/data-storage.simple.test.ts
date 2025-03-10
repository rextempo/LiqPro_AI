import { DataStorage, StorageConfig } from '../../../src/modules/storage/data-storage';

// Mock the @liqpro/monitoring module
jest.mock('@liqpro/monitoring', () => ({
  createLogger: jest.fn().mockReturnValue({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

describe('DataStorage', () => {
  let dataStorage: DataStorage;

  const mockConfig: StorageConfig = {
    hotDataThreshold: 30 * 24 * 60 * 60 * 1000, // 30 days
    warmDataThreshold: 90 * 24 * 60 * 60 * 1000, // 90 days
    maxHotDataPoints: 1000,
    compressWarmData: true,
    compressColdData: true,
    enableAutoArchiving: true,
    archiveInterval: 24 * 60 * 60 * 1000, // 24 hours
  };

  beforeEach(() => {
    // Create a new instance for each test
    dataStorage = new DataStorage(mockConfig);
  });

  afterEach(() => {
    // Clean up after each test
    if (dataStorage) {
      dataStorage.close();
    }

    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize correctly', () => {
      expect(dataStorage).toBeDefined();
    });

    test('should initialize and close', async () => {
      await dataStorage.initialize();
      dataStorage.close();
      expect(true).toBe(true); // Just checking that no errors are thrown
    });
  });
});
