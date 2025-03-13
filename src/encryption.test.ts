import { KeySharingService } from '../src/encryption/key-sharing.service';
import { DataEncryptionService } from '../src/encryption/data-encryption.service';
import { SecureTransportService } from '../src/encryption/secure-transport.service';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

describe('Encryption System Tests', () => {
  let keySharingService: KeySharingService;
  let dataEncryptionService: DataEncryptionService;
  let secureTransportService: SecureTransportService;
  let testDir: string;

  beforeAll(() => {
    keySharingService = new KeySharingService();
    dataEncryptionService = new DataEncryptionService();
    secureTransportService = new SecureTransportService();
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'security-test-'));
  });

  afterAll(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('Key Sharing Service', () => {
    it('should split and reconstruct key', async () => {
      const originalKey = await keySharingService.generateKey();
      const shares = await keySharingService.splitKey(originalKey, 5);

      expect(shares.length).toBe(5);

      // 使用3个分片重建密钥
      const reconstructedKey = await keySharingService.reconstructKey(shares.slice(0, 3));
      expect(reconstructedKey).toEqual(originalKey);
    });

    it('should encrypt and decrypt key shares', async () => {
      const originalKey = await keySharingService.generateKey();
      const shares = await keySharingService.splitKey(originalKey, 5);
      const password = 'test-password';

      // 加密所有分片
      const encryptedShares = await Promise.all(
        shares.map(share => keySharingService.encryptShare(share, password))
      );

      // 解密所有分片
      const decryptedShares = await Promise.all(
        encryptedShares.map(share => keySharingService.decryptShare(share, password))
      );

      // 使用解密后的分片重建密钥
      const reconstructedKey = await keySharingService.reconstructKey(decryptedShares.slice(0, 3));
      expect(reconstructedKey).toEqual(originalKey);
    });

    it('should fail with insufficient shares', async () => {
      const originalKey = await keySharingService.generateKey();
      const shares = await keySharingService.splitKey(originalKey, 5);

      // 使用2个分片尝试重建（应该失败，因为需要3个）
      await expect(keySharingService.reconstructKey(shares.slice(0, 2))).rejects.toThrow();
    });
  });

  describe('Data Encryption Service', () => {
    const testData = Buffer.from('test data');
    const password = 'test-password';

    it('should encrypt and decrypt data with password', async () => {
      const encrypted = await dataEncryptionService.encryptWithPassword(testData, password);
      expect(encrypted.data).not.toEqual(testData);

      const decrypted = await dataEncryptionService.decryptWithPassword(encrypted, password);
      expect(decrypted).toEqual(testData);
    });

    it('should encrypt and decrypt data with key', async () => {
      const key = await keySharingService.generateKey();
      const encrypted = await dataEncryptionService.encryptWithKey(testData, key);
      expect(encrypted.data).not.toEqual(testData);

      const decrypted = await dataEncryptionService.decryptWithKey(encrypted, key);
      expect(decrypted).toEqual(testData);
    });

    it('should encrypt and decrypt data with RSA keys', async () => {
      const { publicKey, privateKey } = await dataEncryptionService.generateKeyPair();
      const encrypted = await dataEncryptionService.encryptWithPublicKey(testData, publicKey);
      expect(encrypted).not.toEqual(testData);

      const decrypted = await dataEncryptionService.decryptWithPrivateKey(encrypted, privateKey);
      expect(decrypted).toEqual(testData);
    });

    it('should sign and verify data', async () => {
      const { publicKey, privateKey } = await dataEncryptionService.generateKeyPair();
      const signature = await dataEncryptionService.sign(testData, privateKey);

      const isValid = await dataEncryptionService.verify(testData, signature, publicKey);
      expect(isValid).toBe(true);

      // 验证修改后的数据
      const modifiedData = Buffer.from('modified data');
      const isInvalid = await dataEncryptionService.verify(modifiedData, signature, publicKey);
      expect(isInvalid).toBe(false);
    });
  });

  describe('Secure Transport Service', () => {
    it('should generate and verify self-signed certificate', async () => {
      const certInfo = {
        commonName: 'localhost',
        organization: 'Test Org',
        validityDays: 1,
      };

      const { certPath, keyPath } = await secureTransportService.generateSelfSignedCert(
        testDir,
        certInfo
      );

      expect(fs.existsSync(certPath)).toBe(true);
      expect(fs.existsSync(keyPath)).toBe(true);

      const info = await secureTransportService.getCertificateInfo(certPath);
      expect(info.subject).toContain(certInfo.commonName);
      expect(info.subject).toContain(certInfo.organization);
    });

    it('should verify certificate chain', async () => {
      const certInfo = {
        commonName: 'localhost',
        organization: 'Test Org',
        validityDays: 1,
      };

      const { certPath } = await secureTransportService.generateSelfSignedCert(testDir, certInfo);

      const isValid = await secureTransportService.verifyCertificateChain(certPath, []);
      expect(isValid).toBe(true);
    });
  });
});
