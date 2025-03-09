import { randomBytes } from 'crypto';
import * as crypto from 'crypto';

interface KeyShare {
  index: number;
  value: Buffer;
}

export class KeySharingService {
  private readonly prime: bigint;
  private readonly threshold = 3; // 固定阈值为3

  constructor() {
    // 使用更小的素数以简化计算，但仍然保持足够的安全性
    this.prime = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F');
  }

  // 生成随机系数
  private generateRandomCoefficient(): bigint {
    const bytes = randomBytes(32);
    return BigInt('0x' + bytes.toString('hex')) % this.prime;
  }

  // 将密钥分割成shares份，需要threshold份才能重建
  async splitKey(key: Buffer, shares: number): Promise<KeyShare[]> {
    if (shares < this.threshold) {
      throw new Error(`Shares count must be at least ${this.threshold}`);
    }

    // 将密钥转换为bigint
    const secret = BigInt('0x' + key.toString('hex')) % this.prime;
    
    // 生成两个随机系数 (因为阈值是3，所以需要二次多项式)
    const a1 = this.generateRandomCoefficient();
    const a2 = this.generateRandomCoefficient();

    const keyShares: KeyShare[] = [];

    // 为每个分片计算f(x) = secret + a1*x + a2*x^2
    for (let x = 1; x <= shares; x++) {
      const bigX = BigInt(x);
      const value = (
        secret + 
        (a1 * bigX) + 
        (a2 * bigX * bigX)
      ) % this.prime;

      keyShares.push({
        index: x,
        value: Buffer.from(value.toString(16).padStart(64, '0'), 'hex')
      });
    }

    return keyShares;
  }

  // 使用高斯消元法重建密钥
  async reconstructKey(shares: KeyShare[]): Promise<Buffer> {
    if (shares.length < this.threshold) {
      throw new Error(`At least ${this.threshold} shares are required to reconstruct the key`);
    }

    // 只使用前三个分片
    const points = shares.slice(0, 3).map(share => ({
      x: BigInt(share.index),
      y: BigInt('0x' + share.value.toString('hex'))
    }));

    // 构建线性方程组的系数矩阵
    const matrix = [
      [BigInt(1), points[0].x, points[0].x * points[0].x, points[0].y],
      [BigInt(1), points[1].x, points[1].x * points[1].x, points[1].y],
      [BigInt(1), points[2].x, points[2].x * points[2].x, points[2].y]
    ];

    // 高斯消元
    for (let i = 0; i < 3; i++) {
      // 将对角线元素变为1
      const factor = this.modInverse(matrix[i][i]);
      for (let j = i; j < 4; j++) {
        matrix[i][j] = (matrix[i][j] * factor) % this.prime;
      }

      // 消除其他行中的这一列
      for (let k = 0; k < 3; k++) {
        if (k !== i) {
          const factor = matrix[k][i];
          for (let j = i; j < 4; j++) {
            matrix[k][j] = (matrix[k][j] - (factor * matrix[i][j])) % this.prime;
            if (matrix[k][j] < BigInt(0)) {
              matrix[k][j] += this.prime;
            }
          }
        }
      }
    }

    // 第一个系数就是密钥
    let secret = matrix[0][3];
    if (secret < BigInt(0)) {
      secret = (secret + this.prime) % this.prime;
    }

    return Buffer.from(secret.toString(16).padStart(64, '0'), 'hex');
  }

  // 计算模逆
  private modInverse(a: bigint): bigint {
    let t = BigInt(0);
    let newT = BigInt(1);
    let r = this.prime;
    let newR = a % this.prime;

    while (newR !== BigInt(0)) {
      const quotient = r / newR;
      [t, newT] = [newT, t - quotient * newT];
      [r, newR] = [newR, r - quotient * newR];
    }

    if (t < BigInt(0)) {
      t += this.prime;
    }

    return t;
  }

  // 生成新的加密密钥
  async generateKey(): Promise<Buffer> {
    return randomBytes(32);
  }

  // 加密密钥分片
  async encryptShare(share: KeyShare, password: string): Promise<Buffer> {
    const salt = randomBytes(16);
    const key = crypto.scryptSync(password, salt, 32);
    const iv = randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    const shareData = Buffer.concat([
      Buffer.from([share.index]),
      share.value
    ]);
    
    const encrypted = Buffer.concat([
      cipher.update(shareData),
      cipher.final()
    ]);
    
    const tag = cipher.getAuthTag();
    
    return Buffer.concat([salt, iv, tag, encrypted]);
  }

  // 解密密钥分片
  async decryptShare(encryptedShare: Buffer, password: string): Promise<KeyShare> {
    const salt = encryptedShare.slice(0, 16);
    const iv = encryptedShare.slice(16, 32);
    const tag = encryptedShare.slice(32, 48);
    const data = encryptedShare.slice(48);
    
    const key = crypto.scryptSync(password, salt, 32);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    
    const decrypted = Buffer.concat([
      decipher.update(data),
      decipher.final()
    ]);
    
    return {
      index: decrypted[0],
      value: decrypted.slice(1)
    };
  }
} 