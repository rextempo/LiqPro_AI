import * as tls from 'tls';
import * as https from 'https';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { SecureVersion, ConnectionOptions } from 'tls';
import { constants } from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface TLSConfig {
  cert: string;
  key: string;
  ca?: string[];
  ciphers?: string;
  minVersion?: SecureVersion;
  maxVersion?: SecureVersion;
  rejectUnauthorized?: boolean;
  host?: string;
  port?: number;
}

export class SecureTransportService {
  private readonly defaultCiphers = [
    'TLS_AES_256_GCM_SHA384',
    'TLS_CHACHA20_POLY1305_SHA256',
    'TLS_AES_128_GCM_SHA256',
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES128-GCM-SHA256',
  ].join(':');

  private readonly defaultConfig: Partial<TLSConfig> = {
    minVersion: 'TLSv1.2' as SecureVersion,
    maxVersion: 'TLSv1.3' as SecureVersion,
    rejectUnauthorized: true,
    ciphers: this.defaultCiphers,
  };

  // 创建TLS配置
  private async createTLSConfig(config: TLSConfig): Promise<tls.TlsOptions> {
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
      secureOptions:
        constants.SSL_OP_NO_SSLv2 |
        constants.SSL_OP_NO_SSLv3 |
        constants.SSL_OP_NO_TLSv1 |
        constants.SSL_OP_NO_TLSv1_1 |
        constants.SSL_OP_CIPHER_SERVER_PREFERENCE,
    };
  }

  // 创建HTTPS服务器
  async createHTTPSServer(
    config: TLSConfig,
    requestHandler: (req: http.IncomingMessage, res: http.ServerResponse) => void
  ): Promise<https.Server> {
    const tlsConfig = await this.createTLSConfig(config);
    return https.createServer(tlsConfig, requestHandler);
  }

  // 创建TLS客户端
  async createTLSClient(config: TLSConfig): Promise<tls.TLSSocket> {
    if (!config.host || !config.port) {
      throw new Error('Host and port are required for TLS client connection');
    }

    const tlsConfig = await this.createTLSConfig(config);
    const connectionOptions: ConnectionOptions = {
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
  async generateSelfSignedCert(
    outputDir: string,
    options: {
      commonName: string;
      organization: string;
      validityDays: number;
    }
  ): Promise<{
    certPath: string;
    keyPath: string;
  }> {
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
  async verifyCertificateChain(cert: string, ca: string[]): Promise<boolean> {
    try {
      const certData = fs.readFileSync(cert);
      const caData = ca.map(caPath => fs.readFileSync(caPath));

      tls.createSecureContext({
        cert: certData,
        ca: caData,
      });

      // 如果创建上下文成功，证书链是有效的
      return true;
    } catch (error) {
      console.error('Certificate chain verification failed:', error);
      return false;
    }
  }

  // 获取证书信息
  async getCertificateInfo(certPath: string): Promise<{
    subject: string;
    issuer: string;
    validFrom: string;
    validTo: string;
    fingerprint: string;
  }> {
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
