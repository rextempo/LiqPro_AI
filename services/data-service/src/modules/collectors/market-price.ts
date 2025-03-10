import axios from 'axios';
import { createLogger } from '@liqpro/monitoring';
import { Connection, PublicKey } from '@solana/web3.js';

const logger = createLogger('data-service:market-price-collector');

/**
 * Market Price Data Collector
 * Responsible for fetching market price data from various sources
 */
export class MarketPriceCollector {
  private priceCache: Map<string, { price: number, timestamp: number }> = new Map();
  private updateInterval: number = 5 * 60 * 1000; // 5 minutes in milliseconds
  private connection: Connection;
  
  /**
   * Create a new Market Price Collector
   * @param rpcEndpoint Solana RPC endpoint
   * @param apiKeys API keys for various price sources
   */
  constructor(
    rpcEndpoint: string,
    private apiKeys: { 
      coingecko?: string,
      coinmarketcap?: string 
    } = {}
  ) {
    this.connection = new Connection(rpcEndpoint);
    logger.info('Market Price Collector initialized');
  }

  /**
   * Get token price from CoinGecko
   * @param tokenId CoinGecko token ID
   * @param currency Currency to get price in (default: usd)
   * @returns Token price
   */
  async getPriceFromCoinGecko(tokenId: string, currency: string = 'usd'): Promise<number> {
    const cacheKey = `coingecko:${tokenId}:${currency}`;
    const now = Date.now();
    const cachedData = this.priceCache.get(cacheKey);
    
    // Return cached data if valid
    if (cachedData && (now - cachedData.timestamp < this.updateInterval)) {
      return cachedData.price;
    }
    
    try {
      logger.info(`Fetching price for ${tokenId} from CoinGecko`);
      
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${tokenId}&vs_currencies=${currency}`;
      const headers: Record<string, string> = {};
      
      // Add API key if available
      if (this.apiKeys.coingecko) {
        headers['x-cg-pro-api-key'] = this.apiKeys.coingecko;
      }
      
      const response = await axios.get(url, { headers });
      const price = response.data[tokenId][currency];
      
      // Update cache
      this.priceCache.set(cacheKey, { price, timestamp: now });
      
      return price;
    } catch (error) {
      logger.error(`Error fetching price for ${tokenId} from CoinGecko`, { error });
      
      // Return cached data if available, otherwise rethrow
      if (cachedData) {
        logger.info(`Returning cached price for ${tokenId}`);
        return cachedData.price;
      }
      
      throw error;
    }
  }

  /**
   * Get token price from CoinMarketCap
   * @param tokenSymbol Token symbol
   * @param currency Currency to get price in (default: USD)
   * @returns Token price
   */
  async getPriceFromCoinMarketCap(tokenSymbol: string, currency: string = 'USD'): Promise<number> {
    const cacheKey = `coinmarketcap:${tokenSymbol}:${currency}`;
    const now = Date.now();
    const cachedData = this.priceCache.get(cacheKey);
    
    // Return cached data if valid
    if (cachedData && (now - cachedData.timestamp < this.updateInterval)) {
      return cachedData.price;
    }
    
    try {
      logger.info(`Fetching price for ${tokenSymbol} from CoinMarketCap`);
      
      if (!this.apiKeys.coinmarketcap) {
        throw new Error('CoinMarketCap API key is required');
      }
      
      const url = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest';
      const response = await axios.get(url, {
        headers: {
          'X-CMC_PRO_API_KEY': this.apiKeys.coinmarketcap
        },
        params: {
          symbol: tokenSymbol,
          convert: currency
        }
      });
      
      const price = response.data.data[tokenSymbol].quote[currency].price;
      
      // Update cache
      this.priceCache.set(cacheKey, { price, timestamp: now });
      
      return price;
    } catch (error) {
      logger.error(`Error fetching price for ${tokenSymbol} from CoinMarketCap`, { error });
      
      // Return cached data if available, otherwise rethrow
      if (cachedData) {
        logger.info(`Returning cached price for ${tokenSymbol}`);
        return cachedData.price;
      }
      
      throw error;
    }
  }

  /**
   * Get token price from Jupiter API
   * @param tokenMint Token mint address
   * @param quoteMint Quote token mint address (default: USDC)
   * @returns Token price
   */
  async getPriceFromJupiter(
    tokenMint: string, 
    quoteMint: string = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' // USDC mint
  ): Promise<number> {
    const cacheKey = `jupiter:${tokenMint}:${quoteMint}`;
    const now = Date.now();
    const cachedData = this.priceCache.get(cacheKey);
    
    // Return cached data if valid
    if (cachedData && (now - cachedData.timestamp < this.updateInterval)) {
      return cachedData.price;
    }
    
    try {
      logger.info(`Fetching price for ${tokenMint} from Jupiter`);
      
      const url = `https://price.jup.ag/v4/price?ids=${tokenMint}&vsToken=${quoteMint}`;
      const response = await axios.get(url);
      
      const price = response.data.data[tokenMint].price;
      
      // Update cache
      this.priceCache.set(cacheKey, { price, timestamp: now });
      
      return price;
    } catch (error) {
      logger.error(`Error fetching price for ${tokenMint} from Jupiter`, { error });
      
      // Return cached data if available, otherwise rethrow
      if (cachedData) {
        logger.info(`Returning cached price for ${tokenMint}`);
        return cachedData.price;
      }
      
      throw error;
    }
  }

  /**
   * Monitor token price volatility
   * @param tokenIdentifier Token identifier (mint, symbol, or ID depending on source)
   * @param source Price source ('coingecko', 'coinmarketcap', or 'jupiter')
   * @param thresholdPercentage Threshold percentage (0-100) to consider as volatile
   * @param timeWindowMs Time window in milliseconds to check volatility
   * @returns Object with volatility data if detected, null otherwise
   */
  async monitorPriceVolatility(
    tokenIdentifier: string,
    source: 'coingecko' | 'coinmarketcap' | 'jupiter',
    thresholdPercentage: number = 15,
    timeWindowMs: number = 30 * 60 * 1000 // 30 minutes
  ): Promise<any | null> {
    try {
      // Get current price
      let currentPrice: number;
      
      switch (source) {
        case 'coingecko':
          currentPrice = await this.getPriceFromCoinGecko(tokenIdentifier);
          break;
        case 'coinmarketcap':
          currentPrice = await this.getPriceFromCoinMarketCap(tokenIdentifier);
          break;
        case 'jupiter':
          currentPrice = await this.getPriceFromJupiter(tokenIdentifier);
          break;
        default:
          throw new Error(`Unsupported price source: ${source}`);
      }
      
      // Store current price with timestamp for future volatility checks
      const cacheKey = `volatility:${source}:${tokenIdentifier}`;
      const now = Date.now();
      const historicalPrices = this.getHistoricalPrices(cacheKey);
      
      // Add current price to historical data
      historicalPrices.push({ price: currentPrice, timestamp: now });
      
      // Remove old data outside the time window
      const filteredPrices = historicalPrices.filter(item => now - item.timestamp <= timeWindowMs);
      
      // Store updated historical prices
      this.storeHistoricalPrices(cacheKey, filteredPrices);
      
      // Need at least 2 data points to calculate volatility
      if (filteredPrices.length < 2) {
        return null;
      }
      
      // Find oldest and newest prices in the time window
      const oldestData = filteredPrices.reduce((oldest, current) => 
        current.timestamp < oldest.timestamp ? current : oldest, filteredPrices[0]);
      
      const newestData = filteredPrices.reduce((newest, current) => 
        current.timestamp > newest.timestamp ? current : newest, filteredPrices[0]);
      
      // Calculate price change percentage
      const priceChange = newestData.price - oldestData.price;
      const changePercentage = Math.abs((priceChange / oldestData.price) * 100);
      
      // Check if volatility exceeds threshold
      if (changePercentage >= thresholdPercentage) {
        logger.warn(`High price volatility detected for ${tokenIdentifier}`, {
          source,
          oldPrice: oldestData.price,
          newPrice: newestData.price,
          changePercentage,
          timeWindowMs
        });
        
        return {
          tokenIdentifier,
          source,
          oldPrice: oldestData.price,
          oldTimestamp: oldestData.timestamp,
          newPrice: newestData.price,
          newTimestamp: newestData.timestamp,
          priceChange,
          changePercentage,
          direction: priceChange > 0 ? 'up' : 'down',
          timeWindowMs
        };
      }
      
      return null;
    } catch (error) {
      logger.error(`Error monitoring price volatility for ${tokenIdentifier}`, { error });
      return null;
    }
  }

  /**
   * Get historical prices from memory
   * @param cacheKey Cache key
   * @returns Array of historical price data
   */
  private getHistoricalPrices(cacheKey: string): Array<{ price: number, timestamp: number }> {
    const cachedData = this.priceCache.get(cacheKey);
    
    if (cachedData && Array.isArray(cachedData.price)) {
      return cachedData.price;
    }
    
    return [];
  }

  /**
   * Store historical prices in memory
   * @param cacheKey Cache key
   * @param prices Array of historical price data
   */
  private storeHistoricalPrices(cacheKey: string, prices: Array<{ price: number, timestamp: number }>): void {
    this.priceCache.set(cacheKey, { price: prices, timestamp: Date.now() });
  }

  /**
   * Set the cache update interval
   * @param intervalMs Interval in milliseconds
   */
  setUpdateInterval(intervalMs: number): void {
    this.updateInterval = intervalMs;
    logger.info(`Update interval set to ${intervalMs}ms`);
  }

  /**
   * Clear the price cache
   * @param tokenIdentifier Optional token identifier to clear specific cache
   * @param source Optional price source to clear specific cache
   */
  clearCache(tokenIdentifier?: string, source?: string): void {
    if (tokenIdentifier && source) {
      const pattern = `${source}:${tokenIdentifier}`;
      
      // Delete all cache entries matching the pattern
      for (const key of this.priceCache.keys()) {
        if (key.startsWith(pattern)) {
          this.priceCache.delete(key);
        }
      }
      
      logger.info(`Cache cleared for ${tokenIdentifier} from ${source}`);
    } else {
      this.priceCache.clear();
      logger.info('All price cache cleared');
    }
  }
} 