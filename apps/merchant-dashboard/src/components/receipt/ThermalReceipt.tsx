'use client';

'use client';

export interface ReceiptData {
  transactionId: string;
  businessName: string;
  customerName: string;
  customerPhone: string;
  amount: number;
  merchantPoints: number;
  newMerchantBalance: number;
  currentTier: string;
  date: Date;
}

export function ThermalReceipt(props: ReceiptData) {
  const {
    transactionId,
    businessName,
    customerName,
    customerPhone,
    amount,
    merchantPoints,
    newMerchantBalance,
    currentTier,
    date,
  } = props;

  return (
    <div
      className="receipt-printable"
      style={{ width: '80mm', fontFamily: 'monospace', fontSize: '12px', padding: '4mm' }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        {/* biome-ignore lint/a11y/useAltText: receipt logo */}
        <img
          src="/logos/pointlylogo.png"
          style={{ width: '40mm', margin: '0 auto 4px', display: 'block' }}
        />
        <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{businessName}</div>
      </div>

      <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

      {/* Date & Transaction ID */}
      <div style={{ fontSize: '10px' }}>
        <div>{date.toLocaleString('en-SA')}</div>
        <div>TXN: {transactionId.slice(0, 12)}...</div>
      </div>

      <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

      {/* Customer */}
      <div>
        <div>{customerName}</div>
        <div style={{ direction: 'ltr' }}>{customerPhone}</div>
        <div>Tier: {currentTier}</div>
      </div>

      <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

      {/* Purchase */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Amount:</span>
          <span>{amount.toFixed(2)} SAR</span>
        </div>
      </div>

      <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

      {/* Points */}
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontWeight: 'bold',
          }}
        >
          <span>Points Earned:</span>
          <span>+{merchantPoints}</span>
        </div>
      </div>

      <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

      {/* Balance */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Store Balance:</span>
          <span>{newMerchantBalance}</span>
        </div>
      </div>

      <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

      {/* Footer */}
      <div style={{ textAlign: 'center', fontSize: '10px', color: '#666', marginTop: '8px' }}>
        <div>Thank you for your loyalty!</div>
        <div>شكراً لولائكم</div>
      </div>
    </div>
  );
}
