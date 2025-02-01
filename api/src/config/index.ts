import dotenv from 'dotenv';
import { Connection, clusterApiUrl } from '@solana/web3.js';

dotenv.config();

const environment = process.env.NODE_ENV || 'development';

interface Config {
  port: number;
  solanaNetwork: 'mainnet-beta' | 'devnet' | 'testnet';
  solanaConnection: Connection;
  programId: string;
  protocolStateAddress: string;
  logLevel: string;
}

const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  solanaNetwork: (process.env.SOLANA_NETWORK || 'devnet') as 'mainnet-beta' | 'devnet' | 'testnet',
  solanaConnection: new Connection(
    process.env.SOLANA_RPC_URL || clusterApiUrl('devnet'),
    'confirmed'
  ),
  programId: process.env.PROGRAM_ID || 'SYNPSv1protocol11111111111111111111111111111',
  protocolStateAddress: process.env.PROTOCOL_STATE_ADDRESS || '',
  logLevel: environment === 'production' ? 'info' : 'debug',
};

export { config }; 