import { useState, useCallback, useEffect } from 'react';
import { useAuth } from './useAuth';

export interface DashboardOverview {
  empresa_id: string;
  conversion_rate_24h: number;
  vendas_finalizadas_24h: number;
  total_conversas_24h: number;
  receita_hoje: number;
  vendas_count_hoje: number;
  ticket_medio_7d: number;
  sla_percentage_24h: number;
  nao_respondidos_30min: number;
  sem_link_pagamento: number;
  carrinho_abandonado_2h: number;
}

interface UseDashboardOverviewResult {
  data: DashboardOverview | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useDashboardOverview(empresaId: string, period?: string): UseDashboardOverviewResult {

  const [data, setData] = useState<DashboardOverview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    if (!empresaId) return;
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ empresa_id: empresaId });
      if (period) params.append('period', period);
      const token = localStorage.getItem('auth-token');
      if (!token) {
        throw new Error('Token não encontrado');
      }
      const res = await fetch(`/api/dashboard/overview?empresa_id=${empresaId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.message || 'Erro ao buscar dados do dashboard');
        setData(null);
      } else {
        setData(json.data);
      }
    } catch (err: any) {
      console.error('Erro no fetchOverview', err);
      setError(err.message || 'Erro desconhecido');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [empresaId, period]);

  useEffect(() => {
    if (empresaId) {
      fetchOverview();
    }
    }, [empresaId, period, fetchOverview]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchOverview,
  };
} 