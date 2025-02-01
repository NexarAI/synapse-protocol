import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { SynapseClient } from '../api/src/services/synapseClient';
import { Command } from 'commander';
import * as dotenv from 'dotenv';
import { KeyManager } from './key-manager';
import { readFileSync } from 'fs';
import { join } from 'path';

dotenv.config();

class ProtocolCLI {
  private client: SynapseClient;
  private keyManager: KeyManager;

  constructor(
    connection: Connection,
    programId: string,
    protocolStateAddress: string
  ) {
    this.client = new SynapseClient(connection, programId, protocolStateAddress);
    this.keyManager = new KeyManager();
  }

  /**
   * Register a new node
   */
  async registerNode(keyName: string, stake: number): Promise<void> {
    console.log('📝 Registering node...');
    
    const keypair = this.keyManager.loadKeypair(keyName);
    const initialState = {
      weights: new Float32Array(10).fill(0),
      gradients: new Float32Array(10).fill(0),
      timestamp: Date.now(),
      version: 1
    };

    await this.client.registerNode(BigInt(stake), initialState);
    console.log('✅ Node registered successfully');
  }

  /**
   * Propose a neural state update
   */
  async proposeUpdate(keyName: string, weightsFile: string): Promise<void> {
    console.log('🔄 Proposing update...');
    
    // Load weights from file
    const weights = JSON.parse(readFileSync(weightsFile, 'utf-8'));
    
    const neuralState = {
      weights: new Float32Array(weights),
      gradients: new Float32Array(weights.length).fill(0.01),
      timestamp: Date.now(),
      version: 1
    };

    const proposalTx = await this.client.proposeUpdate(neuralState);
    console.log('✅ Proposal submitted:', proposalTx);
  }

  /**
   * Vote on a proposal
   */
  async vote(keyName: string, proposalId: string, approve: boolean): Promise<void> {
    console.log(`🗳️ Voting ${approve ? 'YES' : 'NO'} on proposal...`);
    
    const keypair = this.keyManager.loadKeypair(keyName);
    await this.client.voteOnProposal(new PublicKey(proposalId));
    console.log('✅ Vote submitted');
  }

  /**
   * Get node metrics
   */
  async getNodeMetrics(nodeAddress: string): Promise<void> {
    console.log('📊 Fetching node metrics...');
    
    const metrics = await this.client.getNodeMetrics(new PublicKey(nodeAddress));
    console.log('\nNode Metrics:');
    console.table(metrics);
  }

  /**
   * Get consensus metrics
   */
  async getConsensusMetrics(): Promise<void> {
    console.log('🌐 Fetching consensus metrics...');
    
    const metrics = await this.client.getConsensusMetrics();
    console.log('\nConsensus Metrics:');
    console.table(metrics);
  }

  /**
   * Get neural metrics
   */
  async getNeuralMetrics(): Promise<void> {
    console.log('🧠 Fetching neural metrics...');
    
    const metrics = await this.client.getNeuralMetrics();
    console.log('\nNeural Metrics:');
    console.table(metrics);
  }

  /**
   * Get protocol state
   */
  async getProtocolState(): Promise<void> {
    console.log('📈 Fetching protocol state...');
    
    const state = await this.client.getProtocolState();
    console.log('\nProtocol State:');
    console.table(state);
  }
}

// Set up CLI
const program = new Command();

program
  .name('synapse-cli')
  .description('CLI tool for interacting with the Synapse Protocol')
  .version('1.0.0');

// Initialize CLI instance
const cli = new ProtocolCLI(
  new Connection(process.env.SOLANA_RPC_URL || 'http://localhost:8899'),
  process.env.PROGRAM_ID!,
  process.env.PROTOCOL_STATE_ADDRESS!
);

// Register commands
program
  .command('register')
  .description('Register a new node')
  .argument('<key-name>', 'Name of the keypair to use')
  .argument('<stake>', 'Amount of SOL to stake')
  .action(async (keyName, stake) => {
    try {
      await cli.registerNode(keyName, parseInt(stake));
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

program
  .command('propose')
  .description('Propose a neural state update')
  .argument('<key-name>', 'Name of the keypair to use')
  .argument('<weights-file>', 'Path to weights JSON file')
  .action(async (keyName, weightsFile) => {
    try {
      await cli.proposeUpdate(keyName, weightsFile);
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

program
  .command('vote')
  .description('Vote on a proposal')
  .argument('<key-name>', 'Name of the keypair to use')
  .argument('<proposal-id>', 'Proposal public key')
  .option('--no', 'Vote NO instead of YES')
  .action(async (keyName, proposalId, options) => {
    try {
      await cli.vote(keyName, proposalId, !options.no);
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

program
  .command('node-metrics')
  .description('Get node metrics')
  .argument('<node-address>', 'Node public key')
  .action(async (nodeAddress) => {
    try {
      await cli.getNodeMetrics(nodeAddress);
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

program
  .command('consensus-metrics')
  .description('Get consensus metrics')
  .action(async () => {
    try {
      await cli.getConsensusMetrics();
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

program
  .command('neural-metrics')
  .description('Get neural metrics')
  .action(async () => {
    try {
      await cli.getNeuralMetrics();
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

program
  .command('protocol-state')
  .description('Get protocol state')
  .action(async () => {
    try {
      await cli.getProtocolState();
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse(); 