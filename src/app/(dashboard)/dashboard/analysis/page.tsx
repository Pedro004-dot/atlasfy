'use client';

import { useState } from 'react';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, DollarSign, Users, Heart, Calendar, RefreshCw } from 'lucide-react';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { ConversionFunnelChart } from '@/components/dashboard/ConversionFunnelChart';
import { LostLeadsChart } from '@/components/dashboard/LostLeadsChart';
import { ProductEfficiencyChart } from '@/components/dashboard/ProductEfficiencyChart';
import { SentimentAnalysisChart } from '@/components/dashboard/SentimentAnalysisChart';
import { PurchaseBarriersChart } from '@/components/dashboard/PurchaseBarriersChart';

// Componente de esqueleto para exibir durante o carregamento dos dados
const DashboardSkeleton = () => (
  <div className="flex-1 space-y-6 p-8 pt-6">
    {/* Header Skeleton */}
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-80 animate-pulse"></div>
        <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-60 animate-pulse"></div>
      </div>
      <div className="flex items-center space-x-3">
        <div className="h-9 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-[180px] animate-pulse"></div>
        <div className="h-9 w-9 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg animate-pulse"></div>
      </div>
    </div>

    {/* Métricas Cards Skeleton */}
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-32 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg border border-gray-200 animate-pulse">
          <div className="p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div className="h-4 bg-gray-300 rounded w-24"></div>
              <div className="h-8 w-8 bg-gray-300 rounded-lg"></div>
            </div>
            <div className="h-8 bg-gray-300 rounded w-20"></div>
            <div className="h-3 bg-gray-300 rounded w-32"></div>
          </div>
        </div>
      ))}
    </div>

    {/* Gráficos Principais Skeleton */}
    <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
      {[...Array(2)].map((_, i) => (
        <div key={i} className="h-80 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg border border-gray-200 animate-pulse">
          <div className="p-4 space-y-4">
            <div className="h-6 bg-gray-300 rounded w-48"></div>
            <div className="h-64 bg-gray-300 rounded-lg"></div>
          </div>
        </div>
      ))}
    </div>

    {/* Gráficos Secundários Skeleton */}
    <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
      {[...Array(2)].map((_, i) => (
        <div key={i} className="h-80 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg border border-gray-200 animate-pulse">
          <div className="p-4 space-y-4">
            <div className="h-6 bg-gray-300 rounded w-48"></div>
            <div className="h-64 bg-gray-300 rounded-lg"></div>
          </div>
        </div>
      ))}
    </div>

    {/* Último Gráfico Skeleton */}
    <div className="h-80 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg border border-gray-200 animate-pulse">
      <div className="p-4 space-y-4">
        <div className="h-6 bg-gray-300 rounded w-48"></div>
        <div className="h-64 bg-gray-300 rounded-lg"></div>
      </div>
    </div>
  </div>
);

export default function AnalysisPage() {
  const [period, setPeriod] = useState('7d');
  const { empresaSelecionada } = useEmpresa();
  const { dashboardData, isLoading, isError, refresh } = useDashboardMetrics(empresaSelecionada, period);

  // Função para mudar período e forçar refresh
  const handlePeriodChange = (newPeriod: string) => {
    console.log('[AnalysisPage] Changing period from', period, 'to', newPeriod);
    setPeriod(newPeriod);
    // Força refresh após mudança de período
    setTimeout(() => {
      refresh();
    }, 100);
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (isError) {
    return (
      <div className="flex-1 space-y-6 p-8 pt-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">Métricas de Performance</h2>
            <p className="text-gray-600">Análise completa do desempenho de vendas</p>
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
          <div className="relative">
            <div className="mx-auto h-16 w-16 text-red-500 bg-red-100 rounded-full flex items-center justify-center">
              <TrendingUp className="h-8 w-8" />
            </div>
            <div className="absolute -top-1 -right-1 h-6 w-6 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">!</span>
            </div>
          </div>
          
          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold text-gray-900">Erro ao Carregar Dados</h3>
            <p className="text-gray-600 max-w-md">
              Não foi possível buscar as métricas no momento. Verifique sua conexão e tente novamente.
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => refresh()} 
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              Tentar Novamente
            </button>
            <button 
              onClick={() => window.location.reload()} 
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200"
            >
              Recarregar Página
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between p-6 rounded-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-gradient-to-br from-red-600 to-red-700 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-white">Métricas de Performance</h2>
              <p className="text-gray-300">Análise completa do desempenho de vendas</p>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-gray-800 px-3 py-2 rounded-lg border border-gray-700">
            <Calendar className="h-4 w-4 text-gray-400" />
            <Select value={period} onValueChange={handlePeriodChange}>
              <SelectTrigger className="w-[160px] border-0 focus:ring-0 bg-transparent text-white">
                <SelectValue placeholder="Selecione o período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6h">Últimas 6 horas</SelectItem>
                <SelectItem value="24h">Últimas 24 horas</SelectItem>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <button 
            onClick={() => refresh()} 
            className="p-3 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200 border border-gray-700 hover:border-gray-600"
            title="Atualizar dados"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Métricas Principais */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Taxa de Crescimento (WoW)"
          value={`${dashboardData?.growthMetrics?.wow?.percentageChange?.toFixed(1) || 0}%`}
          icon={TrendingUp}
          trend={{
            value: dashboardData?.growthMetrics?.wow?.percentageChange || 0,
            isPositive: (dashboardData?.growthMetrics?.wow?.percentageChange || 0) > 0
          }}
          iconColor="text-green-600"
        />
        <MetricCard
          title="Valor por Cliente (LTV)"
          value={`R$ ${dashboardData?.customerLTV?.avgLTV?.toFixed(2) || '0.00'}`}
          icon={DollarSign}
          description="Ticket médio por cliente"
          iconColor="text-blue-600"
        />
        <MetricCard
          title="Sentiment Score"
          value={`${dashboardData?.sentimentAnalysis?.overallScore?.toFixed(1) || '0.0'} / 10`}
          icon={Heart}
          trend={{
            value: dashboardData?.sentimentAnalysis?.satisfactionTrend?.percentageChange || 0,
            isPositive: dashboardData?.sentimentAnalysis?.satisfactionTrend?.trend === 'up'
          }}
          iconColor="text-red-600"
        />
        <MetricCard
          title="Total de Conversas"
          value={dashboardData?.conversationMetrics?.totalConversations || 0}
          icon={Users}
          description="Conversas ativas no período"
          iconColor="text-purple-600"
        />
      </div>

      {/* Gráficos Principais */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* <ConversionFunnelChart data={dashboardData?.conversionFunnel || []} /> */}
        <LostLeadsChart data={dashboardData?.lostLeads?.lostByReason || []} />
        <SentimentAnalysisChart data={dashboardData?.sentimentAnalysis} />
      </div>

      {/* Gráficos Secundários */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* <SentimentAnalysisChart data={dashboardData?.sentimentAnalysis} /> */}
        {/* <ProductEfficiencyChart data={dashboardData?.productEfficiency || []} /> */}
      </div>

      {/* Barreiras de Compra */}
      {/* <PurchaseBarriersChart data={dashboardData?.purchaseBarriers || []} /> */}
    </div>
  );
}