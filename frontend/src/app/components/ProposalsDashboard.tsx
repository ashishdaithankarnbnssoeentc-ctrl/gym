import { useState, useEffect } from 'react';
import { FileText, Plus, Loader2, Eye, Trash2, Send, Check, X } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { getProposals, updateProposalStatus, deleteProposal } from '../services/proposalsService';
import { ProposalGenerator } from './ProposalGenerator';

interface Proposal {
  id: string;
  project_name: string;
  client_name: string;
  client_type: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  created_at: string;
  generated_proposal: string;
  invoice_data: any;
}

export function ProposalsDashboard() {
  const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');

  useEffect(() => {
    if (view === 'list') {
      loadProposals();
    }
  }, [view, filter]);

  const loadProposals = async () => {
    try {
      setLoading(true);
      const data = await getProposals(1, 50, filter || undefined);
      setProposals(data?.proposals || []);
    } catch (error: any) {
      toast.error('Failed to load proposals');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: Proposal['status']) => {
    try {
      await updateProposalStatus(id, status);
      toast.success(`Proposal marked as ${status}`);
      loadProposals();
    } catch (error: any) {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this proposal?')) {
      return;
    }

    try {
      await deleteProposal(id);
      toast.success('Proposal deleted');
      loadProposals();
    } catch (error: any) {
      toast.error('Failed to delete proposal');
    }
  };

  const viewProposal = (proposal: Proposal) => {
    setSelectedProposal(proposal);
    setView('detail');
  };

  if (view === 'create') {
    return (
      <ProposalGenerator
        onSuccess={() => {
          setView('list');
          loadProposals();
        }}
        onBack={() => setView('list')}
      />
    );
  }

  if (view === 'detail' && selectedProposal) {
    return (
      <div className="min-h-screen bg-black p-6">
        <div className="max-w-5xl mx-auto">
          <div className="bg-neutral-900 rounded-lg p-8 border border-neutral-800">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">{selectedProposal.project_name}</h2>
                <p className="text-neutral-400">Client: {selectedProposal.client_name}</p>
                <p className="text-sm text-neutral-500 mt-1">
                  Created: {new Date(selectedProposal.created_at).toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded text-sm font-medium ${
                    selectedProposal.status === 'accepted'
                      ? 'bg-green-900 text-green-300'
                      : selectedProposal.status === 'sent'
                      ? 'bg-blue-900 text-blue-300'
                      : selectedProposal.status === 'rejected'
                      ? 'bg-red-900 text-red-300'
                      : 'bg-neutral-800 text-neutral-300'
                  }`}
                >
                  {selectedProposal.status}
                </span>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Proposal</h3>
                <div className="bg-neutral-950 rounded p-6 text-neutral-300 whitespace-pre-wrap">
                  {selectedProposal.generated_proposal}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Invoice</h3>
                <div className="bg-neutral-950 rounded p-6">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-neutral-500">Invoice Number</p>
                      <p className="text-white font-medium">{selectedProposal.invoice_data?.invoiceNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Total Amount</p>
                      <p className="text-white font-medium text-xl">
                        ${selectedProposal.invoice_data?.total?.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {selectedProposal.invoice_data?.milestones && (
                    <div>
                      <p className="text-sm text-neutral-500 mb-2">Milestones</p>
                      <div className="space-y-3">
                        {selectedProposal.invoice_data.milestones.map((milestone: any, index: number) => (
                          <div key={index} className="border-l-2 border-orange-500 pl-4">
                            <p className="text-white font-medium">{milestone.phase}</p>
                            <p className="text-sm text-neutral-400">Timeline: {milestone.timeline}</p>
                            <p className="text-sm text-neutral-400">
                              Payment: ${milestone.payment?.toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={() => setView('list')} variant="outline" className="flex-1">
                  Back to List
                </Button>

                {selectedProposal.status === 'draft' && (
                  <Button
                    onClick={() => handleStatusUpdate(selectedProposal.id, 'sent')}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Mark as Sent
                  </Button>
                )}

                {selectedProposal.status === 'sent' && (
                  <>
                    <Button
                      onClick={() => handleStatusUpdate(selectedProposal.id, 'accepted')}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Mark Accepted
                    </Button>
                    <Button
                      onClick={() => handleStatusUpdate(selectedProposal.id, 'rejected')}
                      className="flex-1 bg-red-600 hover:bg-red-700"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Mark Rejected
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Client Proposals</h1>
            <p className="text-neutral-400">AI-generated proposals with invoices</p>
          </div>

          <Button onClick={() => setView('create')} className="bg-orange-600 hover:bg-orange-700">
            <Plus className="w-4 h-4 mr-2" />
            New Proposal
          </Button>
        </div>

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setFilter('')}
            className={`px-4 py-2 rounded ${
              filter === '' ? 'bg-orange-600 text-white' : 'bg-neutral-800 text-neutral-300'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('draft')}
            className={`px-4 py-2 rounded ${
              filter === 'draft' ? 'bg-orange-600 text-white' : 'bg-neutral-800 text-neutral-300'
            }`}
          >
            Drafts
          </button>
          <button
            onClick={() => setFilter('sent')}
            className={`px-4 py-2 rounded ${
              filter === 'sent' ? 'bg-orange-600 text-white' : 'bg-neutral-800 text-neutral-300'
            }`}
          >
            Sent
          </button>
          <button
            onClick={() => setFilter('accepted')}
            className={`px-4 py-2 rounded ${
              filter === 'accepted' ? 'bg-orange-600 text-white' : 'bg-neutral-800 text-neutral-300'
            }`}
          >
            Accepted
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
          </div>
        ) : proposals.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="w-16 h-16 text-neutral-700 mx-auto mb-4" />
            <p className="text-neutral-400 mb-4">
              {filter ? `No ${filter} proposals found` : 'No proposals yet'}
            </p>
            <Button onClick={() => setView('create')} className="bg-orange-600 hover:bg-orange-700">
              Create Your First Proposal
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {proposals.map((proposal) => (
              <div
                key={proposal.id}
                className="bg-neutral-900 rounded-lg p-6 border border-neutral-800 hover:border-neutral-700 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white mb-1">{proposal.project_name}</h3>
                    <p className="text-neutral-400 mb-2">Client: {proposal.client_name}</p>
                    <div className="flex items-center gap-4 text-sm text-neutral-500">
                      <span>Type: {proposal.client_type}</span>
                      <span>Created: {new Date(proposal.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded text-sm font-medium ${
                        proposal.status === 'accepted'
                          ? 'bg-green-900 text-green-300'
                          : proposal.status === 'sent'
                          ? 'bg-blue-900 text-blue-300'
                          : proposal.status === 'rejected'
                          ? 'bg-red-900 text-red-300'
                          : 'bg-neutral-800 text-neutral-300'
                      }`}
                    >
                      {proposal.status}
                    </span>

                    <Button
                      onClick={() => viewProposal(proposal)}
                      variant="outline"
                      size="sm"
                      className="text-orange-500 hover:text-orange-400"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>

                    <Button
                      onClick={() => handleDelete(proposal.id)}
                      variant="outline"
                      size="sm"
                      className="text-red-500 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
