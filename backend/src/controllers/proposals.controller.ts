/**
 * Proposals Controller
 *
 * Handles proposal generation, validation, and storage
 * Implements master system prompt governance
 */

import { Request, Response } from 'express';
import crypto from 'crypto';
import { supabase } from '../lib/supabase.js';
import { generateProposal } from '../services/ai.service.js';
import { generateInvoice } from '../services/invoice.service.js';
import { generateProposalPDF, getPDFPath } from '../services/pdf.service.js';
import { AuthRequest } from '../middleware/auth.js';

/**
 * Get Supabase user ID from Firebase UID
 */
async function getUserId(firebaseUid: string): Promise<string> {
  const { data: user, error } = await supabase
    .from('users')
    .select('id')
    .eq('firebase_uid', firebaseUid)
    .single();

  if (error || !user) {
    throw new Error('User not found in database');
  }

  return user.id;
}

/**
 * Generate request hash for duplicate detection
 */
function generateRequestHash(data: any): string {
  const hashString = JSON.stringify({
    projectName: data.project_name,
    clientName: data.client_name,
    projectDescription: data.project_description,
  });

  return crypto.createHash('sha256').update(hashString).digest('hex');
}

/**
 * Validate proposal request
 */
function validateProposalRequest(body: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required fields
  if (!body.project_name || body.project_name.trim().length === 0) {
    errors.push('project_name is required');
  }

  if (!body.client_name || body.client_name.trim().length === 0) {
    errors.push('client_name is required');
  }

  if (!body.client_type) {
    errors.push('client_type is required');
  } else if (!['startup', 'corporate', 'small_business'].includes(body.client_type)) {
    errors.push('client_type must be one of: startup, corporate, small_business');
  }

  if (!body.project_description || body.project_description.trim().length < 20) {
    errors.push('project_description must be at least 20 characters');
  }

  if (!body.project_goals || !Array.isArray(body.project_goals) || body.project_goals.length === 0) {
    errors.push('project_goals must be a non-empty array');
  }

  if (!body.pricing_tier) {
    errors.push('pricing_tier is required');
  } else if (!['basic', 'professional', 'enterprise'].includes(body.pricing_tier)) {
    errors.push('pricing_tier must be one of: basic, professional, enterprise');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create new proposal
 * POST /api/proposals
 */
export const createProposal = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Step 1: Authentication check (handled by middleware)
    const firebaseUid = req.user!.uid;
    const userId = await getUserId(firebaseUid || '');

    // Step 2: Validate request
    const validation = validateProposalRequest(req.body);
    if (!validation.valid) {
      res.status(400).json({
        status: 'error',
        reason: 'validation_failed',
        action: 'Fix validation errors',
        errors: validation.errors,
      });
      return;
    }

    // Step 3: Check for duplicate (using request hash)
    const requestHash = generateRequestHash(req.body);
    const { data: existingProposal } = await supabase
      .from('proposals')
      .select('id')
      .eq('request_hash', requestHash)
      .eq('user_id', userId)
      .single();

    if (existingProposal) {
      res.status(409).json({
        status: 'error',
        reason: 'duplicate_request',
        action: 'A similar proposal already exists',
        proposalId: existingProposal.id,
      });
      return;
    }

    // Step 4: Generate AI proposal
    let aiOutput;
    try {
      aiOutput = await generateProposal({
        projectName: req.body.project_name,
        clientName: req.body.client_name,
        clientType: req.body.client_type,
        projectDescription: req.body.project_description,
        projectGoals: req.body.project_goals,
        budgetRange: req.body.budget_range,
        timeline: req.body.timeline,
        pricingTier: req.body.pricing_tier,
      });
    } catch (error: any) {
      console.error('AI generation failed:', error);
      res.status(500).json({
        status: 'error',
        reason: 'generation_failed',
        action: 'AI proposal generation failed. Please try again.',
      });
      return;
    }

    // Step 5: Generate invoice
    const invoiceData = generateInvoice(
      req.body.pricing_tier,
      req.body.client_type,
      req.body.project_name
    );

    // Step 6: Store in database
    const { data: proposal, error: dbError } = await supabase
      .from('proposals')
      .insert({
        user_id: userId,
        project_name: req.body.project_name,
        client_name: req.body.client_name,
        client_type: req.body.client_type,
        client_industry: req.body.client_industry || null,
        request_hash: requestHash,
        project_description: req.body.project_description,
        project_goals: req.body.project_goals,
        budget_range: req.body.budget_range || null,
        timeline: req.body.timeline || null,
        strategy: aiOutput.strategy,
        generated_proposal: aiOutput.proposal,
        tone_profile: aiOutput.toneProfile,
        pricing_tier: req.body.pricing_tier,
        pricing_summary: {
          tier: req.body.pricing_tier,
          amount: invoiceData.total,
        },
        invoice_data: invoiceData,
        status: 'draft',
      })
      .select()
      .single();

    if (dbError || !proposal) {
      console.error('Database error:', dbError);
      res.status(500).json({
        status: 'error',
        reason: 'database_error',
        action: 'Failed to store proposal',
      });
      return;
    }

    // Step 7: Generate PDF (async, don't block response)
    generateProposalPDF(
      {
        projectName: proposal.project_name,
        clientName: proposal.client_name,
        proposal: proposal.generated_proposal,
        invoiceData: proposal.invoice_data,
        createdAt: proposal.created_at,
      },
      getPDFPath(proposal.id)
    )
      .then(async (pdfPath) => {
        // Update proposal with PDF path
        await supabase
          .from('proposals')
          .update({
            pdf_url: pdfPath,
            pdf_generated_at: new Date().toISOString(),
          })
          .eq('id', proposal.id);

        console.log(`✅ PDF generated for proposal ${proposal.id}`);
      })
      .catch((error) => {
        console.error(`❌ PDF generation failed for proposal ${proposal.id}:`, error);
      });

    // Step 8: Update client memory (async)
    updateClientMemory(userId, req.body.client_name, req.body.client_type, req.body.client_industry).catch(
      console.error
    );

    // Step 9: Return success response
    res.status(201).json({
      status: 'success',
      data: {
        id: proposal.id,
        project_name: proposal.project_name,
        client_name: proposal.client_name,
        proposal: proposal.generated_proposal,
        invoice: proposal.invoice_data,
        status: proposal.status,
        created_at: proposal.created_at,
      },
    });
  } catch (error: any) {
    console.error('Proposal creation error:', error);
    res.status(500).json({
      status: 'error',
      reason: 'internal_error',
      action: 'An unexpected error occurred',
    });
  }
};

/**
 * Get all proposals for authenticated user
 * GET /api/proposals
 */
export const getProposals = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const firebaseUid = req.user!.uid;
    const userId = await getUserId(firebaseUid || '');

    // Pagination
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    // Status filter
    const status = req.query.status as string;

    let query = supabase
      .from('proposals')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (status && ['draft', 'sent', 'accepted', 'rejected'].includes(status)) {
      query = query.eq('status', status);
    }

    const { data: proposals, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    res.json({
      status: 'success',
      data: {
        proposals: proposals || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          total_pages: Math.ceil((count || 0) / limit),
        },
      },
    });
  } catch (error) {
    console.error('Get proposals error:', error);
    res.status(500).json({
      status: 'error',
      reason: 'fetch_failed',
      action: 'Failed to retrieve proposals',
    });
  }
};

/**
 * Get proposal by ID
 * GET /api/proposals/:id
 */
export const getProposalById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const firebaseUid = req.user!.uid;
    const userId = await getUserId(firebaseUid || '');
    const proposalId = req.params.id;

    const { data: proposal, error } = await supabase
      .from('proposals')
      .select('*')
      .eq('id', proposalId)
      .eq('user_id', userId)
      .single();

    if (error || !proposal) {
      res.status(404).json({
        status: 'error',
        reason: 'not_found',
        action: 'Proposal not found',
      });
      return;
    }

    res.json({
      status: 'success',
      data: proposal,
    });
  } catch (error) {
    console.error('Get proposal error:', error);
    res.status(500).json({
      status: 'error',
      reason: 'fetch_failed',
      action: 'Failed to retrieve proposal',
    });
  }
};

/**
 * Update proposal status
 * PATCH /api/proposals/:id
 */
export const updateProposalStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const firebaseUid = req.user!.uid;
    const userId = await getUserId(firebaseUid || '');
    const proposalId = req.params.id;
    const { status } = req.body;

    if (!status || !['draft', 'sent', 'accepted', 'rejected'].includes(status)) {
      res.status(400).json({
        status: 'error',
        reason: 'invalid_status',
        action: 'Status must be one of: draft, sent, accepted, rejected',
      });
      return;
    }

    const updateData: any = { status };

    // Track sent_at timestamp
    if (status === 'sent') {
      updateData.sent_at = new Date().toISOString();
    }

    const { data: proposal, error } = await supabase
      .from('proposals')
      .update(updateData)
      .eq('id', proposalId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !proposal) {
      res.status(404).json({
        status: 'error',
        reason: 'not_found',
        action: 'Proposal not found',
      });
      return;
    }

    res.json({
      status: 'success',
      data: proposal,
    });
  } catch (error) {
    console.error('Update proposal error:', error);
    res.status(500).json({
      status: 'error',
      reason: 'update_failed',
      action: 'Failed to update proposal',
    });
  }
};

/**
 * Delete proposal
 * DELETE /api/proposals/:id
 */
export const deleteProposal = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const firebaseUid = req.user!.uid;
    const userId = await getUserId(firebaseUid || '');
    const proposalId = req.params.id;

    const { error } = await supabase
      .from('proposals')
      .delete()
      .eq('id', proposalId)
      .eq('user_id', userId);

    if (error) {
      res.status(404).json({
        status: 'error',
        reason: 'not_found',
        action: 'Proposal not found',
      });
      return;
    }

    res.json({
      status: 'success',
      message: 'Proposal deleted successfully',
    });
  } catch (error) {
    console.error('Delete proposal error:', error);
    res.status(500).json({
      status: 'error',
      reason: 'delete_failed',
      action: 'Failed to delete proposal',
    });
  }
};

/**
 * Update client memory (internal function)
 */
async function updateClientMemory(
  userId: string,
  clientName: string,
  clientType: string,
  clientIndustry?: string
): Promise<void> {
  try {
    const { data: existingMemory } = await supabase
      .from('client_memory')
      .select('*')
      .eq('user_id', userId)
      .eq('client_name', clientName)
      .single();

    if (existingMemory) {
      // Update existing memory
      await supabase
        .from('client_memory')
        .update({
          total_proposals: existingMemory.total_proposals + 1,
          last_interaction: new Date().toISOString(),
        })
        .eq('id', existingMemory.id);
    } else {
      // Create new memory
      await supabase.from('client_memory').insert({
        user_id: userId,
        client_name: clientName,
        client_type: clientType,
        client_industry: clientIndustry || null,
        total_proposals: 1,
      });
    }
  } catch (error) {
    console.error('Client memory update failed:', error);
    // Don't throw - this is non-critical
  }
}

/**
 * Get client memory
 * GET /api/proposals/clients/:clientName
 */
export const getClientMemory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const firebaseUid = req.user!.uid;
    const userId = await getUserId(firebaseUid || '');
    const clientName = req.params.clientName;

    const { data: memory, error } = await supabase
      .from('client_memory')
      .select('*')
      .eq('user_id', userId)
      .eq('client_name', clientName)
      .single();

    if (error || !memory) {
      res.status(404).json({
        status: 'error',
        reason: 'not_found',
        action: 'No memory found for this client',
      });
      return;
    }

    res.json({
      status: 'success',
      data: memory,
    });
  } catch (error) {
    console.error('Get client memory error:', error);
    res.status(500).json({
      status: 'error',
      reason: 'fetch_failed',
      action: 'Failed to retrieve client memory',
    });
  }
};
