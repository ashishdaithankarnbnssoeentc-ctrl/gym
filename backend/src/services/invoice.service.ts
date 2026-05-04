/**
 * Invoice Generation Service
 *
 * Generates structured invoices with milestones
 */

interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface Milestone {
  phase: string;
  deliverables: string[];
  timeline: string;
  payment: number;
}

interface InvoiceData {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  items: InvoiceItem[];
  milestones: Milestone[];
  subtotal: number;
  tax: number;
  total: number;
  paymentTerms: string;
}

const PRICING_TIERS = {
  basic: {
    name: 'Basic Package',
    amount: 5000,
    description: 'Essential features and core functionality',
  },
  professional: {
    name: 'Professional Package',
    amount: 15000,
    description: 'Advanced features with customization',
  },
  enterprise: {
    name: 'Enterprise Package',
    amount: 35000,
    description: 'Full-featured solution with dedicated support',
  },
};

/**
 * Generate invoice number
 */
function generateInvoiceNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `INV-${year}${month}-${random}`;
}

/**
 * Calculate due date (30 days from now)
 */
function calculateDueDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().split('T')[0];
}

/**
 * Generate milestones based on pricing tier
 */
function generateMilestones(tier: keyof typeof PRICING_TIERS, clientType: string): Milestone[] {
  const tierInfo = PRICING_TIERS[tier];
  const baseAmount = tierInfo.amount;

  const milestones: Milestone[] = [];

  if (clientType === 'startup') {
    // Fast, phased approach
    milestones.push({
      phase: 'Phase 1: MVP Development',
      deliverables: ['Core features', 'Basic UI/UX', 'Initial testing'],
      timeline: '2-3 weeks',
      payment: baseAmount * 0.4,
    });
    milestones.push({
      phase: 'Phase 2: Enhancement & Launch',
      deliverables: ['Additional features', 'Optimization', 'Deployment'],
      timeline: '2-3 weeks',
      payment: baseAmount * 0.4,
    });
    milestones.push({
      phase: 'Phase 3: Post-Launch Support',
      deliverables: ['Bug fixes', 'Performance tuning', 'Documentation'],
      timeline: '1-2 weeks',
      payment: baseAmount * 0.2,
    });
  } else if (clientType === 'corporate') {
    // Structured, comprehensive approach
    milestones.push({
      phase: 'Phase 1: Planning & Design',
      deliverables: ['Requirements analysis', 'Architecture design', 'Stakeholder approval'],
      timeline: '3-4 weeks',
      payment: baseAmount * 0.25,
    });
    milestones.push({
      phase: 'Phase 2: Development',
      deliverables: ['Core implementation', 'Integration', 'Testing'],
      timeline: '6-8 weeks',
      payment: baseAmount * 0.5,
    });
    milestones.push({
      phase: 'Phase 3: Deployment & Training',
      deliverables: ['Production deployment', 'User training', 'Documentation'],
      timeline: '2-3 weeks',
      payment: baseAmount * 0.25,
    });
  } else {
    // Small business - simple, practical
    milestones.push({
      phase: 'Phase 1: Setup & Development',
      deliverables: ['Initial setup', 'Core features', 'Basic design'],
      timeline: '2-3 weeks',
      payment: baseAmount * 0.5,
    });
    milestones.push({
      phase: 'Phase 2: Launch & Support',
      deliverables: ['Final testing', 'Deployment', 'Training'],
      timeline: '1-2 weeks',
      payment: baseAmount * 0.5,
    });
  }

  return milestones;
}

/**
 * Generate invoice data
 */
export function generateInvoice(
  tier: keyof typeof PRICING_TIERS,
  clientType: string,
  projectName: string
): InvoiceData {
  const tierInfo = PRICING_TIERS[tier];
  const amount = tierInfo.amount;

  const items: InvoiceItem[] = [
    {
      description: `${projectName} - ${tierInfo.name}`,
      quantity: 1,
      rate: amount,
      amount: amount,
    },
  ];

  const subtotal = amount;
  const tax = 0; // Can be calculated based on location
  const total = subtotal + tax;

  const milestones = generateMilestones(tier, clientType);

  return {
    invoiceNumber: generateInvoiceNumber(),
    date: new Date().toISOString().split('T')[0],
    dueDate: calculateDueDate(),
    items,
    milestones,
    subtotal,
    tax,
    total,
    paymentTerms: 'Payment due within 30 days. Milestone payments as outlined above.',
  };
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}
