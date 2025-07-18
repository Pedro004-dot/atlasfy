'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthForm, AuthFormField, AuthFormButton, AuthFormLink } from '@/components/forms/auth-form';
import { LoginFormData, validateLogin, formatValidationErrors } from '@/lib/validations';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    senha: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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
    setErrors({});

    const validation = validateLogin(formData);
    
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
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validation.data),
      });

      const result = await response.json();

      if (result.success && result.token) {
        // Salvar token no localStorage
        localStorage.setItem('auth-token', result.token);
        // Redirecionamento
        window.location.replace('/dashboard');
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
      title="Entrar"
      subtitle="Faça login em sua conta"
      onSubmit={handleSubmit}
      isLoading={isLoading}
      error={error}
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
        disabled={isLoading}
      />

      <AuthFormField
        label="Senha"
        type="password"
        name="senha"
        value={formData.senha}
        onChange={handleChange}
        error={errors.senha}
        placeholder="Digite sua senha"
        required
        disabled={isLoading}
      />

      <div className="text-right mb-4">
        <AuthFormLink href="/esqueci-senha">
          Esqueci minha senha
        </AuthFormLink>
      </div>

      <AuthFormButton isLoading={isLoading}>
        Entrar
      </AuthFormButton>

      <div className="text-center mt-4">
        <span className="text-sm text-muted-foreground atlas-text">Não tem uma conta? </span>
        <AuthFormLink href="/cadastro">
          Criar conta
        </AuthFormLink>
      </div>
    </AuthForm>
  );
}