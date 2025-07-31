"use client";

import React from 'react';
import { TrendingUp, Users, Target, ShoppingCart } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

function MetricCard({ title, value, icon: Icon, trend = 'neutral', className = '' }: MetricCardProps) {
  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-600',
  };

  return (
    <div className={`bg-card rounded-lg shadow-sm border border-border p-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-full bg-primary/10 ${trendColors[trend]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

interface SimpleMetrics {
  vendasHoje: number;
  leadsHoje: number;
  taxaConversao: number;
  carrinhoAbandonado: number;
}

interface MetricsCardsProps {
  metrics: SimpleMetrics;
  isLoading?: boolean;
}

export function MetricsCards({ metrics, isLoading }: MetricsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, index) => (
          <div
            key={index}
            className="bg-card rounded-lg shadow-sm border border-border p-6 animate-pulse"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-20"></div>
                <div className="h-8 bg-muted rounded w-16"></div>
              </div>
              <div className="p-3 rounded-full bg-muted">
                <div className="h-6 w-6 bg-muted rounded"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <MetricCard
        title="Vendas Hoje"
        value={metrics.vendasHoje}
        icon={TrendingUp}
        trend="up"
      />
      <MetricCard
        title="Leads Hoje"
        value={metrics.leadsHoje}
        icon={Users}
        trend="up"
      />
      <MetricCard
        title="Taxa de Conversão"
        value={`${metrics.taxaConversao}%`}
        icon={Target}
        trend={metrics.taxaConversao > 0 ? 'up' : 'neutral'}
      />
      <MetricCard
        title="Carrinho Abandonado"
        value={metrics.carrinhoAbandonado}
        icon={ShoppingCart}
        trend={metrics.carrinhoAbandonado > 0 ? 'down' : 'neutral'}
      />
    </div>
  );
}