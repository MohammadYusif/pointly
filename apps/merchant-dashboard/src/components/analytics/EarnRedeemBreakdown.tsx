"use client";

import type { AnalyticsDataPoint } from "@/types/api";
import { useTranslation } from "@pointly/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@pointly/ui";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface EarnRedeemBreakdownProps {
  data: AnalyticsDataPoint[];
  loading?: boolean;
}

export function EarnRedeemBreakdown({
  data,
  loading,
}: EarnRedeemBreakdownProps) {
  const { t, language } = useTranslation();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm md:text-base">
            {language === "ar"
              ? "النقاط المكتسبة والمستبدلة"
              : "Points Earned vs Redeemed"}
          </CardTitle>
        </CardHeader>
        <CardContent className="h-75 flex items-center justify-center">
          <p className="text-muted-foreground">{t("common.loading")}</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((d) => ({
    period: formatPeriodLabel(d.period, language),
    earned: d.pointsEarned,
    redeemed: d.pointsRedeemed,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm md:text-base">
          {language === "ar"
            ? "النقاط المكتسبة والمستبدلة"
            : "Points Earned vs Redeemed"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div dir="ltr" className="h-75">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="period" fontSize={12} tickLine={false} />
              <YAxis fontSize={12} tickLine={false} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="earned"
                name={language === "ar" ? "مكتسبة" : "Earned"}
                fill="#22c55e"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="redeemed"
                name={language === "ar" ? "مستبدلة" : "Redeemed"}
                fill="#f97316"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function formatPeriodLabel(period: string, language: string): string {
  try {
    const date = new Date(period);
    return new Intl.DateTimeFormat(language === "ar" ? "ar-SA" : "en-SA", {
      month: "short",
      day: "numeric",
    }).format(date);
  } catch {
    return period;
  }
}
