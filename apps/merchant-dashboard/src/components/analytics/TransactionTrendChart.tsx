'use client';

import type { AnalyticsDataPoint } from '@/types/api';
import { useTranslation } from '@pointly/i18n';
import { formatPeriodLabel } from '@pointly/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@pointly/ui';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface TransactionTrendChartProps {
  data: AnalyticsDataPoint[];
  loading?: boolean;
}

export function TransactionTrendChart({ data, loading }: TransactionTrendChartProps) {
  const { t, language } = useTranslation();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm md:text-base">
            {language === 'ar' ? 'اتجاه المعاملات' : 'Transaction Trends'}
          </CardTitle>
        </CardHeader>
        <CardContent className="h-75 flex items-center justify-center">
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm md:text-base">
            {language === 'ar' ? 'اتجاه المعاملات' : 'Transaction Trends'}
          </CardTitle>
        </CardHeader>
        <CardContent className="h-75 flex items-center justify-center">
          <p className="text-muted-foreground">
            {language === 'ar' ? 'لا توجد بيانات في هذه الفترة' : 'No data for this period'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((d) => ({
    period: formatPeriodLabel(d.period, language),
    earn: d.earnCount,
    redeem: d.redeemCount,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm md:text-base">
          {language === 'ar' ? 'اتجاه المعاملات' : 'Transaction Trends'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div dir="ltr" className="h-75">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="period" fontSize={12} tickLine={false} />
              <YAxis fontSize={12} tickLine={false} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="earn"
                name={language === 'ar' ? 'كسب' : 'Earn'}
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="redeem"
                name={language === 'ar' ? 'استبدال' : 'Redeem'}
                stroke="#f97316"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

