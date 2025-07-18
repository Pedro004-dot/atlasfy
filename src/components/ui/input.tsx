"use client";

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, type = "text", ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={inputId} 
            className="atlas-label block text-sm font-medium mb-1"
            style={{
              fontFamily: 'var(--font-sans)',
              letterSpacing: 'var(--tracking-normal)',
              color: 'hsl(var(--foreground))'
            }}
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          className={cn(
            'atlas-input flex h-9 w-full border border-input bg-background px-3 py-1 text-sm transition-colors',
            'file:border-0 file:bg-transparent file:text-sm file:font-medium',
            'placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-destructive focus-visible:ring-destructive',
            className
          )}
          style={{
            borderRadius: 'var(--radius-sm)',
            fontFamily: 'var(--font-sans)',
            letterSpacing: 'var(--tracking-normal)'
          }}
          ref={ref}
          {...props}
        />
        {error && (
          <p 
            className="text-destructive text-xs mt-1"
            style={{
              fontFamily: 'var(--font-sans)',
              letterSpacing: 'var(--tracking-normal)'
            }}
          >
            {error}
          </p>
        )}
        {helperText && !error && (
          <p 
            className="atlas-muted text-xs mt-1"
            style={{
              fontFamily: 'var(--font-sans)',
              letterSpacing: 'var(--tracking-normal)'
            }}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };