'use client';

import { useTranslation } from '@pointly/i18n';
import { Card, CardContent } from '@pointly/ui';

interface DecayWarningProps {
  nextDecayDate: string;
  globalPointsBalance: number;
  isDecayImmune: boolean;
  decayPhase: number;
}

export function DecayWarning({
  nextDecayDate,
  globalPointsBalance,
  isDecayImmune,
  decayPhase,
}: DecayWarningProps) {
  const { t } = useTranslation();

  if (isDecayImmune) {
    return (
      <Card className="stagger-item border-green-300 bg-green-50">
        <CardContent className="p-4">
          <p className="text-sm text-green-800">{t('expiry.noExpiry')}</p>
        </CardContent>
      </Card>
    );
  }

  if (decayPhase === 0 || globalPointsBalance === 0) {
    return null;
  }

  const daysUntilDecay = Math.max(
    0,
    Math.floor((new Date(nextDecayDate).getTime() - Date.now()) / 86400000),
  );

  const isUrgent = decayPhase >= 2;
  const borderColor = isUrgent ? 'border-red-300 bg-red-50' : 'border-amber-300 bg-amber-50';
  const textColor = isUrgent ? 'text-red-800' : 'text-amber-800';

  return (
    <Card className={`stagger-item ${borderColor}`}>
      <CardContent className="p-4">
        <p className={`text-sm ${textColor}`}>
          {daysUntilDecay <= 0
            ? t('expiry.pointsExpireToday')
            : `${t('expiry.pointsExpireIn')} ${daysUntilDecay} ${daysUntilDecay === 1 ? t('expiry.day') : t('expiry.days')}. ${t('expiry.resetHint')}`}
        </p>
      </CardContent>
    </Card>
  );
}
