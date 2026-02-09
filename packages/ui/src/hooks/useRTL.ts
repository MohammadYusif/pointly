'use client';

import { useDirection } from '@pointly/i18n';

/**
 * Hook providing RTL-aware utility functions for styling components
 */
export function useRTL() {
  const { isRTL, direction } = useDirection();

  /**
   * Returns the appropriate class based on direction
   * @param ltr - Class to use in LTR mode
   * @param rtl - Class to use in RTL mode
   */
  const dir = (ltr: string, rtl: string): string => (isRTL ? rtl : ltr);

  /**
   * Margin-inline-start utility
   * Returns me-{value} in RTL (which maps to margin-left in RTL)
   * Returns ms-{value} in LTR (which maps to margin-left in LTR)
   */
  const ms = (value: string): string => (isRTL ? `me-${value}` : `ms-${value}`);

  /**
   * Margin-inline-end utility
   * Returns ms-{value} in RTL (which maps to margin-right in RTL)
   * Returns me-{value} in LTR (which maps to margin-right in LTR)
   */
  const me = (value: string): string => (isRTL ? `ms-${value}` : `me-${value}`);

  /**
   * Padding-inline-start utility
   */
  const ps = (value: string): string => (isRTL ? `pe-${value}` : `ps-${value}`);

  /**
   * Padding-inline-end utility
   */
  const pe = (value: string): string => (isRTL ? `ps-${value}` : `pe-${value}`);

  /**
   * Flex direction for row that respects RTL
   */
  const flexRow = isRTL ? 'flex-row-reverse' : 'flex-row';

  /**
   * Text alignment that respects logical direction
   */
  const textStart = isRTL ? 'text-right' : 'text-left';
  const textEnd = isRTL ? 'text-left' : 'text-right';

  /**
   * Border radius for start edge
   */
  const roundedStart = isRTL ? 'rounded-e' : 'rounded-s';
  const roundedEnd = isRTL ? 'rounded-s' : 'rounded-e';

  /**
   * Position utilities
   */
  const start = (value: string): string => (isRTL ? `right-${value}` : `left-${value}`);
  const end = (value: string): string => (isRTL ? `left-${value}` : `right-${value}`);

  /**
   * Translate utilities
   */
  const translateXStart = isRTL ? 'translate-x-full' : '-translate-x-full';
  const translateXEnd = isRTL ? '-translate-x-full' : 'translate-x-full';

  /**
   * Icon flip class for directional icons (arrows, chevrons)
   */
  const flipIcon = isRTL ? 'scale-x-[-1]' : '';

  return {
    isRTL,
    direction,
    dir,
    ms,
    me,
    ps,
    pe,
    flexRow,
    textStart,
    textEnd,
    roundedStart,
    roundedEnd,
    start,
    end,
    translateXStart,
    translateXEnd,
    flipIcon,
  };
}
