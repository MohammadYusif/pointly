import type { ReceiptData } from '@/components/receipt/ThermalReceipt';

async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateReceiptPDF(data: ReceiptData): Promise<void> {
  const { default: jsPDF } = await import('jspdf');

  const doc = new jsPDF({
    unit: 'mm',
    format: [80, 160],
  });

  let y = 6;
  const leftMargin = 4;
  const rightMargin = 76;

  // Logo
  const logoData = await loadImageAsBase64('/logos/pointlylogo.png');
  if (logoData) {
    // Logo aspect ratio is 1080x720 = 1.5:1
    doc.addImage(logoData, 'PNG', 15, y, 50, 33.3);
    y += 36;
  } else {
    doc.setFontSize(10);
    doc.text('Pointly', 40, y + 4, { align: 'center' });
    y += 10;
  }

  // Business name
  doc.setFontSize(14);
  doc.text(data.businessName, 40, y, { align: 'center' });
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
  doc.setFontSize(10);
  doc.text('Points Earned:', leftMargin, y);
  doc.text(`+${data.merchantPoints}`, rightMargin, y, { align: 'right' });
  y += 5;

  doc.setFontSize(9);
  doc.line(leftMargin, y, rightMargin, y);
  y += 5;

  // Balance
  doc.text('Store Balance:', leftMargin, y);
  doc.text(`${data.newMerchantBalance}`, rightMargin, y, { align: 'right' });
  y += 5;

  doc.line(leftMargin, y, rightMargin, y);
  y += 6;

  // Footer
  doc.setFontSize(8);
  doc.text('Thank you for your loyalty!', 40, y, { align: 'center' });

  doc.save(`receipt-${data.transactionId.slice(0, 8)}.pdf`);
}
