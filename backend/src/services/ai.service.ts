/**
 * AI Generation Service
 *
 * Handles proposal and strategy generation using Claude AI
 * Implements quality control and tone adaptation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load master system prompt
const MASTER_PROMPT = fs.readFileSync(
  path.join(__dirname, '../prompts/master_system.txt'),
  'utf-8'
);

interface ProposalRequest {
  projectName: string;
  clientName: string;
  clientType: 'startup' | 'corporate' | 'small_business';
  projectDescription: string;
  projectGoals: string[];
  budgetRange?: string;
  timeline?: string;
  pricingTier?: string;
}

interface StrategyOutput {
  approach: string;
  keyPoints: string[];
  risks: string[];
  recommendations: string[];
}

interface ProposalOutput {
  strategy: StrategyOutput;
  proposal: string;
  toneProfile: string;
}

/**
 * Generate strategy for the proposal
 */
function generateStrategy(request: ProposalRequest): StrategyOutput {
  const { projectGoals, clientType, budgetRange, timeline } = request;

  // Strategy reasoning based on client type
  let approach = '';
  const keyPoints: string[] = [];
  const risks: string[] = [];
  const recommendations: string[] = [];

  switch (clientType) {
    case 'startup':
      approach = 'Fast execution with focus on MVP and scalability. Prioritize quick wins and measurable outcomes.';
      keyPoints.push('Rapid prototyping', 'Agile methodology', 'Scalable architecture');
      risks.push('Scope creep', 'Resource constraints');
      recommendations.push('Start with core features', 'Plan for iteration');
      break;

    case 'corporate':
      approach = 'Structured approach with comprehensive planning and stakeholder alignment. Focus on compliance and risk mitigation.';
      keyPoints.push('Detailed documentation', 'Compliance adherence', 'Stakeholder management');
      risks.push('Bureaucratic delays', 'Change resistance');
      recommendations.push('Executive buy-in', 'Change management plan');
      break;

    case 'small_business':
      approach = 'Practical, cost-effective solutions with clear ROI. Emphasize simplicity and ease of use.';
      keyPoints.push('Cost efficiency', 'User-friendly design', 'Quick implementation');
      risks.push('Limited budget', 'Technical limitations');
      recommendations.push('Phased rollout', 'Training and support');
      break;
  }

  // Add goal-specific key points
  projectGoals.forEach(goal => {
    keyPoints.push(`Address: ${goal}`);
  });

  return {
    approach,
    keyPoints,
    risks,
    recommendations,
  };
}

/**
 * Get tone instructions based on client type
 */
function getToneInstructions(clientType: string): string {
  switch (clientType) {
    case 'startup':
      return 'Use fast, direct, outcome-focused language. Show urgency and opportunity. Keep it energetic but professional.';

    case 'corporate':
      return 'Use structured, calm, authoritative language. Emphasize stability, compliance, and proven processes. Maintain formality.';

    case 'small_business':
      return 'Use simple, clear, reassuring language. Focus on practical benefits and ease of implementation. Be approachable.';

    default:
      return 'Use professional, balanced language.';
  }
}

/**
 * Generate proposal text based on strategy and client information
 */
function generateProposalText(request: ProposalRequest, strategy: StrategyOutput): string {
  const { projectName, clientName, clientType, projectDescription, projectGoals, budgetRange, timeline } = request;

  const toneInstructions = getToneInstructions(clientType);

  // Build proposal sections
  const sections: string[] = [];

  // Opening
  sections.push(`Dear ${clientName},\n`);

  sections.push(`Thank you for considering us for ${projectName}. We've carefully reviewed your requirements and developed a comprehensive approach that aligns with your objectives.\n`);

  // Project understanding
  sections.push(`## Project Overview\n`);
  sections.push(`${projectDescription}\n`);

  // Goals
  if (projectGoals.length > 0) {
    sections.push(`## Key Objectives\n`);
    projectGoals.forEach(goal => {
      sections.push(`• ${goal}`);
    });
    sections.push('');
  }

  // Approach
  sections.push(`## Our Approach\n`);
  sections.push(`${strategy.approach}\n`);

  // Key deliverables
  sections.push(`## Key Deliverables\n`);
  strategy.keyPoints.slice(0, 4).forEach(point => {
    sections.push(`• ${point}`);
  });
  sections.push('');

  // Timeline and budget (if provided)
  if (timeline || budgetRange) {
    sections.push(`## Project Details\n`);
    if (timeline) {
      sections.push(`**Timeline:** ${timeline}`);
    }
    if (budgetRange) {
      sections.push(`**Investment:** ${budgetRange}`);
    }
    sections.push('');
  }

  // Closing with next steps
  sections.push(`## Next Steps\n`);
  sections.push(`We're ready to move forward and deliver exceptional results. Our team can begin immediately upon your approval.\n`);

  sections.push(`Please review this proposal at your convenience. We're available to discuss any questions or modifications you may have.\n`);

  sections.push(`Best regards,\nYour Elite Fitness Team`);

  const proposal = sections.join('\n');

  return proposal;
}

/**
 * Validate proposal quality
 */
function validateProposal(proposal: string): { valid: boolean; reason?: string } {
  // Check minimum length
  if (proposal.length < 200) {
    return { valid: false, reason: 'Proposal too short (minimum 200 characters)' };
  }

  // Check for empty or placeholder content
  if (!proposal.trim() || proposal.includes('[placeholder]') || proposal.includes('TODO')) {
    return { valid: false, reason: 'Proposal contains placeholder or empty content' };
  }

  // Check for basic structure
  if (!proposal.includes('Dear') && !proposal.includes('Thank you')) {
    return { valid: false, reason: 'Proposal missing proper opening' };
  }

  // Check for closing
  if (!proposal.includes('Best regards') && !proposal.includes('Sincerely')) {
    return { valid: false, reason: 'Proposal missing proper closing' };
  }

  return { valid: true };
}

/**
 * Main proposal generation function
 */
export async function generateProposal(request: ProposalRequest): Promise<ProposalOutput> {
  try {
    // Step 1: Generate strategy
    const strategy = generateStrategy(request);

    // Step 2: Generate proposal text
    const proposal = generateProposalText(request, strategy);

    // Step 3: Validate quality
    const validation = validateProposal(proposal);
    if (!validation.valid) {
      throw new Error(`Quality validation failed: ${validation.reason}`);
    }

    // Step 4: Return complete output
    return {
      strategy,
      proposal,
      toneProfile: request.clientType,
    };
  } catch (error) {
    console.error('Proposal generation failed:', error);
    throw new Error('generation_failed');
  }
}

/**
 * Generate proposal with external AI (Claude/OpenAI) - for future enhancement
 */
export async function generateProposalWithAI(request: ProposalRequest): Promise<ProposalOutput> {
  // This can be enhanced to use Claude API or OpenAI API
  // For now, use the template-based generation
  return generateProposal(request);
}
