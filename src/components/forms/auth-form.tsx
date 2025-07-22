'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AuthFormProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent) => void;
  isLoading?: boolean;
  error?: string;
  success?: string;
}

export function AuthForm({
  title,
  subtitle,
  children,
  onSubmit,
  isLoading,
  error,
  success
}: AuthFormProps) {
  return (
    <div className="auth-layout">
      <div className="auth-container">
        {/* Mobile Logo Section */}
        <div className="auth-logo-section mobile-only mb-8">
          <div className="auth-logo max-w-xs">
            <img 
              src="/images/atlas-logo.png" 
              alt="Atlas Logo" 
              className="w-full h-auto"
            />
          </div>
        </div>
        
        <div className="auth-grid">
          {/* Desktop Logo Section */}
          <div className="auth-logo-section desktop-only">
            <div className="auth-logo">
              <img 
                src="/images/atlas-logo.png" 
                alt="Atlas Logo" 
                className="w-full h-auto"
              />
            </div>
            <div className="text-center">
              <p className="text-lg text-gray-600">
                Revolucione suas vendas com inteligência artificial
              </p>
            </div>
          </div>
          
          {/* Form Section */}
          <div className="auth-form-section">
            <Card className="auth-card">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold text-foreground atlas-heading">
                  {title}
                </CardTitle>
                {subtitle && (
                  <p className="text-muted-foreground mt-2 atlas-text">{subtitle}</p>
                )}
              </CardHeader>
              <CardContent>
                {error && (
                  <Alert variant="error" className="mb-4">
                    {error}
                  </Alert>
                )}
                {success && (
                  <Alert variant="success" className="mb-4">
                    {success}
                  </Alert>
                )}
                <form onSubmit={onSubmit} className="space-y-4">
                  {children}
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

interface AuthFormFieldProps {
  label: string;
  type: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

export function AuthFormField({
  label,
  type,
  name,
  value,
  onChange,
  error,
  placeholder,
  required = false,
  disabled = false
}: AuthFormFieldProps) {
  return (
    <Input
      id={`auth-field-${name}`}
      label={label}
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      error={error}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
    />
  );
}

interface AuthFormButtonProps {
  children: React.ReactNode;
  isLoading?: boolean;
  disabled?: boolean;
  type?: 'submit' | 'button';
}

export function AuthFormButton({
  children,
  isLoading,
  disabled,
  type = 'submit'
}: AuthFormButtonProps) {
  return (
    <Button
      type={type}
      className="w-full"
      isLoading={isLoading}
      disabled={disabled}
    >
      {children}
    </Button>
  );
}

interface AuthFormLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function AuthFormLink({ href, children, className = '' }: AuthFormLinkProps) {
  return (
    <a
      href={href}
      className={`text-sm text-primary hover:text-primary/80 transition-colors atlas-text ${className}`}
    >
      {children}
    </a>
  );
}