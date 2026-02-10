'use client';

import { useTranslation } from '@pointly/i18n';

export type DatePreset = '7d' | '30d' | '90d';
export type GroupBy = 'day' | 'week' | 'month';

interface DateRangeSelectorProps {
  preset: DatePreset;
  groupBy: GroupBy;
  onPresetChange: (preset: DatePreset) => void;
  onGroupByChange: (groupBy: GroupBy) => void;
}

const PRESET_DAYS: Record<DatePreset, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

export function getDateRange(preset: DatePreset): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date(end.getTime() - PRESET_DAYS[preset] * 86400000);
  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
}

export function DateRangeSelector({
  preset,
  groupBy,
  onPresetChange,
  onGroupByChange,
}: DateRangeSelectorProps) {
  const { language } = useTranslation();

  const presetLabels: Record<DatePreset, string> = {
    '7d': language === 'ar' ? '7 أيام' : '7 Days',
    '30d': language === 'ar' ? '30 يوم' : '30 Days',
    '90d': language === 'ar' ? '3 أشهر' : '3 Months',
  };

  const groupByLabels: Record<GroupBy, string> = {
    day: language === 'ar' ? 'يوم' : 'Day',
    week: language === 'ar' ? 'أسبوع' : 'Week',
    month: language === 'ar' ? 'شهر' : 'Month',
  };

  return (
    <div className="flex flex-wrap gap-2">
      <div className="flex rounded-md border border-input overflow-hidden">
        {(Object.keys(presetLabels) as DatePreset[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPresetChange(p)}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              preset === p
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-muted-foreground hover:bg-muted'
            }`}
          >
            {presetLabels[p]}
          </button>
        ))}
      </div>
      <div className="flex rounded-md border border-input overflow-hidden">
        {(Object.keys(groupByLabels) as GroupBy[]).map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => onGroupByChange(g)}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              groupBy === g
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-muted-foreground hover:bg-muted'
            }`}
          >
            {groupByLabels[g]}
          </button>
        ))}
      </div>
    </div>
  );
}
