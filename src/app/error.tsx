'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Erro da aplicação:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <Card className="max-w-md w-full atlas-card">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-red-100 flex items-center justify-center border border-red-200">
            <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Algo deu errado
          </CardTitle>
          <CardDescription className="text-lg">
            Ocorreu um erro inesperado na aplicação.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {process.env.NODE_ENV === 'development' && (
            <details className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
                Detalhes do erro (desenvolvimento)
              </summary>
              <pre className="mt-3 text-xs text-gray-600 overflow-auto bg-white p-3 rounded border">
                {error.message}
              </pre>
            </details>
          )}
          <div className="flex flex-col space-y-3">
            <Button onClick={reset} className="atlas-button-primary w-full">
              Tentar novamente
            </Button>
            <Button 
              onClick={() => window.location.href = '/'} 
              className="atlas-button-secondary w-full"
            >
              Voltar ao início
            </Button>
          </div>
          <div className="text-center pt-4 border-t border-gray-200">
            <div className="flex items-center justify-center space-x-2">
              <div className="bg-atlas-gradient rounded-lg p-1">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <span className="text-sm font-semibold bg-atlas-gradient bg-clip-text text-transparent">Atlas Auth</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}