'use client';

import { CustomerLayout } from '@/components/CustomerLayout';
import { DecayWarning } from '@/components/DecayWarning';
import { PointlyLogo } from '@/components/PointlyLogo';
import { useCustomer, useMyMerchants, useNotificationPermission } from '@/hooks/api';
import { walletApi } from '@/lib/api';
import { useTranslation } from '@pointly/i18n';
import type { CustomerEnrollment, CustomerMerchantView } from '@pointly/shared';
import {
  CUSTOMER_TIERS,
  DEFAULT_REDEMPTION_RATE,
  TIER_ORDER,
  getTierBgColor,
  getTierTarget,
} from '@pointly/shared';
import type { CustomerTierLevel } from '@pointly/shared';
import { Button, Card, CardContent, CardHeader, CardTitle, useRTL } from '@pointly/ui';
import { useState } from 'react';

type TFn = ReturnType<typeof useTranslation>['t'];

function getDecayPhaseLabel(phase: number | undefined, t: TFn): string {
  if (phase === 0) return t('wallet.phase0');
  if (phase === 1) return t('wallet.phase1');
  return t('wallet.phase2');
}

function buildMerchantMap(
  merchants: CustomerMerchantView[] | undefined,
): Record<string, CustomerMerchantView> {
  const map: Record<string, CustomerMerchantView> = {};
  if (merchants) {
    for (const m of merchants) {
      map[m.merchantId] = m;
    }
  }
  return map;
}

function WalletSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-48 skeleton rounded-3xl" />
      <div className="h-6 w-40 skeleton" />
      <div className="h-32 skeleton rounded-xl" />
      <div className="h-32 skeleton rounded-xl" />
      <div className="h-24 skeleton rounded-xl" />
    </div>
  );
}

interface MerchantCardProps {
  enrollment: CustomerEnrollment;
  merchant: CustomerMerchantView | undefined;
}

function MerchantCard({ enrollment, merchant }: MerchantCardProps) {
  const { t, formatNumber, formatCurrency } = useTranslation();
  // Each merchant configures its own point value — fall back to the
  // platform default only when the merchant record is unavailable.
  const sarValue =
    enrollment.merchantPointsBalance * (merchant?.redemptionRate ?? DEFAULT_REDEMPTION_RATE);
  const businessName = merchant?.businessName ?? enrollment.merchantId;

  const handleGoogleWallet = async () => {
    try {
      const result = await walletApi.getGoogleWalletLink(enrollment.merchantId);
      window.open(result.url, '_blank');
    } catch {
      // Wallet link not available
    }
  };

  return (
    <Card className="stagger-item">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{businessName}</p>
            <p className="text-xs text-muted-foreground">
              {formatNumber(enrollment.merchantPointsBalance)} pts &middot;{' '}
              {formatCurrency(sarValue)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <a
            href={walletApi.getApplePassUrl(enrollment.merchantId)}
            className="flex-1 inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-accent hover:text-accent-foreground"
            download
          >
            {t('wallet.addToAppleWallet')}
          </a>
          <button
            type="button"
            onClick={handleGoogleWallet}
            className="flex-1 inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-accent hover:text-accent-foreground"
          >
            {t('wallet.saveToGoogleWallet')}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

function PushNotificationsCard() {
  const { t } = useTranslation();
  const { status, isRegistering, requestPermission } = useNotificationPermission();
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone =
    typeof window !== 'undefined' &&
    'standalone' in window.navigator &&
    (window.navigator as { standalone?: boolean }).standalone === true;

  return (
    <Card className="stagger-item">
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>{t('notifications.title')}</span>
          {status === 'granted' && (
            <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-green-100 text-green-700">
              {t('notifications.enabled')}
            </span>
          )}
          {status === 'denied' && (
            <span className="text-xs font-normal text-red-600">{t('notifications.denied')}</span>
          )}
          {status === 'unsupported' && (
            <span className="text-xs font-normal text-muted-foreground">
              {t('notifications.unsupported')}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      {status === 'default' && (
        <CardContent className="space-y-3">
          {isIOS && !isStandalone ? (
            <p className="text-sm text-muted-foreground">{t('notifications.iosHint')}</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">{t('notifications.enablePrompt')}</p>
              <Button size="sm" onClick={requestPermission} disabled={isRegistering}>
                {isRegistering ? t('common.loading') : t('notifications.enable')}
              </Button>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function WalletPage() {
  const { t, formatNumber, formatDate } = useTranslation();
  const { textStart } = useRTL();
  const [showDetails, setShowDetails] = useState(false);

  const { data: customer, isLoading: customerLoading, refetch } = useCustomer();
  const { data: merchants } = useMyMerchants();

  if (customerLoading) {
    return (
      <CustomerLayout>
        <WalletSkeleton />
      </CustomerLayout>
    );
  }

  if (!customer) {
    return (
      <CustomerLayout>
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
          <p className="text-muted-foreground">{t('common.error')}</p>
          <Button variant="outline" onClick={() => refetch()} size="sm">
            {t('auth.statsRetry')}
          </Button>
        </div>
      </CustomerLayout>
    );
  }

  const tierTarget = getTierTarget(customer.currentTier);
  const progress = customer.monthlyProgress || 0;
  const progressPercent = tierTarget > 0 ? Math.min(100, (progress / tierTarget) * 100) : 100;
  const isDiamond = customer.currentTier.toUpperCase() === 'DIAMOND';
  const currentTierIndex = TIER_ORDER.indexOf(customer.currentTier as CustomerTierLevel);
  const nextTierKey = TIER_ORDER[currentTierIndex + 1];
  const nextTierName = nextTierKey ? CUSTOMER_TIERS[nextTierKey].displayName : '';
  const ptsToNext = tierTarget - progress;

  const memberYear = customer.createdAt ? customer.createdAt.split('T')[0].split('-')[0] : '';

  const merchantMap = buildMerchantMap(merchants);

  const sortedEnrollments = [...(customer.enrollments || [])].sort(
    (a, b) => (b.merchantPointsBalance || 0) - (a.merchantPointsBalance || 0),
  );

  const decayPhaseLabel = getDecayPhaseLabel(customer.globalPointsDecayPhase, t);

  return (
    <CustomerLayout>
      <div className="space-y-4">
        <h1 className={`text-xl font-bold stagger-item ${textStart}`}>{t('wallet.title')}</h1>

        {/* Section 1: Pointly Card */}
        <div
          className="stagger-item w-full rounded-3xl p-5 text-white"
          style={{
            background: 'linear-gradient(135deg, #0f2744 0%, #0d9488 100%)',
            minHeight: '200px',
            aspectRatio: '1.6 / 1',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <PointlyLogo height={22} color="#ffffff" />
            <span className="text-xs text-white/70 font-medium tracking-wide">Pointly Loyalty</span>
          </div>

          <div className="mb-3">
            <p className="text-3xl font-bold leading-none">
              {formatNumber(customer.globalPointsBalance)}
            </p>
            <p className="text-sm text-white/70 mt-1">{t('wallet.globalPoints')}</p>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${getTierBgColor(customer.currentTier as CustomerTierLevel)}`}
            >
              {customer.tierDisplayName}
            </span>
            <span className="text-xs text-white/80">{customer.earningMultiplier}×</span>
          </div>

          {!isDiamond && tierTarget > 0 && (
            <div className="mb-3">
              <div className="w-full h-1.5 rounded-full bg-white/30">
                <div
                  className="h-1.5 rounded-full bg-white transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-xs text-white/70 mt-1">
                {formatNumber(Math.max(0, ptsToNext))}{' '}
                {t('wallet.ptsToNextTier', { tier: nextTierName })}
              </p>
            </div>
          )}

          <div className="flex items-end justify-between mt-auto">
            <span className="text-sm font-medium">{customer.name ?? ''}</span>
            <span className="text-xs text-white/60" suppressHydrationWarning>
              {t('wallet.memberSince', { year: memberYear })}
            </span>
          </div>
        </div>

        {/* Section 2: Your Store Cards */}
        {sortedEnrollments.length > 0 && (
          <div className="space-y-3">
            <h2 className={`text-base font-semibold ${textStart}`}>{t('wallet.topStores')}</h2>
            {sortedEnrollments.map((enrollment) => (
              <MerchantCard
                key={enrollment.merchantId}
                enrollment={enrollment}
                merchant={merchantMap[enrollment.merchantId]}
              />
            ))}
          </div>
        )}

        {/* Section 3: Push Notifications */}
        <PushNotificationsCard />

        {/* Section 4: More Details (collapsible) */}
        <div className="stagger-item">
          <button
            type="button"
            className={`text-sm font-medium text-muted-foreground flex items-center gap-1 w-full ${textStart}`}
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? `${t('wallet.lessDetails')} ▴` : `${t('wallet.moreDetails')} ▾`}
          </button>

          {showDetails && (
            <div className="space-y-3 mt-3">
              <Card>
                <CardContent className="p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('wallet.lifetimeEarned')}</span>
                    <span className="font-medium">
                      {formatNumber(customer.globalLifetimePoints)} pts
                    </span>
                  </div>
                  {customer.monthlyProgressResetAt && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('wallet.progressReset')}</span>
                      <span className="text-xs text-muted-foreground" suppressHydrationWarning>
                        {formatDate(customer.monthlyProgressResetAt)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('wallet.decayPhase')}</span>
                    <span className="font-medium">{decayPhaseLabel}</span>
                  </div>
                </CardContent>
              </Card>

              {customer.nextDecayDate && (
                <DecayWarning
                  nextDecayDate={customer.nextDecayDate}
                  globalPointsBalance={customer.globalPointsBalance}
                  isDecayImmune={customer.isDecayImmune}
                  decayPhase={customer.globalPointsDecayPhase}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}
