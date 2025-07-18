'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface ProtectedPageProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

export function ProtectedPage({ 
  children, 
  requireAuth = true, 
  redirectTo = '/login' 
}: ProtectedPageProps) {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      if (!requireAuth) {
        setIsAuthenticated(true);
        setIsChecking(false);
        return;
      }

      // Verificar se há token
      const token = localStorage.getItem('token') || localStorage.getItem('auth-token');
      
      if (!token) {
        console.log('Nenhum token encontrado');
        setIsAuthenticated(false);
        setIsChecking(false);
        router.push(redirectTo);
        return;
      }

      // Tentar decodificar o token
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        
        // Verificar se o token não expirou
        const currentTime = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < currentTime) {
          console.log('Token expirado');
          localStorage.removeItem('token');
          localStorage.removeItem('auth-token');
          setIsAuthenticated(false);
          setIsChecking(false);
          router.push(redirectTo);
          return;
        }

        console.log('Token válido encontrado');
        setIsAuthenticated(true);
        setIsChecking(false);
      } catch (tokenError) {
        console.error('Erro ao decodificar token:', tokenError);
        localStorage.removeItem('token');
        localStorage.removeItem('auth-token');
        setIsAuthenticated(false);
        setIsChecking(false);
        router.push(redirectTo);
      }
    } catch (error) {
      console.error('Erro na verificação de autenticação:', error);
      setIsAuthenticated(false);
      setIsChecking(false);
      router.push(redirectTo);
    }
  };

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && requireAuth) {
    return null; // Não renderizar nada se não autenticado
  }

  return <>{children}</>;
}