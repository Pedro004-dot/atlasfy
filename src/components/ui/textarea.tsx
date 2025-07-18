"use client";

import * as React from 'react';
import { cn } from '@/lib/utils';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helpText?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helpText, id, ...props }, ref) => {
    const generatedId = React.useId();
    const textareaId = id || generatedId;
    
    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={textareaId} 
            className="atlas-label block text-sm font-medium mb-1"
            style={{
              fontFamily: 'var(--font-sans)',
              letterSpacing: 'var(--tracking-normal)',
              color: 'hsl(var(--foreground))'
            }}
          >
            {label}
            {props.required && <span className="text-destructive ml-1">*</span>}
          </label>
        )}
        
        <textarea
          id={textareaId}
          ref={ref}
          className={cn(
            'atlas-input flex min-h-[80px] w-full border border-input bg-background px-3 py-2 text-sm transition-colors',
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
        
        {helpText && !error && (
          <p 
            className="atlas-muted text-xs mt-1"
            style={{
              fontFamily: 'var(--font-sans)',
              letterSpacing: 'var(--tracking-normal)'
            }}
          >
            {helpText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export { Textarea };