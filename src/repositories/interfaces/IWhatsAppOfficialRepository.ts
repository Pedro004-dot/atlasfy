import {
  WhatsAppOfficialConnection,
  CreateOfficialConnectionData,
  ConnectionStatus,
  HealthStatus,
  ServiceResult
} from '@/types/whatsapp-official';

/**
 * Interface abstrata para WhatsApp Official Repository
 * Seguindo princípio Open/Closed: fechado para modificação, aberto para extensão
 */
export interface IWhatsAppOfficialRepository {
  // CRUD básico
  create(data: CreateOfficialConnectionData & { user_id: string }): Promise<WhatsAppOfficialConnection>;
  findById(id: string): Promise<WhatsAppOfficialConnection | null>;
  findByPhoneNumberId(phoneNumberId: string): Promise<WhatsAppOfficialConnection | null>;
  findByUserId(userId: string): Promise<WhatsAppOfficialConnection[]>;
  findByAgentId(agentId: string): Promise<WhatsAppOfficialConnection | null>;
  update(id: string, data: Partial<WhatsAppOfficialConnection>): Promise<WhatsAppOfficialConnection>;
  delete(id: string): Promise<void>;

  // Operações específicas de tokens
  updateTokens(
    id: string, 
    accessToken: string, 
    refreshToken?: string, 
    expiresAt?: Date
  ): Promise<WhatsAppOfficialConnection>;
  
  findExpiredTokens(warningHours?: number): Promise<WhatsAppOfficialConnection[]>;
  
  // Operações de status e saúde
  updateStatus(
    id: string, 
    status: ConnectionStatus, 
    errorMessage?: string
  ): Promise<WhatsAppOfficialConnection>;
  
  updateHealthStatus(
    id: string, 
    healthStatus: HealthStatus
  ): Promise<WhatsAppOfficialConnection>;

  // Operações de webhook
  updateWebhookConfig(
    id: string, 
    webhookUrl: string, 
    webhookSecret?: string, 
    verified?: boolean
  ): Promise<WhatsAppOfficialConnection>;

  // Operações de quota e rate limiting
  incrementMessageQuota(id: string, count?: number): Promise<WhatsAppOfficialConnection>;
  resetDailyQuota(id: string): Promise<WhatsAppOfficialConnection>;
  findQuotaExceeded(): Promise<WhatsAppOfficialConnection[]>;

  // Operações de erro e monitoramento
  incrementErrorCount(id: string): Promise<WhatsAppOfficialConnection>;
  resetErrorCount(id: string): Promise<WhatsAppOfficialConnection>;
  updateActivity(
    id: string, 
    lastMessageSent?: Date, 
    lastMessageReceived?: Date, 
    lastWebhookReceived?: Date
  ): Promise<WhatsAppOfficialConnection>;

  // Operações de limpeza e manutenção
  findInactive(daysInactive: number): Promise<WhatsAppOfficialConnection[]>;
  cleanupExpired(): Promise<number>;
  
  // Operações de estatísticas
  getConnectionStats(id: string): Promise<any>;
  getSystemStats(): Promise<any>;
}

/**
 * Interface para logs repository
 */
export interface IWhatsAppOfficialLogsRepository {
  create(logData: {
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
  }): Promise<any>;

  findByConnectionId(
    connectionId: string, 
    limit?: number, 
    offset?: number
  ): Promise<any[]>;

  findByEventType(
    eventType: string, 
    hours?: number, 
    limit?: number
  ): Promise<any[]>;

  getEventStats(
    connectionId?: string, 
    hours?: number
  ): Promise<any>;

  cleanup(retentionDays: number): Promise<number>;
}

/**
 * Extensões futuras podem implementar essas interfaces
 * sem modificar o código existente
 */
export interface IWhatsAppOfficialCacheRepository {
  set(key: string, value: any, ttl?: number): Promise<void>;
  get(key: string): Promise<any>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

export interface IWhatsAppOfficialMetricsRepository {
  recordEvent(eventType: string, metadata?: any): Promise<void>;
  getMetrics(period: 'hour' | 'day' | 'week' | 'month'): Promise<any>;
  getConnectionMetrics(connectionId: string, period: string): Promise<any>;
}