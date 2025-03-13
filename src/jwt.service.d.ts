export interface JWTPayload {
  userId: string;
  role: string;
  sessionId: string;
}
export declare class JWTService {
  private readonly accessTokenSecret;
  private readonly refreshTokenSecret;
  private readonly accessTokenExpiry;
  private readonly refreshTokenExpiry;
  constructor();
  private parseTimeToSeconds;
  generateAccessToken(payload: JWTPayload): Promise<string>;
  generateRefreshToken(payload: JWTPayload): Promise<string>;
  verifyAccessToken(token: string): Promise<JWTPayload>;
  verifyRefreshToken(token: string): Promise<JWTPayload>;
  generateTokenPair(payload: JWTPayload): Promise<{
    accessToken: string;
    refreshToken: string;
  }>;
}
//# sourceMappingURL=jwt.service.d.ts.map
