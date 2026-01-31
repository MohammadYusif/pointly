'use client';

import * as React from 'react';
import { useDirection } from '@pointly/i18n';
import { Button } from '../Button/Button';
import { cn } from '../../utils/cn';

export interface LanguageToggleProps {
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
}

export function LanguageToggle({
  className,
  variant = 'ghost',
  size = 'sm',
  showLabel = true,
}: LanguageToggleProps) {
  const { language, toggleDirection } = useDirection();

  const label = language === 'ar' ? 'English' : 'العربية';
  const shortLabel = language === 'ar' ? 'EN' : 'ع';

  return (
    <Button
      variant={variant}
      size={size}
      onClick={toggleDirection}
      className={cn('font-medium', className)}
      aria-label={`Switch to ${language === 'ar' ? 'English' : 'Arabic'}`}
    >
      {showLabel ? label : shortLabel}
    </Button>
  );
}

LanguageToggle.displayName = 'LanguageToggle';
