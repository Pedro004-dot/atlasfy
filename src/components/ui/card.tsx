"use client";

import * as React from 'react';
import { cn } from '@/lib/utils';

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'atlas-card bg-card text-card-foreground shadow-sm border border-border',
      className
    )}
    style={{
      borderRadius: 'var(--radius)',
      boxShadow: 'var(--shadow-sm)',
      fontFamily: 'var(--font-sans)',
      letterSpacing: 'var(--tracking-normal)'
    }}
    {...props}
  />
));

Card.displayName = 'Card';

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 p-6', className)}
    style={{
      fontFamily: 'var(--font-sans)',
      letterSpacing: 'var(--tracking-normal)'
    }}
    {...props}
  />
));

CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      'atlas-heading text-lg font-semibold leading-none text-foreground',
      className
    )}
    style={{
      fontFamily: 'var(--font-sans)',
      letterSpacing: 'var(--tracking-normal)'
    }}
    {...props}
  />
));

CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('atlas-muted text-sm text-muted-foreground', className)}
    style={{
      fontFamily: 'var(--font-sans)',
      letterSpacing: 'var(--tracking-normal)'
    }}
    {...props}
  />
));

CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div 
    ref={ref} 
    className={cn('p-6 pt-0', className)} 
    style={{
      fontFamily: 'var(--font-sans)',
      letterSpacing: 'var(--tracking-normal)'
    }}
    {...props} 
  />
));

CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center p-6 pt-0', className)}
    style={{
      fontFamily: 'var(--font-sans)',
      letterSpacing: 'var(--tracking-normal)'
    }}
    {...props}
  />
));

CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };