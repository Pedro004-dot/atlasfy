"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('auth-token');
        
        if (!token) {
          router.replace('/login');
          return;
        }

        // Verificar se o token é válido
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setIsAuthenticated(true);
          } else {
            localStorage.removeItem('auth-token');
            localStorage.removeItem('empresa-selecionada');
            router.replace('/login');
          }
        } else {
          localStorage.removeItem('auth-token');
          localStorage.removeItem('empresa-selecionada');
          router.replace('/login');
        }
      } catch (error) {
        console.error('Erro na verificação de autenticação:', error);
        localStorage.removeItem('auth-token');
        localStorage.removeItem('empresa-selecionada');
        router.replace('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // O router.replace já está redirecionando
  }

  return <>{children}</>;
}