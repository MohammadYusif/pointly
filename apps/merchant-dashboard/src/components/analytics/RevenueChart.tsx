'use client';

import type { AnalyticsDataPoint } from '@/types/api';
import { useTranslation } from '@pointly/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@pointly/ui';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface RevenueChartProps {
  data: AnalyticsDataPoint[];
  loading?: boolean;
}

export function RevenueChart({ data, loading }: RevenueChartProps) {
  const { t, language } = useTranslation();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm md:text-base">
            {language === 'ar' ? 'الإيرادات' : 'Revenue'}
          </CardTitle>
        </CardHeader>
        <CardContent className="h-75 flex items-center justify-center">
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((d) => ({
    period: formatPeriodLabel(d.period, language),
    revenue: d.revenue,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm md:text-base">
          {language === 'ar' ? 'الإيرادات' : 'Revenue (SAR)'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div dir="ltr" className="h-75">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="period" fontSize={12} tickLine={false} />
              <YAxis fontSize={12} tickLine={false} />
              <Tooltip
                formatter={(value) =>
                  new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-SA', {
                    style: 'currency',
                    currency: 'SAR',
                  }).format(Number(value))
                }
              />
              <Area
                type="monotone"
                dataKey="revenue"
                name={language === 'ar' ? 'الإيرادات' : 'Revenue'}
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#revenueGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function formatPeriodLabel(period: string, language: string): string {
  try {
    const date = new Date(period);
    return new Intl.DateTimeFormat(language === 'ar' ? 'ar-SA' : 'en-SA', {
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch {
    return period;
  }
}
