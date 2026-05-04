import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Loader2, FileText, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { createProposal } from '../services/proposalsService';

interface ProposalGeneratorProps {
  onSuccess?: (proposal: any) => void;
  onBack?: () => void;
}

export function ProposalGenerator({ onSuccess, onBack }: ProposalGeneratorProps) {
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [proposal, setProposal] = useState<any>(null);

  const [formData, setFormData] = useState({
    project_name: '',
    client_name: '',
    client_type: 'small_business' as 'startup' | 'corporate' | 'small_business',
    client_industry: '',
    project_description: '',
    project_goals: '',
    budget_range: '',
    timeline: '',
    pricing_tier: 'professional' as 'basic' | 'professional' | 'enterprise',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setGenerated(false);

    try {
      // Parse project goals (comma-separated)
      const goalsArray = formData.project_goals
        .split(',')
        .map(g => g.trim())
        .filter(g => g.length > 0);

      if (goalsArray.length === 0) {
        toast.error('Please add at least one project goal');
        setLoading(false);
        return;
      }

      const proposalData = await createProposal({
        ...formData,
        project_goals: goalsArray,
      });

      setProposal(proposalData);
      setGenerated(true);
      toast.success('Proposal generated successfully!');

      if (onSuccess) {
        onSuccess(proposalData);
      }
    } catch (error: any) {
      toast.error('Failed to generate proposal', {
        description: error.message || 'Please try again',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (generated && proposal) {
    return (
      <div className="min-h-screen bg-black p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-neutral-900 rounded-lg p-8 border border-neutral-800">
            <div className="flex items-center gap-3 mb-6">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <h2 className="text-2xl font-bold text-white">Proposal Generated!</h2>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Project: {proposal.project_name}</h3>
                <p className="text-neutral-400">Client: {proposal.client_name}</p>
              </div>

              <div>
                <h4 className="font-medium text-white mb-2">Proposal Preview</h4>
                <div className="bg-neutral-950 rounded p-4 text-neutral-300 whitespace-pre-wrap max-h-96 overflow-y-auto">
                  {proposal.proposal}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-white mb-2">Invoice Summary</h4>
                <div className="bg-neutral-950 rounded p-4">
                  <p className="text-neutral-300">
                    Total: ${proposal.invoice?.total?.toLocaleString() || '0'}
                  </p>
                  <p className="text-sm text-neutral-500 mt-2">
                    Invoice #{proposal.invoice?.invoiceNumber}
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={() => {
                    setGenerated(false);
                    setProposal(null);
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Generate Another
                </Button>
                {onBack && (
                  <Button onClick={onBack} className="flex-1 bg-orange-600 hover:bg-orange-700">
                    View All Proposals
                  </Button>
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
      <div className="max-w-3xl mx-auto">
        <div className="bg-neutral-900 rounded-lg p-8 border border-neutral-800">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="w-8 h-8 text-orange-500" />
            <h2 className="text-2xl font-bold text-white">Generate Client Proposal</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Project Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Project Information</h3>

              <div>
                <Label htmlFor="project_name" className="text-neutral-300">
                  Project Name *
                </Label>
                <Input
                  id="project_name"
                  name="project_name"
                  value={formData.project_name}
                  onChange={handleChange}
                  required
                  className="bg-neutral-950 border-neutral-800 text-white"
                  placeholder="Website Redesign"
                />
              </div>

              <div>
                <Label htmlFor="client_name" className="text-neutral-300">
                  Client Name *
                </Label>
                <Input
                  id="client_name"
                  name="client_name"
                  value={formData.client_name}
                  onChange={handleChange}
                  required
                  className="bg-neutral-950 border-neutral-800 text-white"
                  placeholder="Acme Corporation"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="client_type" className="text-neutral-300">
                    Client Type *
                  </Label>
                  <select
                    id="client_type"
                    name="client_type"
                    value={formData.client_type}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="startup">Startup</option>
                    <option value="corporate">Corporate</option>
                    <option value="small_business">Small Business</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="client_industry" className="text-neutral-300">
                    Industry
                  </Label>
                  <Input
                    id="client_industry"
                    name="client_industry"
                    value={formData.client_industry}
                    onChange={handleChange}
                    className="bg-neutral-950 border-neutral-800 text-white"
                    placeholder="Technology"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="project_description" className="text-neutral-300">
                  Project Description *
                </Label>
                <textarea
                  id="project_description"
                  name="project_description"
                  value={formData.project_description}
                  onChange={handleChange}
                  required
                  rows={4}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Describe the project scope and requirements..."
                />
              </div>

              <div>
                <Label htmlFor="project_goals" className="text-neutral-300">
                  Project Goals * (comma-separated)
                </Label>
                <Input
                  id="project_goals"
                  name="project_goals"
                  value={formData.project_goals}
                  onChange={handleChange}
                  required
                  className="bg-neutral-950 border-neutral-800 text-white"
                  placeholder="Increase conversions, Improve UX, Modernize design"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="budget_range" className="text-neutral-300">
                    Budget Range
                  </Label>
                  <Input
                    id="budget_range"
                    name="budget_range"
                    value={formData.budget_range}
                    onChange={handleChange}
                    className="bg-neutral-950 border-neutral-800 text-white"
                    placeholder="$10,000 - $25,000"
                  />
                </div>

                <div>
                  <Label htmlFor="timeline" className="text-neutral-300">
                    Timeline
                  </Label>
                  <Input
                    id="timeline"
                    name="timeline"
                    value={formData.timeline}
                    onChange={handleChange}
                    className="bg-neutral-950 border-neutral-800 text-white"
                    placeholder="6-8 weeks"
                  />
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Pricing</h3>

              <div>
                <Label htmlFor="pricing_tier" className="text-neutral-300">
                  Pricing Tier *
                </Label>
                <select
                  id="pricing_tier"
                  name="pricing_tier"
                  value={formData.pricing_tier}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="basic">Basic - $5,000</option>
                  <option value="professional">Professional - $15,000</option>
                  <option value="enterprise">Enterprise - $35,000</option>
                </select>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-4 pt-4">
              {onBack && (
                <Button
                  type="button"
                  onClick={onBack}
                  variant="outline"
                  className="flex-1"
                  disabled={loading}
                >
                  Back
                </Button>
              )}
              <Button
                type="submit"
                className="flex-1 bg-orange-600 hover:bg-orange-700"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate Proposal'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
