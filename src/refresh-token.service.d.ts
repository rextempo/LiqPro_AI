import { Redis } from 'ioredis';
export declare class RefreshTokenService {
  private readonly redis;
  private readonly blacklistPrefix;
  private readonly refreshTokenPrefix;
  constructor(redisClient: Redis);
  createRefreshToken(userId: string): Promise<string>;
  validateRefreshToken(token: string): Promise<string | null>;
  revokeRefreshToken(token: string): Promise<void>;
  revokeAllUserTokens(userId: string): Promise<void>;
}
//# sourceMappingURL=refresh-token.service.d.ts.map
