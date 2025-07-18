'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface UserProfile {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  cpf_cnpj?: string;
  faturamento_mensal?: number;
  endereco?: string;
  bairro?: string;
  cep?: string;
  tipo_pessoa?: 'FISICA' | 'JURIDICA';
  perfil_completo: boolean;
  conta_bancaria_id?: string;
  created_at: string;
  updated_at: string;
}

interface ProfileStatus {
  isComplete: boolean;
  missingFields: string[];
}

interface UseUserProfileReturn {
  user: UserProfile | null;
  profileStatus: ProfileStatus | null;
  isLoading: boolean;
  error: string | null;
  checkProfile: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export function useUserProfile(): UseUserProfileReturn {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [profileStatus, setProfileStatus] = useState<ProfileStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const checkProfile = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('auth-token');
      
      if (!token) {
        setError('Token não encontrado');
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/auth/perfil', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-user-id': JSON.parse(atob(token.split('.')[1])).userId,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('auth-token');
          router.push('/login');
          return;
        }
        throw new Error('Erro ao verificar perfil');
      }

      const data = await response.json();
      setUser(data.data.user);
      setProfileStatus(data.data.profileStatus);
      setError(null);
    } catch (err) {
      console.error('Erro ao verificar perfil:', err);
      setError(err instanceof Error ? err.message : 'Erro ao verificar perfil');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProfile = async () => {
    setIsLoading(true);
    await checkProfile();
  };

  useEffect(() => {
    checkProfile();
  }, []);

  return {
    user,
    profileStatus,
    isLoading,
    error,
    checkProfile,
    refreshProfile,
  };
}

// Hook específico para verificar se o perfil está completo
export function useProfileComplete(): {
  isComplete: boolean | null;
  isLoading: boolean;
  checkComplete: () => Promise<boolean>;
} {
  const [isComplete, setIsComplete] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkComplete = async (): Promise<boolean> => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('auth-token');
      
      if (!token) {
        setIsComplete(false);
        setIsLoading(false);
        return false;
      }

      const response = await fetch('/api/auth/completar-perfil', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-user-id': JSON.parse(atob(token.split('.')[1])).userId,
        },
      });

      if (!response.ok) {
        setIsComplete(false);
        setIsLoading(false);
        return false;
      }

      const data = await response.json();
      const complete = data.data.isComplete;
      setIsComplete(complete);
      setIsLoading(false);
      return complete;
    } catch (error) {
      console.error('Erro ao verificar perfil:', error);
      setIsComplete(false);
      setIsLoading(false);
      return false;
    }
  };

  useEffect(() => {
    checkComplete();
  }, []);

  return {
    isComplete,
    isLoading,
    checkComplete,
  };
}