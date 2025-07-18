'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthForm, AuthFormField, AuthFormButton, AuthFormLink } from '@/components/forms/auth-form';
import { RegisterFormData, validateRegister, formatValidationErrors } from '@/lib/validations';

export default function CadastroPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<RegisterFormData>({
    nome: '',
    email: '',
    senha: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

    const validation = validateRegister(formData);
    
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
      const response = await fetch('/api/auth/register', {
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
          router.push(`/confirmar-email?email=${encodeURIComponent(formData.email)}`);
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
      title="Criar Conta"
      subtitle="Preencha os dados abaixo para criar sua conta"
      onSubmit={handleSubmit}
      isLoading={isLoading}
      error={error}
      success={success}
    >
      <AuthFormField
        label="Nome completo"
        type="text"
        name="nome"
        value={formData.nome}
        onChange={handleChange}
        error={errors.nome}
        placeholder="Digite seu nome completo"
        required
        disabled={isLoading}
      />

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
        placeholder="Digite uma senha segura"
        required
        disabled={isLoading}
      />

      <div className="text-xs text-gray-500 mb-4">
        A senha deve conter pelo menos 8 caracteres, incluindo letras maiúsculas,
        minúsculas, números e símbolos.
      </div>

      <AuthFormButton isLoading={isLoading}>
        Criar Conta
      </AuthFormButton>

      <div className="text-center mt-4">
        <span className="text-sm text-gray-600">Já tem uma conta? </span>
        <AuthFormLink href="/login">
          Fazer login
        </AuthFormLink>
      </div>
    </AuthForm>
  );
}