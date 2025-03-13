export declare const config: {
    rpc: {
        endpoint: string;
    };
    app: {
        env: string;
        port: string | number;
        host: string;
        name: string;
        version: string;
    };
    logging: {
        level: string;
        console: boolean;
        file: boolean;
        maxSize: string;
        maxFiles: string;
    };
    solana: {
        rpcEndpoint: string;
        wsEndpoint: string;
        commitment: string;
    };
    monitoring: {
        enabled: boolean;
        interval: number;
        metricsPort: number;
    };
    signal: {
        updateInterval: number;
        historyDays: number;
        maxT1Pools: number;
        maxT2Pools: number;
        maxT3Pools: number;
    };
    security: {
        rateLimitWindow: number;
        maxRequestsPerWindow: number;
    };
};
