import { Request, Response } from 'express';
import { SynapseClient } from '../services/synapseClient';
import { config } from '../config';
import { ApiError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

export class MetricsController {
  private client: SynapseClient;

  constructor() {
    this.client = new SynapseClient(
      config.solanaConnection,
      config.programId,
      config.protocolStateAddress
    );
  }

  public getConsensusMetrics = async (req: Request, res: Response) => {
    try {
      const metrics = await this.client.getConsensusMetrics();

      res.status(200).json({
        status: 'success',
        data: metrics
      });
    } catch (error) {
      logger.error('Error fetching consensus metrics', { error });
      throw new ApiError(
        500,
        'Failed to fetch consensus metrics',
        true,
        error instanceof Error ? error.message : undefined
      );
    }
  };

  public getProtocolMetrics = async (req: Request, res: Response) => {
    try {
      const state = await this.client.getProtocolState();

      res.status(200).json({
        status: 'success',
        data: {
          minStake: state.minStake.toString(),
          epochDuration: state.epochDuration,
          proposalCount: state.proposalCount,
          lastEpochUpdate: state.lastEpochUpdate,
          activeNodeCount: state.activeNodeCount
        }
      });
    } catch (error) {
      logger.error('Error fetching protocol metrics', { error });
      throw new ApiError(
        500,
        'Failed to fetch protocol metrics',
        true,
        error instanceof Error ? error.message : undefined
      );
    }
  };

  public getNeuralMetrics = async (req: Request, res: Response) => {
    try {
      const metrics = await this.client.getNeuralMetrics();

      res.status(200).json({
        status: 'success',
        data: {
          currentVersion: metrics.currentVersion,
          lastUpdateTimestamp: metrics.lastUpdateTimestamp,
          convergenceRate: metrics.convergenceRate,
          modelAccuracy: metrics.modelAccuracy
        }
      });
    } catch (error) {
      logger.error('Error fetching neural metrics', { error });
      throw new ApiError(
        500,
        'Failed to fetch neural metrics',
        true,
        error instanceof Error ? error.message : undefined
      );
    }
  };
} 