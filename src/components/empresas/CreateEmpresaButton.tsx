'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { Plus } from 'lucide-react';

interface CreateEmpresaButtonProps {
  variant?: 'default' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function CreateEmpresaButton({ 
  variant = 'default', 
  size = 'md', 
  className 
}: CreateEmpresaButtonProps) {
  const [isChecking, setIsChecking] = useState(false);
  const router = useRouter();
  const { addToast } = useToast();

  const handleCreateEmpresa = async () => {
    setIsChecking(true);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      // Verificar se o perfil está completo
      const profileResponse = await fetch('/api/auth/completar-perfil', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-user-id': JSON.parse(atob(token.split('.')[1])).userId,
        },
      });

      if (!profileResponse.ok) {
        throw new Error('Erro ao verificar perfil');
      }

      const profileData = await profileResponse.json();
      
      if (!profileData.data.isComplete) {
        addToast({
          message: 'Complete seu perfil para criar empresas. Isso é necessário para gerar links de pagamento.',
          type: 'error',
        });
        
        const currentUrl = window.location.pathname;
        router.push(`/completar-perfil?redirect=${encodeURIComponent(currentUrl)}`);
        return;
      }

      // Se o perfil está completo, prosseguir para criação da empresa
      router.push('/dashboard/empresas/criar');
    } catch (error) {
      console.error('Erro ao verificar perfil:', error);
      addToast({
        message: 'Erro ao verificar perfil. Tente novamente.',
        type: 'error',
      });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <Button
      onClick={handleCreateEmpresa}
      disabled={isChecking}
      variant={variant}
      size={size as 'default' | 'sm' | 'lg' | 'icon'}
      className={className}
    >
      <Plus className="mr-2 h-4 w-4" />
      {isChecking ? 'Verificando...' : 'Criar Empresa'}
    </Button>
  );
}

// Hook para verificar o status do perfil (mantido para compatibilidade)
export function useProfileStatus() {
  const [isComplete, setIsComplete] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  const checkProfile = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('auth-token');
      if (!token) {
        setIsComplete(false);
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/auth/completar-perfil', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-user-id': JSON.parse(atob(token.split('.')[1])).userId,
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao verificar perfil');
      }

      const data = await response.json();
      setIsComplete(data.data.isComplete);
      setMissingFields(data.data.missingFields || []);
    } catch (error) {
      console.error('Erro ao verificar perfil:', error);
      setIsComplete(false);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isComplete,
    isLoading,
    missingFields,
    checkProfile,
  };
}