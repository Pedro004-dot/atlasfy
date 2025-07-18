'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthForm, AuthFormField, AuthFormButton, AuthFormLink } from '@/components/forms/auth-form';
import { EmailVerificationFormData, validateEmailVerification, formatValidationErrors } from '@/lib/validations';

function ConfirmarEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromUrl = searchParams.get('email') || '';
  const tokenFromUrl = searchParams.get('token') || '';

  const [formData, setFormData] = useState<EmailVerificationFormData>({
    email: emailFromUrl,
    token: tokenFromUrl
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (tokenFromUrl && emailFromUrl) {
      handleSubmit(new Event('submit') as any);
    }
  }, [tokenFromUrl, emailFromUrl]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');
    setErrors({});

    const validation = validateEmailVerification(formData);
    
    if (!validation.success) {
      const validationErrors = formatValidationErrors(validation.error);
      const errorMap: Record<string, string> = {};
      validationErrors.forEach(err => {
        errorMap[err.field] = err.message;
      });
      setErrors(errorMap);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validation.data),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(result.message);
        setTimeout(() => {
          router.push('/home');
        }, 2000);
      } else {
        if (result.errors) {
          const errorMap: Record<string, string> = {};
          result.errors.forEach((err: any) => {
            errorMap[err.field] = err.message;
          });
          setErrors(errorMap);
        } else {
          setError(result.message);
        }
      }
    } catch (err) {
      setError('Erro de conexão. Tente novamente.');
    }

    setIsLoading(false);
  };

  return (
    <AuthForm
      title="Confirmar Email"
      subtitle="Digite o código de 6 dígitos enviado para seu email"
      onSubmit={handleSubmit}
      isLoading={isLoading}
      error={error}
      success={success}
    >
      <AuthFormField
        label="Email"
        type="email"
        name="email"
        value={formData.email}
        onChange={handleChange}
        error={errors.email}
        placeholder="Digite seu email"
        required
        disabled={isLoading || !!emailFromUrl}
      />

      <AuthFormField
        label="Código de verificação"
        type="text"
        name="token"
        value={formData.token}
        onChange={handleChange}
        error={errors.token}
        placeholder="Digite o código de 6 dígitos"
        required
        disabled={isLoading}
      />

      <div className="text-sm text-gray-600 mb-4">
        Verifique sua caixa de entrada e spam. O código expira em 15 minutos.
      </div>

      <AuthFormButton isLoading={isLoading}>
        Confirmar Email
      </AuthFormButton>

      <div className="text-center mt-4 space-y-2">
        <div>
          <span className="text-sm text-gray-600">Não recebeu o código? </span>
          <AuthFormLink href="/cadastro">
            Reenviar
          </AuthFormLink>
        </div>
        <div>
          <AuthFormLink href="/login">
            Voltar ao login
          </AuthFormLink>
        </div>
      </div>
    </AuthForm>
  );
}

export default function ConfirmarEmailPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <ConfirmarEmailContent />
    </Suspense>
  );
}