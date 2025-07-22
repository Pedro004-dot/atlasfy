"use client";

import React, { useState, useEffect } from 'react';
import { MetricsCards } from '@/components/dashboard/metrics-cards';
import { RecentSales } from '@/components/dashboard/recent-sales';
import { DashboardData } from '@/types/dashboard';
import { useAuth } from '@/hooks/useAuth';

interface DashboardPageState {
  data: DashboardData | null;
  isLoading: boolean;
  error: string | null;
}

export default function DashboardPage() {
  const [state, setState] = useState<DashboardPageState>({
    data: null,
    isLoading: true,
    error: null,
  });


  const fetchDashboardData = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const token = localStorage.getItem('auth-token');
      if (!token) {
        throw new Error('Token não encontrado');
      }
      const empresaId = '3749ded8-bdd3-4055-a44c-fc64fd0f70df'; // Troque por dinâmico se necessário
      const response = await fetch(`/api/dashboard/overview?empresa_id=${empresaId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error('Erro ao buscar dados do dashboard');
      }
      const data = await response.json();

      // Trate o shape do dado conforme esperado
      if (!data.success) {
        throw new Error(data.message || 'Erro ao carregar dados');
      }

      setState(prev => ({
        ...prev,
        data: data.data,
        isLoading: false,
      }));
    } catch (error: any) {
      console.error('Erro ao buscar dados do dashboard:', error);
      setState(prev => ({
        ...prev,
        error: error.message || 'Erro desconhecido',
        isLoading: false,
      }));
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (state.error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md w-full bg-card rounded-lg shadow-sm border border-border p-6">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <svg
                className="mx-auto h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              Erro ao carregar dashboard
            </h3>
            <p className="text-sm text-muted-foreground mb-6">{state.error}</p>
            <button
              onClick={fetchDashboardData}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Visão geral das suas vendas e métricas de hoje
        </p>
      </div>

      {/* Métricas */}
      <MetricsCards
        metrics={state.data?.metrics || {
          vendasHoje: 0,
          leadsHoje: 0,
          taxaConversao: 0,
          carrinhoAbandonado: 0,
        }}
        isLoading={state.isLoading}
      />

      {/* Últimas Vendas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentSales
            vendas={state.data?.ultimasVendas || []}
            isLoading={state.isLoading}
          />
        </div>
        
        {/* Espaço para gráficos futuros */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Resumo Rápido
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Status do sistema</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Online
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Última atualização</span>
              <span className="text-xs text-muted-foreground">
                {new Date().toLocaleTimeString('pt-BR')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}