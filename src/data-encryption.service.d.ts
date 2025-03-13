export interface EncryptedData {
  iv: Buffer;
  tag: Buffer;
  data: Buffer;
  salt?: Buffer;
}
export declare class DataEncryptionService {
  private readonly algorithm;
  private readonly pbkdf2Iterations;
  private readonly pbkdf2KeyLength;
  private readonly pbkdf2Digest;
  encryptWithPassword(data: Buffer, password: string): Promise<EncryptedData>;
  decryptWithPassword(encryptedData: EncryptedData, password: string): Promise<Buffer>;
  encryptWithKey(data: Buffer, key: Buffer): Promise<EncryptedData>;
  decryptWithKey(encryptedData: EncryptedData, key: Buffer): Promise<Buffer>;
  generateKeyPair(): Promise<{
    publicKey: string;
    privateKey: string;
  }>;
  encryptWithPublicKey(data: Buffer, publicKey: string): Promise<Buffer>;
  decryptWithPrivateKey(encryptedData: Buffer, privateKey: string): Promise<Buffer>;
  sign(data: Buffer, privateKey: string): Promise<Buffer>;
  verify(data: Buffer, signature: Buffer, publicKey: string): Promise<boolean>;
}
//# sourceMappingURL=data-encryption.service.d.ts.map
