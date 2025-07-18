import { databaseService } from '@/lib/database';
import { Cliente, ClienteWithEmpresa, ClienteFilters, ClienteListResponse } from '@/types';

export interface IClienteRepository {
  getClientesByEmpresa(empresaId: string, filters: ClienteFilters): Promise<ClienteListResponse>;
  getClienteById(id: string): Promise<ClienteWithEmpresa | null>;
  createCliente(data: Omit<Cliente, 'id' | 'created_at' | 'updated_at'>): Promise<Cliente>;
  updateCliente(id: string, data: Partial<Cliente>): Promise<Cliente>;
  deleteCliente(id: string): Promise<void>;
}

export class ClienteRepository implements IClienteRepository {
  async getClientesByEmpresa(empresaId: string, filters: ClienteFilters = {}): Promise<ClienteListResponse> {
    const supabase = databaseService.getClient();
    const { nome, orderBy = 'recent', page = 1, limit = 10 } = filters;

    // Build SQL query with proper joins
    let sqlQuery = `
      SELECT 
        ce.id,
        ce.cliente_id,
        ce.empresa_id,
        ce.status,
        ce.primeiro_contato,
        ce.ultimo_contato,
        ce.total_mensagens,
        ce.observacoes,
        ce.tags,
        ce.created_at,
        ce.updated_at,
        c.id as cliente_id_full,
        c.nome as cliente_nome,
        c.telefone as cliente_telefone,
        c.created_at as cliente_created_at,
        c.updated_at as cliente_updated_at,
        c.asaas_customer_id
      FROM cliente_empresa ce
      JOIN cliente c ON ce.cliente_id = c.id
      WHERE ce.empresa_id = $1
    `;

    const queryParams = [empresaId];

    // Apply name filter if provided
    if (nome) {
      sqlQuery += ` AND c.nome ILIKE $${queryParams.length + 1}`;
      queryParams.push(`%${nome}%`);
    }

    // Apply ordering
    switch (orderBy) {
      case 'recent':
        sqlQuery += ` ORDER BY ce.primeiro_contato DESC`;
        break;
      case 'name':
        sqlQuery += ` ORDER BY c.nome ASC`;
        break;
      case 'date':
        sqlQuery += ` ORDER BY ce.created_at DESC`;
        break;
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    sqlQuery += ` LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit.toString(), offset.toString());

    // Execute the query
    const { data: clientesData, error } = await supabase.rpc('execute_raw_sql', {
      query: sqlQuery,
      params: queryParams
    });

    if (error) {
      // If RPC is not available, try direct query
      const { data: directData, error: directError } = await supabase
        .from('cliente_empresa')
        .select(`
          id,
          cliente_id,
          empresa_id,
          status,
          primeiro_contato,
          ultimo_contato,
          total_mensagens,
          observacoes,
          tags,
          created_at,
          updated_at,
          cliente (
            id,
            nome,
            telefone,
            created_at,
            updated_at,
            asaas_customer_id
          )
        `)
        .eq('empresa_id', empresaId)
        .order('primeiro_contato', { ascending: false })
        .range((page - 1) * limit, (page - 1) * limit + limit - 1);

      if (directError) {
        throw new Error(`Erro ao buscar clientes: ${directError.message}`);
      }

      // Transform direct data
      const clientes: ClienteWithEmpresa[] = directData?.map(ce => ({
        id: (ce.cliente as any).id,
        nome: (ce.cliente as any).nome,
        telefone: (ce.cliente as any).telefone,
        created_at: (ce.cliente as any).created_at,
        updated_at: (ce.cliente as any).updated_at,
        asaas_customer_id: (ce.cliente as any).asaas_customer_id,
        cliente_empresa: {
          id: ce.id,
          cliente_id: ce.cliente_id,
          empresa_id: ce.empresa_id,
          status: ce.status,
          primeiro_contato: ce.primeiro_contato,
          ultimo_contato: ce.ultimo_contato,
          total_mensagens: ce.total_mensagens,
          observacoes: ce.observacoes,
          tags: ce.tags,
          created_at: ce.created_at,
          updated_at: ce.updated_at,
        }
      })) || [];

      // Get total count for pagination
      const { count } = await supabase
        .from('cliente_empresa')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_id', empresaId);

      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        clientes,
        total,
        page,
        limit,
        totalPages,
      };
    }

    // Transform SQL results to match ClienteWithEmpresa interface
    const clientes: ClienteWithEmpresa[] = clientesData?.map((row: any) => ({
      id: row.cliente_id_full,
      nome: row.cliente_nome,
      telefone: row.cliente_telefone,
      created_at: row.cliente_created_at,
      updated_at: row.cliente_updated_at,
      asaas_customer_id: row.asaas_customer_id,
      cliente_empresa: {
        id: row.id,
        cliente_id: row.cliente_id,
        empresa_id: row.empresa_id,
        status: row.status,
        primeiro_contato: row.primeiro_contato,
        ultimo_contato: row.ultimo_contato,
        total_mensagens: row.total_mensagens,
        observacoes: row.observacoes,
        tags: row.tags,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }
    })) || [];

    // Get total count for pagination
    const { count } = await supabase
      .from('cliente_empresa')
      .select('*', { count: 'exact', head: true })
      .eq('empresa_id', empresaId);

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      clientes,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getClienteById(id: string): Promise<ClienteWithEmpresa | null> {
    const supabase = databaseService.getClient();

    const { data: clienteEmpresa, error } = await supabase
      .from('cliente_empresa')
      .select(`
        id,
        cliente_id,
        empresa_id,
        status,
        primeiro_contato,
        ultimo_contato,
        total_mensagens,
        observacoes,
        tags,
        created_at,
        updated_at,
        cliente:cliente_id (
          id,
          nome,
          telefone,
          created_at,
          updated_at,
          asaas_customer_id
        )
      `)
      .eq('cliente_id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Erro ao buscar cliente: ${error.message}`);
    }

    return {
      ...(clienteEmpresa.cliente as unknown as Cliente),
      cliente_empresa: {
        id: clienteEmpresa.id,
        cliente_id: clienteEmpresa.cliente_id,
        empresa_id: clienteEmpresa.empresa_id,
        status: clienteEmpresa.status,
        primeiro_contato: clienteEmpresa.primeiro_contato,
        ultimo_contato: clienteEmpresa.ultimo_contato,
        total_mensagens: clienteEmpresa.total_mensagens,
        observacoes: clienteEmpresa.observacoes,
        tags: clienteEmpresa.tags,
        created_at: clienteEmpresa.created_at,
        updated_at: clienteEmpresa.updated_at,
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