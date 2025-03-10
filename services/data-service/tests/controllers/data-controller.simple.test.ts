import { DataController } from '../../src/controllers/data-controller';

// Mock the @liqpro/monitoring module
jest.mock('@liqpro/monitoring', () => ({
  createLogger: jest.fn().mockReturnValue({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

describe('DataController', () => {
  let dataController: DataController;

  const mockConfig = {
    rpcEndpoint: 'https://api.mainnet-beta.solana.com',
    rpcCommitment: 'confirmed' as 'processed' | 'confirmed' | 'finalized',
    apiKeys: {
      coingecko: 'mock-coingecko-key',
      coinmarketcap: 'mock-coinmarketcap-key',
      jupiter: 'mock-jupiter-key',
    },
    poolDataInterval: 60000,
    marketPriceInterval: 300000,
    eventPollingInterval: 10000,
    storage: {
      hotDataThreshold: 30 * 24 * 60 * 60 * 1000,
      warmDataThreshold: 90 * 24 * 60 * 60 * 1000,
      maxHotDataPoints: 10000,
      compressWarmData: true,
      compressColdData: true,
      enableAutoArchiving: true,
      archiveInterval: 24 * 60 * 60 * 1000,
    },
    whaleMonitoring: {
      minValueUSD: 50000,
      minPoolPercentage: 5,
    },
  };

  beforeEach(() => {
    dataController = new DataController(mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Lifecycle methods', () => {
    test('should initialize correctly', () => {
      expect(dataController).toBeDefined();
    });

    test('should start and stop correctly', async () => {
      await dataController.start();
      dataController.stop();
      expect(true).toBe(true); // Just checking that no errors are thrown
    });
  });
});
