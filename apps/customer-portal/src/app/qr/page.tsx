'use client';

import { CustomerLayout } from '@/components/CustomerLayout';
import { generateQRCode, getCustomer } from '@/lib/api';
import { useTranslation } from '@pointly/i18n';
import { Card, CardContent, useRTL } from '@pointly/ui';
import { RefreshCw } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useCallback, useEffect, useState } from 'react';

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: QR page with loading/error/timer states
export default function QRCodePage() {
  const { language } = useTranslation();
  const { textStart } = useRTL();

  const [qrPayload, setQrPayload] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // biome-ignore lint/suspicious/noExplicitAny: API response shape varies
  const [customer, setCustomer] = useState<any>(null);

  const fetchQR = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [qrData, custData] = await Promise.all([
        generateQRCode(),
        customer ? Promise.resolve(customer) : getCustomer('me'),
      ]);
      setQrPayload(qrData.qrPayload);
      setExpiresAt(qrData.expiresAt);
      if (!customer) setCustomer(custData);
    } catch {
      setError(
        language === 'ar'
          ? 'فشل في إنشاء رمز QR. حاول مرة أخرى.'
          : 'Failed to generate QR code. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }, [customer, language]);

  useEffect(() => {
    fetchQR();
  }, [fetchQR]);

  // Countdown timer
  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        fetchQR();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, fetchQR]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <CustomerLayout>
      <div className="space-y-4">
        <h1 className={`text-xl font-bold ${textStart}`}>
          {language === 'ar' ? 'رمز QR الخاص بك' : 'Your QR Code'}
        </h1>

        <Card>
          <CardContent className="p-6 flex flex-col items-center space-y-4">
            {loading ? (
              <div className="w-64 h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#08b0a2]" />
              </div>
            ) : error ? (
              <div className="w-64 h-64 flex flex-col items-center justify-center text-center">
                <p className="text-sm text-destructive mb-4">{error}</p>
                <button
                  type="button"
                  onClick={fetchQR}
                  className="px-4 py-2 bg-[#08b0a2] text-white rounded-md text-sm font-medium"
                >
                  {language === 'ar' ? 'إعادة المحاولة' : 'Retry'}
                </button>
              </div>
            ) : (
              <>
                <div className="bg-white p-4 rounded-xl">
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
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'ينتهي خلال' : 'Expires in'}
                  </p>
                  <p
                    className={`text-2xl font-mono font-bold ${timeLeft <= 30 ? 'text-red-500' : 'text-foreground'}`}
                  >
                    {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                  </p>
                </div>

                {/* Refresh button */}
                <button
                  type="button"
                  onClick={fetchQR}
                  className="flex items-center gap-2 px-4 py-2 border border-border rounded-md text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  {language === 'ar' ? 'تحديث' : 'Refresh'}
                </button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Customer info for merchant reference */}
        {customer && (
          <Card>
            <CardContent className="p-4 text-center space-y-1">
              <p className="font-medium text-lg">{customer.name}</p>
              <p className="text-sm text-muted-foreground" dir="ltr">
                {customer.phone}
              </p>
              <p className="text-xs text-muted-foreground">
                {language === 'ar'
                  ? 'أظهر هذا الرمز للتاجر عند الدفع'
                  : 'Show this code to the merchant at checkout'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </CustomerLayout>
  );
}
