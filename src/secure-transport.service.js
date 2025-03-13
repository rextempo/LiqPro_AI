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
exports.SecureTransportService = void 0;
const tls = __importStar(require("tls"));
const https = __importStar(require("https"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto_1 = require("crypto");
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class SecureTransportService {
    constructor() {
        this.defaultCiphers = [
            'TLS_AES_256_GCM_SHA384',
            'TLS_CHACHA20_POLY1305_SHA256',
            'TLS_AES_128_GCM_SHA256',
            'ECDHE-RSA-AES256-GCM-SHA384',
            'ECDHE-RSA-AES128-GCM-SHA256',
        ].join(':');
        this.defaultConfig = {
            minVersion: 'TLSv1.2',
            maxVersion: 'TLSv1.3',
            rejectUnauthorized: true,
            ciphers: this.defaultCiphers,
        };
    }
    // 创建TLS配置
    async createTLSConfig(config) {
        return {
            cert: fs.readFileSync(config.cert),
            key: fs.readFileSync(config.key),
            ca: config.ca?.map(caPath => fs.readFileSync(caPath)),
            minVersion: config.minVersion || this.defaultConfig.minVersion,
            maxVersion: config.maxVersion || this.defaultConfig.maxVersion,
            ciphers: config.ciphers || this.defaultConfig.ciphers,
            rejectUnauthorized: config.rejectUnauthorized ?? this.defaultConfig.rejectUnauthorized,
            // 安全选项
            honorCipherOrder: true, // 使用服务器的密码套件优先级
            sessionTimeout: 300, // 会话超时时间（秒）
            ticketKeys: tls.createSecureContext().context.getTicketKeys(), // 会话票据密钥
            // 安全标头
            secureOptions: crypto_1.constants.SSL_OP_NO_SSLv2 |
                crypto_1.constants.SSL_OP_NO_SSLv3 |
                crypto_1.constants.SSL_OP_NO_TLSv1 |
                crypto_1.constants.SSL_OP_NO_TLSv1_1 |
                crypto_1.constants.SSL_OP_CIPHER_SERVER_PREFERENCE,
        };
    }
    // 创建HTTPS服务器
    async createHTTPSServer(config, requestHandler) {
        const tlsConfig = await this.createTLSConfig(config);
        return https.createServer(tlsConfig, requestHandler);
    }
    // 创建TLS客户端
    async createTLSClient(config) {
        if (!config.host || !config.port) {
            throw new Error('Host and port are required for TLS client connection');
        }
        const tlsConfig = await this.createTLSConfig(config);
        const connectionOptions = {
            host: config.host,
            port: config.port,
            cert: tlsConfig.cert,
            key: tlsConfig.key,
            ca: tlsConfig.ca,
            minVersion: tlsConfig.minVersion,
            maxVersion: tlsConfig.maxVersion,
            ciphers: tlsConfig.ciphers,
            rejectUnauthorized: tlsConfig.rejectUnauthorized,
            honorCipherOrder: tlsConfig.honorCipherOrder,
            sessionTimeout: tlsConfig.sessionTimeout,
        };
        return tls.connect(connectionOptions);
    }
    // 生成自签名证书（仅用于开发/测试）
    async generateSelfSignedCert(outputDir, options) {
        const certPath = path.join(outputDir, 'cert.pem');
        const keyPath = path.join(outputDir, 'key.pem');
        // 确保输出目录存在
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        // 使用OpenSSL生成自签名证书
        const command = `openssl req -x509 -newkey rsa:4096 -nodes \
      -keyout "${keyPath}" \
      -out "${certPath}" \
      -days ${options.validityDays} \
      -subj "/CN=${options.commonName}/O=${options.organization}"`;
        await execAsync(command);
        return {
            certPath,
            keyPath,
        };
    }
    // 验证证书链
    async verifyCertificateChain(cert, ca) {
        try {
            const certData = fs.readFileSync(cert);
            const caData = ca.map(caPath => fs.readFileSync(caPath));
            tls.createSecureContext({
                cert: certData,
                ca: caData,
            });
            // 如果创建上下文成功，证书链是有效的
            return true;
        }
        catch (error) {
            console.error('Certificate chain verification failed:', error);
            return false;
        }
    }
    // 获取证书信息
    async getCertificateInfo(certPath) {
        const command = `openssl x509 -in "${certPath}" -text -noout`;
        const { stdout } = await execAsync(command);
        // 解析证书信息
        const subjectMatch = /Subject: (.+)/.exec(stdout);
        const issuerMatch = /Issuer: (.+)/.exec(stdout);
        const validFromMatch = /Not Before: (.+)/.exec(stdout);
        const validToMatch = /Not After : (.+)/.exec(stdout);
        const fingerprintMatch = /SHA1 Fingerprint=(.+)/.exec(stdout);
        if (!subjectMatch || !issuerMatch || !validFromMatch || !validToMatch) {
            throw new Error('Failed to parse certificate information');
        }
        return {
            subject: subjectMatch[1].trim(),
            issuer: issuerMatch[1].trim(),
            validFrom: validFromMatch[1].trim(),
            validTo: validToMatch[1].trim(),
            fingerprint: fingerprintMatch ? fingerprintMatch[1].trim() : '',
        };
    }
}
exports.SecureTransportService = SecureTransportService;
//# sourceMappingURL=secure-transport.service.js.map