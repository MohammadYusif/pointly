'use client';

import type { MerchantLocation } from '@/types/api';
import { useTranslation } from '@pointly/i18n';

interface LocationSelectorProps {
  locations: MerchantLocation[];
  selected: string | undefined;
  onChange: (locationId: string | undefined) => void;
}

export function LocationSelector({ locations, selected, onChange }: LocationSelectorProps) {
  const { t } = useTranslation();

  if (locations.length <= 1) return null;

  return (
    <select
      value={selected || ''}
      onChange={(e) => onChange(e.target.value || undefined)}
      className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
    >
      <option value="">{t('merchant.allLocations')}</option>
      {locations
        .filter((l) => l.isActive)
        .map((loc) => (
          <option key={loc.locationId} value={loc.locationId}>
            {loc.name}
          </option>
        ))}
    </select>
  );
}
