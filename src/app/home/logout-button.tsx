'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

export default function LogoutButton() {
  const { logout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    
    try {
      // Chama API de logout para limpar cookies do servidor
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Erro ao chamar API de logout:', error);
    }
    
    // Sempre remove localStorage e redireciona, mesmo se API falhar
    logout();
    setIsLoading(false);
  };

  return (
    <Button
      variant="outline"
      onClick={handleLogout}
      isLoading={isLoading}
      disabled={isLoading}
    >
      Sair
    </Button>
  );
}