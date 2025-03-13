interface SolanaProvider {
  isPhantom?: boolean;
  publicKey?: {
    toString: () => string;
  };
  connect: () => Promise<{ publicKey: { toString: () => string } }>;
  disconnect: () => Promise<void>;
  signMessage: (message: Uint8Array, encoding: string) => Promise<{
    signature: Uint8Array;
    publicKey: string;
  }>;
}

interface SolflareProvider {
  publicKey: {
    toString: () => string;
  };
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signMessage: (message: Uint8Array, encoding: string) => Promise<{
    signature: Uint8Array;
    publicKey: string;
  }>;
}

declare global {
  interface Window {
    solana?: SolanaProvider;
    solflare?: SolflareProvider;
  }
}

export {}; 