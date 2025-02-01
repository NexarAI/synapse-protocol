import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { Program, Provider, web3 } from '@project-serum/anchor';
import { IDL } from '../../../target/types/synapse_protocol';
import { logger } from '../utils/logger';

export interface NeuralState {
  weights: Float32Array;
  gradients: Float32Array;
  timestamp: number;
  version: number;
}

export interface NodeMetrics {
  stake: bigint;
  reputation: number;
  isActive: boolean;
  lastUpdate: number;
}

export interface ConsensusMetrics {
  totalNodes: number;
  activeNodes: number;
  averageReputation: number;
  consensusHealth: number;
}

export interface NeuralMetrics {
  currentVersion: number;
  lastUpdateTimestamp: number;
  convergenceRate: number;
  modelAccuracy: number;
}

export class SynapseClient {
  private program: Program;
  private protocolState: PublicKey;

  constructor(
    private connection: Connection,
    programId: string,
    protocolStateAddress: string
  ) {
    this.protocolState = new PublicKey(protocolStateAddress);

    // Initialize Anchor program
    const provider = new Provider(
      connection,
      new Keypair(), // Placeholder wallet, will be replaced in actual requests
      { commitment: 'confirmed' }
    );

    this.program = new Program(IDL, new PublicKey(programId), provider);
  }

  /**
   * Register as a neural consensus node
   */
  async registerNode(
    stakeAmount: bigint,
    neuralState: NeuralState
  ): Promise<string> {
    try {
      const nodeState = await this.findNodeAddress(this.program.provider.publicKey);
      const stateRoot = this.computeNeuralStateRoot(neuralState);

      const tx = await this.program.methods
        .registerNode(stakeAmount, stateRoot)
        .accounts({
          protocolState: this.protocolState,
          nodeState,
          staker: this.program.provider.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .transaction();

      const signature = await sendAndConfirmTransaction(
        this.connection,
        tx,
        [this.program.provider.wallet as Keypair]
      );

      logger.info('Node registered successfully', {
        signature,
        nodeState: nodeState.toString()
      });

      return signature;
    } catch (error) {
      logger.error('Error registering node', { error });
      throw error;
    }
  }

  /**
   * Propose a new neural state update
   */
  async proposeUpdate(neuralState: NeuralState): Promise<string> {
    try {
      const nodeState = await this.findNodeAddress(this.program.provider.publicKey);
      const stateRoot = this.computeNeuralStateRoot(neuralState);
      const signature = await this.signNeuralState(stateRoot);

      const proposal = Keypair.generate();

      const tx = await this.program.methods
        .proposeNeuralState(stateRoot, signature)
        .accounts({
          protocolState: this.protocolState,
          nodeState,
          proposal: proposal.publicKey,
          staker: this.program.provider.publicKey,
        })
        .transaction();

      const txSignature = await sendAndConfirmTransaction(
        this.connection,
        tx,
        [this.program.provider.wallet as Keypair, proposal]
      );

      logger.info('Neural state proposal created', {
        signature: txSignature,
        proposal: proposal.publicKey.toString()
      });

      return txSignature;
    } catch (error) {
      logger.error('Error proposing neural state update', { error });
      throw error;
    }
  }

  /**
   * Vote on a neural state proposal
   */
  async voteOnProposal(proposalAddress: PublicKey): Promise<string> {
    try {
      const nodeState = await this.findNodeAddress(this.program.provider.publicKey);

      const tx = await this.program.methods
        .voteOnProposal()
        .accounts({
          protocolState: this.protocolState,
          nodeState,
          proposal: proposalAddress,
          voter: this.program.provider.publicKey,
        })
        .transaction();

      const signature = await sendAndConfirmTransaction(
        this.connection,
        tx,
        [this.program.provider.wallet as Keypair]
      );

      logger.info('Vote cast successfully', {
        signature,
        proposal: proposalAddress.toString()
      });

      return signature;
    } catch (error) {
      logger.error('Error voting on proposal', { error });
      throw error;
    }
  }

  /**
   * Get node metrics
   */
  async getNodeMetrics(nodeAddress: PublicKey): Promise<NodeMetrics> {
    try {
      const nodeState = await this.findNodeAddress(nodeAddress);
      const account = await this.program.account.nodeState.fetch(nodeState);

      return {
        stake: account.stake,
        reputation: account.reputation.toNumber(),
        isActive: account.isActive,
        lastUpdate: account.lastUpdate.toNumber(),
      };
    } catch (error) {
      logger.error('Error fetching node metrics', { error });
      throw error;
    }
  }

  /**
   * Get consensus metrics
   */
  async getConsensusMetrics(): Promise<ConsensusMetrics> {
    try {
      const state = await this.program.account.protocolState.fetch(
        this.protocolState
      );

      const nodes = await this.program.account.nodeState.all();
      const activeNodes = nodes.filter(n => n.account.isActive);

      const totalStake = activeNodes.reduce(
        (sum, node) => sum + node.account.stake,
        0n
      );

      const averageReputation = activeNodes.reduce(
        (sum, node) => sum + node.account.reputation.toNumber(),
        0
      ) / (activeNodes.length || 1);

      const consensusHealth = Number(
        activeNodes
          .filter(n => n.account.reputation.toNumber() > 500)
          .reduce((sum, node) => sum + node.account.stake, 0n)
      ) / Number(totalStake || 1n);

      return {
        totalNodes: nodes.length,
        activeNodes: activeNodes.length,
        averageReputation,
        consensusHealth,
      };
    } catch (error) {
      logger.error('Error fetching consensus metrics', { error });
      throw error;
    }
  }

  /**
   * Get protocol state
   */
  async getProtocolState() {
    try {
      return await this.program.account.protocolState.fetch(this.protocolState);
    } catch (error) {
      logger.error('Error fetching protocol state', { error });
      throw error;
    }
  }

  /**
   * Get neural metrics
   */
  async getNeuralMetrics(): Promise<NeuralMetrics> {
    try {
      const proposals = await this.program.account.proposal.all();
      const executedProposals = proposals.filter(p => p.account.executed);
      
      const latestProposal = executedProposals[executedProposals.length - 1];
      const convergenceRate = this.calculateConvergenceRate(executedProposals);
      const modelAccuracy = await this.evaluateModelAccuracy();

      return {
        currentVersion: executedProposals.length,
        lastUpdateTimestamp: latestProposal ? latestProposal.account.timestamp.toNumber() : 0,
        convergenceRate,
        modelAccuracy,
      };
    } catch (error) {
      logger.error('Error fetching neural metrics', { error });
      throw error;
    }
  }

  /**
   * Helper: Find PDA for node state account
   */
  private async findNodeAddress(nodeAddress: PublicKey): Promise<PublicKey> {
    const [address] = await PublicKey.findProgramAddress(
      [Buffer.from('node'), nodeAddress.toBuffer()],
      this.program.programId
    );
    return address;
  }

  /**
   * Helper: Compute neural state root
   */
  private computeNeuralStateRoot(state: NeuralState): Buffer {
    const combined = new Float32Array(
      state.weights.length + state.gradients.length
    );
    combined.set(state.weights);
    combined.set(state.gradients, state.weights.length);

    const buffer = Buffer.from(combined.buffer);
    const metadata = Buffer.from(
      `${state.timestamp}:${state.version}`
    );

    return Buffer.concat([buffer, metadata]);
  }

  /**
   * Helper: Sign neural state
   */
  private async signNeuralState(stateRoot: Buffer): Promise<Buffer> {
    return await web3.ed25519.sign(
      stateRoot,
      (this.program.provider.wallet as Keypair).secretKey
    );
  }

  /**
   * Helper: Calculate convergence rate
   */
  private calculateConvergenceRate(executedProposals: any[]): number {
    if (executedProposals.length < 2) return 0;

    const recentProposals = executedProposals.slice(-10);
    let totalDelta = 0;

    for (let i = 1; i < recentProposals.length; i++) {
      const timeDelta = recentProposals[i].account.timestamp.sub(
        recentProposals[i - 1].account.timestamp
      ).toNumber();
      totalDelta += timeDelta;
    }

    return totalDelta / (recentProposals.length - 1);
  }

  /**
   * Helper: Evaluate model accuracy
   */
  private async evaluateModelAccuracy(): Promise<number> {
    // In a real implementation, this would evaluate the model's performance
    // against a validation dataset. For now, we return a placeholder value.
    return 0.95;
  }
} 