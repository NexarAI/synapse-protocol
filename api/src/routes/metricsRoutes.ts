import { Router } from 'express';
import { MetricsController } from '../controllers/metricsController';

const router = Router();
const metricsController = new MetricsController();

/**
 * @swagger
 * /api/v1/metrics/consensus:
 *   get:
 *     summary: Get consensus metrics
 *     tags: [Metrics]
 *     responses:
 *       200:
 *         description: Consensus metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalNodes:
 *                   type: number
 *                 activeNodes:
 *                   type: number
 *                 averageReputation:
 *                   type: number
 *                 consensusHealth:
 *                   type: number
 */
router.get('/consensus', metricsController.getConsensusMetrics);

/**
 * @swagger
 * /api/v1/metrics/protocol:
 *   get:
 *     summary: Get protocol state metrics
 *     tags: [Metrics]
 *     responses:
 *       200:
 *         description: Protocol state metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 minStake:
 *                   type: string
 *                 epochDuration:
 *                   type: number
 *                 proposalCount:
 *                   type: number
 *                 lastEpochUpdate:
 *                   type: number
 */
router.get('/protocol', metricsController.getProtocolMetrics);

/**
 * @swagger
 * /api/v1/metrics/neural:
 *   get:
 *     summary: Get neural network metrics
 *     tags: [Metrics]
 *     responses:
 *       200:
 *         description: Neural network metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 currentVersion:
 *                   type: number
 *                 lastUpdateTimestamp:
 *                   type: number
 *                 convergenceRate:
 *                   type: number
 *                 modelAccuracy:
 *                   type: number
 */
router.get('/neural', metricsController.getNeuralMetrics);

export { router as metricsRoutes }; 