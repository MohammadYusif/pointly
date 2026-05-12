'use client';

import { useTranslation } from '@pointly/i18n';
import type { PublicMerchantSummary } from '@pointly/shared';
import { Button, Card, CardContent } from '@pointly/ui';
import { type BezierDefinition, motion, useReducedMotion } from 'framer-motion';
import { MapPin, Users } from 'lucide-react';
import Link from 'next/link';

const EASE: BezierDefinition = [0.16, 1, 0.3, 1];

interface MerchantCardProps {
  merchant: PublicMerchantSummary;
  isEnrolled: boolean;
  onEnroll: () => void;
  isEnrolling: boolean;
}

export function MerchantCard({ merchant, isEnrolled, onEnroll, isEnrolling }: MerchantCardProps) {
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
    >
      <Card className="merchant-card">
        <CardContent className="p-4 space-y-3">
          {/* Header: Name */}
          <div className="flex items-start justify-between gap-2">
            <Link
              href={`/merchants/${merchant.merchantId}`}
              className="text-base font-bold text-foreground hover:text-primary transition-colors"
            >
              {merchant.businessName}
            </Link>
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
              className="text-xs text-primary-accessible hover:underline"
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
    </motion.div>
  );
}
