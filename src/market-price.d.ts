/**
 * Market Price Data Collector
 * Responsible for fetching market price data from various sources
 */
export declare class MarketPriceCollector {
    private apiKeys;
    private priceCache;
    private updateInterval;
    private connection;
    /**
     * Create a new Market Price Collector
     * @param rpcEndpoint Solana RPC endpoint
     * @param apiKeys API keys for various price sources
     */
    constructor(rpcEndpoint: string, apiKeys?: {
        coingecko?: string;
        coinmarketcap?: string;
    });
    /**
     * Get token price from CoinGecko
     * @param tokenId CoinGecko token ID
     * @param currency Currency to get price in (default: usd)
     * @returns Token price
     */
    getPriceFromCoinGecko(tokenId: string, currency?: string): Promise<number>;
    /**
     * Get token price from CoinMarketCap
     * @param tokenSymbol Token symbol
     * @param currency Currency to get price in (default: USD)
     * @returns Token price
     */
    getPriceFromCoinMarketCap(tokenSymbol: string, currency?: string): Promise<number>;
    /**
     * Get token price from Jupiter API
     * @param tokenMint Token mint address
     * @param quoteMint Quote token mint address (default: USDC)
     * @returns Token price
     */
    getPriceFromJupiter(tokenMint: string, quoteMint?: string): Promise<number>;
    /**
     * Monitor token price volatility
     * @param tokenIdentifier Token identifier (mint, symbol, or ID depending on source)
     * @param source Price source ('coingecko', 'coinmarketcap', or 'jupiter')
     * @param thresholdPercentage Threshold percentage (0-100) to consider as volatile
     * @param timeWindowMs Time window in milliseconds to check volatility
     * @returns Object with volatility data if detected, null otherwise
     */
    monitorPriceVolatility(tokenIdentifier: string, source: 'coingecko' | 'coinmarketcap' | 'jupiter', thresholdPercentage?: number, timeWindowMs?: number): Promise<any | null>;
    /**
     * Get historical prices from memory
     * @param cacheKey Cache key
     * @returns Array of historical price data
     */
    private getHistoricalPrices;
    /**
     * Store historical prices in memory
     * @param cacheKey Cache key
     * @param prices Array of historical price data
     */
    private storeHistoricalPrices;
    /**
     * Set the cache update interval
     * @param intervalMs Interval in milliseconds
     */
    setUpdateInterval(intervalMs: number): void;
    /**
     * Clear the price cache
     * @param tokenIdentifier Optional token identifier to clear specific cache
     * @param source Optional price source to clear specific cache
     */
    clearCache(tokenIdentifier?: string, source?: string): void;
}
