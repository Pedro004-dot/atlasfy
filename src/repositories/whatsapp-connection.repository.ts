import { databaseService } from '@/lib/database';
import { 
  WhatsAppConnection, 
  CreateWhatsAppConnectionData, 
  EvolutionInstanceData 
} from '@/types';

export interface IWhatsAppConnectionRepository {
  create(data: CreateWhatsAppConnectionData & { user_id: string }): Promise<WhatsAppConnection>;
  findById(id: string): Promise<WhatsAppConnection | null>;
  findByInstanceName(instanceName: string): Promise<WhatsAppConnection | null>;
  findByUserId(userId: string): Promise<WhatsAppConnection[]>;
  findByAgentId(agentId: string): Promise<WhatsAppConnection | null>;
  updateQrCode(instanceName: string, qrCode: string): Promise<WhatsAppConnection>;
  updateStatus(instanceName: string, status: WhatsAppConnection['status'], errorMessage?: string): Promise<WhatsAppConnection>;
  updatePhoneConnection(instanceName: string, phoneNumber: string, profileName?: string): Promise<WhatsAppConnection>;
  updateEvolutionData(instanceName: string, data: EvolutionInstanceData): Promise<WhatsAppConnection>;
  incrementAttempts(instanceName: string): Promise<WhatsAppConnection>;
  delete(id: string): Promise<void>;
  deleteByInstanceName(instanceName: string): Promise<void>;
  cleanupExpired(): Promise<number>;
}

export class WhatsAppConnectionRepository implements IWhatsAppConnectionRepository {
  
  /**
   * Validates if a string is a valid UUID format
   */
  private isValidUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }
  
  async create(data: CreateWhatsAppConnectionData & { user_id: string }): Promise<WhatsAppConnection> {
    console.log('=== Repository: create ===');
    console.log('Create data:', data);
    
    const supabase = databaseService.getClient();
    
    // Validate agent_id - only use if it's a valid UUID, otherwise set to null
    const validAgentId = data.agent_id && this.isValidUUID(data.agent_id) ? data.agent_id : null;
    
    console.log('Agent ID validation:', {
      original: data.agent_id,
      isValid: data.agent_id ? this.isValidUUID(data.agent_id) : false,
      final: validAgentId
    });
    
    const insertData = {
      user_id: data.user_id,
      instance_name: data.instance_name,
      agent_id: validAgentId,
      webhook_url: data.webhook_url,
      status: 'pending',
      connection_attempts: 0,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
    };
    
    console.log('Insert data:', insertData);
    
    const { data: connection, error } = await supabase
      .from('whatsapp_connections')
      .insert([insertData])
      .select(`
        *,
        agente:agent_id (
          id,
          nome,
          genero,
          personalidade,
          empresa_id,
          ativo,
          whatsapp_conectado,
          whatsapp_numero,
          fluxo_conversa,
          created_at,
          updated_at
        )
      `)
      .single();

    console.log('Database result:', { connection, error });

    if (error) {
      console.error('Database error:', error);
      throw new Error(`Erro ao criar conexão WhatsApp: ${error.message}`);
    }

    console.log('Connection created successfully:', connection);
    return connection;
  }

  async findById(id: string): Promise<WhatsAppConnection | null> {
    const supabase = databaseService.getClient();
    
    const { data: connection, error } = await supabase
      .from('whatsapp_connections')
      .select(`
        *,
        agente:agent_id (
          id,
          nome,
          genero,
          personalidade,
          empresa_id,
          ativo,
          whatsapp_conectado,
          whatsapp_numero,
          fluxo_conversa,
          created_at,
          updated_at
        )
      `)
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Erro ao buscar conexão WhatsApp: ${error.message}`);
    }

    return connection || null;
  }

  async findByInstanceName(instanceName: string): Promise<WhatsAppConnection | null> {
    const supabase = databaseService.getClient();
    
    const { data: connection, error } = await supabase
      .from('whatsapp_connections')
      .select(`
        *,
        agente:agent_id (
          id,
          nome,
          genero,
          personalidade,
          empresa_id,
          ativo,
          whatsapp_conectado,
          whatsapp_numero,
          fluxo_conversa,
          created_at,
          updated_at
        )
      `)
      .eq('instance_name', instanceName)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Erro ao buscar conexão WhatsApp: ${error.message}`);
    }

    return connection || null;
  }

  async findByUserId(userId: string): Promise<WhatsAppConnection[]> {
    const supabase = databaseService.getClient();
    
    const { data: connections, error } = await supabase
      .from('whatsapp_connections')
      .select(`
        *,
        agente:agent_id (
          id,
          nome,
          genero,
          personalidade,
          empresa_id,
          ativo,
          whatsapp_conectado,
          whatsapp_numero,
          fluxo_conversa,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Erro ao buscar conexões WhatsApp do usuário: ${error.message}`);
    }

    return connections || [];
  }

  async findByAgentId(agentId: string): Promise<WhatsAppConnection | null> {
    const supabase = databaseService.getClient();
    
    const { data: connection, error } = await supabase
      .from('whatsapp_connections')
      .select(`
        *,
        agente:agent_id (
          id,
          nome,
          genero,
          personalidade,
          empresa_id,
          ativo,
          whatsapp_conectado,
          whatsapp_numero,
          fluxo_conversa,
          created_at,
          updated_at
        )
      `)
      .eq('agent_id', agentId)
      .eq('status', 'connected')
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Erro ao buscar conexão WhatsApp do agente: ${error.message}`);
    }

    return connection || null;
  }

  async updateQrCode(instanceName: string, qrCode: string): Promise<WhatsAppConnection> {
    const supabase = databaseService.getClient();
    
    const { data: connection, error } = await supabase
      .from('whatsapp_connections')
      .update({
        qr_code: qrCode,
        last_updated: new Date().toISOString(),
      })
      .eq('instance_name', instanceName)
      .select(`
        *,
        agente:agent_id (
          id,
          nome,
          genero,
          personalidade,
          empresa_id,
          ativo,
          whatsapp_conectado,
          whatsapp_numero,
          fluxo_conversa,
          created_at,
          updated_at
        )
      `)
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar QR Code: ${error.message}`);
    }

    return connection;
  }

  async updateStatus(
    instanceName: string, 
    status: WhatsAppConnection['status'], 
    errorMessage?: string
  ): Promise<WhatsAppConnection> {
    const supabase = databaseService.getClient();
    
    const updateData: any = {
      status,
      last_updated: new Date().toISOString(),
    };

    if (errorMessage) {
      updateData.last_error = errorMessage;
    }

    // If status is expired or error, clear the QR code
    if (status === 'expired' || status === 'error') {
      updateData.qr_code = null;
    }

    const { data: connection, error } = await supabase
      .from('whatsapp_connections')
      .update(updateData)
      .eq('instance_name', instanceName)
      .select(`
        *,
        agente:agent_id (
          id,
          nome,
          genero,
          personalidade,
          empresa_id,
          ativo,
          whatsapp_conectado,
          whatsapp_numero,
          fluxo_conversa,
          created_at,
          updated_at
        )
      `)
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar status: ${error.message}`);
    }

    return connection;
  }

  async updatePhoneConnection(
    instanceName: string, 
    phoneNumber: string, 
    profileName?: string
  ): Promise<WhatsAppConnection> {
    const supabase = databaseService.getClient();
    
    const updateData: any = {
      phone_number: phoneNumber,
      status: 'connected',
      qr_code: null, // Clear QR code when connected
      last_updated: new Date().toISOString(),
    };

    // Update evolution instance data if we have profile name
    if (profileName) {
      updateData.evolution_instance_data = {
        profileName,
      };
    }

    const { data: connection, error } = await supabase
      .from('whatsapp_connections')
      .update(updateData)
      .eq('instance_name', instanceName)
      .select(`
        *,
        agente:agent_id (
          id,
          nome,
          genero,
          personalidade,
          empresa_id,
          ativo,
          whatsapp_conectado,
          whatsapp_numero,
          fluxo_conversa,
          created_at,
          updated_at
        )
      `)
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar conexão do telefone: ${error.message}`);
    }

    // Update agent whatsapp status if agent is linked
    if (connection.agent_id) {
      await supabase
        .from('agente')
        .update({
          whatsapp_conectado: true,
          whatsapp_numero: phoneNumber,
        })
        .eq('id', connection.agent_id);
    }

    return connection;
  }

  async updateEvolutionData(instanceName: string, data: EvolutionInstanceData): Promise<WhatsAppConnection> {
    const supabase = databaseService.getClient();
    
    const { data: connection, error } = await supabase
      .from('whatsapp_connections')
      .update({
        evolution_instance_data: data,
        last_updated: new Date().toISOString(),
      })
      .eq('instance_name', instanceName)
      .select(`
        *,
        agente:agent_id (
          id,
          nome,
          genero,
          personalidade,
          empresa_id,
          ativo,
          whatsapp_conectado,
          whatsapp_numero,
          fluxo_conversa,
          created_at,
          updated_at
        )
      `)
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar dados da Evolution API: ${error.message}`);
    }

    return connection;
  }

  async incrementAttempts(instanceName: string): Promise<WhatsAppConnection> {
    const supabase = databaseService.getClient();
    
    // First get current attempts count
    const { data: current, error: fetchError } = await supabase
      .from('whatsapp_connections')
      .select('connection_attempts')
      .eq('instance_name', instanceName)
      .single();

    if (fetchError) {
      throw new Error(`Erro ao buscar tentativas: ${fetchError.message}`);
    }

    const { data: connection, error } = await supabase
      .from('whatsapp_connections')
      .update({
        connection_attempts: (current.connection_attempts || 0) + 1,
        last_updated: new Date().toISOString(),
      })
      .eq('instance_name', instanceName)
      .select(`
        *,
        agente:agent_id (
          id,
          nome,
          genero,
          personalidade,
          empresa_id,
          ativo,
          whatsapp_conectado,
          whatsapp_numero,
          fluxo_conversa,
          created_at,
          updated_at
        )
      `)
      .single();

    if (error) {
      throw new Error(`Erro ao incrementar tentativas: ${error.message}`);
    }

    return connection;
  }

  async delete(id: string): Promise<void> {
    const supabase = databaseService.getClient();
    
    const { error } = await supabase
      .from('whatsapp_connections')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao deletar conexão WhatsApp: ${error.message}`);
    }
  }

  async deleteByInstanceName(instanceName: string): Promise<void> {
    const supabase = databaseService.getClient();
    
    const { error } = await supabase
      .from('whatsapp_connections')
      .delete()
      .eq('instance_name', instanceName);

    if (error) {
      throw new Error(`Erro ao deletar conexão WhatsApp: ${error.message}`);
    }
  }

  async cleanupExpired(): Promise<number> {
    const supabase = databaseService.getClient();
    
    const { data: expiredConnections, error } = await supabase
      .from('whatsapp_connections')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .eq('status', 'pending')
      .select('id');

    if (error) {
      throw new Error(`Erro ao limpar conexões expiradas: ${error.message}`);
    }

    return expiredConnections?.length || 0;
  }
}