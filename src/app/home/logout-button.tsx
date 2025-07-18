'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function LogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
      
      router.push('/login');
    } catch (error) {
      console.error('Erro no logout:', error);
    }
    
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