import { databaseService } from '@/lib/database';
import { Agente, CreateAgenteData, ProdutoAgente, CreateProdutoAgenteData, CreateEmpresaData } from '@/types';

export interface IAgenteRepository {
  create(data: CreateAgenteData): Promise<Agente>;
  findById(id: string): Promise<Agente | null>;
  findByEmpresaId(empresaId: string): Promise<Agente[]>;
  findByUserId(userId: string): Promise<Agente[]>;
  update(id: string, data: Partial<CreateAgenteData>): Promise<Agente>;
  delete(id: string): Promise<void>;
  createEmpresa(data: CreateEmpresaData, userId: string): Promise<string>;
  createProdutoAgente(agenteId: string, data: CreateProdutoAgenteData): Promise<ProdutoAgente>;
  getProdutosByAgenteId(agenteId: string): Promise<ProdutoAgente[]>;
  updateProdutoAgente(id: string, data: Partial<CreateProdutoAgenteData>): Promise<ProdutoAgente>;
  deleteProdutoAgente(id: string): Promise<void>;
}

export class AgenteRepository implements IAgenteRepository {
  async create(data: CreateAgenteData): Promise<Agente> {
    const supabase = databaseService.getClient();
    
    const { data: agente, error } = await supabase
      .from('agente')
      .insert([{
        nome: data.nome,
        genero: data.genero,
        personalidade: data.personalidade,
        empresa_id: data.empresa_id,
        whatsapp_numero: data.whatsapp_numero,
        fluxo_conversa: data.fluxo_conversa,
        ativo: true,
        whatsapp_conectado: false,
      }])
      .select(`
        *,
        empresa:empresa_id (
          id,
          nome,
          cnpj,
          telefone,
          endereco,
          link_google_maps,
          created_at,
          updated_at
        )
      `)
      .single();

    if (error) {
      throw new Error(`Erro ao criar agente: ${error.message}`);
    }

    return agente;
  }

  async findById(id: string): Promise<Agente | null> {
    const supabase = databaseService.getClient();
    
    const { data: agente, error } = await supabase
      .from('agente')
      .select(`
        *,
        empresa:empresa_id (
          id,
          nome,
          cnpj,
          telefone,
          endereco,
          link_google_maps,
          created_at,
          updated_at
        )
      `)
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Erro ao buscar agente: ${error.message}`);
    }

    return agente || null;
  }

  async findByEmpresaId(empresaId: string): Promise<Agente[]> {
    const supabase = databaseService.getClient();
    
    const { data: agentes, error } = await supabase
      .from('agente')
      .select(`
        *,
        empresa:empresa_id (
          id,
          nome,
          cnpj,
          telefone,
          endereco,
          link_google_maps,
          created_at,
          updated_at
        )
      `)
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Erro ao buscar agentes: ${error.message}`);
    }

    return agentes || [];
  }

  async findByUserId(userId: string): Promise<Agente[]> {
    const supabase = databaseService.getClient();
    
    // First get the companies that the user belongs to
    const { data: userCompanies, error: userCompaniesError } = await supabase
      .from('usuario_empresa')
      .select('empresa_id')
      .eq('usuario_id', userId)
      .eq('ativo', true);

    if (userCompaniesError) {
      throw new Error(`Erro ao buscar empresas do usuário: ${userCompaniesError.message}`);
    }

    if (!userCompanies || userCompanies.length === 0) {
      return [];
    }

    const companyIds = userCompanies.map(uc => uc.empresa_id);

    // Then get agents for those companies
    const { data: agentes, error } = await supabase
      .from('agente')
      .select(`
        *,
        empresa:empresa_id (
          id,
          nome,
          cnpj,
          telefone,
          endereco,
          link_google_maps,
          created_at,
          updated_at
        )
      `)
      .in('empresa_id', companyIds)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Erro ao buscar agentes do usuário: ${error.message}`);
    }

    return agentes || [];
  }

  async update(id: string, data: Partial<CreateAgenteData>): Promise<Agente> {
    const supabase = databaseService.getClient();
    
    const { data: agente, error } = await supabase
      .from('agente')
      .update(data)
      .eq('id', id)
      .select(`
        *,
        empresa:empresa_id (
          id,
          nome,
          cnpj,
          telefone,
          endereco,
          link_google_maps,
          created_at,
          updated_at
        )
      `)
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar agente: ${error.message}`);
    }

    return agente;
  }

  async delete(id: string): Promise<void> {
    const supabase = databaseService.getClient();
    
    const { error } = await supabase
      .from('agente')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao deletar agente: ${error.message}`);
    }
  }

  async createEmpresa(data: CreateEmpresaData, userId: string): Promise<string> {
    const supabase = databaseService.getClient();
    
    const { data: empresa, error } = await supabase
      .from('empresa')
      .insert([{
        nome: data.nome,
        cnpj: data.cnpj,
        telefone: data.telefone,
        endereco: data.endereco,
        link_google_maps: data.link_google_maps,
        nome_atendente: data.nome_atendente,
        genero_atendente: data.genero_atendente,
        numeroSuporte: data.numeroSuporte,
        descricao: data.descricao,
      }])
      .select('id')
      .single();

    if (error) {
      throw new Error(`Erro ao criar empresa: ${error.message}`);
    }

    // Link user to company
    const { error: linkError } = await supabase
      .from('usuario_empresa')
      .insert([{
        usuario_id: userId,
        empresa_id: empresa.id,
        papel: 'proprietario',
        ativo: true,
      }]);

    if (linkError) {
      throw new Error(`Erro ao vincular usuário à empresa: ${linkError.message}`);
    }

    return empresa.id;
  }

  async createProdutoAgente(agenteId: string, data: CreateProdutoAgenteData): Promise<ProdutoAgente> {
    const supabase = databaseService.getClient();
    
    const { data: produto, error } = await supabase
      .from('produto_agente')
      .insert([{
        agente_id: agenteId,
        nome: data.nome,
        descricao: data.descricao,
        preco: data.preco,
        link_checkout: data.link_checkout,
        imagens: data.imagens,
        videos: data.videos,
        prova_social: data.prova_social,
        ativo: true,
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar produto do agente: ${error.message}`);
    }

    return produto;
  }

  async getProdutosByAgenteId(agenteId: string): Promise<ProdutoAgente[]> {
    const supabase = databaseService.getClient();
    
    const { data: produtos, error } = await supabase
      .from('produto_agente')
      .select('*')
      .eq('agente_id', agenteId)
      .eq('ativo', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Erro ao buscar produtos do agente: ${error.message}`);
    }

    return produtos || [];
  }

  async updateProdutoAgente(id: string, data: Partial<CreateProdutoAgenteData>): Promise<ProdutoAgente> {
    const supabase = databaseService.getClient();
    
    const { data: produto, error } = await supabase
      .from('produto_agente')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar produto do agente: ${error.message}`);
    }

    return produto;
  }

  async deleteProdutoAgente(id: string): Promise<void> {
    const supabase = databaseService.getClient();
    
    const { error } = await supabase
      .from('produto_agente')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao deletar produto do agente: ${error.message}`);
    }
  }
}