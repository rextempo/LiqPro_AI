export interface TokenPayload {
    userId: string;
    role: string;
}
export declare function generateToken(payload: TokenPayload): Promise<string>;
export declare function verifyToken(token: string): Promise<TokenPayload>;
