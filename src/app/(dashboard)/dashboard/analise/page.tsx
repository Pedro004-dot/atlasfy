'use client';

import React, { useEffect } from 'react';
import { useDashboardOverview } from '@/hooks/useDashboardOverview';

// TODO: Trocar por empresaId dinâmico do contexto/usuário logado
const EMPRESA_ID = '3749ded8-bdd3-4055-a44c-fc64fd0f70df';

const timeFilters = [
  { label: '6h', value: '6h' },
  { label: 'Hoje', value: '24h' },
  { label: '7 dias', value: '7d' },
  { label: '30 dias', value: '30d' },
];

export default function AnalisePage() {
  const [period, setPeriod] = React.useState('24h');
  const { data, isLoading, error, refetch } = useDashboardOverview(EMPRESA_ID, period);

  useEffect(() => { refetch(); }, [period, refetch]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border bg-background px-4 py-6 rounded-t-lg">
        <div>
          <h1 className="text-2xl font-bold text-foreground">WhatsApp Sales Intelligence</h1>
          <p className="text-muted-foreground mt-1">Relatórios e análises detalhadas das suas vendas</p>
        </div>
        <div className="flex gap-2 mt-2 md:mt-0">
          {timeFilters.map(f => (
            <button
              key={f.value}
              className={`px-4 py-2 rounded-md border text-sm font-medium transition-colors ${period === f.value ? 'bg-primary text-white border-primary' : 'bg-background border-border text-foreground hover:bg-muted'}`}
              onClick={() => setPeriod(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Métricas Principais */}
      <div className="dashboard-container px-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Taxa de Conversão"
            icon="📈"
            value={isLoading ? '--' : data ? `${data.conversion_rate_24h}%` : '--'}
            change={null} // Pode calcular variação depois
            positive
          />
          <MetricCard
            title="Receita Hoje"
            icon="💰"
            value={isLoading ? '--' : data ? `R$ ${Number(data.receita_hoje).toLocaleString('pt-BR')}` : '--'}
            change={null}
            positive
          />
          <MetricCard
            title="Ticket Médio (7d)"
            icon="🛒"
            value={isLoading ? '--' : data ? `R$ ${Number(data.ticket_medio_7d).toLocaleString('pt-BR')}` : '--'}
            change={null}
            positive={false}
          />
          <MetricCard
            title="SLA de Resposta"
            icon="⏱️"
            value={isLoading ? '--' : data ? `${data.sla_percentage_24h}%` : '--'}
            change={null}
            positive
          />
        </div>

        {/* Alertas de Ação Urgente */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <AlertCard
            title="Não Respondidos"
            icon="🚨"
            count={isLoading ? '--' : data ? data.nao_respondidos_30min : '--'}
            description="Clientes aguardando há mais de 30min"
            color="danger"
          />
          <AlertCard
            title="Sem Link de Pagamento"
            icon="💳"
            count={isLoading ? '--' : data ? data.sem_link_pagamento : '--'}
            description="Interessados prontos para comprar"
            color="warning"
          />
          <AlertCard
            title="Carrinho Abandonado"
            icon="🛒"
            count={isLoading ? '--' : data ? data.carrinho_abandonado_2h : '--'}
            description="Clientes que receberam link mas não pagaram"
            color="info"
          />
        </div>

        {/* Loading/Error */}
        {isLoading && <div className="text-center text-muted-foreground py-8">Carregando...</div>}
        {error && <div className="text-center text-destructive py-8">{error}</div>}
      </div>
    </div>
  );
}

// Componentes auxiliares
function MetricCard({ title, icon, value, change, positive }: { title: string; icon: string; value: string | number; change: string | null; positive?: boolean }) {
  return (
    <div className="bg-card rounded-lg shadow-sm border border-border p-6 flex flex-col gap-2 hover:border-primary transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="text-muted-foreground text-sm font-medium">{title}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <div className="text-3xl font-bold text-foreground mb-1">{value}</div>
      {change && (
        <div className={`text-sm flex items-center gap-1 ${positive ? 'text-green-600' : 'text-red-600'}`}>{change}</div>
      )}
    </div>
  );
}

function AlertCard({ title, icon, count, description, color }: { title: string; icon: string; count: string | number; description: string; color: 'danger' | 'warning' | 'info' }) {
  const colorMap = {
    danger: 'border-red-400 bg-red-50 text-red-700',
    warning: 'border-yellow-400 bg-yellow-50 text-yellow-700',
    info: 'border-blue-400 bg-blue-50 text-blue-700',
  };
  return (
    <div className={`rounded-lg p-6 border ${colorMap[color]} flex flex-col gap-2 shadow-sm`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <span className="font-semibold text-base">{title}</span>
      </div>
      <div className="text-3xl font-bold">{count}</div>
      <div className="text-sm text-muted-foreground">{description}</div>
    </div>
  );
}