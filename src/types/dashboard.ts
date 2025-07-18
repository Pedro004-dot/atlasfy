export interface DashboardMetrics {
  vendasHoje: number;
  leadsHoje: number;
  taxaConversao: number;
  carrinhoAbandonado: number;
}

export interface UltimaVenda {
  id: string;
  cliente_nome: string;
  valor_total: number;
  created_at: string;
  status_pagamento: string;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  ultimasVendas: UltimaVenda[];
}

export interface Empresa {
  id: string;
  nome: string;
  telefone: string;
  created_at: string;
}

export interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  created_at: string;
}

export interface Pedido {
  id: string;
  empresa_id: string;
  cliente_id: string;
  produto_id: string;
  valor_total: number;
  status_pagamento: string;
  status_pedido: string;
  created_at: string;
}