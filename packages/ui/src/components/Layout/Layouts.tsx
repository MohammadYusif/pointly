'use client';

import * as React from 'react';
import { cn } from '../../utils/cn';
import { useRTL } from '../../hooks/useRTL';

// ============================================================================
// Flex Component
// ============================================================================

type FlexDirection = 'row' | 'col' | 'row-reverse' | 'col-reverse';
type FlexAlign = 'start' | 'center' | 'end' | 'stretch' | 'baseline';
type FlexJustify = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
type Gap = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '8' | '10' | '12';

export interface FlexProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: FlexDirection;
  align?: FlexAlign;
  justify?: FlexJustify;
  gap?: Gap;
  wrap?: boolean;
  inline?: boolean;
}

const Flex = React.forwardRef<HTMLDivElement, FlexProps>(
  (
    {
      direction = 'row',
      align = 'start',
      justify = 'start',
      gap = '4',
      wrap = false,
      inline = false,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const { isRTL } = useRTL();

    const alignMap: Record<FlexAlign, string> = {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch',
      baseline: 'items-baseline',
    };

    const justifyMap: Record<FlexJustify, string> = {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
      around: 'justify-around',
      evenly: 'justify-evenly',
    };

    // Handle RTL direction reversal for row
    let actualDirection = direction;
    if (isRTL && direction === 'row') {
      actualDirection = 'row-reverse';
    } else if (isRTL && direction === 'row-reverse') {
      actualDirection = 'row';
    }

    const directionMap: Record<FlexDirection, string> = {
      row: 'flex-row',
      col: 'flex-col',
      'row-reverse': 'flex-row-reverse',
      'col-reverse': 'flex-col-reverse',
    };

    return (
      <div
        ref={ref}
        className={cn(
          inline ? 'inline-flex' : 'flex',
          directionMap[actualDirection],
          alignMap[align],
          justifyMap[justify],
          `gap-${gap}`,
          wrap && 'flex-wrap',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Flex.displayName = 'Flex';

// ============================================================================
// Grid Component
// ============================================================================

type GridCols =
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | '11'
  | '12'
  | 'none';

export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: GridCols;
  colsSm?: GridCols;
  colsMd?: GridCols;
  colsLg?: GridCols;
  colsXl?: GridCols;
  gap?: Gap;
  gapX?: Gap;
  gapY?: Gap;
}

const Grid = React.forwardRef<HTMLDivElement, GridProps>(
  (
    {
      cols = '1',
      colsSm,
      colsMd,
      colsLg,
      colsXl,
      gap = '4',
      gapX,
      gapY,
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'grid',
          `grid-cols-${cols}`,
          colsSm && `sm:grid-cols-${colsSm}`,
          colsMd && `md:grid-cols-${colsMd}`,
          colsLg && `lg:grid-cols-${colsLg}`,
          colsXl && `xl:grid-cols-${colsXl}`,
          gapX || gapY
            ? cn(gapX && `gap-x-${gapX}`, gapY && `gap-y-${gapY}`)
            : `gap-${gap}`,
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Grid.displayName = 'Grid';

// ============================================================================
// Container Component
// ============================================================================

type ContainerSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: ContainerSize;
  centered?: boolean;
}

const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ size = '2xl', centered = true, className, children, ...props }, ref) => {
    const sizeMap: Record<ContainerSize, string> = {
      sm: 'max-w-screen-sm',
      md: 'max-w-screen-md',
      lg: 'max-w-screen-lg',
      xl: 'max-w-screen-xl',
      '2xl': 'max-w-screen-2xl',
      full: 'max-w-full',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'w-full px-4 sm:px-6 lg:px-8',
          sizeMap[size],
          centered && 'mx-auto',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Container.displayName = 'Container';

// ============================================================================
// Stack Component (Vertical Flex shorthand)
// ============================================================================

export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  gap?: Gap;
  align?: FlexAlign;
}

const Stack = React.forwardRef<HTMLDivElement, StackProps>(
  ({ gap = '4', align = 'stretch', className, children, ...props }, ref) => {
    const alignMap: Record<FlexAlign, string> = {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch',
      baseline: 'items-baseline',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col',
          `gap-${gap}`,
          alignMap[align],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Stack.displayName = 'Stack';

export { Flex, Grid, Container, Stack };
