'use client';

import useSWR from 'swr';
import { DashboardAPIResponse, DashboardData } from '@/types/dashboard';

// O fetcher é uma função simples que encapsula a lógica de chamada à API.
// Ele lida com a requisição e a resposta, tratando erros de forma centralizada.
const fetcher = async (url: string): Promise<DashboardAPIResponse> => {
  // Verifica se estamos no lado do cliente
  if (typeof window === 'undefined') {
    throw new Error('Executando no servidor');
  }

  // Get auth token from localStorage
  const token = localStorage.getItem('auth-token');
  if (!token) {
    throw new Error('Usuário não autenticado');
  }

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorInfo = await response.json().catch(() => ({ message: 'An error occurred while fetching the data.' }));
    throw new Error(errorInfo.message || 'Failed to fetch dashboard data');
  }

  return response.json();
};

/**
 * Hook customizado para buscar os dados do dashboard de BI.
 * Utiliza SWR para caching, revalidação e gerenciamento de estado.
 *
 * @param empresaId - O ID da empresa para a qual buscar as métricas.
 * @param period - O período de tempo para a análise (ex: '7d', '30d').
 * @returns Um objeto com os dados do dashboard, estado de carregamento e erro.
 */
export function useDashboardMetrics(empresaId: string | null | undefined, period: string) {
  // Verifica se estamos no lado do cliente e se há um token
  const isClient = typeof window !== 'undefined';
  const hasToken = isClient ? !!localStorage.getItem('auth-token') : false;
  
  // Constrói a URL da API. Se não houver empresaId ou token, a URL será nula e o SWR não fará a requisição.
  const url = empresaId && hasToken ? `/api/dashboard/metrics?empresa_id=${empresaId}&period=${period}` : null;

  // Debug logs
  console.log('[useDashboardMetrics] Hook called with:', { empresaId, period, url });

  const { data, error, isLoading, mutate } = useSWR<DashboardAPIResponse>(
    url, 
    fetcher, 
    {
      // Mantém os dados anteriores em tela enquanto novos dados são carregados.
      // Isso proporciona uma experiência de usuário mais suave ao trocar filtros.
      keepPreviousData: true,
      // Em caso de erro, tenta novamente até 3 vezes com um backoff exponencial.
      shouldRetryOnError: true,
      revalidateOnFocus: false, // Opcional: desativa a revalidação ao focar na janela
      // Força revalidação quando o período mudar
      revalidateIfStale: true,
      revalidateOnMount: true,
    }
  );

  // Debug logs
  console.log('[useDashboardMetrics] SWR result:', { 
    hasData: !!data, 
    isLoading, 
    hasError: !!error,
    period,
    empresaId 
  });

  return {
    // Extrai os dados do dashboard da resposta da API.
    dashboardData: data?.data,
    // O SWR já fornece o estado de carregamento.
    isLoading,
    // Informa se ocorreu um erro na requisição.
    isError: !!error,
    // Expõe a função `mutate` do SWR para permitir a revalidação manual (ex: botão de refresh).
    refresh: mutate,
  };
}
