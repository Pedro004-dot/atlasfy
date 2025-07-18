import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <Card className="max-w-md w-full atlas-card">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-atlas-gradient flex items-center justify-center shadow-lg">
            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0118 12a8 8 0 10-16 0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Página não encontrada
          </CardTitle>
          <CardDescription className="text-lg">
            A página que você está procurando não existe.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-8xl font-bold bg-atlas-gradient bg-clip-text text-transparent text-center">
            404
          </div>
          <div className="flex flex-col space-y-3">
            <Link href="/" className="block">
              <Button className="atlas-button-primary w-full">
                Voltar ao início
              </Button>
            </Link>
            <Link href="/login" className="block">
              <Button className="atlas-button-secondary w-full">
                Fazer login
              </Button>
            </Link>
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