import { Router } from 'express';
import { body } from 'express-validator';
import { ProposalController } from '../controllers/proposalController';
import { validateRequest } from '../middleware/validateRequest';

const router = Router();
const proposalController = new ProposalController();

/**
 * @swagger
 * /api/v1/proposals/create:
 *   post:
 *     summary: Create a new neural state proposal
 *     tags: [Proposals]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - neuralState
 *             properties:
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
  '/create',
  [
    body('neuralState').isObject().notEmpty(),
    validateRequest,
  ],
  proposalController.createProposal
);

/**
 * @swagger
 * /api/v1/proposals/{proposalId}/vote:
 *   post:
 *     summary: Vote on a proposal
 *     tags: [Proposals]
 *     parameters:
 *       - in: path
 *         name: proposalId
 *         required: true
 *         schema:
 *           type: string
 */
router.post(
  '/:proposalId/vote',
  proposalController.voteOnProposal
);

/**
 * @swagger
 * /api/v1/proposals/{proposalId}:
 *   get:
 *     summary: Get proposal details
 *     tags: [Proposals]
 *     parameters:
 *       - in: path
 *         name: proposalId
 *         required: true
 *         schema:
 *           type: string
 */
router.get(
  '/:proposalId',
  proposalController.getProposalDetails
);

/**
 * @swagger
 * /api/v1/proposals:
 *   get:
 *     summary: Get all active proposals
 *     tags: [Proposals]
 */
router.get(
  '/',
  proposalController.getAllProposals
);

export { router as proposalRoutes }; 