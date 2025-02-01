import { Request, Response } from 'express';
import { PublicKey } from '@solana/web3.js';
import { SynapseClient } from '../services/synapseClient';
import { config } from '../config';
import { ApiError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

export class ProposalController {
  private client: SynapseClient;

  constructor() {
    this.client = new SynapseClient(
      config.solanaConnection,
      config.programId,
      config.protocolStateAddress
    );
  }

  public createProposal = async (req: Request, res: Response) => {
    try {
      const { neuralState } = req.body;

      const result = await this.client.proposeUpdate(neuralState);

      logger.info('Proposal created successfully', { 
        txSignature: result 
      });

      res.status(201).json({
        status: 'success',
        data: {
          txSignature: result
        }
      });
    } catch (error) {
      logger.error('Error creating proposal', { error });
      throw new ApiError(
        500,
        'Failed to create proposal',
        true,
        error instanceof Error ? error.message : undefined
      );
    }
  };

  public voteOnProposal = async (req: Request, res: Response) => {
    try {
      const { proposalId } = req.params;
      const proposalAddress = new PublicKey(proposalId);

      const result = await this.client.voteOnProposal(proposalAddress);

      logger.info('Vote cast successfully', { 
        txSignature: result 
      });

      res.status(200).json({
        status: 'success',
        data: {
          txSignature: result
        }
      });
    } catch (error) {
      logger.error('Error casting vote', { error });
      throw new ApiError(
        500,
        'Failed to cast vote',
        true,
        error instanceof Error ? error.message : undefined
      );
    }
  };

  public getProposalDetails = async (req: Request, res: Response) => {
    try {
      const { proposalId } = req.params;
      const proposalAddress = new PublicKey(proposalId);

      const proposal = await this.client.getProposalDetails(proposalAddress);

      res.status(200).json({
        status: 'success',
        data: proposal
      });
    } catch (error) {
      logger.error('Error fetching proposal details', { error });
      throw new ApiError(
        500,
        'Failed to fetch proposal details',
        true,
        error instanceof Error ? error.message : undefined
      );
    }
  };

  public getAllProposals = async (req: Request, res: Response) => {
    try {
      const proposals = await this.client.getAllProposals();

      res.status(200).json({
        status: 'success',
        data: proposals
      });
    } catch (error) {
      logger.error('Error fetching proposals', { error });
      throw new ApiError(
        500,
        'Failed to fetch proposals',
        true,
        error instanceof Error ? error.message : undefined
      );
    }
  };
} 