import { databaseService } from '@/lib/database';
import { DashboardMetrics, UltimaVenda } from '@/types/dashboard';

export interface IDashboardRepository {
  getMetricsByEmpresa(empresaId: string): Promise<DashboardMetrics>;
  getUltimasVendasByEmpresa(empresaId: string): Promise<UltimaVenda[]>;
  getEmpresasByUsuario(usuarioId: string): Promise<string[]>;
}

export class DashboardRepository implements IDashboardRepository {
  async getEmpresasByUsuario(usuarioId: string): Promise<string[]> {
    const supabase = databaseService.getClient();
    
    const { data: empresas, error } = await supabase
      .from('usuario_empresa')
      .select('empresa_id')
      .eq('usuario_id', usuarioId)
      .eq('ativo', true);

    if (error) {
      throw new Error(`Erro ao buscar empresas do usuário: ${error.message}`);
    }

    return empresas?.map(e => e.empresa_id) || [];
  }

  async getMetricsByEmpresa(empresaId: string): Promise<DashboardMetrics> {
    const supabase = databaseService.getClient();
    const hoje = new Date().toISOString().split('T')[0];

    // Vendas hoje (pedidos com status_pagamento = 'pago' criados hoje)
    const { data: vendasHoje, error: vendasError } = await supabase
      .from('pedido')
      .select('id')
      .eq('empresa_id', empresaId)
      .eq('status_pagamento', 'pago')
      .gte('created_at', `${hoje}T00:00:00`)
      .lt('created_at', `${hoje}T23:59:59`);

    if (vendasError) {
      throw new Error(`Erro ao buscar vendas: ${vendasError.message}`);
    }

    // Leads hoje (novos clientes que tiveram primeiro contato hoje)
    const { data: leadsHoje, error: leadsError } = await supabase
      .from('cliente_empresa')
      .select('id')
      .eq('empresa_id', empresaId)
      .gte('primeiro_contato', `${hoje}T00:00:00`)
      .lt('primeiro_contato', `${hoje}T23:59:59`);

    if (leadsError) {
      throw new Error(`Erro ao buscar leads: ${leadsError.message}`);
    }

    // Total de pedidos hoje para calcular taxa de conversão
    const { data: totalPedidos, error: pedidosError } = await supabase
      .from('pedido')
      .select('id')
      .eq('empresa_id', empresaId)
      .gte('created_at', `${hoje}T00:00:00`)
      .lt('created_at', `${hoje}T23:59:59`);

    if (pedidosError) {
      throw new Error(`Erro ao buscar pedidos: ${pedidosError.message}`);
    }

    // Carrinho abandonado (pedidos com status_pagamento = 'pendente')
    const { data: carrinhoAbandonado, error: carrinhoError } = await supabase
      .from('pedido')
      .select('id')
      .eq('empresa_id', empresaId)
      .eq('status_pagamento', 'pendente')
      .gte('created_at', `${hoje}T00:00:00`)
      .lt('created_at', `${hoje}T23:59:59`);

    if (carrinhoError) {
      throw new Error(`Erro ao buscar carrinho abandonado: ${carrinhoError.message}`);
    }

    const totalLeads = leadsHoje?.length || 0;
    const totalVendas = vendasHoje?.length || 0;
    const taxaConversao = totalLeads > 0 ? (totalVendas / totalLeads) * 100 : 0;

    return {
      vendasHoje: totalVendas,
      leadsHoje: totalLeads,
      taxaConversao: Math.round(taxaConversao * 100) / 100,
      carrinhoAbandonado: carrinhoAbandonado?.length || 0,
    };
  }

  async getUltimasVendasByEmpresa(empresaId: string): Promise<UltimaVenda[]> {
    const supabase = databaseService.getClient();

    const { data: vendas, error } = await supabase
      .from('pedido')
      .select(`
        id,
        valor_total,
        status_pagamento,
        created_at,
        cliente:cliente_id (
          nome
        )
      `)
      .eq('empresa_id', empresaId)
      .eq('status_pagamento', 'pago')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      throw new Error(`Erro ao buscar últimas vendas: ${error.message}`);
    }

    return vendas?.map(venda => ({
      id: venda.id,
      cliente_nome: (venda.cliente as any)?.nome || 'Cliente não informado',
      valor_total: venda.valor_total,
      created_at: venda.created_at,
      status_pagamento: venda.status_pagamento,
    })) || [];
  }
}

export const dashboardRepository = new DashboardRepository();