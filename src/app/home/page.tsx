import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { getDaysUntilExpiration, isTrialExpired, formatDate } from '@/lib/utils';
import LogoutButton from './logout-button';

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const trialDaysLeft = user.data_fim_plano ? getDaysUntilExpiration(user.data_fim_plano) : 0;
  const trialExpired = user.data_fim_plano ? isTrialExpired(user.data_fim_plano) : false;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="bg-atlas-gradient rounded-xl p-3 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-atlas-gradient bg-clip-text text-transparent">
                  Dashboard
                </h1>
                <p className="text-lg text-gray-600">
                  Bem-vindo de volta, <span className="font-semibold text-atlas-700">{user.nome}</span>!
                </p>
              </div>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Trial Alert */}
        {user.data_fim_plano && (
          <div className="mb-8">
            {trialExpired ? (
              <Alert variant="error" title="Período de teste expirado" className="border-l-4 border-l-red-500">
                Seu período de teste gratuito expirou em {formatDate(user.data_fim_plano)}.
                Faça upgrade para continuar usando nossos serviços.
              </Alert>
            ) : (
              <Alert variant="warning" title="Período de teste ativo" className="border-l-4 border-l-atlas-500">
                Você tem <span className="font-bold">{trialDaysLeft} dia{trialDaysLeft !== 1 ? 's' : ''}</span> restante{trialDaysLeft !== 1 ? 's' : ''} 
                no seu período de teste gratuito.
              </Alert>
            )}
          </div>
        )}

        {/* Main Cards Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {/* Account Info Card */}
          <Card className="atlas-card">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-atlas-100 rounded-lg p-2">
                  <svg className="w-6 h-6 text-atlas-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <CardTitle className="text-xl">Informações da Conta</CardTitle>
                  <CardDescription>Detalhes do seu perfil</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-500">Nome:</span>
                <p className="text-lg font-semibold text-gray-900">{user.nome}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-500">Email:</span>
                <p className="text-lg font-semibold text-gray-900">{user.email}</p>
              </div>
              {user.telefone && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-500">Telefone:</span>
                  <p className="text-lg font-semibold text-gray-900">{user.telefone}</p>
                </div>
              )}
              <div className="p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-500">Status:</span>
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                    user.email_verificado 
                      ? 'bg-green-100 text-green-800 border border-green-200' 
                      : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                  }`}>
                    {user.email_verificado ? '✓ Verificado' : '⚠ Não verificado'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Plan Info Card */}
          <Card className="atlas-card">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-atlas-100 rounded-lg p-2">
                  <svg className="w-6 h-6 text-atlas-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <CardTitle className="text-xl">Plano Atual</CardTitle>
                  <CardDescription>Informações sobre seu plano</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-atlas-50 rounded-lg border border-atlas-200">
                <span className="text-sm font-medium text-atlas-600">Tipo:</span>
                <p className="text-lg font-bold text-atlas-900">Período de Teste Gratuito</p>
              </div>
              {user.data_inicio_plano && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-500">Início:</span>
                  <p className="text-lg font-semibold text-gray-900">{formatDate(user.data_inicio_plano)}</p>
                </div>
              )}
              {user.data_fim_plano && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-500">Expira em:</span>
                  <p className="text-lg font-semibold text-gray-900">{formatDate(user.data_fim_plano)}</p>
                </div>
              )}
              <div className="pt-2">
                <Button className="atlas-button-primary w-full">
                  Fazer Upgrade
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Activity Card */}
          <Card className="atlas-card">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-atlas-100 rounded-lg p-2">
                  <svg className="w-6 h-6 text-atlas-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <CardTitle className="text-xl">Atividade</CardTitle>
                  <CardDescription>Histórico de acessos</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {user.ultimo_acesso && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-500">Último acesso:</span>
                  <p className="text-lg font-semibold text-gray-900">{formatDate(user.ultimo_acesso)}</p>
                </div>
              )}
              <div className="p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-500">Membro desde:</span>
                <p className="text-lg font-semibold text-gray-900">{formatDate(user.created_at)}</p>
              </div>
              <div className="pt-2">
                <Button variant="outline" className="w-full atlas-button-secondary">
                  Ver Histórico Completo
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Section */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Features Card */}
          <Card className="atlas-card">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center space-x-3">
                <div className="bg-atlas-100 rounded-lg p-2">
                  <svg className="w-6 h-6 text-atlas-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span>Recursos Disponíveis</span>
              </CardTitle>
              <CardDescription>Funcionalidades que você pode usar</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                  <span className="font-medium text-green-900">Dashboard completo</span>
                  <span className="text-green-600 font-bold">✓ Ativo</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                  <span className="font-medium text-green-900">Gerenciamento de perfil</span>
                  <span className="text-green-600 font-bold">✓ Ativo</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                  <span className="font-medium text-green-900">Suporte básico</span>
                  <span className="text-green-600 font-bold">✓ Ativo</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="font-medium text-gray-600">Recursos premium</span>
                  <span className="text-gray-400 font-medium">Upgrade necessário</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Next Steps Card */}
          <Card className="atlas-card">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center space-x-3">
                <div className="bg-atlas-100 rounded-lg p-2">
                  <svg className="w-6 h-6 text-atlas-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span>Próximos Passos</span>
              </CardTitle>
              <CardDescription>Recomendações personalizadas para você</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-atlas-50 rounded-lg border border-atlas-200">
                  <h4 className="font-bold text-atlas-900 mb-2">Complete seu perfil</h4>
                  <p className="text-sm text-atlas-700">
                    Adicione mais informações para personalizar sua experiência.
                  </p>
                </div>
                {!trialExpired && (
                  <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <h4 className="font-bold text-yellow-900 mb-2">Explore os recursos</h4>
                    <p className="text-sm text-yellow-700">
                      Aproveite seus {trialDaysLeft} dias restantes para testar tudo.
                    </p>
                  </div>
                )}
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-bold text-green-900 mb-2">Faça upgrade</h4>
                  <p className="text-sm text-green-700">
                    Desbloqueie recursos premium e suporte prioritário.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}