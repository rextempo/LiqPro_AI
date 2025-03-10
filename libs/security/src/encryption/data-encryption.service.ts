import * as crypto from 'crypto';
import { promisify } from 'util';

const randomBytes = promisify(crypto.randomBytes);
const pbkdf2 = promisify(crypto.pbkdf2);

export interface EncryptedData {
  iv: Buffer;
  tag: Buffer;
  data: Buffer;
  salt?: Buffer;
}

export class DataEncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly pbkdf2Iterations = 100000;
  private readonly pbkdf2KeyLength = 32;
  private readonly pbkdf2Digest = 'sha512';

  // 使用密码加密数据
  async encryptWithPassword(data: Buffer, password: string): Promise<EncryptedData> {
    const salt = await randomBytes(32);
    const key = await pbkdf2(
      password,
      salt,
      this.pbkdf2Iterations,
      this.pbkdf2KeyLength,
      this.pbkdf2Digest
    );

    const iv = await randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);

    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);

    const tag = cipher.getAuthTag();

    return {
      iv,
      tag,
      data: encrypted,
      salt,
    };
  }

  // 使用密码解密数据
  async decryptWithPassword(encryptedData: EncryptedData, password: string): Promise<Buffer> {
    if (!encryptedData.salt) {
      throw new Error('Salt is required for password-based decryption');
    }

    const key = await pbkdf2(
      password,
      encryptedData.salt,
      this.pbkdf2Iterations,
      this.pbkdf2KeyLength,
      this.pbkdf2Digest
    );

    const decipher = crypto.createDecipheriv(this.algorithm, key, encryptedData.iv);

    decipher.setAuthTag(encryptedData.tag);

    return Buffer.concat([decipher.update(encryptedData.data), decipher.final()]);
  }

  // 使用密钥加密数据
  async encryptWithKey(data: Buffer, key: Buffer): Promise<EncryptedData> {
    const iv = await randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);

    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);

    const tag = cipher.getAuthTag();

    return {
      iv,
      tag,
      data: encrypted,
    };
  }

  // 使用密钥解密数据
  async decryptWithKey(encryptedData: EncryptedData, key: Buffer): Promise<Buffer> {
    const decipher = crypto.createDecipheriv(this.algorithm, key, encryptedData.iv);

    decipher.setAuthTag(encryptedData.tag);

    return Buffer.concat([decipher.update(encryptedData.data), decipher.final()]);
  }

  // 生成RSA密钥对
  async generateKeyPair(): Promise<{
    publicKey: string;
    privateKey: string;
  }> {
    return new Promise((resolve, reject) => {
      crypto.generateKeyPair(
        'rsa',
        {
          modulusLength: 4096,
          publicKeyEncoding: {
            type: 'spki',
            format: 'pem',
          },
          privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem',
          },
        },
        (err, publicKey, privateKey) => {
          if (err) {
            reject(err);
          } else {
            resolve({ publicKey, privateKey });
          }
        }
      );
    });
  }

  // 使用公钥加密数据
  async encryptWithPublicKey(data: Buffer, publicKey: string): Promise<Buffer> {
    return crypto.publicEncrypt(
      {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      data
    );
  }

  // 使用私钥解密数据
  async decryptWithPrivateKey(encryptedData: Buffer, privateKey: string): Promise<Buffer> {
    return crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      encryptedData
    );
  }

  // 使用私钥签名数据
  async sign(data: Buffer, privateKey: string): Promise<Buffer> {
    const sign = crypto.createSign('SHA256');
    sign.update(data);
    return sign.sign(privateKey);
  }

  // 使用公钥验证签名
  async verify(data: Buffer, signature: Buffer, publicKey: string): Promise<boolean> {
    const verify = crypto.createVerify('SHA256');
    verify.update(data);
    return verify.verify(publicKey, signature);
  }
}
