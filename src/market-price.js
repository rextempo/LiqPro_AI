"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketPriceCollector = void 0;
const axios_1 = __importDefault(require("axios"));
const monitoring_1 = require("@liqpro/monitoring");
const web3_js_1 = require("@solana/web3.js");
const logger = (0, monitoring_1.createLogger)('data-service:market-price-collector');
/**
 * Market Price Data Collector
 * Responsible for fetching market price data from various sources
 */
class MarketPriceCollector {
    /**
     * Create a new Market Price Collector
     * @param rpcEndpoint Solana RPC endpoint
     * @param apiKeys API keys for various price sources
     */
    constructor(rpcEndpoint, apiKeys = {}) {
        this.apiKeys = apiKeys;
        this.priceCache = new Map();
        this.updateInterval = 5 * 60 * 1000; // 5 minutes in milliseconds
        this.connection = new web3_js_1.Connection(rpcEndpoint);
        logger.info('Market Price Collector initialized');
    }
    /**
     * Get token price from CoinGecko
     * @param tokenId CoinGecko token ID
     * @param currency Currency to get price in (default: usd)
     * @returns Token price
     */
    async getPriceFromCoinGecko(tokenId, currency = 'usd') {
        const cacheKey = `coingecko:${tokenId}:${currency}`;
        const now = Date.now();
        const cachedData = this.priceCache.get(cacheKey);
        // Return cached data if valid
        if (cachedData && now - cachedData.timestamp < this.updateInterval) {
            return cachedData.price;
        }
        try {
            logger.info(`Fetching price for ${tokenId} from CoinGecko`);
            const url = `https://api.coingecko.com/api/v3/simple/price?ids=${tokenId}&vs_currencies=${currency}`;
            const headers = {};
            // Add API key if available
            if (this.apiKeys.coingecko) {
                headers['x-cg-pro-api-key'] = this.apiKeys.coingecko;
            }
            const response = await axios_1.default.get(url, { headers });
            const price = response.data[tokenId][currency];
            // Update cache
            this.priceCache.set(cacheKey, { price, timestamp: now });
            return price;
        }
        catch (error) {
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
    async getPriceFromCoinMarketCap(tokenSymbol, currency = 'USD') {
        const cacheKey = `coinmarketcap:${tokenSymbol}:${currency}`;
        const now = Date.now();
        const cachedData = this.priceCache.get(cacheKey);
        // Return cached data if valid
        if (cachedData && now - cachedData.timestamp < this.updateInterval) {
            return cachedData.price;
        }
        try {
            logger.info(`Fetching price for ${tokenSymbol} from CoinMarketCap`);
            if (!this.apiKeys.coinmarketcap) {
                throw new Error('CoinMarketCap API key is required');
            }
            const url = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest';
            const response = await axios_1.default.get(url, {
                headers: {
                    'X-CMC_PRO_API_KEY': this.apiKeys.coinmarketcap,
                },
                params: {
                    symbol: tokenSymbol,
                    convert: currency,
                },
            });
            const price = response.data.data[tokenSymbol].quote[currency].price;
            // Update cache
            this.priceCache.set(cacheKey, { price, timestamp: now });
            return price;
        }
        catch (error) {
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
    async getPriceFromJupiter(tokenMint, quoteMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' // USDC mint
    ) {
        const cacheKey = `jupiter:${tokenMint}:${quoteMint}`;
        const now = Date.now();
        const cachedData = this.priceCache.get(cacheKey);
        // Return cached data if valid
        if (cachedData && now - cachedData.timestamp < this.updateInterval) {
            return cachedData.price;
        }
        try {
            logger.info(`Fetching price for ${tokenMint} from Jupiter`);
            const url = `https://price.jup.ag/v4/price?ids=${tokenMint}&vsToken=${quoteMint}`;
            const response = await axios_1.default.get(url);
            const price = response.data.data[tokenMint].price;
            // Update cache
            this.priceCache.set(cacheKey, { price, timestamp: now });
            return price;
        }
        catch (error) {
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
    async monitorPriceVolatility(tokenIdentifier, source, thresholdPercentage = 15, timeWindowMs = 30 * 60 * 1000 // 30 minutes
    ) {
        try {
            // Get current price
            let currentPrice;
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
            const oldestData = filteredPrices.reduce((oldest, current) => (current.timestamp < oldest.timestamp ? current : oldest), filteredPrices[0]);
            const newestData = filteredPrices.reduce((newest, current) => (current.timestamp > newest.timestamp ? current : newest), filteredPrices[0]);
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
                    timeWindowMs,
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
                    timeWindowMs,
                };
            }
            return null;
        }
        catch (error) {
            logger.error(`Error monitoring price volatility for ${tokenIdentifier}`, { error });
            return null;
        }
    }
    /**
     * Get historical prices from memory
     * @param cacheKey Cache key
     * @returns Array of historical price data
     */
    getHistoricalPrices(cacheKey) {
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
    storeHistoricalPrices(cacheKey, prices) {
        this.priceCache.set(cacheKey, { price: prices, timestamp: Date.now() });
    }
    /**
     * Set the cache update interval
     * @param intervalMs Interval in milliseconds
     */
    setUpdateInterval(intervalMs) {
        this.updateInterval = intervalMs;
        logger.info(`Update interval set to ${intervalMs}ms`);
    }
    /**
     * Clear the price cache
     * @param tokenIdentifier Optional token identifier to clear specific cache
     * @param source Optional price source to clear specific cache
     */
    clearCache(tokenIdentifier, source) {
        if (tokenIdentifier && source) {
            const pattern = `${source}:${tokenIdentifier}`;
            // Delete all cache entries matching the pattern
            for (const key of this.priceCache.keys()) {
                if (key.startsWith(pattern)) {
                    this.priceCache.delete(key);
                }
            }
            logger.info(`Cache cleared for ${tokenIdentifier} from ${source}`);
        }
        else {
            this.priceCache.clear();
            logger.info('All price cache cleared');
        }
    }
}
exports.MarketPriceCollector = MarketPriceCollector;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2V0LXByaWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL21vZHVsZXMvY29sbGVjdG9ycy9tYXJrZXQtcHJpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsa0RBQTBCO0FBQzFCLG1EQUFrRDtBQUNsRCw2Q0FBd0Q7QUFFeEQsTUFBTSxNQUFNLEdBQUcsSUFBQSx5QkFBWSxFQUFDLHFDQUFxQyxDQUFDLENBQUM7QUFFbkU7OztHQUdHO0FBQ0gsTUFBYSxvQkFBb0I7SUFLL0I7Ozs7T0FJRztJQUNILFlBQ0UsV0FBbUIsRUFDWCxVQUdKLEVBQUU7UUFIRSxZQUFPLEdBQVAsT0FBTyxDQUdUO1FBZEEsZUFBVSxHQUFzRCxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQzFFLG1CQUFjLEdBQVcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQyw0QkFBNEI7UUFlMUUsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLG9CQUFVLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDOUMsTUFBTSxDQUFDLElBQUksQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDO0lBQ3BELENBQUM7SUFFRDs7Ozs7T0FLRztJQUNILEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxPQUFlLEVBQUUsV0FBbUIsS0FBSztRQUNuRSxNQUFNLFFBQVEsR0FBRyxhQUFhLE9BQU8sSUFBSSxRQUFRLEVBQUUsQ0FBQztRQUNwRCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDdkIsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFakQsOEJBQThCO1FBQzlCLElBQUksVUFBVSxJQUFJLEdBQUcsR0FBRyxVQUFVLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUNuRSxPQUFPLFVBQVUsQ0FBQyxLQUFLLENBQUM7UUFDMUIsQ0FBQztR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LENBQUM7b0JBQzVCLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUM5QixDQUFDO1lBQ0gsQ0FBQztZQUVELE1BQU0sQ0FBQyxJQUFJLENBQUMscUJBQXFCLGVBQWUsU0FBUyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBQ3JFLENBQUM7YUFBTSxDQUFDO1lBQ04sSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUN4QixNQUFNLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLENBQUM7UUFDekMsQ0FBQztJQUNILENBQUM7Q0FDRjtBQWhVRCxvREFnVUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgYXhpb3MgZnJvbSAnYXhpb3MnO1xuaW1wb3J0IHsgY3JlYXRlTG9nZ2VyIH0gZnJvbSAnQGxpcXByby9tb25pdG9yaW5nJztcbmltcG9ydCB7IENvbm5lY3Rpb24sIFB1YmxpY0tleSB9IGZyb20gJ0Bzb2xhbmEvd2ViMy5qcyc7XG5cbmNvbnN0IGxvZ2dlciA9IGNyZWF0ZUxvZ2dlcignZGF0YS1zZXJ2aWNlOm1hcmtldC1wcmljZS1jb2xsZWN0b3InKTtcblxuLyoqXG4gKiBNYXJrZXQgUHJpY2UgRGF0YSBDb2xsZWN0b3JcbiAqIFJlc3BvbnNpYmxlIGZvciBmZXRjaGluZyBtYXJrZXQgcHJpY2UgZGF0YSBmcm9tIHZhcmlvdXMgc291cmNlc1xuICovXG5leHBvcnQgY2xhc3MgTWFya2V0UHJpY2VDb2xsZWN0b3Ige1xuICBwcml2YXRlIHByaWNlQ2FjaGU6IE1hcDxzdHJpbmcsIHsgcHJpY2U6IG51bWJlcjsgdGltZXN0YW1wOiBudW1iZXIgfT4gPSBuZXcgTWFwKCk7XG4gIHByaXZhdGUgdXBkYXRlSW50ZXJ2YWw6IG51bWJlciA9IDUgKiA2MCAqIDEwMDA7IC8vIDUgbWludXRlcyBpbiBtaWxsaXNlY29uZHNcbiAgcHJpdmF0ZSBjb25uZWN0aW9uOiBDb25uZWN0aW9uO1xuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSBuZXcgTWFya2V0IFByaWNlIENvbGxlY3RvclxuICAgKiBAcGFyYW0gcnBjRW5kcG9pbnQgU29sYW5hIFJQQyBlbmRwb2ludFxuICAgKiBAcGFyYW0gYXBpS2V5cyBBUEkga2V5cyBmb3IgdmFyaW91cyBwcmljZSBzb3VyY2VzXG4gICAqL1xuICBjb25zdHJ1Y3RvcihcbiAgICBycGNFbmRwb2ludDogc3RyaW5nLFxuICAgIHByaXZhdGUgYXBpS2V5czoge1xuICAgICAgY29pbmdlY2tvPzogc3RyaW5nO1xuICAgICAgY29pbm1hcmtldGNhcD86IHN0cmluZztcbiAgICB9ID0ge31cbiAgKSB7XG4gICAgdGhpcy5jb25uZWN0aW9uID0gbmV3IENvbm5lY3Rpb24ocnBjRW5kcG9pbnQpO1xuICAgIGxvZ2dlci5pbmZvKCdNYXJrZXQgUHJpY2UgQ29sbGVjdG9yIGluaXRpYWxpemVkJyk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRva2VuIHByaWNlIGZyb20gQ29pbkdlY2tvXG4gICAqIEBwYXJhbSB0b2tlbklkIENvaW5HZWNrbyB0b2tlbiBJRFxuICAgKiBAcGFyYW0gY3VycmVuY3kgQ3VycmVuY3kgdG8gZ2V0IHByaWNlIGluIChkZWZhdWx0OiB1c2QpXG4gICAqIEByZXR1cm5zIFRva2VuIHByaWNlXG4gICAqL1xuICBhc3luYyBnZXRQcmljZUZyb21Db2luR2Vja28odG9rZW5JZDogc3RyaW5nLCBjdXJyZW5jeTogc3RyaW5nID0gJ3VzZCcpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgIGNvbnN0IGNhY2hlS2V5ID0gYGNvaW5nZWNrbzoke3Rva2VuSWR9OiR7Y3VycmVuY3l9YDtcbiAgICBjb25zdCBub3cgPSBEYXRlLm5vdygpO1xuICAgIGNvbnN0IGNhY2hlZERhdGEgPSB0aGlzLnByaWNlQ2FjaGUuZ2V0KGNhY2hlS2V5KTtcblxuICAgIC8vIFJldHVybiBjYWNoZWQgZGF0YSBpZiB2YWxpZFxuICAgIGlmIChjYWNoZWREYXRhICYmIG5vdyAtIGNhY2hlZERhdGEudGltZXN0YW1wIDwgdGhpcy51cGRhdGVJbnRlcnZhbCkge1xuICAgICAgcmV0dXJuIGNhY2hlZERhdGEucHJpY2U7XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIGxvZ2dlci5pbmZvKGBGZXRjaGluZyBwcmljZSBmb3IgJHt0b2tlbklkfSBmcm9tIENvaW5HZWNrb2ApO1xuXG4gICAgICBjb25zdCB1cmwgPSBgaHR0cHM6Ly9hcGkuY29pbmdlY2tvLmNvbS9hcGkvdjMvc2ltcGxlL3ByaWNlP2lkcz0ke3Rva2VuSWR9JnZzX2N1cnJlbmNpZXM9JHtjdXJyZW5jeX1gO1xuICAgICAgY29uc3QgaGVhZGVyczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xuXG4gICAgICAvLyBBZGQgQVBJIGtleSBpZiBhdmFpbGFibGVcbiAgICAgIGlmICh0aGlzLmFwaUtleXMuY29pbmdlY2tvKSB7XG4gICAgICAgIGhlYWRlcnNbJ3gtY2ctcHJvLWFwaS1rZXknXSA9IHRoaXMuYXBpS2V5cy5jb2luZ2Vja287XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgYXhpb3MuZ2V0KHVybCwgeyBoZWFkZXJzIH0pO1xuICAgICAgY29uc3QgcHJpY2UgPSByZXNwb25zZS5kYXRhW3Rva2VuSWRdW2N1cnJlbmN5XTtcblxuICAgICAgLy8gVXBkYXRlIGNhY2hlXG4gICAgICB0aGlzLnByaWNlQ2FjaGUuc2V0KGNhY2hlS2V5LCB7IHByaWNlLCB0aW1lc3RhbXA6IG5vdyB9KTtcblxuICAgICAgcmV0dXJuIHByaWNlO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBsb2dnZXIuZXJyb3IoYEVycm9yIGZldGNoaW5nIHByaWNlIGZvciAke3Rva2VuSWR9IGZyb20gQ29pbkdlY2tvYCwgeyBlcnJvciB9KTtcblxuICAgICAgLy8gUmV0dXJuIGNhY2hlZCBkYXRhIGlmIGF2YWlsYWJsZSwgb3RoZXJ3aXNlIHJldGhyb3dcbiAgICAgIGlmIChjYWNoZWREYXRhKSB7XG4gICAgICAgIGxvZ2dlci5pbmZvKGBSZXR1cm5pbmcgY2FjaGVkIHByaWNlIGZvciAke3Rva2VuSWR9YCk7XG4gICAgICAgIHJldHVybiBjYWNoZWREYXRhLnByaWNlO1xuICAgICAgfVxuXG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRva2VuIHByaWNlIGZyb20gQ29pbk1hcmtldENhcFxuICAgKiBAcGFyYW0gdG9rZW5TeW1ib2wgVG9rZW4gc3ltYm9sXG4gICAqIEBwYXJhbSBjdXJyZW5jeSBDdXJyZW5jeSB0byBnZXQgcHJpY2UgaW4gKGRlZmF1bHQ6IFVTRClcbiAgICogQHJldHVybnMgVG9rZW4gcHJpY2VcbiAgICovXG4gIGFzeW5jIGdldFByaWNlRnJvbUNvaW5NYXJrZXRDYXAodG9rZW5TeW1ib2w6IHN0cmluZywgY3VycmVuY3k6IHN0cmluZyA9ICdVU0QnKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICBjb25zdCBjYWNoZUtleSA9IGBjb2lubWFya2V0Y2FwOiR7dG9rZW5TeW1ib2x9OiR7Y3VycmVuY3l9YDtcbiAgICBjb25zdCBub3cgPSBEYXRlLm5vdygpO1xuICAgIGNvbnN0IGNhY2hlZERhdGEgPSB0aGlzLnByaWNlQ2FjaGUuZ2V0KGNhY2hlS2V5KTtcblxuICAgIC8vIFJldHVybiBjYWNoZWQgZGF0YSBpZiB2YWxpZFxuICAgIGlmIChjYWNoZWREYXRhICYmIG5vdyAtIGNhY2hlZERhdGEudGltZXN0YW1wIDwgdGhpcy51cGRhdGVJbnRlcnZhbCkge1xuICAgICAgcmV0dXJuIGNhY2hlZERhdGEucHJpY2U7XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIGxvZ2dlci5pbmZvKGBGZXRjaGluZyBwcmljZSBmb3IgJHt0b2tlblN5bWJvbH0gZnJvbSBDb2luTWFya2V0Q2FwYCk7XG5cbiAgICAgIGlmICghdGhpcy5hcGlLZXlzLmNvaW5tYXJrZXRjYXApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDb2luTWFya2V0Q2FwIEFQSSBrZXkgaXMgcmVxdWlyZWQnKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgdXJsID0gJ2h0dHBzOi8vcHJvLWFwaS5jb2lubWFya2V0Y2FwLmNvbS92MS9jcnlwdG9jdXJyZW5jeS9xdW90ZXMvbGF0ZXN0JztcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgYXhpb3MuZ2V0KHVybCwge1xuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgJ1gtQ01DX1BST19BUElfS0VZJzogdGhpcy5hcGlLZXlzLmNvaW5tYXJrZXRjYXAsXG4gICAgICAgIH0sXG4gICAgICAgIHBhcmFtczoge1xuICAgICAgICAgIHN5bWJvbDogdG9rZW5TeW1ib2wsXG4gICAgICAgICAgY29udmVydDogY3VycmVuY3ksXG4gICAgICAgIH0sXG4gICAgICB9KTtcblxuICAgICAgY29uc3QgcHJpY2UgPSByZXNwb25zZS5kYXRhLmRhdGFbdG9rZW5TeW1ib2xdLnF1b3RlW2N1cnJlbmN5XS5wcmljZTtcblxuICAgICAgLy8gVXBkYXRlIGNhY2hlXG4gICAgICB0aGlzLnByaWNlQ2FjaGUuc2V0KGNhY2hlS2V5LCB7IHByaWNlLCB0aW1lc3RhbXA6IG5vdyB9KTtcblxuICAgICAgcmV0dXJuIHByaWNlO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBsb2dnZXIuZXJyb3IoYEVycm9yIGZldGNoaW5nIHByaWNlIGZvciAke3Rva2VuU3ltYm9sfSBmcm9tIENvaW5NYXJrZXRDYXBgLCB7IGVycm9yIH0pO1xuXG4gICAgICAvLyBSZXR1cm4gY2FjaGVkIGRhdGEgaWYgYXZhaWxhYmxlLCBvdGhlcndpc2UgcmV0aHJvd1xuICAgICAgaWYgKGNhY2hlZERhdGEpIHtcbiAgICAgICAgbG9nZ2VyLmluZm8oYFJldHVybmluZyBjYWNoZWQgcHJpY2UgZm9yICR7dG9rZW5TeW1ib2x9YCk7XG4gICAgICAgIHJldHVybiBjYWNoZWREYXRhLnByaWNlO1xuICAgICAgfVxuXG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRva2VuIHByaWNlIGZyb20gSnVwaXRlciBBUElcbiAgICogQHBhcmFtIHRva2VuTWludCBUb2tlbiBtaW50IGFkZHJlc3NcbiAgICogQHBhcmFtIHF1b3RlTWludCBRdW90ZSB0b2tlbiBtaW50IGFkZHJlc3MgKGRlZmF1bHQ6IFVTREMpXG4gICAqIEByZXR1cm5zIFRva2VuIHByaWNlXG4gICAqL1xuICBhc3luYyBnZXRQcmljZUZyb21KdXBpdGVyKFxuICAgIHRva2VuTWludDogc3RyaW5nLFxuICAgIHF1b3RlTWludDogc3RyaW5nID0gJ0VQakZXZGQ1QXVmcVNTcWVNMnFOMXh6eWJhcEM4RzR3RUdHa1p3eVREdDF2JyAvLyBVU0RDIG1pbnRcbiAgKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICBjb25zdCBjYWNoZUtleSA9IGBqdXBpdGVyOiR7dG9rZW5NaW50fToke3F1b3RlTWludH1gO1xuICAgIGNvbnN0IG5vdyA9IERhdGUubm93KCk7XG4gICAgY29uc3QgY2FjaGVkRGF0YSA9IHRoaXMucHJpY2VDYWNoZS5nZXQoY2FjaGVLZXkpO1xuXG4gICAgLy8gUmV0dXJuIGNhY2hlZCBkYXRhIGlmIHZhbGlkXG4gICAgaWYgKGNhY2hlZERhdGEgJiYgbm93IC0gY2FjaGVkRGF0YS50aW1lc3RhbXAgPCB0aGlzLnVwZGF0ZUludGVydmFsKSB7XG4gICAgICByZXR1cm4gY2FjaGVkRGF0YS5wcmljZTtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgbG9nZ2VyLmluZm8oYEZldGNoaW5nIHByaWNlIGZvciAke3Rva2VuTWludH0gZnJvbSBKdXBpdGVyYCk7XG5cbiAgICAgIGNvbnN0IHVybCA9IGBodHRwczovL3ByaWNlLmp1cC5hZy92NC9wcmljZT9pZHM9JHt0b2tlbk1pbnR9JnZzVG9rZW49JHtxdW90ZU1pbnR9YDtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgYXhpb3MuZ2V0KHVybCk7XG5cbiAgICAgIGNvbnN0IHByaWNlID0gcmVzcG9uc2UuZGF0YS5kYXRhW3Rva2VuTWludF0ucHJpY2U7XG5cbiAgICAgIC8vIFVwZGF0ZSBjYWNoZVxuICAgICAgdGhpcy5wcmljZUNhY2hlLnNldChjYWNoZUtleSwgeyBwcmljZSwgdGltZXN0YW1wOiBub3cgfSk7XG5cbiAgICAgIHJldHVybiBwcmljZTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgbG9nZ2VyLmVycm9yKGBFcnJvciBmZXRjaGluZyBwcmljZSBmb3IgJHt0b2tlbk1pbnR9IGZyb20gSnVwaXRlcmAsIHsgZXJyb3IgfSk7XG5cbiAgICAgIC8vIFJldHVybiBjYWNoZWQgZGF0YSBpZiBhdmFpbGFibGUsIG90aGVyd2lzZSByZXRocm93XG4gICAgICBpZiAoY2FjaGVkRGF0YSkge1xuICAgICAgICBsb2dnZXIuaW5mbyhgUmV0dXJuaW5nIGNhY2hlZCBwcmljZSBmb3IgJHt0b2tlbk1pbnR9YCk7XG4gICAgICAgIHJldHVybiBjYWNoZWREYXRhLnByaWNlO1xuICAgICAgfVxuXG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogTW9uaXRvciB0b2tlbiBwcmljZSB2b2xhdGlsaXR5XG4gICAqIEBwYXJhbSB0b2tlbklkZW50aWZpZXIgVG9rZW4gaWRlbnRpZmllciAobWludCwgc3ltYm9sLCBvciBJRCBkZXBlbmRpbmcgb24gc291cmNlKVxuICAgKiBAcGFyYW0gc291cmNlIFByaWNlIHNvdXJjZSAoJ2NvaW5nZWNrbycsICdjb2lubWFya2V0Y2FwJywgb3IgJ2p1cGl0ZXInKVxuICAgKiBAcGFyYW0gdGhyZXNob2xkUGVyY2VudGFnZSBUaHJlc2hvbGQgcGVyY2VudGFnZSAoMC0xMDApIHRvIGNvbnNpZGVyIGFzIHZvbGF0aWxlXG4gICAqIEBwYXJhbSB0aW1lV2luZG93TXMgVGltZSB3aW5kb3cgaW4gbWlsbGlzZWNvbmRzIHRvIGNoZWNrIHZvbGF0aWxpdHlcbiAgICogQHJldHVybnMgT2JqZWN0IHdpdGggdm9sYXRpbGl0eSBkYXRhIGlmIGRldGVjdGVkLCBudWxsIG90aGVyd2lzZVxuICAgKi9cbiAgYXN5bmMgbW9uaXRvclByaWNlVm9sYXRpbGl0eShcbiAgICB0b2tlbklkZW50aWZpZXI6IHN0cmluZyxcbiAgICBzb3VyY2U6ICdjb2luZ2Vja28nIHwgJ2NvaW5tYXJrZXRjYXAnIHwgJ2p1cGl0ZXInLFxuICAgIHRocmVzaG9sZFBlcmNlbnRhZ2U6IG51bWJlciA9IDE1LFxuICAgIHRpbWVXaW5kb3dNczogbnVtYmVyID0gMzAgKiA2MCAqIDEwMDAgLy8gMzAgbWludXRlc1xuICApOiBQcm9taXNlPGFueSB8IG51bGw+IHtcbiAgICB0cnkge1xuICAgICAgLy8gR2V0IGN1cnJlbnQgcHJpY2VcbiAgICAgIGxldCBjdXJyZW50UHJpY2U6IG51bWJlcjtcblxuICAgICAgc3dpdGNoIChzb3VyY2UpIHtcbiAgICAgICAgY2FzZSAnY29pbmdlY2tvJzpcbiAgICAgICAgICBjdXJyZW50UHJpY2UgPSBhd2FpdCB0aGlzLmdldFByaWNlRnJvbUNvaW5HZWNrbyh0b2tlbklkZW50aWZpZXIpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdjb2lubWFya2V0Y2FwJzpcbiAgICAgICAgICBjdXJyZW50UHJpY2UgPSBhd2FpdCB0aGlzLmdldFByaWNlRnJvbUNvaW5NYXJrZXRDYXAodG9rZW5JZGVudGlmaWVyKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnanVwaXRlcic6XG4gICAgICAgICAgY3VycmVudFByaWNlID0gYXdhaXQgdGhpcy5nZXRQcmljZUZyb21KdXBpdGVyKHRva2VuSWRlbnRpZmllcik7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbnN1cHBvcnRlZCBwcmljZSBzb3VyY2U6ICR7c291cmNlfWApO1xuICAgICAgfVxuXG4gICAgICAvLyBTdG9yZSBjdXJyZW50IHByaWNlIHdpdGggdGltZXN0YW1wIGZvciBmdXR1cmUgdm9sYXRpbGl0eSBjaGVja3NcbiAgICAgIGNvbnN0IGNhY2hlS2V5ID0gYHZvbGF0aWxpdHk6JHtzb3VyY2V9OiR7dG9rZW5JZGVudGlmaWVyfWA7XG4gICAgICBjb25zdCBub3cgPSBEYXRlLm5vdygpO1xuICAgICAgY29uc3QgaGlzdG9yaWNhbFByaWNlcyA9IHRoaXMuZ2V0SGlzdG9yaWNhbFByaWNlcyhjYWNoZUtleSk7XG5cbiAgICAgIC8vIEFkZCBjdXJyZW50IHByaWNlIHRvIGhpc3RvcmljYWwgZGF0YVxuICAgICAgaGlzdG9yaWNhbFByaWNlcy5wdXNoKHsgcHJpY2U6IGN1cnJlbnRQcmljZSwgdGltZXN0YW1wOiBub3cgfSk7XG5cbiAgICAgIC8vIFJlbW92ZSBvbGQgZGF0YSBvdXRzaWRlIHRoZSB0aW1lIHdpbmRvd1xuICAgICAgY29uc3QgZmlsdGVyZWRQcmljZXMgPSBoaXN0b3JpY2FsUHJpY2VzLmZpbHRlcihpdGVtID0+IG5vdyAtIGl0ZW0udGltZXN0YW1wIDw9IHRpbWVXaW5kb3dNcyk7XG5cbiAgICAgIC8vIFN0b3JlIHVwZGF0ZWQgaGlzdG9yaWNhbCBwcmljZXNcbiAgICAgIHRoaXMuc3RvcmVIaXN0b3JpY2FsUHJpY2VzKGNhY2hlS2V5LCBmaWx0ZXJlZFByaWNlcyk7XG5cbiAgICAgIC8vIE5lZWQgYXQgbGVhc3QgMiBkYXRhIHBvaW50cyB0byBjYWxjdWxhdGUgdm9sYXRpbGl0eVxuICAgICAgaWYgKGZpbHRlcmVkUHJpY2VzLmxlbmd0aCA8IDIpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIC8vIEZpbmQgb2xkZXN0IGFuZCBuZXdlc3QgcHJpY2VzIGluIHRoZSB0aW1lIHdpbmRvd1xuICAgICAgY29uc3Qgb2xkZXN0RGF0YSA9IGZpbHRlcmVkUHJpY2VzLnJlZHVjZShcbiAgICAgICAgKG9sZGVzdCwgY3VycmVudCkgPT4gKGN1cnJlbnQudGltZXN0YW1wIDwgb2xkZXN0LnRpbWVzdGFtcCA/IGN1cnJlbnQgOiBvbGRlc3QpLFxuICAgICAgICBmaWx0ZXJlZFByaWNlc1swXVxuICAgICAgKTtcblxuICAgICAgY29uc3QgbmV3ZXN0RGF0YSA9IGZpbHRlcmVkUHJpY2VzLnJlZHVjZShcbiAgICAgICAgKG5ld2VzdCwgY3VycmVudCkgPT4gKGN1cnJlbnQudGltZXN0YW1wID4gbmV3ZXN0LnRpbWVzdGFtcCA/IGN1cnJlbnQgOiBuZXdlc3QpLFxuICAgICAgICBmaWx0ZXJlZFByaWNlc1swXVxuICAgICAgKTtcblxuICAgICAgLy8gQ2FsY3VsYXRlIHByaWNlIGNoYW5nZSBwZXJjZW50YWdlXG4gICAgICBjb25zdCBwcmljZUNoYW5nZSA9IG5ld2VzdERhdGEucHJpY2UgLSBvbGRlc3REYXRhLnByaWNlO1xuICAgICAgY29uc3QgY2hhbmdlUGVyY2VudGFnZSA9IE1hdGguYWJzKChwcmljZUNoYW5nZSAvIG9sZGVzdERhdGEucHJpY2UpICogMTAwKTtcblxuICAgICAgLy8gQ2hlY2sgaWYgdm9sYXRpbGl0eSBleGNlZWRzIHRocmVzaG9sZFxuICAgICAgaWYgKGNoYW5nZVBlcmNlbnRhZ2UgPj0gdGhyZXNob2xkUGVyY2VudGFnZSkge1xuICAgICAgICBsb2dnZXIud2FybihgSGlnaCBwcmljZSB2b2xhdGlsaXR5IGRldGVjdGVkIGZvciAke3Rva2VuSWRlbnRpZmllcn1gLCB7XG4gICAgICAgICAgc291cmNlLFxuICAgICAgICAgIG9sZFByaWNlOiBvbGRlc3REYXRhLnByaWNlLFxuICAgICAgICAgIG5ld1ByaWNlOiBuZXdlc3REYXRhLnByaWNlLFxuICAgICAgICAgIGNoYW5nZVBlcmNlbnRhZ2UsXG4gICAgICAgICAgdGltZVdpbmRvd01zLFxuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHRva2VuSWRlbnRpZmllcixcbiAgICAgICAgICBzb3VyY2UsXG4gICAgICAgICAgb2xkUHJpY2U6IG9sZGVzdERhdGEucHJpY2UsXG4gICAgICAgICAgb2xkVGltZXN0YW1wOiBvbGRlc3REYXRhLnRpbWVzdGFtcCxcbiAgICAgICAgICBuZXdQcmljZTogbmV3ZXN0RGF0YS5wcmljZSxcbiAgICAgICAgICBuZXdUaW1lc3RhbXA6IG5ld2VzdERhdGEudGltZXN0YW1wLFxuICAgICAgICAgIHByaWNlQ2hhbmdlLFxuICAgICAgICAgIGNoYW5nZVBlcmNlbnRhZ2UsXG4gICAgICAgICAgZGlyZWN0aW9uOiBwcmljZUNoYW5nZSA+IDAgPyAndXAnIDogJ2Rvd24nLFxuICAgICAgICAgIHRpbWVXaW5kb3dNcyxcbiAgICAgICAgfTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGxvZ2dlci5lcnJvcihgRXJyb3IgbW9uaXRvcmluZyBwcmljZSB2b2xhdGlsaXR5IGZvciAke3Rva2VuSWRlbnRpZmllcn1gLCB7IGVycm9yIH0pO1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEdldCBoaXN0b3JpY2FsIHByaWNlcyBmcm9tIG1lbW9yeVxuICAgKiBAcGFyYW0gY2FjaGVLZXkgQ2FjaGUga2V5XG4gICAqIEByZXR1cm5zIEFycmF5IG9mIGhpc3RvcmljYWwgcHJpY2UgZGF0YVxuICAgKi9cbiAgcHJpdmF0ZSBnZXRIaXN0b3JpY2FsUHJpY2VzKGNhY2hlS2V5OiBzdHJpbmcpOiBBcnJheTx7IHByaWNlOiBudW1iZXI7IHRpbWVzdGFtcDogbnVtYmVyIH0+IHtcbiAgICBjb25zdCBjYWNoZWREYXRhID0gdGhpcy5wcmljZUNhY2hlLmdldChjYWNoZUtleSk7XG5cbiAgICBpZiAoY2FjaGVkRGF0YSAmJiBBcnJheS5pc0FycmF5KGNhY2hlZERhdGEucHJpY2UpKSB7XG4gICAgICByZXR1cm4gY2FjaGVkRGF0YS5wcmljZTtcbiAgICB9XG5cbiAgICByZXR1cm4gW107XG4gIH1cblxuICAvKipcbiAgICogU3RvcmUgaGlzdG9yaWNhbCBwcmljZXMgaW4gbWVtb3J5XG4gICAqIEBwYXJhbSBjYWNoZUtleSBDYWNoZSBrZXlcbiAgICogQHBhcmFtIHByaWNlcyBBcnJheSBvZiBoaXN0b3JpY2FsIHByaWNlIGRhdGFcbiAgICovXG4gIHByaXZhdGUgc3RvcmVIaXN0b3JpY2FsUHJpY2VzKFxuICAgIGNhY2hlS2V5OiBzdHJpbmcsXG4gICAgcHJpY2VzOiBBcnJheTx7IHByaWNlOiBudW1iZXI7IHRpbWVzdGFtcDogbnVtYmVyIH0+XG4gICk6IHZvaWQge1xuICAgIHRoaXMucHJpY2VDYWNoZS5zZXQoY2FjaGVLZXksIHsgcHJpY2U6IHByaWNlcywgdGltZXN0YW1wOiBEYXRlLm5vdygpIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFNldCB0aGUgY2FjaGUgdXBkYXRlIGludGVydmFsXG4gICAqIEBwYXJhbSBpbnRlcnZhbE1zIEludGVydmFsIGluIG1pbGxpc2Vjb25kc1xuICAgKi9cbiAgc2V0VXBkYXRlSW50ZXJ2YWwoaW50ZXJ2YWxNczogbnVtYmVyKTogdm9pZCB7XG4gICAgdGhpcy51cGRhdGVJbnRlcnZhbCA9IGludGVydmFsTXM7XG4gICAgbG9nZ2VyLmluZm8oYFVwZGF0ZSBpbnRlcnZhbCBzZXQgdG8gJHtpbnRlcnZhbE1zfW1zYCk7XG4gIH1cblxuICAvKipcbiAgICogQ2xlYXIgdGhlIHByaWNlIGNhY2hlXG4gICAqIEBwYXJhbSB0b2tlbklkZW50aWZpZXIgT3B0aW9uYWwgdG9rZW4gaWRlbnRpZmllciB0byBjbGVhciBzcGVjaWZpYyBjYWNoZVxuICAgKiBAcGFyYW0gc291cmNlIE9wdGlvbmFsIHByaWNlIHNvdXJjZSB0byBjbGVhciBzcGVjaWZpYyBjYWNoZVxuICAgKi9cbiAgY2xlYXJDYWNoZSh0b2tlbklkZW50aWZpZXI/OiBzdHJpbmcsIHNvdXJjZT86IHN0cmluZyk6IHZvaWQge1xuICAgIGlmICh0b2tlbklkZW50aWZpZXIgJiYgc291cmNlKSB7XG4gICAgICBjb25zdCBwYXR0ZXJuID0gYCR7c291cmNlfToke3Rva2VuSWRlbnRpZmllcn1gO1xuXG4gICAgICAvLyBEZWxldGUgYWxsIGNhY2hlIGVudHJpZXMgbWF0Y2hpbmcgdGhlIHBhdHRlcm5cbiAgICAgIGZvciAoY29uc3Qga2V5IG9mIHRoaXMucHJpY2VDYWNoZS5rZXlzKCkpIHtcbiAgICAgICAgaWYgKGtleS5zdGFydHNXaXRoKHBhdHRlcm4pKSB7XG4gICAgICAgICAgdGhpcy5wcmljZUNhY2hlLmRlbGV0ZShrZXkpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGxvZ2dlci5pbmZvKGBDYWNoZSBjbGVhcmVkIGZvciAke3Rva2VuSWRlbnRpZmllcn0gZnJvbSAke3NvdXJjZX1gKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5wcmljZUNhY2hlLmNsZWFyKCk7XG4gICAgICBsb2dnZXIuaW5mbygnQWxsIHByaWNlIGNhY2hlIGNsZWFyZWQnKTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==