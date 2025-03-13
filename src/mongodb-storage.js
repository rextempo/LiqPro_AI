"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoDBStorage = void 0;
const monitoring_1 = require("@liqpro/monitoring");
const mongodb_1 = require("mongodb");
const logger = (0, monitoring_1.createLogger)('data-service:mongodb-storage');
/**
 * MongoDB implementation of DataStorage
 */
class MongoDBStorage {
    /**
     * Create a new MongoDB storage
     * @param config Storage configuration
     */
    constructor(config) {
        this.db = null;
        this.collections = {
            poolData: null,
            poolMetadata: null,
            events: null,
            tokenPrices: null,
            tokenMetadata: null,
            whaleActivities: null,
        };
        this.isConnected = false;
        this.config = config;
        this.client = new mongodb_1.MongoClient(config.uri);
        logger.info('MongoDB storage initialized', {
            uri: config.uri,
            dbName: config.dbName,
        });
    }
    /**
     * Connect to MongoDB
     */
    async connect() {
        if (this.isConnected) {
            logger.info('Already connected to MongoDB');
            return;
        }
        try {
            logger.info('Connecting to MongoDB...');
            await this.client.connect();
            this.db = this.client.db(this.config.dbName);
            // Initialize collections
            this.collections.poolData = this.db.collection(this.config.collections.poolData);
            this.collections.poolMetadata = this.db.collection(this.config.collections.poolMetadata);
            this.collections.events = this.db.collection(this.config.collections.events);
            this.collections.tokenPrices = this.db.collection(this.config.collections.tokenPrices);
            this.collections.tokenMetadata = this.db.collection(this.config.collections.tokenMetadata);
            this.collections.whaleActivities = this.db.collection(this.config.collections.whaleActivities);
            // Create indexes if enabled
            if (this.config.indexes?.enabled) {
                await this.createIndexes();
            }
            this.isConnected = true;
            logger.info('Connected to MongoDB');
        }
        catch (error) {
            logger.error('Failed to connect to MongoDB', { error });
            throw new Error(`Failed to connect to MongoDB: ${error.message}`);
        }
    }
    /**
     * Disconnect from MongoDB
     */
    async disconnect() {
        if (!this.isConnected) {
            logger.info('Not connected to MongoDB');
            return;
        }
        try {
            logger.info('Disconnecting from MongoDB...');
            await this.client.close();
            this.isConnected = false;
            this.db = null;
            this.collections.poolData = null;
            this.collections.poolMetadata = null;
            this.collections.events = null;
            this.collections.tokenPrices = null;
            this.collections.tokenMetadata = null;
            this.collections.whaleActivities = null;
            logger.info('Disconnected from MongoDB');
        }
        catch (error) {
            logger.error('Failed to disconnect from MongoDB', { error });
            throw new Error(`Failed to disconnect from MongoDB: ${error.message}`);
        }
    }
    /**
     * Store pool data
     * @param data Pool data
     */
    async storePoolData(data) {
        await this.ensureConnected();
        try {
            const collection = this.collections.poolData;
            // Add timestamp if not present
            const timestamp = data.timestamp || Math.floor(Date.now() / 1000);
            const documentId = `${data.address}-${timestamp}`;
            // Create document without _id field, MongoDB will generate it
            const document = {
                ...data,
                timestamp,
                documentId, // Store the original ID as a field
            };
            await collection.insertOne(document);
            logger.debug(`Stored pool data for ${data.address}`);
        }
        catch (error) {
            // Ignore duplicate key errors (can happen with rapid updates)
            if (error.code === 11000) {
                logger.debug(`Duplicate pool data for ${data.address}, skipping`);
                return;
            }
            logger.error(`Failed to store pool data for ${data.address}`, { error });
            throw new Error(`Failed to store pool data: ${error.message}`);
        }
    }
    /**
     * Store pool metadata
     * @param poolAddress Pool address
     * @param metadata Pool metadata
     */
    async storePoolMetadata(poolAddress, metadata) {
        await this.ensureConnected();
        try {
            const collection = this.collections.poolMetadata;
            const document = {
                poolAddress,
                ...metadata,
                updatedAt: new Date(),
            };
            await collection.updateOne({ poolAddress }, { $set: document }, { upsert: true });
            logger.debug(`Stored metadata for pool ${poolAddress}`);
        }
        catch (error) {
            logger.error(`Failed to store metadata for pool ${poolAddress}`, { error });
            throw new Error(`Failed to store pool metadata: ${error.message}`);
        }
    }
    /**
     * Store event data
     * @param event Event data
     */
    async storeEvent(event) {
        await this.ensureConnected();
        try {
            const collection = this.collections.events;
            const document = {
                ...event,
                eventId: event.id, // Store the original ID as a field
                timestamp: event.blockTime,
            };
            await collection.insertOne(document);
            logger.debug(`Stored event ${event.id} for pool ${event.poolAddress}`);
        }
        catch (error) {
            // Ignore duplicate key errors
            if (error.code === 11000) {
                logger.debug(`Duplicate event ${event.id}, skipping`);
                return;
            }
            logger.error(`Failed to store event ${event.id}`, { error });
            throw new Error(`Failed to store event: ${error.message}`);
        }
    }
    /**
     * Store token prices
     * @param priceData Token price data
     * @param timestamp Timestamp
     */
    async storeTokenPrices(priceData, timestamp) {
        await this.ensureConnected();
        try {
            const collection = this.collections.tokenPrices;
            const documents = Object.entries(priceData).map(([tokenMint, data]) => ({
                tokenMint,
                price: data.price,
                source: data.source,
                timestamp,
                documentId: `${tokenMint}-${timestamp}`, // Store as a field, not as _id
            }));
            if (documents.length === 0) {
                return;
            }
            await collection.insertMany(documents);
            logger.debug(`Stored prices for ${documents.length} tokens`);
        }
        catch (error) {
            // Ignore duplicate key errors
            if (error.code === 11000) {
                logger.debug('Duplicate token prices, skipping');
                return;
            }
            logger.error('Failed to store token prices', { error });
            throw new Error(`Failed to store token prices: ${error.message}`);
        }
    }
    /**
     * Store token metadata
     * @param tokenMint Token mint address
     * @param metadata Token metadata
     */
    async storeTokenMetadata(tokenMint, metadata) {
        await this.ensureConnected();
        try {
            const collection = this.collections.tokenMetadata;
            const document = {
                tokenMint,
                ...metadata,
                updatedAt: new Date(),
            };
            await collection.updateOne({ tokenMint }, { $set: document }, { upsert: true });
            logger.debug(`Stored metadata for token ${tokenMint}`);
        }
        catch (error) {
            logger.error(`Failed to store metadata for token ${tokenMint}`, { error });
            throw new Error(`Failed to store token metadata: ${error.message}`);
        }
    }
    /**
     * Store whale activity
     * @param activity Whale activity
     */
    async storeWhaleActivity(activity) {
        await this.ensureConnected();
        try {
            const collection = this.collections.whaleActivities;
            const document = {
                ...activity,
                activityId: activity.id, // Store the original ID as a field
                timestamp: activity.blockTime,
            };
            await collection.insertOne(document);
            logger.debug(`Stored whale activity ${activity.id} for pool ${activity.poolAddress}`);
        }
        catch (error) {
            // Ignore duplicate key errors
            if (error.code === 11000) {
                logger.debug(`Duplicate whale activity ${activity.id}, skipping`);
                return;
            }
            logger.error(`Failed to store whale activity ${activity.id}`, { error });
            throw new Error(`Failed to store whale activity: ${error.message}`);
        }
    }
    /**
     * Get latest pool data
     * @param poolAddress Pool address
     * @returns Latest pool data or null if not found
     */
    async getLatestPoolData(poolAddress) {
        await this.ensureConnected();
        try {
            const collection = this.collections.poolData;
            const result = await collection
                .find({ address: poolAddress })
                .sort({ timestamp: -1 })
                .limit(1)
                .toArray();
            if (result.length === 0) {
                return null;
            }
            // Remove MongoDB-specific fields
            const { _id, documentId, ...poolData } = result[0];
            return poolData;
        }
        catch (error) {
            logger.error(`Failed to get latest data for pool ${poolAddress}`, { error });
            throw new Error(`Failed to get latest pool data: ${error.message}`);
        }
    }
    /**
     * Get latest token price
     * @param tokenMint Token mint address
     * @returns Latest token price data or null if not found
     */
    async getLatestTokenPrice(tokenMint) {
        await this.ensureConnected();
        try {
            const collection = this.collections.tokenPrices;
            const result = await collection
                .find({ tokenMint })
                .sort({ timestamp: -1 })
                .limit(1)
                .toArray();
            if (result.length === 0) {
                return null;
            }
            const { _id, tokenMint: _, documentId, ...priceData } = result[0];
            return priceData;
        }
        catch (error) {
            logger.error(`Failed to get latest price for token ${tokenMint}`, { error });
            throw new Error(`Failed to get latest token price: ${error.message}`);
        }
    }
    /**
     * Get raw pool data
     * @param poolAddress Pool address
     * @param startTime Start time in seconds
     * @param endTime End time in seconds
     * @returns Array of pool data points
     */
    async getRawPoolData(poolAddress, startTime, endTime) {
        await this.ensureConnected();
        try {
            const collection = this.collections.poolData;
            const result = await collection
                .find({
                address: poolAddress,
                timestamp: { $gte: startTime, $lte: endTime },
            })
                .sort({ timestamp: 1 })
                .toArray();
            // Remove MongoDB-specific fields
            return result.map(({ _id, documentId, ...poolData }) => poolData);
        }
        catch (error) {
            logger.error(`Failed to get raw data for pool ${poolAddress}`, { error });
            throw new Error(`Failed to get raw pool data: ${error.message}`);
        }
    }
    /**
     * Get aggregated pool data
     * @param poolAddress Pool address
     * @param timeframe Timeframe in seconds
     * @returns Aggregated pool data
     */
    async getAggregatedPoolData(poolAddress, timeframe) {
        await this.ensureConnected();
        try {
            const collection = this.collections.poolData;
            // Calculate start time
            const endTime = Math.floor(Date.now() / 1000);
            const startTime = endTime - timeframe;
            // Get raw data
            const rawData = await this.getRawPoolData(poolAddress, startTime, endTime);
            if (rawData.length === 0) {
                return {
                    poolAddress,
                    timeframe,
                    dataPoints: 0,
                    startTime,
                    endTime,
                    data: {},
                };
            }
            // Calculate aggregated metrics
            const firstData = rawData[0];
            const lastData = rawData[rawData.length - 1];
            // Calculate liquidity change
            const liquidityStart = firstData.liquidity;
            const liquidityEnd = lastData.liquidity;
            const liquidityChange = Number(((Number(liquidityEnd) - Number(liquidityStart)) / Number(liquidityStart)) * 100);
            // Calculate price change
            const priceStart = Number(firstData.sqrtPrice) ** 2;
            const priceEnd = Number(lastData.sqrtPrice) ** 2;
            const priceChange = ((priceEnd - priceStart) / priceStart) * 100;
            // Calculate token reserves change
            const tokenAReserveStart = Number(firstData.tokenA.reserve);
            const tokenAReserveEnd = Number(lastData.tokenA.reserve);
            const tokenAReserveChange = ((tokenAReserveEnd - tokenAReserveStart) / tokenAReserveStart) * 100;
            const tokenBReserveStart = Number(firstData.tokenB.reserve);
            const tokenBReserveEnd = Number(lastData.tokenB.reserve);
            const tokenBReserveChange = ((tokenBReserveEnd - tokenBReserveStart) / tokenBReserveStart) * 100;
            return {
                poolAddress,
                timeframe,
                dataPoints: rawData.length,
                startTime,
                endTime,
                data: {
                    liquidity: {
                        start: liquidityStart.toString(),
                        end: liquidityEnd.toString(),
                        change: liquidityChange,
                    },
                    price: {
                        start: priceStart,
                        end: priceEnd,
                        change: priceChange,
                    },
                    tokenA: {
                        mint: firstData.tokenA.mint,
                        decimals: firstData.tokenA.decimals,
                        reserve: {
                            start: firstData.tokenA.reserve.toString(),
                            end: lastData.tokenA.reserve.toString(),
                            change: tokenAReserveChange,
                        },
                    },
                    tokenB: {
                        mint: firstData.tokenB.mint,
                        decimals: firstData.tokenB.decimals,
                        reserve: {
                            start: firstData.tokenB.reserve.toString(),
                            end: lastData.tokenB.reserve.toString(),
                            change: tokenBReserveChange,
                        },
                    },
                },
            };
        }
        catch (error) {
            logger.error(`Failed to get aggregated data for pool ${poolAddress}`, { error });
            throw new Error(`Failed to get aggregated pool data: ${error.message}`);
        }
    }
    /**
     * Get whale activities
     * @param poolAddress Optional pool address to filter by
     * @param startTime Optional start time in seconds
     * @param endTime Optional end time in seconds
     * @returns Array of whale activities
     */
    async getWhaleActivities(poolAddress, startTime, endTime) {
        await this.ensureConnected();
        try {
            const collection = this.collections.whaleActivities;
            // Build query
            const query = {};
            if (poolAddress) {
                query.poolAddress = poolAddress;
            }
            if (startTime || endTime) {
                query.blockTime = {};
                if (startTime) {
                    query.blockTime.$gte = startTime;
                }
                if (endTime) {
                    query.blockTime.$lte = endTime;
                }
            }
            const result = await collection
                .find(query)
                .sort({ blockTime: -1 })
                .limit(100) // Limit to 100 activities
                .toArray();
            // Remove MongoDB-specific fields
            return result.map(({ _id, activityId, ...activity }) => {
                // Restore the original id
                return { ...activity, id: activityId };
            });
        }
        catch (error) {
            logger.error('Failed to get whale activities', { error, poolAddress, startTime, endTime });
            throw new Error(`Failed to get whale activities: ${error.message}`);
        }
    }
    /**
     * Get storage statistics
     * @returns Storage statistics
     */
    async getStats() {
        await this.ensureConnected();
        try {
            const stats = {
                poolData: await this.collections.poolData.countDocuments(),
                poolMetadata: await this.collections.poolMetadata.countDocuments(),
                events: await this.collections.events.countDocuments(),
                tokenPrices: await this.collections.tokenPrices.countDocuments(),
                tokenMetadata: await this.collections.tokenMetadata.countDocuments(),
                whaleActivities: await this.collections.whaleActivities.countDocuments(),
                pools: await this.collections.poolMetadata.countDocuments(),
                tokens: await this.collections.tokenMetadata.countDocuments(),
                hotDataSize: 0,
                warmDataSize: 0,
                coldDataSize: 0,
            };
            return stats;
        }
        catch (error) {
            logger.error('Failed to get storage statistics', { error });
            throw new Error(`Failed to get storage statistics: ${error.message}`);
        }
    }
    /**
     * Create indexes for collections
     */
    async createIndexes() {
        try {
            logger.info('Creating indexes...');
            // Pool data indexes
            await this.collections.poolData.createIndex({ address: 1, timestamp: -1 });
            await this.collections.poolData.createIndex({ timestamp: 1 });
            await this.collections.poolData.createIndex({ documentId: 1 }, { unique: true });
            // Events indexes
            await this.collections.events.createIndex({ poolAddress: 1, blockTime: -1 });
            await this.collections.events.createIndex({ type: 1, blockTime: -1 });
            await this.collections.events.createIndex({ blockTime: 1 });
            await this.collections.events.createIndex({ eventId: 1 }, { unique: true });
            // Token prices indexes
            await this.collections.tokenPrices.createIndex({ tokenMint: 1, timestamp: -1 });
            await this.collections.tokenPrices.createIndex({ timestamp: 1 });
            await this.collections.tokenPrices.createIndex({ documentId: 1 }, { unique: true });
            // Token metadata indexes
            await this.collections.tokenMetadata.createIndex({ tokenMint: 1 }, { unique: true });
            // Pool metadata indexes
            await this.collections.poolMetadata.createIndex({ poolAddress: 1 }, { unique: true });
            // Whale activities indexes
            await this.collections.whaleActivities.createIndex({ poolAddress: 1, blockTime: -1 });
            await this.collections.whaleActivities.createIndex({ walletAddress: 1, blockTime: -1 });
            await this.collections.whaleActivities.createIndex({ blockTime: 1 });
            await this.collections.whaleActivities.createIndex({ activityId: 1 }, { unique: true });
            // TTL indexes if configured
            if (this.config.indexes?.ttl) {
                const ttl = this.config.indexes.ttl;
                if (ttl.poolData) {
                    await this.collections.poolData.createIndex({ timestamp: 1 }, { expireAfterSeconds: ttl.poolData });
                    logger.info(`Created TTL index for pool data (${ttl.poolData} seconds)`);
                }
                if (ttl.events) {
                    await this.collections.events.createIndex({ blockTime: 1 }, { expireAfterSeconds: ttl.events });
                    logger.info(`Created TTL index for events (${ttl.events} seconds)`);
                }
                if (ttl.tokenPrices) {
                    await this.collections.tokenPrices.createIndex({ timestamp: 1 }, { expireAfterSeconds: ttl.tokenPrices });
                    logger.info(`Created TTL index for token prices (${ttl.tokenPrices} seconds)`);
                }
            }
            logger.info('Indexes created');
        }
        catch (error) {
            logger.error('Failed to create indexes', { error });
            throw new Error(`Failed to create indexes: ${error.message}`);
        }
    }
    /**
     * Ensure connection to MongoDB
     */
    async ensureConnected() {
        if (!this.isConnected) {
            await this.connect();
        }
    }
}
exports.MongoDBStorage = MongoDBStorage;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9uZ29kYi1zdG9yYWdlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL21vZHVsZXMvc3RvcmFnZS9tb25nb2RiLXN0b3JhZ2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbURBQWtEO0FBQ2xELHFDQUFnRTtBQUloRSxNQUFNLE1BQU0sR0FBRyxJQUFBLHlCQUFZLEVBQUMsOEJBQThCLENBQUMsQ0FBQztBQTBCNUQ7O0dBRUc7QUFDSCxNQUFhLGNBQWM7SUFxQnpCOzs7T0FHRztJQUNILFlBQVksTUFBNEI7UUF2QmhDLE9BQUUsR0FBYyxJQUFJLENBQUM7UUFDckIsZ0JBQVcsR0FPZjtZQUNGLFFBQVEsRUFBRSxJQUFJO1lBQ2QsWUFBWSxFQUFFLElBQUk7WUFDbEIsTUFBTSxFQUFFLElBQUk7WUFDWixXQUFXLEVBQUUsSUFBSTtZQUNqQixhQUFhLEVBQUUsSUFBSTtZQUNuQixlQUFlLEVBQUUsSUFBSTtTQUN0QixDQUFDO1FBRU0sZ0JBQVcsR0FBWSxLQUFLLENBQUM7UUFPbkMsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFDckIsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLHFCQUFXLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBRTFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsNkJBQTZCLEVBQUU7WUFDekMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxHQUFHO1lBQ2YsTUFBTSxFQUFFLE1BQU0sQ0FBQyxNQUFNO1NBQ3RCLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxPQUFPO1FBQ1gsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDckIsTUFBTSxDQUFDLElBQUksQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO1lBQzVDLE9BQU87UUFDVCxDQUFDO1FBRUQsSUFBSSxDQUFDO1lBQ0gsTUFBTSxDQUFDLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxDQUFD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QUFFLENBQUMsQ0FBQztRQUNoRSxDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0ssS0FBSyxDQUFDLGVBQWU7UUFDM0IsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUN0QixNQUFNLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUN2QixDQUFDO0lBQ0gsQ0FBQztDQUNGO0FBanBCRCx3Q0FpcEJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgY3JlYXRlTG9nZ2VyIH0gZnJvbSAnQGxpcXByby9tb25pdG9yaW5nJztcbmltcG9ydCB7IE1vbmdvQ2xpZW50LCBDb2xsZWN0aW9uLCBEYiwgT2JqZWN0SWQgfSBmcm9tICdtb25nb2RiJztcbmltcG9ydCB7IERhdGFTdG9yYWdlIH0gZnJvbSAnLi9kYXRhLXN0b3JhZ2UnO1xuaW1wb3J0IHsgUG9vbERhdGEsIFBvb2xFdmVudCwgV2hhbGVBY3Rpdml0eSB9IGZyb20gJy4uLy4uL3R5cGVzL2RhdGEtdHlwZXMnO1xuXG5jb25zdCBsb2dnZXIgPSBjcmVhdGVMb2dnZXIoJ2RhdGEtc2VydmljZTptb25nb2RiLXN0b3JhZ2UnKTtcblxuLyoqXG4gKiBDb25maWd1cmF0aW9uIGZvciBNb25nb0RCIHN0b3JhZ2VcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBNb25nb0RCU3RvcmFnZUNvbmZpZyB7XG4gIHVyaTogc3RyaW5nO1xuICBkYk5hbWU6IHN0cmluZztcbiAgY29sbGVjdGlvbnM6IHtcbiAgICBwb29sRGF0YTogc3RyaW5nO1xuICAgIHBvb2xNZXRhZGF0YTogc3RyaW5nO1xuICAgIGV2ZW50czogc3RyaW5nO1xuICAgIHRva2VuUHJpY2VzOiBzdHJpbmc7XG4gICAgdG9rZW5NZXRhZGF0YTogc3RyaW5nO1xuICAgIHdoYWxlQWN0aXZpdGllczogc3RyaW5nO1xuICB9O1xuICBpbmRleGVzPzoge1xuICAgIGVuYWJsZWQ6IGJvb2xlYW47XG4gICAgdHRsPzoge1xuICAgICAgcG9vbERhdGE/OiBudW1iZXI7IC8vIGluIHNlY29uZHNcbiAgICAgIGV2ZW50cz86IG51bWJlcjsgLy8gaW4gc2Vjb25kc1xuICAgICAgdG9rZW5QcmljZXM/OiBudW1iZXI7IC8vIGluIHNlY29uZHNcbiAgICB9O1xuICB9O1xufVxuXG4vKipcbiAqIE1vbmdvREIgaW1wbGVtZW50YXRpb24gb2YgRGF0YVN0b3JhZ2VcbiAqL1xuZXhwb3J0IGNsYXNzIE1vbmdvREJTdG9yYWdlIGltcGxlbWVudHMgRGF0YVN0b3JhZ2Uge1xuICBwcml2YXRlIGNsaWVudDogTW9uZ29DbGllbnQ7XG4gIHByaXZhdGUgZGI6IERiIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgY29sbGVjdGlvbnM6IHtcbiAgICBwb29sRGF0YTogQ29sbGVjdGlvbiB8IG51bGw7XG4gICAgcG9vbE1ldGFkYXRhOiBDb2xsZWN0aW9uIHwgbnVsbDtcbiAgICBldmVudHM6IENvbGxlY3Rpb24gfCBudWxsO1xuICAgIHRva2VuUHJpY2VzOiBDb2xsZWN0aW9uIHwgbnVsbDtcbiAgICB0b2tlbk1ldGFkYXRhOiBDb2xsZWN0aW9uIHwgbnVsbDtcbiAgICB3aGFsZUFjdGl2aXRpZXM6IENvbGxlY3Rpb24gfCBudWxsO1xuICB9ID0ge1xuICAgIHBvb2xEYXRhOiBudWxsLFxuICAgIHBvb2xNZXRhZGF0YTogbnVsbCxcbiAgICBldmVudHM6IG51bGwsXG4gICAgdG9rZW5QcmljZXM6IG51bGwsXG4gICAgdG9rZW5NZXRhZGF0YTogbnVsbCxcbiAgICB3aGFsZUFjdGl2aXRpZXM6IG51bGwsXG4gIH07XG4gIHByaXZhdGUgY29uZmlnOiBNb25nb0RCU3RvcmFnZUNvbmZpZztcbiAgcHJpdmF0ZSBpc0Nvbm5lY3RlZDogYm9vbGVhbiA9IGZhbHNlO1xuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSBuZXcgTW9uZ29EQiBzdG9yYWdlXG4gICAqIEBwYXJhbSBjb25maWcgU3RvcmFnZSBjb25maWd1cmF0aW9uXG4gICAqL1xuICBjb25zdHJ1Y3Rvcihjb25maWc6IE1vbmdvREJTdG9yYWdlQ29uZmlnKSB7XG4gICAgdGhpcy5jb25maWcgPSBjb25maWc7XG4gICAgdGhpcy5jbGllbnQgPSBuZXcgTW9uZ29DbGllbnQoY29uZmlnLnVyaSk7XG5cbiAgICBsb2dnZXIuaW5mbygnTW9uZ29EQiBzdG9yYWdlIGluaXRpYWxpemVkJywge1xuICAgICAgdXJpOiBjb25maWcudXJpLFxuICAgICAgZGJOYW1lOiBjb25maWcuZGJOYW1lLFxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIENvbm5lY3QgdG8gTW9uZ29EQlxuICAgKi9cbiAgYXN5bmMgY29ubmVjdCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAodGhpcy5pc0Nvbm5lY3RlZCkge1xuICAgICAgbG9nZ2VyLmluZm8oJ0FscmVhZHkgY29ubmVjdGVkIHRvIE1vbmdvREInKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgbG9nZ2VyLmluZm8oJ0Nvbm5lY3RpbmcgdG8gTW9uZ29EQi4uLicpO1xuXG4gICAgICBhd2FpdCB0aGlzLmNsaWVudC5jb25uZWN0KCk7XG4gICAgICB0aGlzLmRiID0gdGhpcy5jbGllbnQuZGIodGhpcy5jb25maWcuZGJOYW1lKTtcblxuICAgICAgLy8gSW5pdGlhbGl6ZSBjb2xsZWN0aW9uc1xuICAgICAgdGhpcy5jb2xsZWN0aW9ucy5wb29sRGF0YSA9IHRoaXMuZGIuY29sbGVjdGlvbih0aGlzLmNvbmZpZy5jb2xsZWN0aW9ucy5wb29sRGF0YSk7XG4gICAgICB0aGlzLmNvbGxlY3Rpb25zLnBvb2xNZXRhZGF0YSA9IHRoaXMuZGIuY29sbGVjdGlvbih0aGlzLmNvbmZpZy5jb2xsZWN0aW9ucy5wb29sTWV0YWRhdGEpO1xuICAgICAgdGhpcy5jb2xsZWN0aW9ucy5ldmVudHMgPSB0aGlzLmRiLmNvbGxlY3Rpb24odGhpcy5jb25maWcuY29sbGVjdGlvbnMuZXZlbnRzKTtcbiAgICAgIHRoaXMuY29sbGVjdGlvbnMudG9rZW5QcmljZXMgPSB0aGlzLmRiLmNvbGxlY3Rpb24odGhpcy5jb25maWcuY29sbGVjdGlvbnMudG9rZW5QcmljZXMpO1xuICAgICAgdGhpcy5jb2xsZWN0aW9ucy50b2tlbk1ldGFkYXRhID0gdGhpcy5kYi5jb2xsZWN0aW9uKHRoaXMuY29uZmlnLmNvbGxlY3Rpb25zLnRva2VuTWV0YWRhdGEpO1xuICAgICAgdGhpcy5jb2xsZWN0aW9ucy53aGFsZUFjdGl2aXRpZXMgPSB0aGlzLmRiLmNvbGxlY3Rpb24oXG4gICAgICAgIHRoaXMuY29uZmlnLmNvbGxlY3Rpb25zLndoYWxlQWN0aXZpdGllc1xuICAgICAgKTtcblxuICAgICAgLy8gQ3JlYXRlIGluZGV4ZXMgaWYgZW5hYmxlZFxuICAgICAgaWYgKHRoaXMuY29uZmlnLmluZGV4ZXM/LmVuYWJsZWQpIHtcbiAgICAgICAgYXdhaXQgdGhpcy5jcmVhdGVJbmRleGVzKCk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuaXNDb25uZWN0ZWQgPSB0cnVlO1xuICAgICAgbG9nZ2VyLmluZm8oJ0Nvbm5lY3RlZCB0byBNb25nb0RCJyk7XG4gICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgbG9nZ2VyLmVycm9yKCdGYWlsZWQgdG8gY29ubmVjdCB0byBNb25nb0RCJywgeyBlcnJvciB9KTtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIGNvbm5lY3QgdG8gTW9uZ29EQjogJHtlcnJvci5tZXNzYWdlfWApO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBEaXNjb25uZWN0IGZyb20gTW9uZ29EQlxuICAgKi9cbiAgYXN5bmMgZGlzY29ubmVjdCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAoIXRoaXMuaXNDb25uZWN0ZWQpIHtcbiAgICAgIGxvZ2dlci5pbmZvKCdOb3QgY29ubmVjdGVkIHRvIE1vbmdvREInKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgbG9nZ2VyLmluZm8oJ0Rpc2Nvbm5lY3RpbmcgZnJvbSBNb25nb0RCLi4uJyk7XG5cbiAgICAgIGF3YWl0IHRoaXMuY2xpZW50LmNsb3NlKCk7XG5cbiAgICAgIHRoaXMuaXNDb25uZWN0ZWQgPSBmYWxzZTtcbiAgICAgIHRoaXMuZGIgPSBudWxsO1xuICAgICAgdGhpcy5jb2xsZWN0aW9ucy5wb29sRGF0YSA9IG51bGw7XG4gICAgICB0aGlzLmNvbGxlY3Rpb25zLnBvb2xNZXRhZGF0YSA9IG51bGw7XG4gICAgICB0aGlzLmNvbGxlY3Rpb25zLmV2ZW50cyA9IG51bGw7XG4gICAgICB0aGlzLmNvbGxlY3Rpb25zLnRva2VuUHJpY2VzID0gbnVsbDtcbiAgICAgIHRoaXMuY29sbGVjdGlvbnMudG9rZW5NZXRhZGF0YSA9IG51bGw7XG4gICAgICB0aGlzLmNvbGxlY3Rpb25zLndoYWxlQWN0aXZpdGllcyA9IG51bGw7XG5cbiAgICAgIGxvZ2dlci5pbmZvKCdEaXNjb25uZWN0ZWQgZnJvbSBNb25nb0RCJyk7XG4gICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgbG9nZ2VyLmVycm9yKCdGYWlsZWQgdG8gZGlzY29ubmVjdCBmcm9tIE1vbmdvREInLCB7IGVycm9yIH0pO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gZGlzY29ubmVjdCBmcm9tIE1vbmdvREI6ICR7ZXJyb3IubWVzc2FnZX1gKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU3RvcmUgcG9vbCBkYXRhXG4gICAqIEBwYXJhbSBkYXRhIFBvb2wgZGF0YVxuICAgKi9cbiAgYXN5bmMgc3RvcmVQb29sRGF0YShkYXRhOiBQb29sRGF0YSk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMuZW5zdXJlQ29ubmVjdGVkKCk7XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgY29sbGVjdGlvbiA9IHRoaXMuY29sbGVjdGlvbnMucG9vbERhdGEhO1xuXG4gICAgICAvLyBBZGQgdGltZXN0YW1wIGlmIG5vdCBwcmVzZW50XG4gICAgICBjb25zdCB0aW1lc3RhbXAgPSBkYXRhLnRpbWVzdGFtcCB8fCBNYXRoLmZsb29yKERhdGUubm93KCkgLyAxMDAwKTtcbiAgICAgIGNvbnN0IGRvY3VtZW50SWQgPSBgJHtkYXRhLmFkZHJlc3N9LSR7dGltZXN0YW1wfWA7XG5cbiAgICAgIC8vIENyZWF0ZSBkb2N1bWVudCB3aXRob3V0IF9pZCBmaWVsZCwgTW9uZ29EQiB3aWxsIGdlbmVyYXRlIGl0XG4gICAgICBjb25zdCBkb2N1bWVudCA9IHtcbiAgICAgICAgLi4uZGF0YSxcbiAgICAgICAgdGltZXN0YW1wLFxuICAgICAgICBkb2N1bWVudElkLCAvLyBTdG9yZSB0aGUgb3JpZ2luYWwgSUQgYXMgYSBmaWVsZFxuICAgICAgfTtcblxuICAgICAgYXdhaXQgY29sbGVjdGlvbi5pbnNlcnRPbmUoZG9jdW1lbnQpO1xuXG4gICAgICBsb2dnZXIuZGVidWcoYFN0b3JlZCBwb29sIGRhdGEgZm9yICR7ZGF0YS5hZGRyZXNzfWApO1xuICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgIC8vIElnbm9yZSBkdXBsaWNhdGUga2V5IGVycm9ycyAoY2FuIGhhcHBlbiB3aXRoIHJhcGlkIHVwZGF0ZXMpXG4gICAgICBpZiAoZXJyb3IuY29kZSA9PT0gMTEwMDApIHtcbiAgICAgICAgbG9nZ2VyLmRlYnVnKGBEdXBsaWNhdGUgcG9vbCBkYXRhIGZvciAke2RhdGEuYWRkcmVzc30sIHNraXBwaW5nYCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgbG9nZ2VyLmVycm9yKGBGYWlsZWQgdG8gc3RvcmUgcG9vbCBkYXRhIGZvciAke2RhdGEuYWRkcmVzc31gLCB7IGVycm9yIH0pO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gc3RvcmUgcG9vbCBkYXRhOiAke2Vycm9yLm1lc3NhZ2V9YCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFN0b3JlIHBvb2wgbWV0YWRhdGFcbiAgICogQHBhcmFtIHBvb2xBZGRyZXNzIFBvb2wgYWRkcmVzc1xuICAgKiBAcGFyYW0gbWV0YWRhdGEgUG9vbCBtZXRhZGF0YVxuICAgKi9cbiAgYXN5bmMgc3RvcmVQb29sTWV0YWRhdGEoXG4gICAgcG9vbEFkZHJlc3M6IHN0cmluZyxcbiAgICBtZXRhZGF0YTogeyBuYW1lPzogc3RyaW5nOyBkZXNjcmlwdGlvbj86IHN0cmluZyB9XG4gICk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMuZW5zdXJlQ29ubmVjdGVkKCk7XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgY29sbGVjdGlvbiA9IHRoaXMuY29sbGVjdGlvbnMucG9vbE1ldGFkYXRhITtcblxuICAgICAgY29uc3QgZG9jdW1lbnQgPSB7XG4gICAgICAgIHBvb2xBZGRyZXNzLFxuICAgICAgICAuLi5tZXRhZGF0YSxcbiAgICAgICAgdXBkYXRlZEF0OiBuZXcgRGF0ZSgpLFxuICAgICAgfTtcblxuICAgICAgYXdhaXQgY29sbGVjdGlvbi51cGRhdGVPbmUoeyBwb29sQWRkcmVzcyB9LCB7ICRzZXQ6IGRvY3VtZW50IH0sIHsgdXBzZXJ0OiB0cnVlIH0pO1xuXG4gICAgICBsb2dnZXIuZGVidWcoYFN0b3JlZCBtZXRhZGF0YSBmb3IgcG9vbCAke3Bvb2xBZGRyZXNzfWApO1xuICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgIGxvZ2dlci5lcnJvcihgRmFpbGVkIHRvIHN0b3JlIG1ldGFkYXRhIGZvciBwb29sICR7cG9vbEFkZHJlc3N9YCwgeyBlcnJvciB9KTtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIHN0b3JlIHBvb2wgbWV0YWRhdGE6ICR7ZXJyb3IubWVzc2FnZX1gKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU3RvcmUgZXZlbnQgZGF0YVxuICAgKiBAcGFyYW0gZXZlbnQgRXZlbnQgZGF0YVxuICAgKi9cbiAgYXN5bmMgc3RvcmVFdmVudChldmVudDogUG9vbEV2ZW50KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy5lbnN1cmVDb25uZWN0ZWQoKTtcblxuICAgIHRyeSB7XG4gICAgICBjb25zdCBjb2xsZWN0aW9uID0gdGhpcy5jb2xsZWN0aW9ucy5ldmVudHMhO1xuXG4gICAgICBjb25zdCBkb2N1bWVudCA9IHtcbiAgICAgICAgLi4uZXZlbnQsXG4gICAgICAgIGV2ZW50SWQ6IGV2ZW50LmlkLCAvLyBTdG9yZSB0aGUgb3JpZ2luYWwgSUQgYXMgYSBmaWVsZFxuICAgICAgICB0aW1lc3RhbXA6IGV2ZW50LmJsb2NrVGltZSxcbiAgICAgIH07XG5cbiAgICAgIGF3YWl0IGNvbGxlY3Rpb24uaW5zZXJ0T25lKGRvY3VtZW50KTtcblxuICAgICAgbG9nZ2VyLmRlYnVnKGBTdG9yZWQgZXZlbnQgJHtldmVudC5pZH0gZm9yIHBvb2wgJHtldmVudC5wb29sQWRkcmVzc31gKTtcbiAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAvLyBJZ25vcmUgZHVwbGljYXRlIGtleSBlcnJvcnNcbiAgICAgIGlmIChlcnJvci5jb2RlID09PSAxMTAwMCkge1xuICAgICAgICBsb2dnZXIuZGVidWcoYER1cGxpY2F0ZSBldmVudCAke2V2ZW50LmlkfSwgc2tpcHBpbmdgKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBsb2dnZXIuZXJyb3IoYEZhaWxlZCB0byBzdG9yZSBldmVudCAke2V2ZW50LmlkfWAsIHsgZXJyb3IgfSk7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBzdG9yZSBldmVudDogJHtlcnJvci5tZXNzYWdlfWApO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBTdG9yZSB0b2tlbiBwcmljZXNcbiAgICogQHBhcmFtIHByaWNlRGF0YSBUb2tlbiBwcmljZSBkYXRhXG4gICAqIEBwYXJhbSB0aW1lc3RhbXAgVGltZXN0YW1wXG4gICAqL1xuICBhc3luYyBzdG9yZVRva2VuUHJpY2VzKFxuICAgIHByaWNlRGF0YTogUmVjb3JkPHN0cmluZywgeyBwcmljZTogbnVtYmVyOyBzb3VyY2U6IHN0cmluZyB9PixcbiAgICB0aW1lc3RhbXA6IG51bWJlclxuICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCB0aGlzLmVuc3VyZUNvbm5lY3RlZCgpO1xuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGNvbGxlY3Rpb24gPSB0aGlzLmNvbGxlY3Rpb25zLnRva2VuUHJpY2VzITtcblxuICAgICAgY29uc3QgZG9jdW1lbnRzID0gT2JqZWN0LmVudHJpZXMocHJpY2VEYXRhKS5tYXAoKFt0b2tlbk1pbnQsIGRhdGFdKSA9PiAoe1xuICAgICAgICB0b2tlbk1pbnQsXG4gICAgICAgIHByaWNlOiBkYXRhLnByaWNlLFxuICAgICAgICBzb3VyY2U6IGRhdGEuc291cmNlLFxuICAgICAgICB0aW1lc3RhbXAsXG4gICAgICAgIGRvY3VtZW50SWQ6IGAke3Rva2VuTWludH0tJHt0aW1lc3RhbXB9YCwgLy8gU3RvcmUgYXMgYSBmaWVsZCwgbm90IGFzIF9pZFxuICAgICAgfSkpO1xuXG4gICAgICBpZiAoZG9jdW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IGNvbGxlY3Rpb24uaW5zZXJ0TWFueShkb2N1bWVudHMpO1xuXG4gICAgICBsb2dnZXIuZGVidWcoYFN0b3JlZCBwcmljZXMgZm9yICR7ZG9jdW1lbnRzLmxlbmd0aH0gdG9rZW5zYCk7XG4gICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgLy8gSWdub3JlIGR1cGxpY2F0ZSBrZXkgZXJyb3JzXG4gICAgICBpZiAoZXJyb3IuY29kZSA9PT0gMTEwMDApIHtcbiAgICAgICAgbG9nZ2VyLmRlYnVnKCdEdXBsaWNhdGUgdG9rZW4gcHJpY2VzLCBza2lwcGluZycpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGxvZ2dlci5lcnJvcignRmFpbGVkIHRvIHN0b3JlIHRva2VuIHByaWNlcycsIHsgZXJyb3IgfSk7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBzdG9yZSB0b2tlbiBwcmljZXM6ICR7ZXJyb3IubWVzc2FnZX1gKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU3RvcmUgdG9rZW4gbWV0YWRhdGFcbiAgICogQHBhcmFtIHRva2VuTWludCBUb2tlbiBtaW50IGFkZHJlc3NcbiAgICogQHBhcmFtIG1ldGFkYXRhIFRva2VuIG1ldGFkYXRhXG4gICAqL1xuICBhc3luYyBzdG9yZVRva2VuTWV0YWRhdGEoXG4gICAgdG9rZW5NaW50OiBzdHJpbmcsXG4gICAgbWV0YWRhdGE6IHsgc3ltYm9sPzogc3RyaW5nOyBuYW1lPzogc3RyaW5nIH1cbiAgKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy5lbnN1cmVDb25uZWN0ZWQoKTtcblxuICAgIHRyeSB7XG4gICAgICBjb25zdCBjb2xsZWN0aW9uID0gdGhpcy5jb2xsZWN0aW9ucy50b2tlbk1ldGFkYXRhITtcblxuICAgICAgY29uc3QgZG9jdW1lbnQgPSB7XG4gICAgICAgIHRva2VuTWludCxcbiAgICAgICAgLi4ubWV0YWRhdGEsXG4gICAgICAgIHVwZGF0ZWRBdDogbmV3IERhdGUoKSxcbiAgICAgIH07XG5cbiAgICAgIGF3YWl0IGNvbGxlY3Rpb24udXBkYXRlT25lKHsgdG9rZW5NaW50IH0sIHsgJHNldDogZG9jdW1lbnQgfSwgeyB1cHNlcnQ6IHRydWUgfSk7XG5cbiAgICAgIGxvZ2dlci5kZWJ1ZyhgU3RvcmVkIG1ldGFkYXRhIGZvciB0b2tlbiAke3Rva2VuTWludH1gKTtcbiAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICBsb2dnZXIuZXJyb3IoYEZhaWxlZCB0byBzdG9yZSBtZXRhZGF0YSBmb3IgdG9rZW4gJHt0b2tlbk1pbnR9YCwgeyBlcnJvciB9KTtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIHN0b3JlIHRva2VuIG1ldGFkYXRhOiAke2Vycm9yLm1lc3NhZ2V9YCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFN0b3JlIHdoYWxlIGFjdGl2aXR5XG4gICAqIEBwYXJhbSBhY3Rpdml0eSBXaGFsZSBhY3Rpdml0eVxuICAgKi9cbiAgYXN5bmMgc3RvcmVXaGFsZUFjdGl2aXR5KGFjdGl2aXR5OiBXaGFsZUFjdGl2aXR5KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy5lbnN1cmVDb25uZWN0ZWQoKTtcblxuICAgIHRyeSB7XG4gICAgICBjb25zdCBjb2xsZWN0aW9uID0gdGhpcy5jb2xsZWN0aW9ucy53aGFsZUFjdGl2aXRpZXMhO1xuXG4gICAgICBjb25zdCBkb2N1bWVudCA9IHtcbiAgICAgICAgLi4uYWN0aXZpdHksXG4gICAgICAgIGFjdGl2aXR5SWQ6IGFjdGl2aXR5LmlkLCAvLyBTdG9yZSB0aGUgb3JpZ2luYWwgSUQgYXMgYSBmaWVsZFxuICAgICAgICB0aW1lc3RhbXA6IGFjdGl2aXR5LmJsb2NrVGltZSxcbiAgICAgIH07XG5cbiAgICAgIGF3YWl0IGNvbGxlY3Rpb24uaW5zZXJ0T25lKGRvY3VtZW50KTtcblxuICAgICAgbG9nZ2VyLmRlYnVnKGBTdG9yZWQgd2hhbGUgYWN0aXZpdHkgJHthY3Rpdml0eS5pZH0gZm9yIHBvb2wgJHthY3Rpdml0eS5wb29sQWRkcmVzc31gKTtcbiAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAvLyBJZ25vcmUgZHVwbGljYXRlIGtleSBlcnJvcnNcbiAgICAgIGlmIChlcnJvci5jb2RlID09PSAxMTAwMCkge1xuICAgICAgICBsb2dnZXIuZGVidWcoYER1cGxpY2F0ZSB3aGFsZSBhY3Rpdml0eSAke2FjdGl2aXR5LmlkfSwgc2tpcHBpbmdgKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBsb2dnZXIuZXJyb3IoYEZhaWxlZCB0byBzdG9yZSB3aGFsZSBhY3Rpdml0eSAke2FjdGl2aXR5LmlkfWAsIHsgZXJyb3IgfSk7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBzdG9yZSB3aGFsZSBhY3Rpdml0eTogJHtlcnJvci5tZXNzYWdlfWApO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgbGF0ZXN0IHBvb2wgZGF0YVxuICAgKiBAcGFyYW0gcG9vbEFkZHJlc3MgUG9vbCBhZGRyZXNzXG4gICAqIEByZXR1cm5zIExhdGVzdCBwb29sIGRhdGEgb3IgbnVsbCBpZiBub3QgZm91bmRcbiAgICovXG4gIGFzeW5jIGdldExhdGVzdFBvb2xEYXRhKHBvb2xBZGRyZXNzOiBzdHJpbmcpOiBQcm9taXNlPFBvb2xEYXRhIHwgbnVsbD4ge1xuICAgIGF3YWl0IHRoaXMuZW5zdXJlQ29ubmVjdGVkKCk7XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgY29sbGVjdGlvbiA9IHRoaXMuY29sbGVjdGlvbnMucG9vbERhdGEhO1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBjb2xsZWN0aW9uXG4gICAgICAgIC5maW5kKHsgYWRkcmVzczogcG9vbEFkZHJlc3MgfSlcbiAgICAgICAgLnNvcnQoeyB0aW1lc3RhbXA6IC0xIH0pXG4gICAgICAgIC5saW1pdCgxKVxuICAgICAgICAudG9BcnJheSgpO1xuXG4gICAgICBpZiAocmVzdWx0Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgLy8gUmVtb3ZlIE1vbmdvREItc3BlY2lmaWMgZmllbGRzXG4gICAgICBjb25zdCB7IF9pZCwgZG9jdW1lbnRJZCwgLi4ucG9vbERhdGEgfSA9IHJlc3VsdFswXTtcblxuICAgICAgcmV0dXJuIHBvb2xEYXRhIGFzIFBvb2xEYXRhO1xuICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgIGxvZ2dlci5lcnJvcihgRmFpbGVkIHRvIGdldCBsYXRlc3QgZGF0YSBmb3IgcG9vbCAke3Bvb2xBZGRyZXNzfWAsIHsgZXJyb3IgfSk7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBnZXQgbGF0ZXN0IHBvb2wgZGF0YTogJHtlcnJvci5tZXNzYWdlfWApO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgbGF0ZXN0IHRva2VuIHByaWNlXG4gICAqIEBwYXJhbSB0b2tlbk1pbnQgVG9rZW4gbWludCBhZGRyZXNzXG4gICAqIEByZXR1cm5zIExhdGVzdCB0b2tlbiBwcmljZSBkYXRhIG9yIG51bGwgaWYgbm90IGZvdW5kXG4gICAqL1xuICBhc3luYyBnZXRMYXRlc3RUb2tlblByaWNlKFxuICAgIHRva2VuTWludDogc3RyaW5nXG4gICk6IFByb21pc2U8eyBwcmljZTogbnVtYmVyOyBzb3VyY2U6IHN0cmluZzsgdGltZXN0YW1wOiBudW1iZXIgfSB8IG51bGw+IHtcbiAgICBhd2FpdCB0aGlzLmVuc3VyZUNvbm5lY3RlZCgpO1xuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGNvbGxlY3Rpb24gPSB0aGlzLmNvbGxlY3Rpb25zLnRva2VuUHJpY2VzITtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY29sbGVjdGlvblxuICAgICAgICAuZmluZCh7IHRva2VuTWludCB9KVxuICAgICAgICAuc29ydCh7IHRpbWVzdGFtcDogLTEgfSlcbiAgICAgICAgLmxpbWl0KDEpXG4gICAgICAgIC50b0FycmF5KCk7XG5cbiAgICAgIGlmIChyZXN1bHQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICBjb25zdCB7IF9pZCwgdG9rZW5NaW50OiBfLCBkb2N1bWVudElkLCAuLi5wcmljZURhdGEgfSA9IHJlc3VsdFswXTtcblxuICAgICAgcmV0dXJuIHByaWNlRGF0YSBhcyB7IHByaWNlOiBudW1iZXI7IHNvdXJjZTogc3RyaW5nOyB0aW1lc3RhbXA6IG51bWJlciB9O1xuICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgIGxvZ2dlci5lcnJvcihgRmFpbGVkIHRvIGdldCBsYXRlc3QgcHJpY2UgZm9yIHRva2VuICR7dG9rZW5NaW50fWAsIHsgZXJyb3IgfSk7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBnZXQgbGF0ZXN0IHRva2VuIHByaWNlOiAke2Vycm9yLm1lc3NhZ2V9YCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEdldCByYXcgcG9vbCBkYXRhXG4gICAqIEBwYXJhbSBwb29sQWRkcmVzcyBQb29sIGFkZHJlc3NcbiAgICogQHBhcmFtIHN0YXJ0VGltZSBTdGFydCB0aW1lIGluIHNlY29uZHNcbiAgICogQHBhcmFtIGVuZFRpbWUgRW5kIHRpbWUgaW4gc2Vjb25kc1xuICAgKiBAcmV0dXJucyBBcnJheSBvZiBwb29sIGRhdGEgcG9pbnRzXG4gICAqL1xuICBhc3luYyBnZXRSYXdQb29sRGF0YShcbiAgICBwb29sQWRkcmVzczogc3RyaW5nLFxuICAgIHN0YXJ0VGltZTogbnVtYmVyLFxuICAgIGVuZFRpbWU6IG51bWJlclxuICApOiBQcm9taXNlPFBvb2xEYXRhW10+IHtcbiAgICBhd2FpdCB0aGlzLmVuc3VyZUNvbm5lY3RlZCgpO1xuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGNvbGxlY3Rpb24gPSB0aGlzLmNvbGxlY3Rpb25zLnBvb2xEYXRhITtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY29sbGVjdGlvblxuICAgICAgICAuZmluZCh7XG4gICAgICAgICAgYWRkcmVzczogcG9vbEFkZHJlc3MsXG4gICAgICAgICAgdGltZXN0YW1wOiB7ICRndGU6IHN0YXJ0VGltZSwgJGx0ZTogZW5kVGltZSB9LFxuICAgICAgICB9KVxuICAgICAgICAuc29ydCh7IHRpbWVzdGFtcDogMSB9KVxuICAgICAgICAudG9BcnJheSgpO1xuXG4gICAgICAvLyBSZW1vdmUgTW9uZ29EQi1zcGVjaWZpYyBmaWVsZHNcbiAgICAgIHJldHVybiByZXN1bHQubWFwKCh7IF9pZCwgZG9jdW1lbnRJZCwgLi4ucG9vbERhdGEgfSkgPT4gcG9vbERhdGEgYXMgUG9vbERhdGEpO1xuICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgIGxvZ2dlci5lcnJvcihgRmFpbGVkIHRvIGdldCByYXcgZGF0YSBmb3IgcG9vbCAke3Bvb2xBZGRyZXNzfWAsIHsgZXJyb3IgfSk7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBnZXQgcmF3IHBvb2wgZGF0YTogJHtlcnJvci5tZXNzYWdlfWApO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgYWdncmVnYXRlZCBwb29sIGRhdGFcbiAgICogQHBhcmFtIHBvb2xBZGRyZXNzIFBvb2wgYWRkcmVzc1xuICAgKiBAcGFyYW0gdGltZWZyYW1lIFRpbWVmcmFtZSBpbiBzZWNvbmRzXG4gICAqIEByZXR1cm5zIEFnZ3JlZ2F0ZWQgcG9vbCBkYXRhXG4gICAqL1xuICBhc3luYyBnZXRBZ2dyZWdhdGVkUG9vbERhdGEocG9vbEFkZHJlc3M6IHN0cmluZywgdGltZWZyYW1lOiBudW1iZXIpOiBQcm9taXNlPGFueT4ge1xuICAgIGF3YWl0IHRoaXMuZW5zdXJlQ29ubmVjdGVkKCk7XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgY29sbGVjdGlvbiA9IHRoaXMuY29sbGVjdGlvbnMucG9vbERhdGEhO1xuXG4gICAgICAvLyBDYWxjdWxhdGUgc3RhcnQgdGltZVxuICAgICAgY29uc3QgZW5kVGltZSA9IE1hdGguZmxvb3IoRGF0ZS5ub3coKSAvIDEwMDApO1xuICAgICAgY29uc3Qgc3RhcnRUaW1lID0gZW5kVGltZSAtIHRpbWVmcmFtZTtcblxuICAgICAgLy8gR2V0IHJhdyBkYXRhXG4gICAgICBjb25zdCByYXdEYXRhID0gYXdhaXQgdGhpcy5nZXRSYXdQb29sRGF0YShwb29sQWRkcmVzcywgc3RhcnRUaW1lLCBlbmRUaW1lKTtcblxuICAgICAgaWYgKHJhd0RhdGEubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgcG9vbEFkZHJlc3MsXG4gICAgICAgICAgdGltZWZyYW1lLFxuICAgICAgICAgIGRhdGFQb2ludHM6IDAsXG4gICAgICAgICAgc3RhcnRUaW1lLFxuICAgICAgICAgIGVuZFRpbWUsXG4gICAgICAgICAgZGF0YToge30sXG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIC8vIENhbGN1bGF0ZSBhZ2dyZWdhdGVkIG1ldHJpY3NcbiAgICAgIGNvbnN0IGZpcnN0RGF0YSA9IHJhd0RhdGFbMF07XG4gICAgICBjb25zdCBsYXN0RGF0YSA9IHJhd0RhdGFbcmF3RGF0YS5sZW5ndGggLSAxXTtcblxuICAgICAgLy8gQ2FsY3VsYXRlIGxpcXVpZGl0eSBjaGFuZ2VcbiAgICAgIGNvbnN0IGxpcXVpZGl0eVN0YXJ0ID0gZmlyc3REYXRhLmxpcXVpZGl0eTtcbiAgICAgIGNvbnN0IGxpcXVpZGl0eUVuZCA9IGxhc3REYXRhLmxpcXVpZGl0eTtcbiAgICAgIGNvbnN0IGxpcXVpZGl0eUNoYW5nZSA9IE51bWJlcihcbiAgICAgICAgKChOdW1iZXIobGlxdWlkaXR5RW5kKSAtIE51bWJlcihsaXF1aWRpdHlTdGFydCkpIC8gTnVtYmVyKGxpcXVpZGl0eVN0YXJ0KSkgKiAxMDBcbiAgICAgICk7XG5cbiAgICAgIC8vIENhbGN1bGF0ZSBwcmljZSBjaGFuZ2VcbiAgICAgIGNvbnN0IHByaWNlU3RhcnQgPSBOdW1iZXIoZmlyc3REYXRhLnNxcnRQcmljZSkgKiogMjtcbiAgICAgIGNvbnN0IHByaWNlRW5kID0gTnVtYmVyKGxhc3REYXRhLnNxcnRQcmljZSkgKiogMjtcbiAgICAgIGNvbnN0IHByaWNlQ2hhbmdlID0gKChwcmljZUVuZCAtIHByaWNlU3RhcnQpIC8gcHJpY2VTdGFydCkgKiAxMDA7XG5cbiAgICAgIC8vIENhbGN1bGF0ZSB0b2tlbiByZXNlcnZlcyBjaGFuZ2VcbiAgICAgIGNvbnN0IHRva2VuQVJlc2VydmVTdGFydCA9IE51bWJlcihmaXJzdERhdGEudG9rZW5BLnJlc2VydmUpO1xuICAgICAgY29uc3QgdG9rZW5BUmVzZXJ2ZUVuZCA9IE51bWJlcihsYXN0RGF0YS50b2tlbkEucmVzZXJ2ZSk7XG4gICAgICBjb25zdCB0b2tlbkFSZXNlcnZlQ2hhbmdlID1cbiAgICAgICAgKCh0b2tlbkFSZXNlcnZlRW5kIC0gdG9rZW5BUmVzZXJ2ZVN0YXJ0KSAvIHRva2VuQVJlc2VydmVTdGFydCkgKiAxMDA7XG5cbiAgICAgIGNvbnN0IHRva2VuQlJlc2VydmVTdGFydCA9IE51bWJlcihmaXJzdERhdGEudG9rZW5CLnJlc2VydmUpO1xuICAgICAgY29uc3QgdG9rZW5CUmVzZXJ2ZUVuZCA9IE51bWJlcihsYXN0RGF0YS50b2tlbkIucmVzZXJ2ZSk7XG4gICAgICBjb25zdCB0b2tlbkJSZXNlcnZlQ2hhbmdlID1cbiAgICAgICAgKCh0b2tlbkJSZXNlcnZlRW5kIC0gdG9rZW5CUmVzZXJ2ZVN0YXJ0KSAvIHRva2VuQlJlc2VydmVTdGFydCkgKiAxMDA7XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIHBvb2xBZGRyZXNzLFxuICAgICAgICB0aW1lZnJhbWUsXG4gICAgICAgIGRhdGFQb2ludHM6IHJhd0RhdGEubGVuZ3RoLFxuICAgICAgICBzdGFydFRpbWUsXG4gICAgICAgIGVuZFRpbWUsXG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICBsaXF1aWRpdHk6IHtcbiAgICAgICAgICAgIHN0YXJ0OiBsaXF1aWRpdHlTdGFydC50b1N0cmluZygpLFxuICAgICAgICAgICAgZW5kOiBsaXF1aWRpdHlFbmQudG9TdHJpbmcoKSxcbiAgICAgICAgICAgIGNoYW5nZTogbGlxdWlkaXR5Q2hhbmdlLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgcHJpY2U6IHtcbiAgICAgICAgICAgIHN0YXJ0OiBwcmljZVN0YXJ0LFxuICAgICAgICAgICAgZW5kOiBwcmljZUVuZCxcbiAgICAgICAgICAgIGNoYW5nZTogcHJpY2VDaGFuZ2UsXG4gICAgICAgICAgfSxcbiAgICAgICAgICB0b2tlbkE6IHtcbiAgICAgICAgICAgIG1pbnQ6IGZpcnN0RGF0YS50b2tlbkEubWludCxcbiAgICAgICAgICAgIGRlY2ltYWxzOiBmaXJzdERhdGEudG9rZW5BLmRlY2ltYWxzLFxuICAgICAgICAgICAgcmVzZXJ2ZToge1xuICAgICAgICAgICAgICBzdGFydDogZmlyc3REYXRhLnRva2VuQS5yZXNlcnZlLnRvU3RyaW5nKCksXG4gICAgICAgICAgICAgIGVuZDogbGFzdERhdGEudG9rZW5BLnJlc2VydmUudG9TdHJpbmcoKSxcbiAgICAgICAgICAgICAgY2hhbmdlOiB0b2tlbkFSZXNlcnZlQ2hhbmdlLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHRva2VuQjoge1xuICAgICAgICAgICAgbWludDogZmlyc3REYXRhLnRva2VuQi5taW50LFxuICAgICAgICAgICAgZGVjaW1hbHM6IGZpcnN0RGF0YS50b2tlbkIuZGVjaW1hbHMsXG4gICAgICAgICAgICByZXNlcnZlOiB7XG4gICAgICAgICAgICAgIHN0YXJ0OiBmaXJzdERhdGEudG9rZW5CLnJlc2VydmUudG9TdHJpbmcoKSxcbiAgICAgICAgICAgICAgZW5kOiBsYXN0RGF0YS50b2tlbkIucmVzZXJ2ZS50b1N0cmluZygpLFxuICAgICAgICAgICAgICBjaGFuZ2U6IHRva2VuQlJlc2VydmVDaGFuZ2UsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICB9O1xuICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgIGxvZ2dlci5lcnJvcihgRmFpbGVkIHRvIGdldCBhZ2dyZWdhdGVkIGRhdGEgZm9yIHBvb2wgJHtwb29sQWRkcmVzc31gLCB7IGVycm9yIH0pO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gZ2V0IGFnZ3JlZ2F0ZWQgcG9vbCBkYXRhOiAke2Vycm9yLm1lc3NhZ2V9YCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEdldCB3aGFsZSBhY3Rpdml0aWVzXG4gICAqIEBwYXJhbSBwb29sQWRkcmVzcyBPcHRpb25hbCBwb29sIGFkZHJlc3MgdG8gZmlsdGVyIGJ5XG4gICAqIEBwYXJhbSBzdGFydFRpbWUgT3B0aW9uYWwgc3RhcnQgdGltZSBpbiBzZWNvbmRzXG4gICAqIEBwYXJhbSBlbmRUaW1lIE9wdGlvbmFsIGVuZCB0aW1lIGluIHNlY29uZHNcbiAgICogQHJldHVybnMgQXJyYXkgb2Ygd2hhbGUgYWN0aXZpdGllc1xuICAgKi9cbiAgYXN5bmMgZ2V0V2hhbGVBY3Rpdml0aWVzKFxuICAgIHBvb2xBZGRyZXNzPzogc3RyaW5nLFxuICAgIHN0YXJ0VGltZT86IG51bWJlcixcbiAgICBlbmRUaW1lPzogbnVtYmVyXG4gICk6IFByb21pc2U8V2hhbGVBY3Rpdml0eVtdPiB7XG4gICAgYXdhaXQgdGhpcy5lbnN1cmVDb25uZWN0ZWQoKTtcblxuICAgIHRyeSB7XG4gICAgICBjb25zdCBjb2xsZWN0aW9uID0gdGhpcy5jb2xsZWN0aW9ucy53aGFsZUFjdGl2aXRpZXMhO1xuXG4gICAgICAvLyBCdWlsZCBxdWVyeVxuICAgICAgY29uc3QgcXVlcnk6IGFueSA9IHt9O1xuXG4gICAgICBpZiAocG9vbEFkZHJlc3MpIHtcbiAgICAgICAgcXVlcnkucG9vbEFkZHJlc3MgPSBwb29sQWRkcmVzcztcbiAgICAgIH1cblxuICAgICAgaWYgKHN0YXJ0VGltZSB8fCBlbmRUaW1lKSB7XG4gICAgICAgIHF1ZXJ5LmJsb2NrVGltZSA9IHt9O1xuXG4gICAgICAgIGlmIChzdGFydFRpbWUpIHtcbiAgICAgICAgICBxdWVyeS5ibG9ja1RpbWUuJGd0ZSA9IHN0YXJ0VGltZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChlbmRUaW1lKSB7XG4gICAgICAgICAgcXVlcnkuYmxvY2tUaW1lLiRsdGUgPSBlbmRUaW1lO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNvbGxlY3Rpb25cbiAgICAgICAgLmZpbmQocXVlcnkpXG4gICAgICAgIC5zb3J0KHsgYmxvY2tUaW1lOiAtMSB9KVxuICAgICAgICAubGltaXQoMTAwKSAvLyBMaW1pdCB0byAxMDAgYWN0aXZpdGllc1xuICAgICAgICAudG9BcnJheSgpO1xuXG4gICAgICAvLyBSZW1vdmUgTW9uZ29EQi1zcGVjaWZpYyBmaWVsZHNcbiAgICAgIHJldHVybiByZXN1bHQubWFwKCh7IF9pZCwgYWN0aXZpdHlJZCwgLi4uYWN0aXZpdHkgfSkgPT4ge1xuICAgICAgICAvLyBSZXN0b3JlIHRoZSBvcmlnaW5hbCBpZFxuICAgICAgICByZXR1cm4geyAuLi5hY3Rpdml0eSwgaWQ6IGFjdGl2aXR5SWQgfSBhcyBXaGFsZUFjdGl2aXR5O1xuICAgICAgfSk7XG4gICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgbG9nZ2VyLmVycm9yKCdGYWlsZWQgdG8gZ2V0IHdoYWxlIGFjdGl2aXRpZXMnLCB7IGVycm9yLCBwb29sQWRkcmVzcywgc3RhcnRUaW1lLCBlbmRUaW1lIH0pO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gZ2V0IHdoYWxlIGFjdGl2aXRpZXM6ICR7ZXJyb3IubWVzc2FnZX1gKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogR2V0IHN0b3JhZ2Ugc3RhdGlzdGljc1xuICAgKiBAcmV0dXJucyBTdG9yYWdlIHN0YXRpc3RpY3NcbiAgICovXG4gIGFzeW5jIGdldFN0YXRzKCk6IFByb21pc2U8YW55PiB7XG4gICAgYXdhaXQgdGhpcy5lbnN1cmVDb25uZWN0ZWQoKTtcblxuICAgIHRyeSB7XG4gICAgICBjb25zdCBzdGF0cyA9IHtcbiAgICAgICAgcG9vbERhdGE6IGF3YWl0IHRoaXMuY29sbGVjdGlvbnMucG9vbERhdGEhLmNvdW50RG9jdW1lbnRzKCksXG4gICAgICAgIHBvb2xNZXRhZGF0YTogYXdhaXQgdGhpcy5jb2xsZWN0aW9ucy5wb29sTWV0YWRhdGEhLmNvdW50RG9jdW1lbnRzKCksXG4gICAgICAgIGV2ZW50czogYXdhaXQgdGhpcy5jb2xsZWN0aW9ucy5ldmVudHMhLmNvdW50RG9jdW1lbnRzKCksXG4gICAgICAgIHRva2VuUHJpY2VzOiBhd2FpdCB0aGlzLmNvbGxlY3Rpb25zLnRva2VuUHJpY2VzIS5jb3VudERvY3VtZW50cygpLFxuICAgICAgICB0b2tlbk1ldGFkYXRhOiBhd2FpdCB0aGlzLmNvbGxlY3Rpb25zLnRva2VuTWV0YWRhdGEhLmNvdW50RG9jdW1lbnRzKCksXG4gICAgICAgIHdoYWxlQWN0aXZpdGllczogYXdhaXQgdGhpcy5jb2xsZWN0aW9ucy53aGFsZUFjdGl2aXRpZXMhLmNvdW50RG9jdW1lbnRzKCksXG4gICAgICAgIHBvb2xzOiBhd2FpdCB0aGlzLmNvbGxlY3Rpb25zLnBvb2xNZXRhZGF0YSEuY291bnREb2N1bWVudHMoKSxcbiAgICAgICAgdG9rZW5zOiBhd2FpdCB0aGlzLmNvbGxlY3Rpb25zLnRva2VuTWV0YWRhdGEhLmNvdW50RG9jdW1lbnRzKCksXG4gICAgICAgIGhvdERhdGFTaXplOiAwLFxuICAgICAgICB3YXJtRGF0YVNpemU6IDAsXG4gICAgICAgIGNvbGREYXRhU2l6ZTogMCxcbiAgICAgIH07XG5cbiAgICAgIHJldHVybiBzdGF0cztcbiAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICBsb2dnZXIuZXJyb3IoJ0ZhaWxlZCB0byBnZXQgc3RvcmFnZSBzdGF0aXN0aWNzJywgeyBlcnJvciB9KTtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIGdldCBzdG9yYWdlIHN0YXRpc3RpY3M6ICR7ZXJyb3IubWVzc2FnZX1gKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIGluZGV4ZXMgZm9yIGNvbGxlY3Rpb25zXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIGNyZWF0ZUluZGV4ZXMoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdHJ5IHtcbiAgICAgIGxvZ2dlci5pbmZvKCdDcmVhdGluZyBpbmRleGVzLi4uJyk7XG5cbiAgICAgIC8vIFBvb2wgZGF0YSBpbmRleGVzXG4gICAgICBhd2FpdCB0aGlzLmNvbGxlY3Rpb25zLnBvb2xEYXRhIS5jcmVhdGVJbmRleCh7IGFkZHJlc3M6IDEsIHRpbWVzdGFtcDogLTEgfSk7XG4gICAgICBhd2FpdCB0aGlzLmNvbGxlY3Rpb25zLnBvb2xEYXRhIS5jcmVhdGVJbmRleCh7IHRpbWVzdGFtcDogMSB9KTtcbiAgICAgIGF3YWl0IHRoaXMuY29sbGVjdGlvbnMucG9vbERhdGEhLmNyZWF0ZUluZGV4KHsgZG9jdW1lbnRJZDogMSB9LCB7IHVuaXF1ZTogdHJ1ZSB9KTtcblxuICAgICAgLy8gRXZlbnRzIGluZGV4ZXNcbiAgICAgIGF3YWl0IHRoaXMuY29sbGVjdGlvbnMuZXZlbnRzIS5jcmVhdGVJbmRleCh7IHBvb2xBZGRyZXNzOiAxLCBibG9ja1RpbWU6IC0xIH0pO1xuICAgICAgYXdhaXQgdGhpcy5jb2xsZWN0aW9ucy5ldmVudHMhLmNyZWF0ZUluZGV4KHsgdHlwZTogMSwgYmxvY2tUaW1lOiAtMSB9KTtcbiAgICAgIGF3YWl0IHRoaXMuY29sbGVjdGlvbnMuZXZlbnRzIS5jcmVhdGVJbmRleCh7IGJsb2NrVGltZTogMSB9KTtcbiAgICAgIGF3YWl0IHRoaXMuY29sbGVjdGlvbnMuZXZlbnRzIS5jcmVhdGVJbmRleCh7IGV2ZW50SWQ6IDEgfSwgeyB1bmlxdWU6IHRydWUgfSk7XG5cbiAgICAgIC8vIFRva2VuIHByaWNlcyBpbmRleGVzXG4gICAgICBhd2FpdCB0aGlzLmNvbGxlY3Rpb25zLnRva2VuUHJpY2VzIS5jcmVhdGVJbmRleCh7IHRva2VuTWludDogMSwgdGltZXN0YW1wOiAtMSB9KTtcbiAgICAgIGF3YWl0IHRoaXMuY29sbGVjdGlvbnMudG9rZW5QcmljZXMhLmNyZWF0ZUluZGV4KHsgdGltZXN0YW1wOiAxIH0pO1xuICAgICAgYXdhaXQgdGhpcy5jb2xsZWN0aW9ucy50b2tlblByaWNlcyEuY3JlYXRlSW5kZXgoeyBkb2N1bWVudElkOiAxIH0sIHsgdW5pcXVlOiB0cnVlIH0pO1xuXG4gICAgICAvLyBUb2tlbiBtZXRhZGF0YSBpbmRleGVzXG4gICAgICBhd2FpdCB0aGlzLmNvbGxlY3Rpb25zLnRva2VuTWV0YWRhdGEhLmNyZWF0ZUluZGV4KHsgdG9rZW5NaW50OiAxIH0sIHsgdW5pcXVlOiB0cnVlIH0pO1xuXG4gICAgICAvLyBQb29sIG1ldGFkYXRhIGluZGV4ZXNcbiAgICAgIGF3YWl0IHRoaXMuY29sbGVjdGlvbnMucG9vbE1ldGFkYXRhIS5jcmVhdGVJbmRleCh7IHBvb2xBZGRyZXNzOiAxIH0sIHsgdW5pcXVlOiB0cnVlIH0pO1xuXG4gICAgICAvLyBXaGFsZSBhY3Rpdml0aWVzIGluZGV4ZXNcbiAgICAgIGF3YWl0IHRoaXMuY29sbGVjdGlvbnMud2hhbGVBY3Rpdml0aWVzIS5jcmVhdGVJbmRleCh7IHBvb2xBZGRyZXNzOiAxLCBibG9ja1RpbWU6IC0xIH0pO1xuICAgICAgYXdhaXQgdGhpcy5jb2xsZWN0aW9ucy53aGFsZUFjdGl2aXRpZXMhLmNyZWF0ZUluZGV4KHsgd2FsbGV0QWRkcmVzczogMSwgYmxvY2tUaW1lOiAtMSB9KTtcbiAgICAgIGF3YWl0IHRoaXMuY29sbGVjdGlvbnMud2hhbGVBY3Rpdml0aWVzIS5jcmVhdGVJbmRleCh7IGJsb2NrVGltZTogMSB9KTtcbiAgICAgIGF3YWl0IHRoaXMuY29sbGVjdGlvbnMud2hhbGVBY3Rpdml0aWVzIS5jcmVhdGVJbmRleCh7IGFjdGl2aXR5SWQ6IDEgfSwgeyB1bmlxdWU6IHRydWUgfSk7XG5cbiAgICAgIC8vIFRUTCBpbmRleGVzIGlmIGNvbmZpZ3VyZWRcbiAgICAgIGlmICh0aGlzLmNvbmZpZy5pbmRleGVzPy50dGwpIHtcbiAgICAgICAgY29uc3QgdHRsID0gdGhpcy5jb25maWcuaW5kZXhlcy50dGw7XG5cbiAgICAgICAgaWYgKHR0bC5wb29sRGF0YSkge1xuICAgICAgICAgIGF3YWl0IHRoaXMuY29sbGVjdGlvbnMucG9vbERhdGEhLmNyZWF0ZUluZGV4KFxuICAgICAgICAgICAgeyB0aW1lc3RhbXA6IDEgfSxcbiAgICAgICAgICAgIHsgZXhwaXJlQWZ0ZXJTZWNvbmRzOiB0dGwucG9vbERhdGEgfVxuICAgICAgICAgICk7XG4gICAgICAgICAgbG9nZ2VyLmluZm8oYENyZWF0ZWQgVFRMIGluZGV4IGZvciBwb29sIGRhdGEgKCR7dHRsLnBvb2xEYXRhfSBzZWNvbmRzKWApO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR0bC5ldmVudHMpIHtcbiAgICAgICAgICBhd2FpdCB0aGlzLmNvbGxlY3Rpb25zLmV2ZW50cyEuY3JlYXRlSW5kZXgoXG4gICAgICAgICAgICB7IGJsb2NrVGltZTogMSB9LFxuICAgICAgICAgICAgeyBleHBpcmVBZnRlclNlY29uZHM6IHR0bC5ldmVudHMgfVxuICAgICAgICAgICk7XG4gICAgICAgICAgbG9nZ2VyLmluZm8oYENyZWF0ZWQgVFRMIGluZGV4IGZvciBldmVudHMgKCR7dHRsLmV2ZW50c30gc2Vjb25kcylgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0dGwudG9rZW5QcmljZXMpIHtcbiAgICAgICAgICBhd2FpdCB0aGlzLmNvbGxlY3Rpb25zLnRva2VuUHJpY2VzIS5jcmVhdGVJbmRleChcbiAgICAgICAgICAgIHsgdGltZXN0YW1wOiAxIH0sXG4gICAgICAgICAgICB7IGV4cGlyZUFmdGVyU2Vjb25kczogdHRsLnRva2VuUHJpY2VzIH1cbiAgICAgICAgICApO1xuICAgICAgICAgIGxvZ2dlci5pbmZvKGBDcmVhdGVkIFRUTCBpbmRleCBmb3IgdG9rZW4gcHJpY2VzICgke3R0bC50b2tlblByaWNlc30gc2Vjb25kcylgKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBsb2dnZXIuaW5mbygnSW5kZXhlcyBjcmVhdGVkJyk7XG4gICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgbG9nZ2VyLmVycm9yKCdGYWlsZWQgdG8gY3JlYXRlIGluZGV4ZXMnLCB7IGVycm9yIH0pO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gY3JlYXRlIGluZGV4ZXM6ICR7ZXJyb3IubWVzc2FnZX1gKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRW5zdXJlIGNvbm5lY3Rpb24gdG8gTW9uZ29EQlxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyBlbnN1cmVDb25uZWN0ZWQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKCF0aGlzLmlzQ29ubmVjdGVkKSB7XG4gICAgICBhd2FpdCB0aGlzLmNvbm5lY3QoKTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==