interface KeyShare {
  index: number;
  value: Buffer;
}
export declare class KeySharingService {
  private readonly prime;
  private readonly threshold;
  constructor();
  private generateRandomCoefficient;
  splitKey(key: Buffer, shares: number): Promise<KeyShare[]>;
  reconstructKey(shares: KeyShare[]): Promise<Buffer>;
  private modInverse;
  generateKey(): Promise<Buffer>;
  encryptShare(share: KeyShare, password: string): Promise<Buffer>;
  decryptShare(encryptedShare: Buffer, password: string): Promise<KeyShare>;
}
export {};
//# sourceMappingURL=key-sharing.service.d.ts.map
