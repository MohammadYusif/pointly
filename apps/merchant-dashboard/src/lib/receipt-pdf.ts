import type { ReceiptData } from '@/components/receipt/ThermalReceipt';
import jsPDF from 'jspdf';

export function generateReceiptPDF(data: ReceiptData): void {
  const doc = new jsPDF({
    unit: 'mm',
    format: [80, 150],
  });

  const totalPoints = data.merchantPoints + data.globalPoints;
  let y = 10;
  const leftMargin = 4;
  const rightMargin = 76;

  // Header
  doc.setFontSize(14);
  doc.text(data.businessName, 40, y, { align: 'center' });
  y += 5;
  doc.setFontSize(8);
  doc.text('Pointly Loyalty', 40, y, { align: 'center' });
  y += 6;

  // Dashed line
  doc.setLineDashPattern([1, 1], 0);
  doc.line(leftMargin, y, rightMargin, y);
  y += 5;

  // Date & Transaction
  doc.setFontSize(8);
  doc.text(data.date.toLocaleString('en-SA'), leftMargin, y);
  y += 4;
  doc.text(`TXN: ${data.transactionId.slice(0, 16)}`, leftMargin, y);
  y += 5;

  doc.line(leftMargin, y, rightMargin, y);
  y += 5;

  // Customer
  doc.setFontSize(9);
  doc.text(data.customerName, leftMargin, y);
  y += 4;
  doc.text(data.customerPhone, leftMargin, y);
  y += 4;
  doc.text(`Tier: ${data.currentTier}`, leftMargin, y);
  y += 5;

  doc.line(leftMargin, y, rightMargin, y);
  y += 5;

  // Amount
  doc.text('Amount:', leftMargin, y);
  doc.text(`${data.amount.toFixed(2)} SAR`, rightMargin, y, { align: 'right' });
  y += 5;

  doc.line(leftMargin, y, rightMargin, y);
  y += 5;

  // Points
  doc.text('Store Points:', leftMargin, y);
  doc.text(`+${data.merchantPoints}`, rightMargin, y, { align: 'right' });
  y += 4;
  doc.text('Network Points:', leftMargin, y);
  doc.text(`+${data.globalPoints}`, rightMargin, y, { align: 'right' });
  y += 4;
  doc.setFontSize(10);
  doc.text('Total Earned:', leftMargin, y);
  doc.text(`+${totalPoints}`, rightMargin, y, { align: 'right' });
  y += 5;

  doc.setFontSize(9);
  doc.line(leftMargin, y, rightMargin, y);
  y += 5;

  // Balances
  doc.text('Store Balance:', leftMargin, y);
  doc.text(`${data.newMerchantBalance}`, rightMargin, y, { align: 'right' });
  y += 4;
  doc.text('Network Balance:', leftMargin, y);
  doc.text(`${data.newGlobalBalance}`, rightMargin, y, { align: 'right' });
  y += 5;

  doc.line(leftMargin, y, rightMargin, y);
  y += 6;

  // Footer
  doc.setFontSize(8);
  doc.text('Thank you for your loyalty!', 40, y, { align: 'center' });

  doc.save(`receipt-${data.transactionId.slice(0, 8)}.pdf`);
}
