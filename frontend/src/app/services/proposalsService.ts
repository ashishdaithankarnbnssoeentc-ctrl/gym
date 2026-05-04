/**
 * Proposals Service
 *
 * Frontend API client for proposal generation and management
 */

import { auth } from '../lib/firebase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface CreateProposalRequest {
  project_name: string;
  client_name: string;
  client_type: 'startup' | 'corporate' | 'small_business';
  client_industry?: string;
  project_description: string;
  project_goals: string[];
  budget_range?: string;
  timeline?: string;
  pricing_tier: 'basic' | 'professional' | 'enterprise';
}

interface Proposal {
  id: string;
  project_name: string;
  client_name: string;
  client_type: string;
  generated_proposal: string;
  invoice_data: any;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
}

interface ProposalsResponse {
  status: 'success' | 'error';
  data?: {
    proposals: Proposal[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
    };
  };
  reason?: string;
  action?: string;
  errors?: string[];
}

/**
 * Get auth headers with Firebase token
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }

  const token = await user.getIdToken();

  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

/**
 * Create new proposal
 */
export async function createProposal(data: CreateProposalRequest): Promise<Proposal> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE_URL}/api/proposals`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok || result.status === 'error') {
    throw new Error(result.action || result.reason || 'Failed to create proposal');
  }

  return result.data;
}

/**
 * Get all proposals
 */
export async function getProposals(
  page: number = 1,
  limit: number = 20,
  status?: string
): Promise<ProposalsResponse['data']> {
  const headers = await getAuthHeaders();

  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  if (status) {
    params.append('status', status);
  }

  const response = await fetch(`${API_BASE_URL}/api/proposals?${params}`, {
    headers,
  });

  const result = await response.json();

  if (!response.ok || result.status === 'error') {
    throw new Error(result.action || result.reason || 'Failed to fetch proposals');
  }

  return result.data;
}

/**
 * Get proposal by ID
 */
export async function getProposalById(id: string): Promise<Proposal> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE_URL}/api/proposals/${id}`, {
    headers,
  });

  const result = await response.json();

  if (!response.ok || result.status === 'error') {
    throw new Error(result.action || result.reason || 'Failed to fetch proposal');
  }

  return result.data;
}

/**
 * Update proposal status
 */
export async function updateProposalStatus(
  id: string,
  status: 'draft' | 'sent' | 'accepted' | 'rejected'
): Promise<Proposal> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE_URL}/api/proposals/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ status }),
  });

  const result = await response.json();

  if (!response.ok || result.status === 'error') {
    throw new Error(result.action || result.reason || 'Failed to update proposal');
  }

  return result.data;
}

/**
 * Delete proposal
 */
export async function deleteProposal(id: string): Promise<void> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE_URL}/api/proposals/${id}`, {
    method: 'DELETE',
    headers,
  });

  const result = await response.json();

  if (!response.ok || result.status === 'error') {
    throw new Error(result.action || result.reason || 'Failed to delete proposal');
  }
}

/**
 * Get client memory
 */
export async function getClientMemory(clientName: string): Promise<any> {
  const headers = await getAuthHeaders();

  const response = await fetch(
    `${API_BASE_URL}/api/proposals/clients/${encodeURIComponent(clientName)}`,
    { headers }
  );

  const result = await response.json();

  if (!response.ok || result.status === 'error') {
    return null; // Client memory not found is OK
  }

  return result.data;
}
