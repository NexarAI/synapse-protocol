import { Router } from 'express';
import { body } from 'express-validator';
import { NodeController } from '../controllers/nodeController';
import { validateRequest } from '../middleware/validateRequest';

const router = Router();
const nodeController = new NodeController();

/**
 * @swagger
 * /api/v1/nodes/register:
 *   post:
 *     summary: Register a new node in the Synapse Protocol
 *     tags: [Nodes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - stakeAmount
 *               - neuralState
 *             properties:
 *               stakeAmount:
 *                 type: string
 *                 description: Amount of tokens to stake
 *               neuralState:
 *                 type: object
 *                 properties:
 *                   weights: 
 *                     type: array
 *                     items:
 *                       type: number
 *                   gradients:
 *                     type: array
 *                     items:
 *                       type: number
 *                   timestamp:
 *                     type: number
 *                   version:
 *                     type: number
 */
router.post(
  '/register',
  [
    body('stakeAmount').isString().notEmpty(),
    body('neuralState').isObject().notEmpty(),
    validateRequest,
  ],
  nodeController.registerNode
);

/**
 * @swagger
 * /api/v1/nodes/{address}:
 *   get:
 *     summary: Get node metrics
 *     tags: [Nodes]
 *     parameters:
 *       - in: path
 *         name: address
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/:address', nodeController.getNodeMetrics);

/**
 * @swagger
 * /api/v1/nodes/stake:
 *   post:
 *     summary: Update node stake amount
 *     tags: [Nodes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - increase
 *             properties:
 *               amount:
 *                 type: string
 *               increase:
 *                 type: boolean
 */
router.post(
  '/stake',
  [
    body('amount').isString().notEmpty(),
    body('increase').isBoolean(),
    validateRequest,
  ],
  nodeController.updateStake
);

/**
 * @swagger
 * /api/v1/nodes/deregister:
 *   post:
 *     summary: Deregister a node from the protocol
 *     tags: [Nodes]
 */
router.post('/deregister', nodeController.deregisterNode);

export { router as nodeRoutes }; 