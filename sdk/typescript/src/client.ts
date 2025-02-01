import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { Program, Provider, web3 } from "@project-serum/anchor";
import { IDL } from "./idl";
import { Buffer } from "buffer";
import * as bs58 from "bs58";

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

export class SynapseClient {
  private connection: Connection;
  private wallet: Keypair;
  private program: Program;
  private protocolState: PublicKey;

  constructor(
    connection: Connection,
    wallet: Keypair,
    programId: PublicKey,
    protocolState: PublicKey
  ) {
    this.connection = connection;
    this.wallet = wallet;
    this.protocolState = protocolState;

    // Initialize Anchor program
    const provider = new Provider(
      connection,
      { publicKey: wallet.publicKey, signTransaction: async (tx: Transaction) => {
        tx.sign(wallet);
        return tx;
      }},
      { commitment: "confirmed" }
    );

    this.program = new Program(IDL, programId, provider);
  }

  /**
   * Register as a neural consensus node
   */
  async registerNode(
    stakeAmount: bigint,
    neuralState: NeuralState
  ): Promise<string> {
    const nodeState = await this.findNodeAddress(this.wallet.publicKey);
    const stateRoot = this.computeNeuralStateRoot(neuralState);

    const tx = await this.program.methods
      .registerNode(stakeAmount, stateRoot)
      .accounts({
        protocolState: this.protocolState,
        nodeState,
        staker: this.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    const signature = await sendAndConfirmTransaction(
      this.connection,
      tx,
      [this.wallet]
    );

    return signature;
  }

  /**
   * Propose a new neural state update
   */
  async proposeUpdate(neuralState: NeuralState): Promise<string> {
    const nodeState = await this.findNodeAddress(this.wallet.publicKey);
    const stateRoot = this.computeNeuralStateRoot(neuralState);
    const signature = await this.signNeuralState(stateRoot);

    const proposal = Keypair.generate();

    const tx = await this.program.methods
      .proposeNeuralState(stateRoot, signature)
      .accounts({
        protocolState: this.protocolState,
        nodeState,
        proposal: proposal.publicKey,
        staker: this.wallet.publicKey,
      })
      .transaction();

    const txSignature = await sendAndConfirmTransaction(
      this.connection,
      tx,
      [this.wallet, proposal]
    );

    return txSignature;
  }

  /**
   * Vote on a neural state proposal
   */
  async voteOnProposal(proposalAddress: PublicKey): Promise<string> {
    const nodeState = await this.findNodeAddress(this.wallet.publicKey);

    const tx = await this.program.methods
      .voteOnProposal()
      .accounts({
        protocolState: this.protocolState,
        nodeState,
        proposal: proposalAddress,
        voter: this.wallet.publicKey,
      })
      .transaction();

    const signature = await sendAndConfirmTransaction(
      this.connection,
      tx,
      [this.wallet]
    );

    return signature;
  }

  /**
   * Update stake amount
   */
  async updateStake(amount: bigint, increase: boolean): Promise<string> {
    const nodeState = await this.findNodeAddress(this.wallet.publicKey);

    const tx = await this.program.methods
      .updateStake(amount, increase)
      .accounts({
        protocolState: this.protocolState,
        nodeState,
        staker: this.wallet.publicKey,
      })
      .transaction();

    const signature = await sendAndConfirmTransaction(
      this.connection,
      tx,
      [this.wallet]
    );

    return signature;
  }

  /**
   * Deregister from the protocol
   */
  async deregisterNode(): Promise<string> {
    const nodeState = await this.findNodeAddress(this.wallet.publicKey);

    const tx = await this.program.methods
      .deregisterNode()
      .accounts({
        protocolState: this.protocolState,
        nodeState,
        staker: this.wallet.publicKey,
      })
      .transaction();

    const signature = await sendAndConfirmTransaction(
      this.connection,
      tx,
      [this.wallet]
    );

    return signature;
  }

  /**
   * Get node metrics
   */
  async getNodeMetrics(nodeAddress: PublicKey): Promise<NodeMetrics> {
    const nodeState = await this.findNodeAddress(nodeAddress);
    const account = await this.program.account.nodeState.fetch(nodeState);

    return {
      stake: account.stake,
      reputation: account.reputation,
      isActive: account.isActive,
      lastUpdate: account.lastUpdate.toNumber(),
    };
  }

  /**
   * Get consensus metrics
   */
  async getConsensusMetrics(): Promise<ConsensusMetrics> {
    const state = await this.program.account.protocolState.fetch(
      this.protocolState
    );

    return {
      totalNodes: await this.program.account.nodeState.all().then(x => x.length),
      activeNodes: state.activeNodeCount.toNumber(),
      averageReputation: await this.calculateAverageReputation(),
      consensusHealth: await this.calculateConsensusHealth(),
    };
  }

  /**
   * Helper: Find PDA for node state account
   */
  private async findNodeAddress(nodeAddress: PublicKey): Promise<PublicKey> {
    const [address] = await PublicKey.findProgramAddress(
      [Buffer.from("node"), nodeAddress.toBuffer()],
      this.program.programId
    );
    return address;
  }

  /**
   * Helper: Compute neural state root
   */
  private computeNeuralStateRoot(state: NeuralState): Buffer {
    // Combine weights and gradients
    const combined = new Float32Array(
      state.weights.length + state.gradients.length
    );
    combined.set(state.weights);
    combined.set(state.gradients, state.weights.length);

    // Create deterministic byte representation
    const buffer = Buffer.from(combined.buffer);
    const metadata = Buffer.from(
      `${state.timestamp}:${state.version}`
    );

    // Compute Blake3 hash
    return Buffer.concat([buffer, metadata]);
  }

  /**
   * Helper: Sign neural state
   */
  private async signNeuralState(stateRoot: Buffer): Promise<Buffer> {
    const signature = bs58.encode(
      await web3.ed25519.sign(
        stateRoot,
        this.wallet.secretKey
      )
    );
    return Buffer.from(signature);
  }

  /**
   * Helper: Calculate average reputation
   */
  private async calculateAverageReputation(): Promise<number> {
    const nodes = await this.program.account.nodeState.all();
    if (nodes.length === 0) return 0;

    const total = nodes.reduce(
      (sum, node) => sum + node.account.reputation.toNumber(),
      0
    );
    return total / nodes.length;
  }

  /**
   * Helper: Calculate consensus health
   */
  private async calculateConsensusHealth(): Promise<number> {
    const nodes = await this.program.account.nodeState.all();
    const activeNodes = nodes.filter(n => n.account.isActive);
    if (activeNodes.length === 0) return 0;

    const totalStake = activeNodes.reduce(
      (sum, node) => sum + node.account.stake,
      0n
    );
    const activeStake = activeNodes
      .filter(n => n.account.reputation > 500) // Minimum reputation threshold
      .reduce((sum, node) => sum + node.account.stake, 0n);

    return Number(activeStake) / Number(totalStake);
  }
} 