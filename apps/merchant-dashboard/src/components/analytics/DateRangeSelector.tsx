'use client';

import { useTranslation } from '@pointly/i18n';

export type DatePreset = '1d' | '7d' | '30d' | '90d';
export type GroupBy = 'day' | 'week' | 'month';

interface DateRangeSelectorProps {
  preset: DatePreset;
  groupBy: GroupBy;
  onPresetChange: (preset: DatePreset) => void;
  onGroupByChange: (groupBy: GroupBy) => void;
}

const PRESET_DAYS: Record<DatePreset, number> = {
  '1d': 1,
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

/** Valid groupBy options per preset */
const VALID_GROUP_BY: Record<DatePreset, GroupBy[]> = {
  '1d': ['day'],
  '7d': ['day'],
  '30d': ['day', 'week'],
  '90d': ['day', 'week', 'month'],
};

/** Default groupBy when switching presets */
const DEFAULT_GROUP_BY: Record<DatePreset, GroupBy> = {
  '1d': 'day',
  '7d': 'day',
  '30d': 'day',
  '90d': 'week',
};

export function getDateRange(preset: DatePreset): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date(end.getTime() - PRESET_DAYS[preset] * 86400000);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
}

export function getDefaultGroupBy(preset: DatePreset): GroupBy {
  return DEFAULT_GROUP_BY[preset];
}

export function isValidGroupBy(preset: DatePreset, groupBy: GroupBy): boolean {
  return VALID_GROUP_BY[preset].includes(groupBy);
}

export function DateRangeSelector({
  preset,
  groupBy,
  onPresetChange,
  onGroupByChange,
}: DateRangeSelectorProps) {
  const { t } = useTranslation();

  const presetLabels: Record<DatePreset, string> = {
    '1d': t('analytics.today'),
    '7d': t('analytics.days7'),
    '30d': t('analytics.days30'),
    '90d': t('analytics.months3'),
  };

  const groupByLabels: Record<GroupBy, string> = {
    day: t('analytics.day'),
    week: t('analytics.week'),
    month: t('analytics.month'),
  };

  const validGroupBys = VALID_GROUP_BY[preset];

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
        {validGroupBys.map((g) => (
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
