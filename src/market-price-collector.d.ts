/**
 * Configuration for the MarketPriceCollector
 */
export interface MarketPriceCollectorConfig {
    interval: number;
    onData: (data: Record<string, {
        price: number;
        source: string;
    }>) => void;
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
export declare class MarketPriceCollector {
    private config;
    private pollingTimer;
    private isRunning;
    private trackedTokens;
    private priceCache;
    /**
     * Create a new Market Price Collector
     * @param config Collector configuration
     */
    constructor(config: MarketPriceCollectorConfig);
    /**
     * Start collecting market prices
     */
    start(): Promise<void>;
    /**
     * Stop collecting market prices
     */
    stop(): void;
    /**
     * Add a token to track
     * @param tokenMint Token mint address
     */
    addToken(tokenMint: string): Promise<void>;
    /**
     * Remove a token from tracking
     * @param tokenMint Token mint address
     */
    removeToken(tokenMint: string): void;
    /**
     * Get all tracked tokens
     * @returns Array of tracked token mint addresses
     */
    getTrackedTokens(): string[];
    /**
     * Collect prices for all tracked tokens
     */
    private collectPrices;
    /**
     * Collect price for a specific token
     * @param tokenMint Token mint address
     * @returns Price in USD or undefined if not available
     */
    private collectPriceForToken;
    /**
     * Get price from Jupiter API
     * @param tokenMint Token mint address
     * @returns Price in USD or undefined if not available
     */
    private getPriceFromJupiter;
    /**
     * Get price from CoinGecko API
     * @param tokenMint Token mint address
     * @returns Price in USD or undefined if not available
     */
    private getPriceFromCoinGecko;
    /**
     * Get price from CoinMarketCap API
     * @param tokenMint Token mint address
     * @returns Price in USD or undefined if not available
     */
    private getPriceFromCoinMarketCap;
    /**
     * Monitor price volatility
     * @param tokenMint Token mint address
     * @param newPrice New price
     * @param source Price source
     */
    private monitorPriceVolatility;
}
