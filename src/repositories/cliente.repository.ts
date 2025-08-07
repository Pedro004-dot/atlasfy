import { databaseService } from '@/lib/database';
import { Cliente, ClienteWithEmpresa, ClienteFilters, ClienteListResponse } from '@/types';

export interface IClienteRepository {
  getAllClientesByEmpresa(empresaId: string): Promise<ClienteListResponse>;
  getClientesByEmpresa(empresaId: string, filters: ClienteFilters): Promise<ClienteListResponse>;
  getClienteById(id: string): Promise<ClienteWithEmpresa | null>;
  createCliente(data: Omit<Cliente, 'id' | 'created_at' | 'updated_at'>): Promise<Cliente>;
  updateCliente(id: string, data: Partial<Cliente>): Promise<Cliente>;
  deleteCliente(id: string): Promise<void>;
}

export class ClienteRepository implements IClienteRepository {
  async getAllClientesByEmpresa(empresaId: string): Promise<ClienteListResponse> {
    const supabase = databaseService.getClient();
    const { data, error } = await supabase
      .from('cliente')
      .select('*')
      .eq('empresa_id', empresaId);

    return {
      clientes: data || [],
      total: data?.length || 0,
      page: 1,
      limit: 10000,
      totalPages: 1,
    };
  }
  async getClientesByEmpresa(empresaId: string, filters: ClienteFilters = {}): Promise<ClienteListResponse> {
    const supabase = databaseService.getClient();
    const { nome, orderBy = 'recent', page = 1, limit = 10 } = filters;

    // 1. Buscar clientes diretamente da tabela cliente com empresa_id
    let query = supabase
      .from('cliente')
      .select('*', { count: 'exact' })
      .eq('empresa_id', empresaId);

    // 2. Filtros por nome e telefone
    if (nome) {
      // Buscar tanto por nome quanto por telefone
      const searchPattern = `%${nome}%`;
      query = query.or(`nome.ilike.${searchPattern},telefone.ilike.${searchPattern}`);
    }

    // 3. Ordenação
    switch (orderBy) {
      case 'recent':
        query = query.order('created_at', { ascending: false });
        break;
      case 'name':
        query = query.order('nome', { ascending: true });
        break;
      case 'date':
        query = query.order('created_at', { ascending: false });
        break;
    }

    // 4. Paginação
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    // 5. Executar query
    const { data: clientes, error, count } = await query;
    if (error) {
      throw new Error(`Erro ao buscar clientes: ${error.message}`);
    }

    // 6. Mapear para o formato ClienteWithEmpresa
    const clientesWithEmpresa: ClienteWithEmpresa[] = (clientes || []).map(cliente => ({
      ...cliente,
      cliente_empresa: {
        id: cliente.id,
        cliente_id: cliente.id,
        empresa_id: cliente.empresa_id,
        status: 'ativo',
        primeiro_contato: cliente.created_at,
        ultimo_contato: cliente.updated_at,
        total_mensagens: 0, // Pode ser calculado posteriormente
        observacoes: null,
        tags: [],
        created_at: cliente.created_at,
        updated_at: cliente.updated_at,
      }
    }));

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      clientes: clientesWithEmpresa,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getClienteById(id: string): Promise<ClienteWithEmpresa | null> {
    const supabase = databaseService.getClient();

    const { data: cliente, error } = await supabase
      .from('cliente')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Erro ao buscar cliente: ${error.message}`);
    }

    if (!cliente) {
      return null;
    }

    return {
      ...cliente,
      cliente_empresa: {
        id: cliente.id,
        cliente_id: cliente.id,
        empresa_id: cliente.empresa_id,
        status: 'ativo',
        primeiro_contato: cliente.created_at,
        ultimo_contato: cliente.updated_at,
        total_mensagens: 0,
        observacoes: null,
        tags: [],
        created_at: cliente.created_at,
        updated_at: cliente.updated_at,
      }
    };
  }

  async createCliente(data: Omit<Cliente, 'id' | 'created_at' | 'updated_at'>): Promise<Cliente> {
    const supabase = databaseService.getClient();

    const { data: cliente, error } = await supabase
      .from('cliente')
      .insert([data])
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar cliente: ${error.message}`);
    }

    return cliente;
  }

  async updateCliente(id: string, data: Partial<Cliente>): Promise<Cliente> {
    const supabase = databaseService.getClient();

    const { data: cliente, error } = await supabase
      .from('cliente')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar cliente: ${error.message}`);
    }

    return cliente;
  }

  async deleteCliente(id: string): Promise<void> {
    const supabase = databaseService.getClient();

    const { error } = await supabase
      .from('cliente')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao deletar cliente: ${error.message}`);
    }
  }
}

export const clienteRepository = new ClienteRepository();