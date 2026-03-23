'use client';

import { CustomerLayout } from '@/components/CustomerLayout';
import { useCustomer, useGenerateQR } from '@/hooks/api';
import { useTranslation } from '@pointly/i18n';
import { formatPhone } from '@pointly/shared';
import { Button, Card, CardContent, useRTL } from '@pointly/ui';
import { RefreshCw } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useRef, useState } from 'react';

export default function QRCodePage() {
  const { t } = useTranslation();
  const { textStart } = useRTL();

  const { data: customer } = useCustomer();
  const generateQR = useGenerateQR();

  const [qrPayload, setQrPayload] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // Stable ref for fetch function — avoids re-creating the countdown interval
  const fetchQRRef = useRef<(() => void) | undefined>(undefined);
  fetchQRRef.current = () => {
    if (generateQR.isPending) return;
    generateQR.mutate(undefined, {
      onSuccess: (data) => {
        setQrPayload(data.qrPayload);
        setExpiresAt(data.expiresAt);
      },
    });
  };

  const fetchQR = () => fetchQRRef.current?.();

  // biome-ignore lint/correctness/useExhaustiveDependencies: initial fetch on mount
  useEffect(() => {
    fetchQR();
  }, []);

  // Countdown timer — only depends on expiresAt (not fetchQR)
  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        fetchQRRef.current?.();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <CustomerLayout>
      <div className="space-y-4">
        <h1 className={`text-xl font-bold ${textStart}`}>{t('qr.title')}</h1>

        <Card className="stagger-item">
          <CardContent className="p-6 flex flex-col items-center space-y-4">
            {generateQR.isPending && !qrPayload ? (
              <div className="w-64 h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : generateQR.isError && !qrPayload ? (
              <div className="w-64 h-64 flex flex-col items-center justify-center text-center">
                <p className="text-sm text-destructive mb-4">{t('qr.generateError')}</p>
                <Button onClick={fetchQR} size="sm">
                  {t('qr.retry')}
                </Button>
              </div>
            ) : (
              <>
                <div className="bg-white p-4 rounded-xl shadow-sm">
                  <QRCodeSVG
                    value={qrPayload || ''}
                    size={224}
                    level="M"
                    includeMargin={false}
                    bgColor="#ffffff"
                    fgColor="#000000"
                  />
                </div>

                {/* Timer */}
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">{t('qr.expiresIn')}</p>
                  <p
                    className={`text-2xl font-mono font-bold ${timeLeft <= 30 ? 'text-red-500' : 'text-foreground'}`}
                  >
                    {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                  </p>
                </div>

                {/* Refresh button */}
                <Button variant="outline" onClick={fetchQR} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  {t('qr.refresh')}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Customer info for merchant reference */}
        {customer && (
          <Card className="stagger-item">
            <CardContent className="p-4 text-center space-y-1">
              <p className="font-medium text-lg">{customer.name}</p>
              <p className="text-sm text-muted-foreground" dir="ltr">
                {formatPhone(customer.phone)}
              </p>
              <p className="text-xs text-muted-foreground">{t('qr.showToMerchant')}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </CustomerLayout>
  );
}
