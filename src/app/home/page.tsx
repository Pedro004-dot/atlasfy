'use client';

import React, { useEffect, useState } from 'react';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { getDaysUntilExpiration, isTrialExpired, formatDate } from '@/lib/utils';
import { useDashboardOverview } from '@/hooks/useDashboardOverview';
import { useAuth } from '@/hooks/useAuth';
import LogoutButton from './logout-button';

// TODO: Trocar por empresaId dinâmico do contexto/usuário logado
const EMPRESA_ID = '3749ded8-bdd3-4055-a44c-fc64fd0f70df';

export default function HomePage() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: dashboardData, isLoading: dashboardLoading, error: dashboardError } = useDashboardOverview(EMPRESA_ID, '24h');


  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  if (!user) {
    redirect('/login');
    return null;
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

          {/* Dashboard Metrics Card */}
          <Card className="atlas-card">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-atlas-100 rounded-lg p-2">
                  <svg className="w-6 h-6 text-atlas-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <CardTitle className="text-xl">Métricas Hoje</CardTitle>
                  <CardDescription>Performance das vendas</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {dashboardLoading ? (
                <div className="text-center text-muted-foreground py-4">Carregando métricas...</div>
              ) : dashboardError ? (
                <div className="text-center text-destructive py-4">{dashboardError}</div>
              ) : dashboardData ? (
                <>
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <span className="text-sm font-medium text-green-600">Taxa de Conversão:</span>
                    <p className="text-lg font-semibold text-green-900">{dashboardData.conversion_rate_24h || 0}%</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <span className="text-sm font-medium text-blue-600">Receita Hoje:</span>
                    <p className="text-lg font-semibold text-blue-900">R$ {Number(dashboardData.receita_hoje || 0).toLocaleString('pt-BR')}</p>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <span className="text-sm font-medium text-yellow-600">SLA de Resposta:</span>
                    <p className="text-lg font-semibold text-yellow-900">{dashboardData.sla_percentage_24h || 0}%</p>
                  </div>
                </>
              ) : (
                <div className="text-center text-muted-foreground py-4">Nenhum dado disponível</div>
              )}
              <div className="pt-2">
                <Button variant="outline" className="w-full atlas-button-secondary">
                  Ver Dashboard Completo
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Section */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Dashboard Alerts Card */}
          <Card className="atlas-card">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center space-x-3">
                <div className="bg-atlas-100 rounded-lg p-2">
                  <svg className="w-6 h-6 text-atlas-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <span>Alertas e Ações</span>
              </CardTitle>
              <CardDescription>Itens que precisam da sua atenção</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboardLoading ? (
                <div className="text-center text-muted-foreground py-4">Carregando alertas...</div>
              ) : dashboardError ? (
                <div className="text-center text-destructive py-4">Erro ao carregar alertas</div>
              ) : dashboardData ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                    <span className="font-medium text-red-900">🚨 Não Respondidos</span>
                    <span className="text-red-600 font-bold">{dashboardData.nao_respondidos_30min || 0}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <span className="font-medium text-yellow-900">💳 Sem Link de Pagamento</span>
                    <span className="text-yellow-600 font-bold">{dashboardData.sem_link_pagamento || 0}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <span className="font-medium text-blue-900">🛒 Carrinho Abandonado</span>
                    <span className="text-blue-600 font-bold">{dashboardData.carrinho_abandonado_2h || 0}</span>
                  </div>
                  <div className="pt-2">
                    <Button className="w-full atlas-button-primary">
                      Ver Detalhes no Dashboard
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-4">Nenhum alerta disponível</div>
              )}
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