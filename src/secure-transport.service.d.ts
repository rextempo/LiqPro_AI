import * as tls from 'tls';
import * as https from 'https';
import * as http from 'http';
import { SecureVersion } from 'tls';
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
export declare class SecureTransportService {
  private readonly defaultCiphers;
  private readonly defaultConfig;
  private createTLSConfig;
  createHTTPSServer(
    config: TLSConfig,
    requestHandler: (req: http.IncomingMessage, res: http.ServerResponse) => void
  ): Promise<https.Server>;
  createTLSClient(config: TLSConfig): Promise<tls.TLSSocket>;
  generateSelfSignedCert(
    outputDir: string,
    options: {
      commonName: string;
      organization: string;
      validityDays: number;
    }
  ): Promise<{
    certPath: string;
    keyPath: string;
  }>;
  verifyCertificateChain(cert: string, ca: string[]): Promise<boolean>;
  getCertificateInfo(certPath: string): Promise<{
    subject: string;
    issuer: string;
    validFrom: string;
    validTo: string;
    fingerprint: string;
  }>;
}
//# sourceMappingURL=secure-transport.service.d.ts.map
