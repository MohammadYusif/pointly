'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@pointly/ui';
import type { ReactNode } from 'react';

interface KPICardProps {
  title: string;
  value: string;
  icon?: ReactNode;
  loading?: boolean;
}

export function KPICard({ title, value, icon, loading }: KPICardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 md:px-6">
        <CardTitle className="text-xs md:text-sm font-medium">{title}</CardTitle>
        {icon && <div className="h-4 w-4 text-muted-foreground shrink-0">{icon}</div>}
      </CardHeader>
      <CardContent className="px-3 md:px-6">
        <div className="text-lg md:text-2xl font-bold truncate">{loading ? '...' : value}</div>
      </CardContent>
    </Card>
  );
}
