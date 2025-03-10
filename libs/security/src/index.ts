import jwt from 'jsonwebtoken';

export interface TokenPayload {
  userId: string;
  role: string;
}

export async function generateToken(payload: TokenPayload): Promise<string> {
  // TODO: Implement proper secret key management
  return jwt.sign(payload, 'temporary-secret', { expiresIn: '2h' });
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  return jwt.verify(token, 'temporary-secret') as TokenPayload;
}
