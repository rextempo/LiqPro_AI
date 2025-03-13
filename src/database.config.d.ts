import { DataSourceOptions } from 'typeorm';
import { MongoClientOptions } from 'mongodb';
export declare const postgresConfig: DataSourceOptions;
export declare const mongoConfig: {
  url: string;
  options: MongoClientOptions;
};
export declare const redisConfig: {
  host: string;
  port: number;
  password: string | undefined;
  db: number;
  maxRetriesPerRequest: number;
  retryStrategy: (times: number) => number;
};
//# sourceMappingURL=database.config.d.ts.map
