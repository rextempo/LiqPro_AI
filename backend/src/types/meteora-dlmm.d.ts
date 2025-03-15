declare module '@meteora-ag/dlmm' {
  import { Connection, PublicKey } from '@solana/web3.js';

  interface BinLiquidity {
    binId: number;
    pricePerLamport: bigint;
    liquidityX: bigint;
    liquidityY: bigint;
  }

  interface BinArrayAccount {
    bins: BinLiquidity[];
    binStep: number;
  }

  interface FeeInfo {
    baseFee: bigint;
    maxFee: bigint;
    protocolFee: bigint;
  }

  interface DLMMPool {
    getActiveBin(): Promise<{ price: bigint }>;
    fromPricePerLamport(price: number): number;
    getFeeInfo(): Promise<FeeInfo>;
    getBinArrays(): Promise<BinArrayAccount[]>;
  }

  interface DLMM {
    create(connection: Connection, poolAddress: PublicKey): Promise<DLMMPool>;
  }

  const DLMM: DLMM;
  export default DLMM;
} 