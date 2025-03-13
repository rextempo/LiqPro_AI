"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataEncryptionService = void 0;
const crypto = __importStar(require("crypto"));
const util_1 = require("util");
const randomBytes = (0, util_1.promisify)(crypto.randomBytes);
const pbkdf2 = (0, util_1.promisify)(crypto.pbkdf2);
class DataEncryptionService {
    constructor() {
        this.algorithm = 'aes-256-gcm';
        this.pbkdf2Iterations = 100000;
        this.pbkdf2KeyLength = 32;
        this.pbkdf2Digest = 'sha512';
    }
    // 使用密码加密数据
    async encryptWithPassword(data, password) {
        const salt = await randomBytes(32);
        const key = await pbkdf2(password, salt, this.pbkdf2Iterations, this.pbkdf2KeyLength, this.pbkdf2Digest);
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
    async decryptWithPassword(encryptedData, password) {
        if (!encryptedData.salt) {
            throw new Error('Salt is required for password-based decryption');
        }
        const key = await pbkdf2(password, encryptedData.salt, this.pbkdf2Iterations, this.pbkdf2KeyLength, this.pbkdf2Digest);
        const decipher = crypto.createDecipheriv(this.algorithm, key, encryptedData.iv);
        decipher.setAuthTag(encryptedData.tag);
        return Buffer.concat([decipher.update(encryptedData.data), decipher.final()]);
    }
    // 使用密钥加密数据
    async encryptWithKey(data, key) {
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
    async decryptWithKey(encryptedData, key) {
        const decipher = crypto.createDecipheriv(this.algorithm, key, encryptedData.iv);
        decipher.setAuthTag(encryptedData.tag);
        return Buffer.concat([decipher.update(encryptedData.data), decipher.final()]);
    }
    // 生成RSA密钥对
    async generateKeyPair() {
        return new Promise((resolve, reject) => {
            crypto.generateKeyPair('rsa', {
                modulusLength: 4096,
                publicKeyEncoding: {
                    type: 'spki',
                    format: 'pem',
                },
                privateKeyEncoding: {
                    type: 'pkcs8',
                    format: 'pem',
                },
            }, (err, publicKey, privateKey) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve({ publicKey, privateKey });
                }
            });
        });
    }
    // 使用公钥加密数据
    async encryptWithPublicKey(data, publicKey) {
        return crypto.publicEncrypt({
            key: publicKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'sha256',
        }, data);
    }
    // 使用私钥解密数据
    async decryptWithPrivateKey(encryptedData, privateKey) {
        return crypto.privateDecrypt({
            key: privateKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'sha256',
        }, encryptedData);
    }
    // 使用私钥签名数据
    async sign(data, privateKey) {
        const sign = crypto.createSign('SHA256');
        sign.update(data);
        return sign.sign(privateKey);
    }
    // 使用公钥验证签名
    async verify(data, signature, publicKey) {
        const verify = crypto.createVerify('SHA256');
        verify.update(data);
        return verify.verify(publicKey, signature);
    }
}
exports.DataEncryptionService = DataEncryptionService;
//# sourceMappingURL=data-encryption.service.js.map