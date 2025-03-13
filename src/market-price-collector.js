"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketPriceCollector = void 0;
const monitoring_1 = require("@liqpro/monitoring");
const axios_1 = __importDefault(require("axios"));
const data_types_1 = require("../../types/data-types");
const logger = (0, monitoring_1.createLogger)('data-service:market-price-collector');
/**
 * Market Price Collector
 * Responsible for collecting token prices from various sources
 */
class MarketPriceCollector {
    /**
     * Create a new Market Price Collector
     * @param config Collector configuration
     */
    constructor(config) {
        this.pollingTimer = null;
        this.isRunning = false;
        this.trackedTokens = new Set();
        this.priceCache = new Map();
        this.config = config;
        logger.info('Market Price Collector initialized', {
            interval: config.interval,
        });
    }
    /**
     * Start collecting market prices
     */
    async start() {
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
    stop() {
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
    async addToken(tokenMint) {
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
    removeToken(tokenMint) {
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
    getTrackedTokens() {
        return Array.from(this.trackedTokens);
    }
    /**
     * Collect prices for all tracked tokens
     */
    async collectPrices() {
        logger.debug(`Collecting prices for ${this.trackedTokens.size} tokens`);
        const priceData = {};
        for (const tokenMint of this.trackedTokens) {
            try {
                // Try to get price from Jupiter first
                let price = await this.getPriceFromJupiter(tokenMint);
                let source = data_types_1.PriceSource.JUPITER;
                // If Jupiter fails, try CoinGecko
                if (price === undefined) {
                    price = await this.getPriceFromCoinGecko(tokenMint);
                    source = data_types_1.PriceSource.COINGECKO;
                }
                // If CoinGecko fails, try CoinMarketCap
                if (price === undefined) {
                    price = await this.getPriceFromCoinMarketCap(tokenMint);
                    source = data_types_1.PriceSource.COINMARKETCAP;
                }
                // If we got a price, add it to the data
                if (price !== undefined) {
                    priceData[tokenMint] = { price, source };
                    // Update cache
                    this.priceCache.set(tokenMint, {
                        price,
                        source,
                        timestamp: Math.floor(Date.now() / 1000),
                    });
                    // Monitor price volatility
                    this.monitorPriceVolatility(tokenMint, price, source);
                }
            }
            catch (error) {
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
    async collectPriceForToken(tokenMint) {
        try {
            // Try to get price from Jupiter first
            let price = await this.getPriceFromJupiter(tokenMint);
            let source = data_types_1.PriceSource.JUPITER;
            // If Jupiter fails, try CoinGecko
            if (price === undefined) {
                price = await this.getPriceFromCoinGecko(tokenMint);
                source = data_types_1.PriceSource.COINGECKO;
            }
            // If CoinGecko fails, try CoinMarketCap
            if (price === undefined) {
                price = await this.getPriceFromCoinMarketCap(tokenMint);
                source = data_types_1.PriceSource.COINMARKETCAP;
            }
            // If we got a price, update cache and notify
            if (price !== undefined) {
                // Update cache
                this.priceCache.set(tokenMint, {
                    price,
                    source,
                    timestamp: Math.floor(Date.now() / 1000),
                });
                // Call the onData callback with the collected price
                this.config.onData({ [tokenMint]: { price, source } });
                // Monitor price volatility
                this.monitorPriceVolatility(tokenMint, price, source);
            }
            return price;
        }
        catch (error) {
            logger.error(`Error collecting price for token ${tokenMint}`, { error });
            return undefined;
        }
    }
    /**
     * Get price from Jupiter API
     * @param tokenMint Token mint address
     * @returns Price in USD or undefined if not available
     */
    async getPriceFromJupiter(tokenMint) {
        try {
            // Check if we have a Jupiter API key
            const jupiterApiKey = this.config.apiKeys?.jupiter;
            // Jupiter API endpoint
            const url = `https://price.jup.ag/v4/price?ids=${tokenMint}`;
            // Make request
            const response = await axios_1.default.get(url, {
                headers: jupiterApiKey ? { Authorization: `Bearer ${jupiterApiKey}` } : {},
            });
            // Check if we got a valid response
            if (response.status === 200 &&
                response.data &&
                response.data.data &&
                response.data.data[tokenMint]) {
                const price = response.data.data[tokenMint].price;
                if (price && typeof price === 'number') {
                    logger.debug(`Got price for ${tokenMint} from Jupiter: ${price}`);
                    return price;
                }
            }
            return undefined;
        }
        catch (error) {
            logger.error(`Error getting price from Jupiter for ${tokenMint}`, { error });
            return undefined;
        }
    }
    /**
     * Get price from CoinGecko API
     * @param tokenMint Token mint address
     * @returns Price in USD or undefined if not available
     */
    async getPriceFromCoinGecko(tokenMint) {
        try {
            // Check if we have a CoinGecko API key
            const coinGeckoApiKey = this.config.apiKeys?.coingecko;
            // CoinGecko API endpoint
            // Note: In a real implementation, you would need to map Solana token mints to CoinGecko IDs
            // This is a simplified example
            const url = `https://api.coingecko.com/api/v3/simple/token_price/solana?contract_addresses=${tokenMint}&vs_currencies=usd`;
            // Make request
            const response = await axios_1.default.get(url, {
                headers: coinGeckoApiKey ? { 'x-cg-pro-api-key': coinGeckoApiKey } : {},
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
        }
        catch (error) {
            logger.error(`Error getting price from CoinGecko for ${tokenMint}`, { error });
            return undefined;
        }
    }
    /**
     * Get price from CoinMarketCap API
     * @param tokenMint Token mint address
     * @returns Price in USD or undefined if not available
     */
    async getPriceFromCoinMarketCap(tokenMint) {
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
            const response = await axios_1.default.get(url, {
                headers: { 'X-CMC_PRO_API_KEY': coinMarketCapApiKey },
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
        }
        catch (error) {
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
    monitorPriceVolatility(tokenMint, newPrice, source) {
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
                source,
            });
        }
    }
}
exports.MarketPriceCollector = MarketPriceCollector;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2V0LXByaWNlLWNvbGxlY3Rvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9tb2R1bGVzL2NvbGxlY3RvcnMvbWFya2V0LXByaWNlLWNvbGxlY3Rvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxtREFBa0Q7QUFDbEQsa0RBQTBCO0FBQzFCLHVEQUFxRDtBQUVyRCxNQUFNLE1BQU0sR0FBRyxJQUFBLHlCQUFZLEVBQUMscUNBQXFDLENBQUMsQ0FBQztBQWVuRTs7O0dBR0c7QUFDSCxNQUFhLG9CQUFvQjtJQU8vQjs7O09BR0c7SUFDSCxZQUFZLE1BQWtDO1FBVHRDLGlCQUFZLEdBQTBCLElBQUksQ0FBQztRQUMzQyxjQUFTLEdBQVksS0FBSyxDQUFDO1FBQzNCLGtCQUFhLEdBQWdCLElBQUksR0FBRyxFQUFFLENBQUM7UUFDdkMsZUFBVSxHQUFzRSxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBT2hHLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBRXJCLE1BQU0sQ0FBQyxJQUFJLENBQUMsb0NBQW9DLEVBQUU7WUFDaEQsUUFBUSxFQUFFLE1BQU0sQ0FBQyxRQUFRO1NBQzFCLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxLQUFLO1FBQ1QsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDbkIsTUFBTSxDQUFDLElBQUksQ0FBQywyQ0FBMkMsQ0FBQyxDQUFDO1lBQ3pELE9BQU87UUFDVCxDQUFDO1FBRUQsTUFBTSxDQUFDLElBQUksQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDO1FBRS9DLHNCQUFzQjtRQUN0QixJQUFJLENBQUMsWUFBWSxHQUFHLFdBQVcsQ0FBQyxHQUFHLEVBQUU7WUFDbkMsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ3ZCLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRXpCLDZCQUE2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QUFDLElBQUksQ0FDVCxTQUFTLFNBQVMsUUFBUSxTQUFTLEtBQUssUUFBUSxPQUFPLFFBQVEsS0FBSyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksRUFDbkc7Z0JBQ0UsU0FBUztnQkFDVCxRQUFRO2dCQUNSLFFBQVE7Z0JBQ1IsZ0JBQWdCO2dCQUNoQixTQUFTO2dCQUNULE1BQU07YUFDUCxDQUNGLENBQUM7UUFDSixDQUFDO0lBQ0gsQ0FBQztDQUNGO0FBdFdELG9EQXNXQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGNyZWF0ZUxvZ2dlciB9IGZyb20gJ0BsaXFwcm8vbW9uaXRvcmluZyc7XG5pbXBvcnQgYXhpb3MgZnJvbSAnYXhpb3MnO1xuaW1wb3J0IHsgUHJpY2VTb3VyY2UgfSBmcm9tICcuLi8uLi90eXBlcy9kYXRhLXR5cGVzJztcblxuY29uc3QgbG9nZ2VyID0gY3JlYXRlTG9nZ2VyKCdkYXRhLXNlcnZpY2U6bWFya2V0LXByaWNlLWNvbGxlY3RvcicpO1xuXG4vKipcbiAqIENvbmZpZ3VyYXRpb24gZm9yIHRoZSBNYXJrZXRQcmljZUNvbGxlY3RvclxuICovXG5leHBvcnQgaW50ZXJmYWNlIE1hcmtldFByaWNlQ29sbGVjdG9yQ29uZmlnIHtcbiAgaW50ZXJ2YWw6IG51bWJlcjtcbiAgb25EYXRhOiAoZGF0YTogUmVjb3JkPHN0cmluZywgeyBwcmljZTogbnVtYmVyOyBzb3VyY2U6IHN0cmluZyB9PikgPT4gdm9pZDtcbiAgYXBpS2V5cz86IHtcbiAgICBjb2luZ2Vja28/OiBzdHJpbmc7XG4gICAgY29pbm1hcmtldGNhcD86IHN0cmluZztcbiAgICBqdXBpdGVyPzogc3RyaW5nO1xuICB9O1xufVxuXG4vKipcbiAqIE1hcmtldCBQcmljZSBDb2xsZWN0b3JcbiAqIFJlc3BvbnNpYmxlIGZvciBjb2xsZWN0aW5nIHRva2VuIHByaWNlcyBmcm9tIHZhcmlvdXMgc291cmNlc1xuICovXG5leHBvcnQgY2xhc3MgTWFya2V0UHJpY2VDb2xsZWN0b3Ige1xuICBwcml2YXRlIGNvbmZpZzogTWFya2V0UHJpY2VDb2xsZWN0b3JDb25maWc7XG4gIHByaXZhdGUgcG9sbGluZ1RpbWVyOiBOb2RlSlMuVGltZW91dCB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIGlzUnVubmluZzogYm9vbGVhbiA9IGZhbHNlO1xuICBwcml2YXRlIHRyYWNrZWRUb2tlbnM6IFNldDxzdHJpbmc+ID0gbmV3IFNldCgpO1xuICBwcml2YXRlIHByaWNlQ2FjaGU6IE1hcDxzdHJpbmcsIHsgcHJpY2U6IG51bWJlcjsgc291cmNlOiBzdHJpbmc7IHRpbWVzdGFtcDogbnVtYmVyIH0+ID0gbmV3IE1hcCgpO1xuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSBuZXcgTWFya2V0IFByaWNlIENvbGxlY3RvclxuICAgKiBAcGFyYW0gY29uZmlnIENvbGxlY3RvciBjb25maWd1cmF0aW9uXG4gICAqL1xuICBjb25zdHJ1Y3Rvcihjb25maWc6IE1hcmtldFByaWNlQ29sbGVjdG9yQ29uZmlnKSB7XG4gICAgdGhpcy5jb25maWcgPSBjb25maWc7XG5cbiAgICBsb2dnZXIuaW5mbygnTWFya2V0IFByaWNlIENvbGxlY3RvciBpbml0aWFsaXplZCcsIHtcbiAgICAgIGludGVydmFsOiBjb25maWcuaW50ZXJ2YWwsXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogU3RhcnQgY29sbGVjdGluZyBtYXJrZXQgcHJpY2VzXG4gICAqL1xuICBhc3luYyBzdGFydCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAodGhpcy5pc1J1bm5pbmcpIHtcbiAgICAgIGxvZ2dlci5pbmZvKCdNYXJrZXQgUHJpY2UgQ29sbGVjdG9yIGlzIGFscmVhZHkgcnVubmluZycpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGxvZ2dlci5pbmZvKCdTdGFydGluZyBNYXJrZXQgUHJpY2UgQ29sbGVjdG9yJyk7XG5cbiAgICAvLyBTdGFydCBwb2xsaW5nIHRpbWVyXG4gICAgdGhpcy5wb2xsaW5nVGltZXIgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICB0aGlzLmNvbGxlY3RQcmljZXMoKTtcbiAgICB9LCB0aGlzLmNvbmZpZy5pbnRlcnZhbCk7XG5cbiAgICAvLyBDb2xsZWN0IHByaWNlcyBpbW1lZGlhdGVseVxuICAgIGF3YWl0IHRoaXMuY29sbGVjdFByaWNlcygpO1xuXG4gICAgdGhpcy5pc1J1bm5pbmcgPSB0cnVlO1xuICAgIGxvZ2dlci5pbmZvKCdNYXJrZXQgUHJpY2UgQ29sbGVjdG9yIHN0YXJ0ZWQnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTdG9wIGNvbGxlY3RpbmcgbWFya2V0IHByaWNlc1xuICAgKi9cbiAgc3RvcCgpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuaXNSdW5uaW5nKSB7XG4gICAgICBsb2dnZXIuaW5mbygnTWFya2V0IFByaWNlIENvbGxlY3RvciBpcyBub3QgcnVubmluZycpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGxvZ2dlci5pbmZvKCdTdG9wcGluZyBNYXJrZXQgUHJpY2UgQ29sbGVjdG9yJyk7XG5cbiAgICAvLyBDbGVhciBwb2xsaW5nIHRpbWVyXG4gICAgaWYgKHRoaXMucG9sbGluZ1RpbWVyKSB7XG4gICAgICBjbGVhckludGVydmFsKHRoaXMucG9sbGluZ1RpbWVyKTtcbiAgICAgIHRoaXMucG9sbGluZ1RpbWVyID0gbnVsbDtcbiAgICB9XG5cbiAgICB0aGlzLmlzUnVubmluZyA9IGZhbHNlO1xuICAgIGxvZ2dlci5pbmZvKCdNYXJrZXQgUHJpY2UgQ29sbGVjdG9yIHN0b3BwZWQnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGQgYSB0b2tlbiB0byB0cmFja1xuICAgKiBAcGFyYW0gdG9rZW5NaW50IFRva2VuIG1pbnQgYWRkcmVzc1xuICAgKi9cbiAgYXN5bmMgYWRkVG9rZW4odG9rZW5NaW50OiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAodGhpcy50cmFja2VkVG9rZW5zLmhhcyh0b2tlbk1pbnQpKSB7XG4gICAgICBsb2dnZXIuaW5mbyhgVG9rZW4gJHt0b2tlbk1pbnR9IGlzIGFscmVhZHkgYmVpbmcgdHJhY2tlZGApO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMudHJhY2tlZFRva2Vucy5hZGQodG9rZW5NaW50KTtcbiAgICBsb2dnZXIuaW5mbyhgQWRkZWQgdG9rZW4gJHt0b2tlbk1pbnR9IHRvIHRyYWNraW5nYCk7XG5cbiAgICAvLyBUcnkgdG8gZ2V0IGluaXRpYWwgcHJpY2VcbiAgICBhd2FpdCB0aGlzLmNvbGxlY3RQcmljZUZvclRva2VuKHRva2VuTWludCk7XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlIGEgdG9rZW4gZnJvbSB0cmFja2luZ1xuICAgKiBAcGFyYW0gdG9rZW5NaW50IFRva2VuIG1pbnQgYWRkcmVzc1xuICAgKi9cbiAgcmVtb3ZlVG9rZW4odG9rZW5NaW50OiBzdHJpbmcpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMudHJhY2tlZFRva2Vucy5oYXModG9rZW5NaW50KSkge1xuICAgICAgbG9nZ2VyLmluZm8oYFRva2VuICR7dG9rZW5NaW50fSBpcyBub3QgYmVpbmcgdHJhY2tlZGApO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMudHJhY2tlZFRva2Vucy5kZWxldGUodG9rZW5NaW50KTtcbiAgICBsb2dnZXIuaW5mbyhgUmVtb3ZlZCB0b2tlbiAke3Rva2VuTWludH0gZnJvbSB0cmFja2luZ2ApO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBhbGwgdHJhY2tlZCB0b2tlbnNcbiAgICogQHJldHVybnMgQXJyYXkgb2YgdHJhY2tlZCB0b2tlbiBtaW50IGFkZHJlc3Nlc1xuICAgKi9cbiAgZ2V0VHJhY2tlZFRva2VucygpOiBzdHJpbmdbXSB7XG4gICAgcmV0dXJuIEFycmF5LmZyb20odGhpcy50cmFja2VkVG9rZW5zKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb2xsZWN0IHByaWNlcyBmb3IgYWxsIHRyYWNrZWQgdG9rZW5zXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIGNvbGxlY3RQcmljZXMoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgbG9nZ2VyLmRlYnVnKGBDb2xsZWN0aW5nIHByaWNlcyBmb3IgJHt0aGlzLnRyYWNrZWRUb2tlbnMuc2l6ZX0gdG9rZW5zYCk7XG5cbiAgICBjb25zdCBwcmljZURhdGE6IFJlY29yZDxzdHJpbmcsIHsgcHJpY2U6IG51bWJlcjsgc291cmNlOiBzdHJpbmcgfT4gPSB7fTtcblxuICAgIGZvciAoY29uc3QgdG9rZW5NaW50IG9mIHRoaXMudHJhY2tlZFRva2Vucykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgLy8gVHJ5IHRvIGdldCBwcmljZSBmcm9tIEp1cGl0ZXIgZmlyc3RcbiAgICAgICAgbGV0IHByaWNlID0gYXdhaXQgdGhpcy5nZXRQcmljZUZyb21KdXBpdGVyKHRva2VuTWludCk7XG4gICAgICAgIGxldCBzb3VyY2UgPSBQcmljZVNvdXJjZS5KVVBJVEVSO1xuXG4gICAgICAgIC8vIElmIEp1cGl0ZXIgZmFpbHMsIHRyeSBDb2luR2Vja29cbiAgICAgICAgaWYgKHByaWNlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBwcmljZSA9IGF3YWl0IHRoaXMuZ2V0UHJpY2VGcm9tQ29pbkdlY2tvKHRva2VuTWludCk7XG4gICAgICAgICAgc291cmNlID0gUHJpY2VTb3VyY2UuQ09JTkdFQ0tPO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSWYgQ29pbkdlY2tvIGZhaWxzLCB0cnkgQ29pbk1hcmtldENhcFxuICAgICAgICBpZiAocHJpY2UgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHByaWNlID0gYXdhaXQgdGhpcy5nZXRQcmljZUZyb21Db2luTWFya2V0Q2FwKHRva2VuTWludCk7XG4gICAgICAgICAgc291cmNlID0gUHJpY2VTb3VyY2UuQ09JTk1BUktFVENBUDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIElmIHdlIGdvdCBhIHByaWNlLCBhZGQgaXQgdG8gdGhlIGRhdGFcbiAgICAgICAgaWYgKHByaWNlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBwcmljZURhdGFbdG9rZW5NaW50XSA9IHsgcHJpY2UsIHNvdXJjZSB9O1xuXG4gICAgICAgICAgLy8gVXBkYXRlIGNhY2hlXG4gICAgICAgICAgdGhpcy5wcmljZUNhY2hlLnNldCh0b2tlbk1pbnQsIHtcbiAgICAgICAgICAgIHByaWNlLFxuICAgICAgICAgICAgc291cmNlLFxuICAgICAgICAgICAgdGltZXN0YW1wOiBNYXRoLmZsb29yKERhdGUubm93KCkgLyAxMDAwKSxcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIC8vIE1vbml0b3IgcHJpY2Ugdm9sYXRpbGl0eVxuICAgICAgICAgIHRoaXMubW9uaXRvclByaWNlVm9sYXRpbGl0eSh0b2tlbk1pbnQsIHByaWNlLCBzb3VyY2UpO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgIGxvZ2dlci5lcnJvcihgRXJyb3IgY29sbGVjdGluZyBwcmljZSBmb3IgdG9rZW4gJHt0b2tlbk1pbnR9YCwgeyBlcnJvciB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBDYWxsIHRoZSBvbkRhdGEgY2FsbGJhY2sgd2l0aCB0aGUgY29sbGVjdGVkIHByaWNlc1xuICAgIGlmIChPYmplY3Qua2V5cyhwcmljZURhdGEpLmxlbmd0aCA+IDApIHtcbiAgICAgIHRoaXMuY29uZmlnLm9uRGF0YShwcmljZURhdGEpO1xuICAgIH1cblxuICAgIGxvZ2dlci5kZWJ1ZyhgQ29sbGVjdGVkIHByaWNlcyBmb3IgJHtPYmplY3Qua2V5cyhwcmljZURhdGEpLmxlbmd0aH0gdG9rZW5zYCk7XG4gIH1cblxuICAvKipcbiAgICogQ29sbGVjdCBwcmljZSBmb3IgYSBzcGVjaWZpYyB0b2tlblxuICAgKiBAcGFyYW0gdG9rZW5NaW50IFRva2VuIG1pbnQgYWRkcmVzc1xuICAgKiBAcmV0dXJucyBQcmljZSBpbiBVU0Qgb3IgdW5kZWZpbmVkIGlmIG5vdCBhdmFpbGFibGVcbiAgICovXG4gIHByaXZhdGUgYXN5bmMgY29sbGVjdFByaWNlRm9yVG9rZW4odG9rZW5NaW50OiBzdHJpbmcpOiBQcm9taXNlPG51bWJlciB8IHVuZGVmaW5lZD4ge1xuICAgIHRyeSB7XG4gICAgICAvLyBUcnkgdG8gZ2V0IHByaWNlIGZyb20gSnVwaXRlciBmaXJzdFxuICAgICAgbGV0IHByaWNlID0gYXdhaXQgdGhpcy5nZXRQcmljZUZyb21KdXBpdGVyKHRva2VuTWludCk7XG4gICAgICBsZXQgc291cmNlID0gUHJpY2VTb3VyY2UuSlVQSVRFUjtcblxuICAgICAgLy8gSWYgSnVwaXRlciBmYWlscywgdHJ5IENvaW5HZWNrb1xuICAgICAgaWYgKHByaWNlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcHJpY2UgPSBhd2FpdCB0aGlzLmdldFByaWNlRnJvbUNvaW5HZWNrbyh0b2tlbk1pbnQpO1xuICAgICAgICBzb3VyY2UgPSBQcmljZVNvdXJjZS5DT0lOR0VDS087XG4gICAgICB9XG5cbiAgICAgIC8vIElmIENvaW5HZWNrbyBmYWlscywgdHJ5IENvaW5NYXJrZXRDYXBcbiAgICAgIGlmIChwcmljZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHByaWNlID0gYXdhaXQgdGhpcy5nZXRQcmljZUZyb21Db2luTWFya2V0Q2FwKHRva2VuTWludCk7XG4gICAgICAgIHNvdXJjZSA9IFByaWNlU291cmNlLkNPSU5NQVJLRVRDQVA7XG4gICAgICB9XG5cbiAgICAgIC8vIElmIHdlIGdvdCBhIHByaWNlLCB1cGRhdGUgY2FjaGUgYW5kIG5vdGlmeVxuICAgICAgaWYgKHByaWNlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgLy8gVXBkYXRlIGNhY2hlXG4gICAgICAgIHRoaXMucHJpY2VDYWNoZS5zZXQodG9rZW5NaW50LCB7XG4gICAgICAgICAgcHJpY2UsXG4gICAgICAgICAgc291cmNlLFxuICAgICAgICAgIHRpbWVzdGFtcDogTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMCksXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENhbGwgdGhlIG9uRGF0YSBjYWxsYmFjayB3aXRoIHRoZSBjb2xsZWN0ZWQgcHJpY2VcbiAgICAgICAgdGhpcy5jb25maWcub25EYXRhKHsgW3Rva2VuTWludF06IHsgcHJpY2UsIHNvdXJjZSB9IH0pO1xuXG4gICAgICAgIC8vIE1vbml0b3IgcHJpY2Ugdm9sYXRpbGl0eVxuICAgICAgICB0aGlzLm1vbml0b3JQcmljZVZvbGF0aWxpdHkodG9rZW5NaW50LCBwcmljZSwgc291cmNlKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHByaWNlO1xuICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgIGxvZ2dlci5lcnJvcihgRXJyb3IgY29sbGVjdGluZyBwcmljZSBmb3IgdG9rZW4gJHt0b2tlbk1pbnR9YCwgeyBlcnJvciB9KTtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEdldCBwcmljZSBmcm9tIEp1cGl0ZXIgQVBJXG4gICAqIEBwYXJhbSB0b2tlbk1pbnQgVG9rZW4gbWludCBhZGRyZXNzXG4gICAqIEByZXR1cm5zIFByaWNlIGluIFVTRCBvciB1bmRlZmluZWQgaWYgbm90IGF2YWlsYWJsZVxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyBnZXRQcmljZUZyb21KdXBpdGVyKHRva2VuTWludDogc3RyaW5nKTogUHJvbWlzZTxudW1iZXIgfCB1bmRlZmluZWQ+IHtcbiAgICB0cnkge1xuICAgICAgLy8gQ2hlY2sgaWYgd2UgaGF2ZSBhIEp1cGl0ZXIgQVBJIGtleVxuICAgICAgY29uc3QganVwaXRlckFwaUtleSA9IHRoaXMuY29uZmlnLmFwaUtleXM/Lmp1cGl0ZXI7XG5cbiAgICAgIC8vIEp1cGl0ZXIgQVBJIGVuZHBvaW50XG4gICAgICBjb25zdCB1cmwgPSBgaHR0cHM6Ly9wcmljZS5qdXAuYWcvdjQvcHJpY2U/aWRzPSR7dG9rZW5NaW50fWA7XG5cbiAgICAgIC8vIE1ha2UgcmVxdWVzdFxuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBheGlvcy5nZXQodXJsLCB7XG4gICAgICAgIGhlYWRlcnM6IGp1cGl0ZXJBcGlLZXkgPyB7IEF1dGhvcml6YXRpb246IGBCZWFyZXIgJHtqdXBpdGVyQXBpS2V5fWAgfSA6IHt9LFxuICAgICAgfSk7XG5cbiAgICAgIC8vIENoZWNrIGlmIHdlIGdvdCBhIHZhbGlkIHJlc3BvbnNlXG4gICAgICBpZiAoXG4gICAgICAgIHJlc3BvbnNlLnN0YXR1cyA9PT0gMjAwICYmXG4gICAgICAgIHJlc3BvbnNlLmRhdGEgJiZcbiAgICAgICAgcmVzcG9uc2UuZGF0YS5kYXRhICYmXG4gICAgICAgIHJlc3BvbnNlLmRhdGEuZGF0YVt0b2tlbk1pbnRdXG4gICAgICApIHtcbiAgICAgICAgY29uc3QgcHJpY2UgPSByZXNwb25zZS5kYXRhLmRhdGFbdG9rZW5NaW50XS5wcmljZTtcbiAgICAgICAgaWYgKHByaWNlICYmIHR5cGVvZiBwcmljZSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICBsb2dnZXIuZGVidWcoYEdvdCBwcmljZSBmb3IgJHt0b2tlbk1pbnR9IGZyb20gSnVwaXRlcjogJHtwcmljZX1gKTtcbiAgICAgICAgICByZXR1cm4gcHJpY2U7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICBsb2dnZXIuZXJyb3IoYEVycm9yIGdldHRpbmcgcHJpY2UgZnJvbSBKdXBpdGVyIGZvciAke3Rva2VuTWludH1gLCB7IGVycm9yIH0pO1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogR2V0IHByaWNlIGZyb20gQ29pbkdlY2tvIEFQSVxuICAgKiBAcGFyYW0gdG9rZW5NaW50IFRva2VuIG1pbnQgYWRkcmVzc1xuICAgKiBAcmV0dXJucyBQcmljZSBpbiBVU0Qgb3IgdW5kZWZpbmVkIGlmIG5vdCBhdmFpbGFibGVcbiAgICovXG4gIHByaXZhdGUgYXN5bmMgZ2V0UHJpY2VGcm9tQ29pbkdlY2tvKHRva2VuTWludDogc3RyaW5nKTogUHJvbWlzZTxudW1iZXIgfCB1bmRlZmluZWQ+IHtcbiAgICB0cnkge1xuICAgICAgLy8gQ2hlY2sgaWYgd2UgaGF2ZSBhIENvaW5HZWNrbyBBUEkga2V5XG4gICAgICBjb25zdCBjb2luR2Vja29BcGlLZXkgPSB0aGlzLmNvbmZpZy5hcGlLZXlzPy5jb2luZ2Vja287XG5cbiAgICAgIC8vIENvaW5HZWNrbyBBUEkgZW5kcG9pbnRcbiAgICAgIC8vIE5vdGU6IEluIGEgcmVhbCBpbXBsZW1lbnRhdGlvbiwgeW91IHdvdWxkIG5lZWQgdG8gbWFwIFNvbGFuYSB0b2tlbiBtaW50cyB0byBDb2luR2Vja28gSURzXG4gICAgICAvLyBUaGlzIGlzIGEgc2ltcGxpZmllZCBleGFtcGxlXG4gICAgICBjb25zdCB1cmwgPSBgaHR0cHM6Ly9hcGkuY29pbmdlY2tvLmNvbS9hcGkvdjMvc2ltcGxlL3Rva2VuX3ByaWNlL3NvbGFuYT9jb250cmFjdF9hZGRyZXNzZXM9JHt0b2tlbk1pbnR9JnZzX2N1cnJlbmNpZXM9dXNkYDtcblxuICAgICAgLy8gTWFrZSByZXF1ZXN0XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGF4aW9zLmdldCh1cmwsIHtcbiAgICAgICAgaGVhZGVyczogY29pbkdlY2tvQXBpS2V5ID8geyAneC1jZy1wcm8tYXBpLWtleSc6IGNvaW5HZWNrb0FwaUtleSB9IDoge30sXG4gICAgICB9KTtcblxuICAgICAgLy8gQ2hlY2sgaWYgd2UgZ290IGEgdmFsaWQgcmVzcG9uc2VcbiAgICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPT09IDIwMCAmJiByZXNwb25zZS5kYXRhICYmIHJlc3BvbnNlLmRhdGFbdG9rZW5NaW50XSkge1xuICAgICAgICBjb25zdCBwcmljZSA9IHJlc3BvbnNlLmRhdGFbdG9rZW5NaW50XS51c2Q7XG4gICAgICAgIGlmIChwcmljZSAmJiB0eXBlb2YgcHJpY2UgPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgbG9nZ2VyLmRlYnVnKGBHb3QgcHJpY2UgZm9yICR7dG9rZW5NaW50fSBmcm9tIENvaW5HZWNrbzogJHtwcmljZX1gKTtcbiAgICAgICAgICByZXR1cm4gcHJpY2U7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICBsb2dnZXIuZXJyb3IoYEVycm9yIGdldHRpbmcgcHJpY2UgZnJvbSBDb2luR2Vja28gZm9yICR7dG9rZW5NaW50fWAsIHsgZXJyb3IgfSk7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgcHJpY2UgZnJvbSBDb2luTWFya2V0Q2FwIEFQSVxuICAgKiBAcGFyYW0gdG9rZW5NaW50IFRva2VuIG1pbnQgYWRkcmVzc1xuICAgKiBAcmV0dXJucyBQcmljZSBpbiBVU0Qgb3IgdW5kZWZpbmVkIGlmIG5vdCBhdmFpbGFibGVcbiAgICovXG4gIHByaXZhdGUgYXN5bmMgZ2V0UHJpY2VGcm9tQ29pbk1hcmtldENhcCh0b2tlbk1pbnQ6IHN0cmluZyk6IFByb21pc2U8bnVtYmVyIHwgdW5kZWZpbmVkPiB7XG4gICAgdHJ5IHtcbiAgICAgIC8vIENoZWNrIGlmIHdlIGhhdmUgYSBDb2luTWFya2V0Q2FwIEFQSSBrZXlcbiAgICAgIGNvbnN0IGNvaW5NYXJrZXRDYXBBcGlLZXkgPSB0aGlzLmNvbmZpZy5hcGlLZXlzPy5jb2lubWFya2V0Y2FwO1xuXG4gICAgICAvLyBJZiB3ZSBkb24ndCBoYXZlIGFuIEFQSSBrZXksIHdlIGNhbid0IHVzZSBDb2luTWFya2V0Q2FwXG4gICAgICBpZiAoIWNvaW5NYXJrZXRDYXBBcGlLZXkpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cblxuICAgICAgLy8gQ29pbk1hcmtldENhcCBBUEkgZW5kcG9pbnRcbiAgICAgIC8vIE5vdGU6IEluIGEgcmVhbCBpbXBsZW1lbnRhdGlvbiwgeW91IHdvdWxkIG5lZWQgdG8gbWFwIFNvbGFuYSB0b2tlbiBtaW50cyB0byBDb2luTWFya2V0Q2FwIElEc1xuICAgICAgLy8gVGhpcyBpcyBhIHNpbXBsaWZpZWQgZXhhbXBsZVxuICAgICAgY29uc3QgdXJsID0gYGh0dHBzOi8vcHJvLWFwaS5jb2lubWFya2V0Y2FwLmNvbS92Mi9jcnlwdG9jdXJyZW5jeS9xdW90ZXMvbGF0ZXN0P2FkZHJlc3M9JHt0b2tlbk1pbnR9JnBsYXRmb3JtPXNvbGFuYWA7XG5cbiAgICAgIC8vIE1ha2UgcmVxdWVzdFxuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBheGlvcy5nZXQodXJsLCB7XG4gICAgICAgIGhlYWRlcnM6IHsgJ1gtQ01DX1BST19BUElfS0VZJzogY29pbk1hcmtldENhcEFwaUtleSB9LFxuICAgICAgfSk7XG5cbiAgICAgIC8vIENoZWNrIGlmIHdlIGdvdCBhIHZhbGlkIHJlc3BvbnNlXG4gICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzID09PSAyMDAgJiYgcmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLmRhdGEpIHtcbiAgICAgICAgY29uc3QgZGF0YSA9IHJlc3BvbnNlLmRhdGEuZGF0YTtcbiAgICAgICAgY29uc3QgdG9rZW5EYXRhID0gZGF0YVtPYmplY3Qua2V5cyhkYXRhKVswXV07XG5cbiAgICAgICAgaWYgKHRva2VuRGF0YSAmJiB0b2tlbkRhdGEucXVvdGUgJiYgdG9rZW5EYXRhLnF1b3RlLlVTRCkge1xuICAgICAgICAgIGNvbnN0IHByaWNlID0gdG9rZW5EYXRhLnF1b3RlLlVTRC5wcmljZTtcbiAgICAgICAgICBpZiAocHJpY2UgJiYgdHlwZW9mIHByaWNlID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKGBHb3QgcHJpY2UgZm9yICR7dG9rZW5NaW50fSBmcm9tIENvaW5NYXJrZXRDYXA6ICR7cHJpY2V9YCk7XG4gICAgICAgICAgICByZXR1cm4gcHJpY2U7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgbG9nZ2VyLmVycm9yKGBFcnJvciBnZXR0aW5nIHByaWNlIGZyb20gQ29pbk1hcmtldENhcCBmb3IgJHt0b2tlbk1pbnR9YCwgeyBlcnJvciB9KTtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIE1vbml0b3IgcHJpY2Ugdm9sYXRpbGl0eVxuICAgKiBAcGFyYW0gdG9rZW5NaW50IFRva2VuIG1pbnQgYWRkcmVzc1xuICAgKiBAcGFyYW0gbmV3UHJpY2UgTmV3IHByaWNlXG4gICAqIEBwYXJhbSBzb3VyY2UgUHJpY2Ugc291cmNlXG4gICAqL1xuICBwcml2YXRlIG1vbml0b3JQcmljZVZvbGF0aWxpdHkodG9rZW5NaW50OiBzdHJpbmcsIG5ld1ByaWNlOiBudW1iZXIsIHNvdXJjZTogc3RyaW5nKTogdm9pZCB7XG4gICAgLy8gR2V0IHByZXZpb3VzIHByaWNlIGZyb20gY2FjaGVcbiAgICBjb25zdCBjYWNoZWREYXRhID0gdGhpcy5wcmljZUNhY2hlLmdldCh0b2tlbk1pbnQpO1xuXG4gICAgaWYgKCFjYWNoZWREYXRhKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3Qgb2xkUHJpY2UgPSBjYWNoZWREYXRhLnByaWNlO1xuXG4gICAgLy8gQ2FsY3VsYXRlIHByaWNlIGNoYW5nZSBwZXJjZW50YWdlXG4gICAgY29uc3QgY2hhbmdlUGVyY2VudGFnZSA9ICgobmV3UHJpY2UgLSBvbGRQcmljZSkgLyBvbGRQcmljZSkgKiAxMDA7XG5cbiAgICAvLyBJZiBwcmljZSBjaGFuZ2UgaXMgc2lnbmlmaWNhbnQsIGxvZyBpdFxuICAgIGlmIChNYXRoLmFicyhjaGFuZ2VQZXJjZW50YWdlKSA+PSA1KSB7XG4gICAgICBjb25zdCBkaXJlY3Rpb24gPSBjaGFuZ2VQZXJjZW50YWdlID4gMCA/ICd1cCcgOiAnZG93bic7XG5cbiAgICAgIGxvZ2dlci5pbmZvKFxuICAgICAgICBgUHJpY2UgJHtkaXJlY3Rpb259IGZvciAke3Rva2VuTWludH06ICR7b2xkUHJpY2V9IC0+ICR7bmV3UHJpY2V9ICgke2NoYW5nZVBlcmNlbnRhZ2UudG9GaXhlZCgyKX0lKWAsXG4gICAgICAgIHtcbiAgICAgICAgICB0b2tlbk1pbnQsXG4gICAgICAgICAgb2xkUHJpY2UsXG4gICAgICAgICAgbmV3UHJpY2UsXG4gICAgICAgICAgY2hhbmdlUGVyY2VudGFnZSxcbiAgICAgICAgICBkaXJlY3Rpb24sXG4gICAgICAgICAgc291cmNlLFxuICAgICAgICB9XG4gICAgICApO1xuICAgIH1cbiAgfVxufVxuIl19