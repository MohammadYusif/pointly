'use client';

import type { CustomerResponse } from '@pointly/shared';
import { useMemo } from 'react';

export interface Badge {
  id: string;
  nameKey: string;
  descKey: string;
  icon: string;
  isEarned: boolean;
  progress?: number;
  progressMax?: number;
}

export function useBadges(customer: CustomerResponse | undefined): Badge[] {
  return useMemo(() => {
    if (!customer) return [];

    const enrollments = customer.enrollments ?? [];
    const totalTxCount = enrollments.reduce((sum, e) => sum + (e.transactionCount || 0), 0);

    return [
      {
        id: 'first-purchase',
        nameKey: 'badges.firstPurchase',
        descKey: 'badges.firstPurchaseDesc',
        icon: 'ShoppingBag',
        isEarned: customer.globalLifetimePoints > 0,
      },
      {
        id: 'century-club',
        nameKey: 'badges.centuryClub',
        descKey: 'badges.centuryClubDesc',
        icon: 'Hash',
        isEarned: totalTxCount >= 100,
        progress: Math.min(totalTxCount, 100),
        progressMax: 100,
      },
      {
        id: 'network-builder',
        nameKey: 'badges.networkBuilder',
        descKey: 'badges.networkBuilderDesc',
        icon: 'Users',
        isEarned: enrollments.length >= 5,
        progress: Math.min(enrollments.length, 5),
        progressMax: 5,
      },
      {
        id: 'gold-member',
        nameKey: 'badges.goldMember',
        descKey: 'badges.goldMemberDesc',
        icon: 'Award',
        isEarned: ['GOLD', 'PLATINUM', 'DIAMOND'].includes(customer.currentTier.toUpperCase()),
      },
      {
        id: 'platinum-elite',
        nameKey: 'badges.platinumElite',
        descKey: 'badges.platinumEliteDesc',
        icon: 'Crown',
        isEarned: ['PLATINUM', 'DIAMOND'].includes(customer.currentTier.toUpperCase()),
      },
      {
        id: 'diamond-legend',
        nameKey: 'badges.diamondLegend',
        descKey: 'badges.diamondLegendDesc',
        icon: 'Gem',
        isEarned: customer.currentTier.toUpperCase() === 'DIAMOND',
      },
      {
        id: 'big-spender',
        nameKey: 'badges.bigSpender',
        descKey: 'badges.bigSpenderDesc',
        icon: 'TrendingUp',
        isEarned: customer.globalLifetimePoints >= 10000,
        progress: Math.min(customer.globalLifetimePoints, 10000),
        progressMax: 10000,
      },
    ];
  }, [customer]);
}
