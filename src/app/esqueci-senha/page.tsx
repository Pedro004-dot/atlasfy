'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthForm, AuthFormField, AuthFormButton, AuthFormLink } from '@/components/forms/auth-form';
import {
  PasswordResetRequestFormData,
  PasswordResetFormData,
  validatePasswordResetRequest,
  validatePasswordReset,
  formatValidationErrors
} from '@/lib/validations';

function EsqueciSenhaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromUrl = searchParams.get('email') || '';
  const tokenFromUrl = searchParams.get('token') || '';

  // Novo: três etapas
  const [step, setStep] = useState<'request' | 'validate' | 'reset'>(tokenFromUrl ? 'validate' : 'request');

  const [requestData, setRequestData] = useState<PasswordResetRequestFormData>({
    email: emailFromUrl
  });

  const [validateData, setValidateData] = useState({
    email: emailFromUrl,
    token: tokenFromUrl
  });

  const [resetData, setResetData] = useState<PasswordResetFormData>({
    email: emailFromUrl,
    token: tokenFromUrl,
    nova_senha: '',
    confirmar_senha: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (tokenFromUrl && emailFromUrl) {
      setStep('validate');
    }
  }, [tokenFromUrl, emailFromUrl]);

  // Etapa 1: Solicitar email
  const handleRequestChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setRequestData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');
    setErrors({});

    const validation = validatePasswordResetRequest(requestData);
    if (!validation.success) {
      const validationErrors = formatValidationErrors(validation.error);
      const errorMap: Record<string, string> = {};
      validationErrors.forEach(err => { errorMap[err.field] = err.message; });
      setErrors(errorMap);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validation.data),
      });
      const result = await response.json();
      if (result.success) {
        setSuccess(result.message);
        setValidateData({ email: requestData.email, token: '' });
        setTimeout(() => {
          setStep('validate');
        }, 1500);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Erro de conexão. Tente novamente.');
    }
    setIsLoading(false);
  };

  // Etapa 2: Validar código
  const handleValidateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setValidateData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleValidateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');
    setErrors({});

    // Simples validação local
    if (!validateData.token || validateData.token.length !== 6) {
      setErrors({ token: 'Digite o código de 6 dígitos' });
      setIsLoading(false);
      return;
    }

    try {
      // Chama endpoint para validar código
      const response = await fetch('/api/auth/validate-reset-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: validateData.email, token: validateData.token }),
      });
      const result = await response.json();
      if (result.success) {
        setSuccess('Código validado! Agora defina sua nova senha.');
        setResetData({
          email: validateData.email,
          token: validateData.token,
          nova_senha: '',
          confirmar_senha: ''
        });
        setTimeout(() => {
          setStep('reset');
        }, 1000);
      } else {
        setError(result.message || 'Código inválido.');
      }
    } catch (err) {
      setError('Erro de conexão. Tente novamente.');
    }
    setIsLoading(false);
  };

  // Etapa 3: Redefinir senha
  const handleResetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setResetData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');
    setErrors({});

    const validation = validatePasswordReset(resetData);
    if (!validation.success) {
      const validationErrors = formatValidationErrors(validation.error);
      const errorMap: Record<string, string> = {};
      validationErrors.forEach(err => { errorMap[err.field] = err.message; });
      setErrors(errorMap);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validation.data),
      });
      const result = await response.json();
      if (result.success) {
        setSuccess(result.message);
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        if (result.errors) {
          const errorMap: Record<string, string> = {};
          result.errors.forEach((err: any) => { errorMap[err.field] = err.message; });
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

  // Renderização condicional por etapa
  if (step === 'request') {
    return (
      <AuthForm
        title="Esqueci minha senha"
        subtitle="Digite seu email para receber o código de redefinição"
        onSubmit={handleRequestSubmit}
        isLoading={isLoading}
        error={error}
        success={success}
      >
        <AuthFormField
          label="Email"
          type="email"
          name="email"
          value={requestData.email}
          onChange={handleRequestChange}
          error={errors.email}
          placeholder="Digite seu email"
          required
          disabled={isLoading}
        />
        <AuthFormButton isLoading={isLoading}>
          Enviar código
        </AuthFormButton>
        <div className="text-center mt-4">
          <AuthFormLink href="/login">
            Voltar ao login
          </AuthFormLink>
        </div>
      </AuthForm>
    );
  }

  if (step === 'validate') {
    return (
      <AuthForm
        title="Validar código"
        subtitle="Digite o código de 6 dígitos enviado para seu email"
        onSubmit={handleValidateSubmit}
        isLoading={isLoading}
        error={error}
        success={success}
      >
        <AuthFormField
          label="Email"
          type="email"
          name="email"
          value={validateData.email}
          onChange={() => {}}
          disabled
        />
        <AuthFormField
          label="Código de verificação"
          type="text"
          name="token"
          value={validateData.token}
          onChange={handleValidateChange}
          error={errors.token}
          placeholder="Digite o código de 6 dígitos"
          required
          disabled={isLoading}
        />
        <AuthFormButton isLoading={isLoading}>
          Validar código
        </AuthFormButton>
        <div className="text-center mt-4 space-y-2">
          <div>
            <span className="text-sm text-gray-600">Não recebeu o código? </span>
            <button
              type="button"
              onClick={() => setStep('request')}
              className="text-sm text-primary-600 hover:text-primary-500"
            >
              Reenviar
            </button>
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

  // step === 'reset'
  return (
    <AuthForm
      title="Redefinir senha"
      subtitle="Digite sua nova senha"
      onSubmit={handleResetSubmit}
      isLoading={isLoading}
      error={error}
      success={success}
    >
      <AuthFormField
        label="Nova senha"
        type="password"
        name="nova_senha"
        value={resetData.nova_senha}
        onChange={handleResetChange}
        error={errors.nova_senha}
        placeholder="Digite sua nova senha"
        required
        disabled={isLoading}
      />
      <AuthFormField
        label="Confirmar nova senha"
        type="password"
        name="confirmar_senha"
        value={resetData.confirmar_senha}
        onChange={handleResetChange}
        error={errors.confirmar_senha}
        placeholder="Confirme sua nova senha"
        required
        disabled={isLoading}
      />
      <AuthFormButton isLoading={isLoading}>
        Redefinir senha
      </AuthFormButton>
      <div className="text-center mt-4">
        <AuthFormLink href="/login">
          Voltar ao login
        </AuthFormLink>
      </div>
    </AuthForm>
  );
}

export default function EsqueciSenhaPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <EsqueciSenhaContent />
    </Suspense>
  );
}