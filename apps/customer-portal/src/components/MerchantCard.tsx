'use client';

import { useTranslation } from '@pointly/i18n';
import type { PublicMerchantSummary } from '@pointly/shared';
import { CUSTOMER_TIERS, getTierColor } from '@pointly/shared';
import { Button, Card, CardContent, cn } from '@pointly/ui';
import { MapPin, Users } from 'lucide-react';
import Link from 'next/link';

interface MerchantCardProps {
  merchant: PublicMerchantSummary;
  isEnrolled: boolean;
  onEnroll: () => void;
  isEnrolling: boolean;
}

function getTierBgColor(tier: string): string {
  const upper = tier.toUpperCase();
  const found = CUSTOMER_TIERS[upper as keyof typeof CUSTOMER_TIERS];
  if (found) return found.color;
  return CUSTOMER_TIERS.BRONZE.color;
}

export function MerchantCard({ merchant, isEnrolled, onEnroll, isEnrolling }: MerchantCardProps) {
  const { t } = useTranslation();

  const tierColor = getTierColor(merchant.tier);
  const tierBg = getTierBgColor(merchant.tier);
  const tierLabel = merchant.tier.charAt(0).toUpperCase() + merchant.tier.slice(1).toLowerCase();

  return (
    <Card className="merchant-card stagger-item">
      <CardContent className="p-4 space-y-3">
        {/* Header: Name + Tier Badge */}
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/merchants/${merchant.merchantId}`}
            className="text-base font-bold text-foreground hover:text-primary transition-colors"
          >
            {merchant.businessName}
          </Link>
          <span
            className={cn('text-xs font-semibold px-2 py-0.5 rounded-full shrink-0', tierColor)}
            style={{ backgroundColor: `${tierBg}20` }}
          >
            {tierLabel}
          </span>
        </div>

        {/* Loyalty Config Preview */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {merchant.loyaltyConfig.pointsPerSAR} {t('merchants.pointsPerSAR')}
          </span>
          {merchant.loyaltyConfig.welcomeBonus > 0 && (
            <span>
              {t('merchants.welcomeBonus')}: {merchant.loyaltyConfig.welcomeBonus}
            </span>
          )}
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {merchant.locations.length} {t('merchants.locations')}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {merchant.totalCustomers} {t('merchants.customers')}
          </span>
        </div>

        {/* Enroll / Enrolled */}
        <div className="flex items-center justify-between pt-1">
          <Link
            href={`/merchants/${merchant.merchantId}`}
            className="text-xs text-primary hover:underline"
          >
            {t('merchants.viewDetails')}
          </Link>
          {isEnrolled ? (
            <Button variant="outline" size="sm" disabled className="text-xs">
              {t('merchants.enrolled')}
            </Button>
          ) : (
            <Button size="sm" onClick={onEnroll} disabled={isEnrolling} className="text-xs">
              {isEnrolling ? t('merchants.joining') : t('merchants.join')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
