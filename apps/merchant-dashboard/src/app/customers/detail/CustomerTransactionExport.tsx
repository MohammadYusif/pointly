'use client';

import type { TransactionResponse } from '@/types/api';
import { useTranslation } from '@pointly/i18n';
import { Button } from '@pointly/ui';
import { Download } from 'lucide-react';

function getAmount(amount: unknown): number {
  if (typeof amount === 'number') return amount;
  if (amount && typeof amount === 'object' && 'amount' in amount) {
    return (amount as { amount: number }).amount;
  }
  return 0;
}

interface CustomerTransactionExportProps {
  allTransactions: TransactionResponse[];
  customerId: string;
  locationNames: Record<string, string>;
}

export function CustomerTransactionExport({
  allTransactions,
  customerId,
  locationNames,
}: CustomerTransactionExportProps) {
  const { t } = useTranslation();

  const handleExport = () => {
    const headers = ['Date', 'ID', 'Type', 'Points', 'Amount (SAR)', 'Status', 'Location'];
    const rows = allTransactions.map((tx) => [
      new Date(tx.createdAt).toISOString(),
      tx.transactionId,
      tx.type,
      tx.points,
      getAmount(tx.amount),
      tx.status,
      tx.locationId ? locationNames[tx.locationId] || tx.locationId : '',
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customer_${customerId}_transactions.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={allTransactions.length === 0}
    >
      <Download className="h-4 w-4 me-1" />
      {t('customer.exportCSV')}
    </Button>
  );
}
