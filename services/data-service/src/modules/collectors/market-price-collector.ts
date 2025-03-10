import { createLogger } from '@liqpro/monitoring';
import axios from 'axios';
import { PriceSource } from '../../types/data-types';

const logger = createLogger('data-service:market-price-collector');

/**
 * Configuration for the MarketPriceCollector
 */
export interface MarketPriceCollectorConfig {
  interval: number;
  onData: (data: Record<string, { price: number; source: string }>) => void;
  apiKeys?: {
    coingecko?: string;
    coinmarketcap?: string;
    jupiter?: string;
  };
}

/**
 * Market Price Collector
 * Responsible for collecting token prices from various sources
 */
export class MarketPriceCollector {
  private config: MarketPriceCollectorConfig;
  private pollingTimer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private trackedTokens: Set<string> = new Set();
  private priceCache: Map<string, { price: number; source: string; timestamp: number }> = new Map();

  /**
   * Create a new Market Price Collector
   * @param config Collector configuration
   */
  constructor(config: MarketPriceCollectorConfig) {
    this.config = config;
    
    logger.info('Market Price Collector initialized', {
      interval: config.interval
    });
  }

  /**
   * Start collecting market prices
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.info('Market Price Collector is already running');
      return;
    }

    logger.info('Starting Market Price Collector');
    
    // Start polling timer
    this.pollingTimer = setInterval(() => {
      this.collectPrices();
    }, this.config.interval);
    
    // Collect prices immediately
    await this.collectPrices();
    
    this.isRunning = true;
    logger.info('Market Price Collector started');
  }

  /**
   * Stop collecting market prices
   */
  stop(): void {
    if (!this.isRunning) {
      logger.info('Market Price Collector is not running');
      return;
    }

    logger.info('Stopping Market Price Collector');
    
    // Clear polling timer
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
    
    this.isRunning = false;
    logger.info('Market Price Collector stopped');
  }

  /**
   * Add a token to track
   * @param tokenMint Token mint address
   */
  async addToken(tokenMint: string): Promise<void> {
    if (this.trackedTokens.has(tokenMint)) {
      logger.info(`Token ${tokenMint} is already being tracked`);
      return;
    }

    this.trackedTokens.add(tokenMint);
    logger.info(`Added token ${tokenMint} to tracking`);
    
    // Try to get initial price
    await this.collectPriceForToken(tokenMint);
  }

  /**
   * Remove a token from tracking
   * @param tokenMint Token mint address
   */
  removeToken(tokenMint: string): void {
    if (!this.trackedTokens.has(tokenMint)) {
      logger.info(`Token ${tokenMint} is not being tracked`);
      return;
    }

    this.trackedTokens.delete(tokenMint);
    logger.info(`Removed token ${tokenMint} from tracking`);
  }

  /**
   * Get all tracked tokens
   * @returns Array of tracked token mint addresses
   */
  getTrackedTokens(): string[] {
    return Array.from(this.trackedTokens);
  }

  /**
   * Collect prices for all tracked tokens
   */
  private async collectPrices(): Promise<void> {
    logger.debug(`Collecting prices for ${this.trackedTokens.size} tokens`);
    
    const priceData: Record<string, { price: number; source: string }> = {};
    
    for (const tokenMint of this.trackedTokens) {
      try {
        // Try to get price from Jupiter first
        let price = await this.getPriceFromJupiter(tokenMint);
        let source = PriceSource.JUPITER;
        
        // If Jupiter fails, try CoinGecko
        if (price === undefined) {
          price = await this.getPriceFromCoinGecko(tokenMint);
          source = PriceSource.COINGECKO;
        }
        
        // If CoinGecko fails, try CoinMarketCap
        if (price === undefined) {
          price = await this.getPriceFromCoinMarketCap(tokenMint);
          source = PriceSource.COINMARKETCAP;
        }
        
        // If we got a price, add it to the data
        if (price !== undefined) {
          priceData[tokenMint] = { price, source };
          
          // Update cache
          this.priceCache.set(tokenMint, { 
            price, 
            source, 
            timestamp: Math.floor(Date.now() / 1000) 
          });
          
          // Monitor price volatility
          this.monitorPriceVolatility(tokenMint, price, source);
        }
      } catch (error: any) {
        logger.error(`Error collecting price for token ${tokenMint}`, { error });
      }
    }
    
    // Call the onData callback with the collected prices
    if (Object.keys(priceData).length > 0) {
      this.config.onData(priceData);
    }
    
    logger.debug(`Collected prices for ${Object.keys(priceData).length} tokens`);
  }

  /**
   * Collect price for a specific token
   * @param tokenMint Token mint address
   * @returns Price in USD or undefined if not available
   */
  private async collectPriceForToken(tokenMint: string): Promise<number | undefined> {
    try {
      // Try to get price from Jupiter first
      let price = await this.getPriceFromJupiter(tokenMint);
      let source = PriceSource.JUPITER;
      
      // If Jupiter fails, try CoinGecko
      if (price === undefined) {
        price = await this.getPriceFromCoinGecko(tokenMint);
        source = PriceSource.COINGECKO;
      }
      
      // If CoinGecko fails, try CoinMarketCap
      if (price === undefined) {
        price = await this.getPriceFromCoinMarketCap(tokenMint);
        source = PriceSource.COINMARKETCAP;
      }
      
      // If we got a price, update cache and notify
      if (price !== undefined) {
        // Update cache
        this.priceCache.set(tokenMint, { 
          price, 
          source, 
          timestamp: Math.floor(Date.now() / 1000) 
        });
        
        // Call the onData callback with the collected price
        this.config.onData({ [tokenMint]: { price, source } });
        
        // Monitor price volatility
        this.monitorPriceVolatility(tokenMint, price, source);
      }
      
      return price;
    } catch (error: any) {
      logger.error(`Error collecting price for token ${tokenMint}`, { error });
      return undefined;
    }
  }

  /**
   * Get price from Jupiter API
   * @param tokenMint Token mint address
   * @returns Price in USD or undefined if not available
   */
  private async getPriceFromJupiter(tokenMint: string): Promise<number | undefined> {
    try {
      // Check if we have a Jupiter API key
      const jupiterApiKey = this.config.apiKeys?.jupiter;
      
      // Jupiter API endpoint
      const url = `https://price.jup.ag/v4/price?ids=${tokenMint}`;
      
      // Make request
      const response = await axios.get(url, {
        headers: jupiterApiKey ? { 'Authorization': `Bearer ${jupiterApiKey}` } : {}
      });
      
      // Check if we got a valid response
      if (response.status === 200 && response.data && response.data.data && response.data.data[tokenMint]) {
        const price = response.data.data[tokenMint].price;
        if (price && typeof price === 'number') {
          logger.debug(`Got price for ${tokenMint} from Jupiter: ${price}`);
          return price;
        }
      }
      
      return undefined;
    } catch (error: any) {
      logger.error(`Error getting price from Jupiter for ${tokenMint}`, { error });
      return undefined;
    }
  }

  /**
   * Get price from CoinGecko API
   * @param tokenMint Token mint address
   * @returns Price in USD or undefined if not available
   */
  private async getPriceFromCoinGecko(tokenMint: string): Promise<number | undefined> {
    try {
      // Check if we have a CoinGecko API key
      const coinGeckoApiKey = this.config.apiKeys?.coingecko;
      
      // CoinGecko API endpoint
      // Note: In a real implementation, you would need to map Solana token mints to CoinGecko IDs
      // This is a simplified example
      const url = `https://api.coingecko.com/api/v3/simple/token_price/solana?contract_addresses=${tokenMint}&vs_currencies=usd`;
      
      // Make request
      const response = await axios.get(url, {
        headers: coinGeckoApiKey ? { 'x-cg-pro-api-key': coinGeckoApiKey } : {}
      });
      
      // Check if we got a valid response
      if (response.status === 200 && response.data && response.data[tokenMint]) {
        const price = response.data[tokenMint].usd;
        if (price && typeof price === 'number') {
          logger.debug(`Got price for ${tokenMint} from CoinGecko: ${price}`);
          return price;
        }
      }
      
      return undefined;
    } catch (error: any) {
      logger.error(`Error getting price from CoinGecko for ${tokenMint}`, { error });
      return undefined;
    }
  }

  /**
   * Get price from CoinMarketCap API
   * @param tokenMint Token mint address
   * @returns Price in USD or undefined if not available
   */
  private async getPriceFromCoinMarketCap(tokenMint: string): Promise<number | undefined> {
    try {
      // Check if we have a CoinMarketCap API key
      const coinMarketCapApiKey = this.config.apiKeys?.coinmarketcap;
      
      // If we don't have an API key, we can't use CoinMarketCap
      if (!coinMarketCapApiKey) {
        return undefined;
      }
      
      // CoinMarketCap API endpoint
      // Note: In a real implementation, you would need to map Solana token mints to CoinMarketCap IDs
      // This is a simplified example
      const url = `https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?address=${tokenMint}&platform=solana`;
      
      // Make request
      const response = await axios.get(url, {
        headers: { 'X-CMC_PRO_API_KEY': coinMarketCapApiKey }
      });
      
      // Check if we got a valid response
      if (response.status === 200 && response.data && response.data.data) {
        const data = response.data.data;
        const tokenData = data[Object.keys(data)[0]];
        
        if (tokenData && tokenData.quote && tokenData.quote.USD) {
          const price = tokenData.quote.USD.price;
          if (price && typeof price === 'number') {
            logger.debug(`Got price for ${tokenMint} from CoinMarketCap: ${price}`);
            return price;
          }
        }
      }
      
      return undefined;
    } catch (error: any) {
      logger.error(`Error getting price from CoinMarketCap for ${tokenMint}`, { error });
      return undefined;
    }
  }

  /**
   * Monitor price volatility
   * @param tokenMint Token mint address
   * @param newPrice New price
   * @param source Price source
   */
  private monitorPriceVolatility(tokenMint: string, newPrice: number, source: string): void {
    // Get previous price from cache
    const cachedData = this.priceCache.get(tokenMint);
    
    if (!cachedData) {
      return;
    }
    
    const oldPrice = cachedData.price;
    
    // Calculate price change percentage
    const changePercentage = ((newPrice - oldPrice) / oldPrice) * 100;
    
    // If price change is significant, log it
    if (Math.abs(changePercentage) >= 5) {
      const direction = changePercentage > 0 ? 'up' : 'down';
      
      logger.info(`Price ${direction} for ${tokenMint}: ${oldPrice} -> ${newPrice} (${changePercentage.toFixed(2)}%)`, {
        tokenMint,
        oldPrice,
        newPrice,
        changePercentage,
        direction,
        source
      });
    }
  }
} 