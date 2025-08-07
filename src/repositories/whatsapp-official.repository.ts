import { databaseService } from '@/lib/database';
import { getEncryptionService } from '@/lib/encryption';
import {
  WhatsAppOfficialConnection,
  CreateOfficialConnectionData,
  ConnectionStatus,
  HealthStatus
} from '@/types/whatsapp-official';
import { 
  IWhatsAppOfficialRepository, 
  IWhatsAppOfficialLogsRepository 
} from './interfaces/IWhatsAppOfficialRepository';

/**
 * Implementação concreta do WhatsApp Official Repository
 * Implementa interface abstrata para manter Open/Closed principle
 */
export class WhatsAppOfficialRepository implements IWhatsAppOfficialRepository {
  private readonly encryption = getEncryptionService();

  /**
   * Cria nova conexão WhatsApp Oficial
   */
  async create(data: CreateOfficialConnectionData & { user_id: string }): Promise<WhatsAppOfficialConnection> {
    const supabase = databaseService.getClient();

    try {
      // Criptografar dados sensíveis
      const encryptedData = {
        ...data,
        app_secret_encrypted: this.encryption.encrypt(data.app_secret),
        webhook_secret_encrypted: data.webhook_secret ? 
          this.encryption.encrypt(data.webhook_secret) : null
      };

      // Remover dados não criptografados
      delete encryptedData.app_secret;
      delete encryptedData.webhook_secret;

      const { data: connection, error } = await supabase
        .from('whatsapp_official_connections')
        .insert([{
          ...encryptedData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select(`
          *,
          agente:agent_id (
            id, nome, genero, personalidade, empresa_id, ativo,
            whatsapp_conectado, whatsapp_numero, fluxo_conversa,
            created_at, updated_at
          ),
          empresa:empresa_id (
            id, nome, cnpj, setor, created_at
          ),
          usuario:user_id (
            id, nome, email, created_at
          )
        `)
        .single();

      if (error) {
        console.error('Repository create error:', error);
        throw new Error(`Failed to create WhatsApp connection: ${error.message}`);
      }

      return connection;

    } catch (error) {
      console.error('Repository create error:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Unknown error creating connection'
      );
    }
  }

  /**
   * Busca conexão por ID
   */
  async findById(id: string): Promise<WhatsAppOfficialConnection | null> {
    const supabase = databaseService.getClient();

    try {
      const { data: connection, error } = await supabase
        .from('whatsapp_official_connections')
        .select(`
          *,
          agente:agent_id (
            id, nome, genero, personalidade, empresa_id, ativo,
            whatsapp_conectado, whatsapp_numero, fluxo_conversa,
            created_at, updated_at
          ),
          empresa:empresa_id (
            id, nome, cnpj, setor, created_at
          ),
          usuario:user_id (
            id, nome, email, created_at
          )
        `)
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Repository findById error:', error);
        throw new Error(`Failed to find connection: ${error.message}`);
      }

      return connection || null;

    } catch (error) {
      console.error('Repository findById error:', error);
      if (error instanceof Error && error.message.includes('Failed to find connection')) {
        throw error;
      }
      return null;
    }
  }

  /**
   * Busca conexão por Phone Number ID da Meta
   */
  async findByPhoneNumberId(phoneNumberId: string): Promise<WhatsAppOfficialConnection | null> {
    const supabase = databaseService.getClient();

    try {
      const { data: connection, error } = await supabase
        .from('whatsapp_official_connections')
        .select(`
          *,
          agente:agent_id (
            id, nome, genero, personalidade, empresa_id, ativo,
            whatsapp_conectado, whatsapp_numero, fluxo_conversa,
            created_at, updated_at
          )
        `)
        .eq('phone_number_id', phoneNumberId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Repository findByPhoneNumberId error:', error);
        throw new Error(`Failed to find connection by phone number ID: ${error.message}`);
      }

      return connection || null;

    } catch (error) {
      console.error('Repository findByPhoneNumberId error:', error);
      if (error instanceof Error && error.message.includes('Failed to find connection')) {
        throw error;
      }
      return null;
    }
  }

  /**
   * Busca conexões por User ID
   */
  async findByUserId(userId: string): Promise<WhatsAppOfficialConnection[]> {
    const supabase = databaseService.getClient();

    try {
      const { data: connections, error } = await supabase
        .from('whatsapp_official_connections')
        .select(`
          *,
          agente:agent_id (
            id, nome, genero, personalidade, empresa_id, ativo,
            whatsapp_conectado, whatsapp_numero, fluxo_conversa,
            created_at, updated_at
          ),
          empresa:empresa_id (
            id, nome, cnpj, setor, created_at
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Repository findByUserId error:', error);
        throw new Error(`Failed to find connections for user: ${error.message}`);
      }

      return connections || [];

    } catch (error) {
      console.error('Repository findByUserId error:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Unknown error finding user connections'
      );
    }
  }

  /**
   * Busca conexão ativa por Agent ID
   */
  async findByAgentId(agentId: string): Promise<WhatsAppOfficialConnection | null> {
    const supabase = databaseService.getClient();

    try {
      const { data: connection, error } = await supabase
        .from('whatsapp_official_connections')
        .select(`
          *,
          agente:agent_id (
            id, nome, genero, personalidade, empresa_id, ativo,
            whatsapp_conectado, whatsapp_numero, fluxo_conversa,
            created_at, updated_at
          )
        `)
        .eq('agent_id', agentId)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Repository findByAgentId error:', error);
        throw new Error(`Failed to find connection for agent: ${error.message}`);
      }

      return connection || null;

    } catch (error) {
      console.error('Repository findByAgentId error:', error);
      if (error instanceof Error && error.message.includes('Failed to find connection')) {
        throw error;
      }
      return null;
    }
  }

  /**
   * Atualiza conexão
   */
  async update(id: string, data: Partial<WhatsAppOfficialConnection>): Promise<WhatsAppOfficialConnection> {
    const supabase = databaseService.getClient();

    try {
      const updateData = {
        ...data,
        updated_at: new Date().toISOString()
      };

      const { data: connection, error } = await supabase
        .from('whatsapp_official_connections')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          agente:agent_id (
            id, nome, genero, personalidade, empresa_id, ativo,
            whatsapp_conectado, whatsapp_numero, fluxo_conversa,
            created_at, updated_at
          )
        `)
        .single();

      if (error) {
        console.error('Repository update error:', error);
        throw new Error(`Failed to update connection: ${error.message}`);
      }

      return connection;

    } catch (error) {
      console.error('Repository update error:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Unknown error updating connection'
      );
    }
  }

  /**
   * Remove conexão
   */
  async delete(id: string): Promise<void> {
    const supabase = databaseService.getClient();

    try {
      const { error } = await supabase
        .from('whatsapp_official_connections')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Repository delete error:', error);
        throw new Error(`Failed to delete connection: ${error.message}`);
      }

    } catch (error) {
      console.error('Repository delete error:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Unknown error deleting connection'
      );
    }
  }

  /**
   * Atualiza tokens OAuth2
   */
  async updateTokens(
    id: string, 
    accessToken: string, 
    refreshToken?: string, 
    expiresAt?: Date
  ): Promise<WhatsAppOfficialConnection> {
    const supabase = databaseService.getClient();

    try {
      const encryptedAccessToken = this.encryption.encrypt(accessToken);
      const encryptedRefreshToken = refreshToken ? 
        this.encryption.encrypt(refreshToken) : null;

      const updateData: any = {
        access_token_encrypted: encryptedAccessToken,
        token_created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (encryptedRefreshToken) {
        updateData.refresh_token_encrypted = encryptedRefreshToken;
      }

      if (expiresAt) {
        updateData.token_expires_at = expiresAt.toISOString();
      }

      const { data: connection, error } = await supabase
        .from('whatsapp_official_connections')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Repository updateTokens error:', error);
        throw new Error(`Failed to update tokens: ${error.message}`);
      }

      return connection;

    } catch (error) {
      console.error('Repository updateTokens error:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Unknown error updating tokens'
      );
    }
  }

  /**
   * Busca tokens que estão próximos do vencimento
   */
  async findExpiredTokens(warningHours: number = 168): Promise<WhatsAppOfficialConnection[]> {
    const supabase = databaseService.getClient();

    try {
      const warningDate = new Date(Date.now() + warningHours * 60 * 60 * 1000);

      const { data: connections, error } = await supabase
        .from('whatsapp_official_connections')
        .select('*')
        .lt('token_expires_at', warningDate.toISOString())
        .eq('status', 'active')
        .order('token_expires_at', { ascending: true });

      if (error) {
        console.error('Repository findExpiredTokens error:', error);
        throw new Error(`Failed to find expired tokens: ${error.message}`);
      }

      return connections || [];

    } catch (error) {
      console.error('Repository findExpiredTokens error:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Unknown error finding expired tokens'
      );
    }
  }

  /**
   * Atualiza status da conexão
   */
  async updateStatus(
    id: string, 
    status: ConnectionStatus, 
    errorMessage?: string
  ): Promise<WhatsAppOfficialConnection> {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (errorMessage) {
      updateData.last_error_message = errorMessage;
      updateData.last_error_at = new Date().toISOString();
    } else if (status === 'active') {
      // Limpar erros quando status volta para ativo
      updateData.last_error_message = null;
      updateData.last_error_code = null;
      updateData.consecutive_errors = 0;
    }

    return this.update(id, updateData);
  }

  /**
   * Atualiza status de saúde
   */
  async updateHealthStatus(id: string, healthStatus: HealthStatus): Promise<WhatsAppOfficialConnection> {
    return this.update(id, { 
      health_status: healthStatus,
      updated_at: new Date().toISOString()
    });
  }

  /**
   * Atualiza configuração de webhook
   */
  async updateWebhookConfig(
    id: string, 
    webhookUrl: string, 
    webhookSecret?: string, 
    verified?: boolean
  ): Promise<WhatsAppOfficialConnection> {
    const updateData: any = {
      webhook_url: webhookUrl,
      webhook_verified: verified ?? false,
      updated_at: new Date().toISOString()
    };

    if (webhookSecret) {
      updateData.webhook_secret_encrypted = this.encryption.encrypt(webhookSecret);
    }

    return this.update(id, updateData);
  }

  /**
   * Incrementa quota de mensagens
   */
  async incrementMessageQuota(id: string, count: number = 1): Promise<WhatsAppOfficialConnection> {
    const supabase = databaseService.getClient();

    try {
      const { data: connection, error } = await supabase
        .from('whatsapp_official_connections')
        .update({
          message_quota_used: supabase.sql`message_quota_used + ${count}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Repository incrementMessageQuota error:', error);
        throw new Error(`Failed to increment message quota: ${error.message}`);
      }

      return connection;

    } catch (error) {
      console.error('Repository incrementMessageQuota error:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Unknown error incrementing quota'
      );
    }
  }

  /**
   * Reseta quota diária
   */
  async resetDailyQuota(id: string): Promise<WhatsAppOfficialConnection> {
    const updateData = {
      message_quota_used: 0,
      quota_reset_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString()
    };

    return this.update(id, updateData);
  }

  /**
   * Busca conexões com quota excedida
   */
  async findQuotaExceeded(): Promise<WhatsAppOfficialConnection[]> {
    const supabase = databaseService.getClient();

    try {
      const { data: connections, error } = await supabase
        .from('whatsapp_official_connections')
        .select('*')
        .gte('message_quota_used', supabase.sql`message_quota_limit`)
        .eq('status', 'active');

      if (error) {
        console.error('Repository findQuotaExceeded error:', error);
        throw new Error(`Failed to find quota exceeded connections: ${error.message}`);
      }

      return connections || [];

    } catch (error) {
      console.error('Repository findQuotaExceeded error:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Unknown error finding quota exceeded'
      );
    }
  }

  /**
   * Incrementa contador de erros
   */
  async incrementErrorCount(id: string): Promise<WhatsAppOfficialConnection> {
    const supabase = databaseService.getClient();

    try {
      const { data: connection, error } = await supabase
        .from('whatsapp_official_connections')
        .update({
          error_count: supabase.sql`error_count + 1`,
          consecutive_errors: supabase.sql`consecutive_errors + 1`,
          last_error_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Repository incrementErrorCount error:', error);
        throw new Error(`Failed to increment error count: ${error.message}`);
      }

      return connection;

    } catch (error) {
      console.error('Repository incrementErrorCount error:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Unknown error incrementing error count'
      );
    }
  }

  /**
   * Reseta contador de erros
   */
  async resetErrorCount(id: string): Promise<WhatsAppOfficialConnection> {
    const updateData = {
      consecutive_errors: 0,
      last_error_message: null,
      last_error_code: null,
      updated_at: new Date().toISOString()
    };

    return this.update(id, updateData);
  }

  /**
   * Atualiza atividade da conexão
   */
  async updateActivity(
    id: string, 
    lastMessageSent?: Date, 
    lastMessageReceived?: Date, 
    lastWebhookReceived?: Date
  ): Promise<WhatsAppOfficialConnection> {
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (lastMessageSent) {
      updateData.last_message_sent_at = lastMessageSent.toISOString();
      updateData.total_messages_sent = supabase.sql`total_messages_sent + 1`;
    }

    if (lastMessageReceived) {
      updateData.last_message_received_at = lastMessageReceived.toISOString();
      updateData.total_messages_received = supabase.sql`total_messages_received + 1`;
    }

    if (lastWebhookReceived) {
      updateData.last_webhook_received_at = lastWebhookReceived.toISOString();
    }

    return this.update(id, updateData);
  }

  /**
   * Busca conexões inativas
   */
  async findInactive(daysInactive: number): Promise<WhatsAppOfficialConnection[]> {
    const supabase = databaseService.getClient();

    try {
      const cutoffDate = new Date(Date.now() - daysInactive * 24 * 60 * 60 * 1000);

      const { data: connections, error } = await supabase
        .from('whatsapp_official_connections')
        .select('*')
        .or(`last_webhook_received_at.lt.${cutoffDate.toISOString()},last_message_sent_at.lt.${cutoffDate.toISOString()}`)
        .eq('status', 'active');

      if (error) {
        console.error('Repository findInactive error:', error);
        throw new Error(`Failed to find inactive connections: ${error.message}`);
      }

      return connections || [];

    } catch (error) {
      console.error('Repository findInactive error:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Unknown error finding inactive connections'
      );
    }
  }

  /**
   * Limpa conexões expiradas
   */
  async cleanupExpired(): Promise<number> {
    const supabase = databaseService.getClient();

    try {
      const { data: expiredConnections, error } = await supabase
        .from('whatsapp_official_connections')
        .delete()
        .lt('token_expires_at', new Date().toISOString())
        .eq('status', 'expired')
        .select('id');

      if (error) {
        console.error('Repository cleanupExpired error:', error);
        throw new Error(`Failed to cleanup expired connections: ${error.message}`);
      }

      return expiredConnections?.length || 0;

    } catch (error) {
      console.error('Repository cleanupExpired error:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Unknown error cleaning up expired connections'
      );
    }
  }

  /**
   * Obtém estatísticas da conexão
   */
  async getConnectionStats(id: string): Promise<any> {
    const supabase = databaseService.getClient();

    try {
      const { data: connection, error } = await supabase
        .from('whatsapp_official_connections')
        .select(`
          id,
          status,
          health_status,
          total_messages_sent,
          total_messages_received,
          message_quota_used,
          message_quota_limit,
          error_count,
          consecutive_errors,
          created_at,
          last_message_sent_at,
          last_message_received_at,
          last_webhook_received_at
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Repository getConnectionStats error:', error);
        throw new Error(`Failed to get connection stats: ${error.message}`);
      }

      return connection;

    } catch (error) {
      console.error('Repository getConnectionStats error:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Unknown error getting connection stats'
      );
    }
  }

  /**
   * Obtém estatísticas do sistema
   */
  async getSystemStats(): Promise<any> {
    const supabase = databaseService.getClient();

    try {
      const { data: stats, error } = await supabase
        .from('whatsapp_official_connections')
        .select('status, health_status')
        .neq('status', 'deleted');

      if (error) {
        console.error('Repository getSystemStats error:', error);
        throw new Error(`Failed to get system stats: ${error.message}`);
      }

      // Agregação das estatísticas
      const summary = (stats || []).reduce((acc: any, conn: any) => {
        acc.total = (acc.total || 0) + 1;
        acc.by_status = acc.by_status || {};
        acc.by_health = acc.by_health || {};
        
        acc.by_status[conn.status] = (acc.by_status[conn.status] || 0) + 1;
        acc.by_health[conn.health_status] = (acc.by_health[conn.health_status] || 0) + 1;
        
        return acc;
      }, {});

      return summary;

    } catch (error) {
      console.error('Repository getSystemStats error:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Unknown error getting system stats'
      );
    }
  }

  /**
   * Busca conexão por Instance ID (Evolution API)
   */
  async findByInstanceId(instanceId: string): Promise<WhatsAppOfficialConnection | null> {
    const supabase = databaseService.getClient();

    try {
      const { data: connection, error } = await supabase
        .from('whatsapp_official_connections')
        .select('*')
        .eq('instance_id', instanceId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Connection not found
        }
        console.error('Repository findByInstanceId error:', error);
        throw new Error(`Failed to find connection by instance ID: ${error.message}`);
      }

      return connection;

    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return null;
      }
      console.error('Repository findByInstanceId error:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Unknown error finding connection by instance ID'
      );
    }
  }

  /**
   * Reseta contador de falhas de webhook
   */
  async resetWebhookFailures(id: string): Promise<WhatsAppOfficialConnection> {
    const supabase = databaseService.getClient();

    try {
      const { data: connection, error } = await supabase
        .from('whatsapp_official_connections')
        .update({
          webhook_consecutive_failures: 0,
          webhook_last_failure_at: null,
          webhook_last_failure_message: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Repository resetWebhookFailures error:', error);
        throw new Error(`Failed to reset webhook failures: ${error.message}`);
      }

      return connection;

    } catch (error) {
      console.error('Repository resetWebhookFailures error:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Unknown error resetting webhook failures'
      );
    }
  }

  /**
   * Busca conexões ativas
   */
  async findActiveConnections(): Promise<WhatsAppOfficialConnection[]> {
    const supabase = databaseService.getClient();

    try {
      const { data: connections, error } = await supabase
        .from('whatsapp_official_connections')
        .select('*')
        .eq('status', 'active')
        .neq('status', 'deleted')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Repository findActiveConnections error:', error);
        throw new Error(`Failed to find active connections: ${error.message}`);
      }

      return connections || [];

    } catch (error) {
      console.error('Repository findActiveConnections error:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Unknown error finding active connections'
      );
    }
  }

  /**
   * Busca conexões por status
   */
  async findByStatus(status: string): Promise<WhatsAppOfficialConnection[]> {
    const supabase = databaseService.getClient();

    try {
      const { data: connections, error } = await supabase
        .from('whatsapp_official_connections')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Repository findByStatus error:', error);
        throw new Error(`Failed to find connections by status: ${error.message}`);
      }

      return connections || [];

    } catch (error) {
      console.error('Repository findByStatus error:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Unknown error finding connections by status'
      );
    }
  }

  /**
   * Busca conexões que não tiveram atividade recente
   */
  async findStaleConnections(sinceDate: string): Promise<WhatsAppOfficialConnection[]> {
    const supabase = databaseService.getClient();

    try {
      const { data: connections, error } = await supabase
        .from('whatsapp_official_connections')
        .select('*')
        .or(`last_message_sent_at.lt.${sinceDate},last_webhook_received_at.lt.${sinceDate}`)
        .neq('status', 'deleted')
        .order('updated_at', { ascending: true });

      if (error) {
        console.error('Repository findStaleConnections error:', error);
        throw new Error(`Failed to find stale connections: ${error.message}`);
      }

      return connections || [];

    } catch (error) {
      console.error('Repository findStaleConnections error:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Unknown error finding stale connections'
      );
    }
  }
}

/**
 * Implementação do Repository de Logs
 */
export class WhatsAppOfficialLogsRepository implements IWhatsAppOfficialLogsRepository {
  
  async create(logData: {
    connection_id: string;
    event_type: string;
    event_status: string;
    event_data?: any;
    meta_response_data?: any;
    error_code?: string;
    error_message?: string;
    request_id?: string;
    duration_ms?: number;
    user_agent?: string;
    ip_address?: string;
  }): Promise<any> {
    const supabase = databaseService.getClient();

    try {
      const { data: log, error } = await supabase
        .from('whatsapp_official_logs')
        .insert([{
          ...logData,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('Logs repository create error:', error);
        throw new Error(`Failed to create log: ${error.message}`);
      }

      return log;

    } catch (error) {
      console.error('Logs repository create error:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Unknown error creating log'
      );
    }
  }

  async findByConnectionId(
    connectionId: string, 
    limit: number = 100, 
    offset: number = 0
  ): Promise<any[]> {
    const supabase = databaseService.getClient();

    try {
      const { data: logs, error } = await supabase
        .from('whatsapp_official_logs')
        .select('*')
        .eq('connection_id', connectionId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Logs repository findByConnectionId error:', error);
        throw new Error(`Failed to find logs: ${error.message}`);
      }

      return logs || [];

    } catch (error) {
      console.error('Logs repository findByConnectionId error:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Unknown error finding logs'
      );
    }
  }

  async findByEventType(
    eventType: string, 
    hours: number = 24, 
    limit: number = 1000
  ): Promise<any[]> {
    const supabase = databaseService.getClient();

    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);

      const { data: logs, error } = await supabase
        .from('whatsapp_official_logs')
        .select('*')
        .eq('event_type', eventType)
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Logs repository findByEventType error:', error);
        throw new Error(`Failed to find logs by event type: ${error.message}`);
      }

      return logs || [];

    } catch (error) {
      console.error('Logs repository findByEventType error:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Unknown error finding logs by event type'
      );
    }
  }

  async getEventStats(connectionId?: string, hours: number = 24): Promise<any> {
    const supabase = databaseService.getClient();

    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);
      
      let query = supabase
        .from('whatsapp_official_logs')
        .select('event_type, event_status')
        .gte('created_at', since.toISOString());

      if (connectionId) {
        query = query.eq('connection_id', connectionId);
      }

      const { data: logs, error } = await query;

      if (error) {
        console.error('Logs repository getEventStats error:', error);
        throw new Error(`Failed to get event stats: ${error.message}`);
      }

      // Agregação das estatísticas
      const stats = (logs || []).reduce((acc: any, log: any) => {
        const key = `${log.event_type}_${log.event_status}`;
        acc[key] = (acc[key] || 0) + 1;
        acc.total = (acc.total || 0) + 1;
        return acc;
      }, {});

      return stats;

    } catch (error) {
      console.error('Logs repository getEventStats error:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Unknown error getting event stats'
      );
    }
  }

  async cleanup(retentionDays: number): Promise<number> {
    const supabase = databaseService.getClient();

    try {
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

      const { data: deletedLogs, error } = await supabase
        .from('whatsapp_official_logs')
        .delete()
        .lt('created_at', cutoffDate.toISOString())
        .select('id');

      if (error) {
        console.error('Logs repository cleanup error:', error);
        throw new Error(`Failed to cleanup logs: ${error.message}`);
      }

      return deletedLogs?.length || 0;

    } catch (error) {
      console.error('Logs repository cleanup error:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Unknown error cleaning up logs'
      );
    }
  }
}

// Singleton instances seguindo padrão estabelecido no projeto
let whatsappOfficialRepository: WhatsAppOfficialRepository;
let whatsappOfficialLogsRepository: WhatsAppOfficialLogsRepository;

export function getWhatsAppOfficialRepository(): WhatsAppOfficialRepository {
  if (!whatsappOfficialRepository) {
    whatsappOfficialRepository = new WhatsAppOfficialRepository();
  }
  return whatsappOfficialRepository;
}

export function getWhatsAppOfficialLogsRepository(): WhatsAppOfficialLogsRepository {
  if (!whatsappOfficialLogsRepository) {
    whatsappOfficialLogsRepository = new WhatsAppOfficialLogsRepository();
  }
  return whatsappOfficialLogsRepository;
}