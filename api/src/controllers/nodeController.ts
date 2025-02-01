import { Request, Response } from 'express';
import { PublicKey } from '@solana/web3.js';
import { SynapseClient } from '../services/synapseClient';
import { config } from '../config';
import { ApiError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

export class NodeController {
  private client: SynapseClient;

  constructor() {
    this.client = new SynapseClient(
      config.solanaConnection,
      config.programId,
      config.protocolStateAddress
    );
  }

  public registerNode = async (req: Request, res: Response) => {
    try {
      const { stakeAmount, neuralState } = req.body;

      const result = await this.client.registerNode(
        BigInt(stakeAmount),
        neuralState
      );

      logger.info('Node registered successfully', { 
        txSignature: result 
      });

      res.status(201).json({
        status: 'success',
        data: {
          txSignature: result
        }
      });
    } catch (error) {
      logger.error('Error registering node', { error });
      throw new ApiError(
        500,
        'Failed to register node',
        true,
        error instanceof Error ? error.message : undefined
      );
    }
  };

  public getNodeMetrics = async (req: Request, res: Response) => {
    try {
      const { address } = req.params;
      const nodeAddress = new PublicKey(address);

      const metrics = await this.client.getNodeMetrics(nodeAddress);

      res.status(200).json({
        status: 'success',
        data: metrics
      });
    } catch (error) {
      logger.error('Error fetching node metrics', { error });
      throw new ApiError(
        500,
        'Failed to fetch node metrics',
        true,
        error instanceof Error ? error.message : undefined
      );
    }
  };

  public updateStake = async (req: Request, res: Response) => {
    try {
      const { amount, increase } = req.body;

      const result = await this.client.updateStake(
        BigInt(amount),
        increase
      );

      logger.info('Stake updated successfully', { 
        txSignature: result 
      });

      res.status(200).json({
        status: 'success',
        data: {
          txSignature: result
        }
      });
    } catch (error) {
      logger.error('Error updating stake', { error });
      throw new ApiError(
        500,
        'Failed to update stake',
        true,
        error instanceof Error ? error.message : undefined
      );
    }
  };

  public deregisterNode = async (req: Request, res: Response) => {
    try {
      const result = await this.client.deregisterNode();

      logger.info('Node deregistered successfully', { 
        txSignature: result 
      });

      res.status(200).json({
        status: 'success',
        data: {
          txSignature: result
        }
      });
    } catch (error) {
      logger.error('Error deregistering node', { error });
      throw new ApiError(
        500,
        'Failed to deregister node',
        true,
        error instanceof Error ? error.message : undefined
      );
    }
  };
} 