/**
 * PDF Generation Service
 *
 * Combines proposal + invoice into a professional PDF document
 * Uses PDFKit for document generation
 */

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { formatCurrency } from './invoice.service.js';

interface ProposalData {
  projectName: string;
  clientName: string;
  proposal: string;
  invoiceData: any;
  createdAt: string;
}

/**
 * Generate PDF from proposal and invoice data
 */
export async function generateProposalPDF(data: ProposalData, outputPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Create PDF document
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });

      // Create write stream
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // Add header
      doc
        .fontSize(24)
        .font('Helvetica-Bold')
        .text('Project Proposal', { align: 'center' })
        .moveDown(0.5);

      doc
        .fontSize(12)
        .font('Helvetica')
        .text(`Date: ${new Date(data.createdAt).toLocaleDateString()}`, { align: 'center' })
        .moveDown(2);

      // Add proposal content
      const proposalLines = data.proposal.split('\n');

      proposalLines.forEach(line => {
        if (line.startsWith('##')) {
          // Section header
          doc
            .moveDown(0.5)
            .fontSize(16)
            .font('Helvetica-Bold')
            .text(line.replace('##', '').trim())
            .moveDown(0.5)
            .fontSize(12)
            .font('Helvetica');
        } else if (line.startsWith('**') && line.endsWith('**')) {
          // Bold text
          doc
            .font('Helvetica-Bold')
            .text(line.replace(/\*\*/g, ''))
            .font('Helvetica');
        } else if (line.startsWith('•')) {
          // Bullet point
          doc.text(line, { indent: 20 });
        } else if (line.trim()) {
          // Normal text
          doc.text(line);
        } else {
          // Empty line
          doc.moveDown(0.5);
        }
      });

      // Add page break before invoice
      doc.addPage();

      // Add invoice section
      doc
        .fontSize(24)
        .font('Helvetica-Bold')
        .text('Invoice', { align: 'center' })
        .moveDown(2);

      // Invoice details
      const invoice = data.invoiceData;
      doc
        .fontSize(12)
        .font('Helvetica')
        .text(`Invoice Number: ${invoice.invoiceNumber}`)
        .text(`Date: ${invoice.date}`)
        .text(`Due Date: ${invoice.dueDate}`)
        .moveDown(1.5);

      // Invoice items
      doc.font('Helvetica-Bold').text('Items:', { underline: true }).moveDown(0.5);

      invoice.items.forEach((item: any) => {
        doc
          .font('Helvetica')
          .text(`${item.description}`)
          .text(`  Quantity: ${item.quantity} × ${formatCurrency(item.rate)} = ${formatCurrency(item.amount)}`)
          .moveDown(0.5);
      });

      // Totals
      doc
        .moveDown(1)
        .text(`Subtotal: ${formatCurrency(invoice.subtotal)}`, { align: 'right' })
        .text(`Tax: ${formatCurrency(invoice.tax)}`, { align: 'right' })
        .fontSize(14)
        .font('Helvetica-Bold')
        .text(`Total: ${formatCurrency(invoice.total)}`, { align: 'right' })
        .fontSize(12)
        .font('Helvetica')
        .moveDown(2);

      // Milestones
      if (invoice.milestones && invoice.milestones.length > 0) {
        doc.font('Helvetica-Bold').text('Payment Milestones:', { underline: true }).moveDown(0.5);

        invoice.milestones.forEach((milestone: any, index: number) => {
          doc
            .font('Helvetica-Bold')
            .text(`${index + 1}. ${milestone.phase}`)
            .font('Helvetica')
            .text(`   Timeline: ${milestone.timeline}`)
            .text(`   Payment: ${formatCurrency(milestone.payment)}`)
            .text(`   Deliverables:`, { continued: false });

          milestone.deliverables.forEach((deliverable: string) => {
            doc.text(`     • ${deliverable}`);
          });

          doc.moveDown(0.5);
        });
      }

      // Payment terms
      doc
        .moveDown(1)
        .font('Helvetica-Bold')
        .text('Payment Terms:', { underline: true })
        .moveDown(0.5)
        .font('Helvetica')
        .text(invoice.paymentTerms);

      // Footer
      doc
        .moveDown(2)
        .fontSize(10)
        .text('Thank you for your business!', { align: 'center' })
        .text('Elite Fitness Platform', { align: 'center' });

      // Finalize PDF
      doc.end();

      stream.on('finish', () => {
        resolve(outputPath);
      });

      stream.on('error', (error) => {
        reject(error);
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Get PDF storage path
 */
export function getPDFPath(proposalId: string): string {
  const uploadsDir = path.join(process.cwd(), 'uploads', 'proposals');

  // Ensure directory exists
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  return path.join(uploadsDir, `proposal-${proposalId}.pdf`);
}
