'use client';

import * as React from 'react';
import { useRTL } from '../../hooks/useRTL';
import { cn } from '../../utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, startIcon, endIcon, ...props }, ref) => {
    const { isRTL, textStart } = useRTL();

    return (
      <div className="w-full">
        {label && (
          <label className={cn('mb-1.5 block text-sm font-medium text-foreground', textStart)}>
            {label}
          </label>
        )}
        <div className="relative">
          {startIcon && (
            <div
              className={cn(
                'pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground',
                isRTL ? 'right-3' : 'left-3',
              )}
            >
              {startIcon}
            </div>
          )}
          <input
            type={type}
            className={cn(
              'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
              'file:border-0 file:bg-transparent file:text-sm file:font-medium',
              'placeholder:text-muted-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              startIcon && (isRTL ? 'pr-10' : 'pl-10'),
              endIcon && (isRTL ? 'pl-10' : 'pr-10'),
              error && 'border-destructive focus-visible:ring-destructive/20',
              textStart,
              className,
            )}
            ref={ref}
            {...props}
          />
          {endIcon && (
            <div
              className={cn(
                'pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground',
                isRTL ? 'left-3' : 'right-3',
              )}
            >
              {endIcon}
            </div>
          )}
        </div>
        {error && <p className={cn('mt-1.5 text-sm text-destructive', textStart)}>{error}</p>}
      </div>
    );
  },
);
Input.displayName = 'Input';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, ...props }, ref) => {
    const { textStart } = useRTL();

    return (
      <div className="w-full">
        {label && (
          <label className={cn('mb-1.5 block text-sm font-medium text-foreground', textStart)}>
            {label}
          </label>
        )}
        <textarea
          className={cn(
            'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
            'placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-destructive focus-visible:ring-destructive/20',
            textStart,
            className,
          )}
          ref={ref}
          {...props}
        />
        {error && <p className={cn('mt-1.5 text-sm text-destructive', textStart)}>{error}</p>}
      </div>
    );
  },
);
Textarea.displayName = 'Textarea';

export { Input, Textarea };
