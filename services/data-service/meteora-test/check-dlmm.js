import { Connection } from '@solana/web3.js';
import pkg from '@meteora-ag/dlmm';

const DLMM = pkg.default;

const RPC_ENDPOINT = 'https://soft-snowy-asphalt.solana-mainnet.quiknode.pro/48639631c6e4e81af5a0b8e228f6f9a0329154b7/';

async function checkDLMM() {
  try {
    console.log('Initializing connection to Solana mainnet...');
    const connection = new Connection(RPC_ENDPOINT, 'confirmed');
    
    console.log('Creating DLMM instance...');
    const dlmm = new DLMM(connection);
    
    console.log('DLMM instance methods:');
    console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(dlmm)));
    
    console.log('\nDLMM static methods:');
    console.log(Object.getOwnPropertyNames(DLMM));
    
    console.log('\nDLMM instance properties:');
    console.log(Object.keys(dlmm));
    
    console.log('\nDLMM package exports:');
    console.log(Object.keys(pkg));
  } catch (error) {
    console.error('Error:', error);
  }
}

checkDLMM().catch(console.error); 