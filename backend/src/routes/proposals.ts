/**
 * Proposals Routes
 *
 * API endpoints for proposal generation and management
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  createProposal,
  getProposals,
  getProposalById,
  updateProposalStatus,
  deleteProposal,
  getClientMemory,
} from '../controllers/proposals.controller.js';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

/**
 * @route   POST /api/proposals
 * @desc    Create new proposal
 * @access  Private
 */
router.post('/', createProposal);

/**
 * @route   GET /api/proposals
 * @desc    Get all proposals for authenticated user
 * @query   page, limit, status
 * @access  Private
 */
router.get('/', getProposals);

/**
 * @route   GET /api/proposals/:id
 * @desc    Get proposal by ID
 * @access  Private
 */
router.get('/:id', getProposalById);

/**
 * @route   PATCH /api/proposals/:id
 * @desc    Update proposal status
 * @access  Private
 */
router.patch('/:id', updateProposalStatus);

/**
 * @route   DELETE /api/proposals/:id
 * @desc    Delete proposal
 * @access  Private
 */
router.delete('/:id', deleteProposal);

/**
 * @route   GET /api/proposals/clients/:clientName
 * @desc    Get client memory
 * @access  Private
 */
router.get('/clients/:clientName', getClientMemory);

export default router;
