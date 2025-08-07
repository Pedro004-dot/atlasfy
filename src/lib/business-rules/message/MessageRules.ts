import { 
  BaseBusinessRule, 
  BusinessRuleContext, 
  BusinessRuleResult, 
  BusinessRuleCategory,
  IMessageValidator 
} from '../interfaces/IBusinessRule';
import { getWhatsAppOfficialRepository } from '@/repositories/whatsapp-official.repository';
import { getWhatsAppOfficialLogsRepository } from '@/repositories/whatsapp-official.repository';
import { databaseService } from '@/lib/database';

/**
 * Implementação do validador de mensagens
 */
export class MessageValidator implements IMessageValidator {
  private repository = getWhatsAppOfficialRepository();
  private logsRepository = getWhatsAppOfficialLogsRepository();

  async validateMessageDuplicate(messageId: string): Promise<boolean> {
    try {
      const supabase = databaseService.getClient();
      
      // Verificar se mensagem já existe nos logs
      const { data: existingLog, error } = await supabase
        .from('whatsapp_official_logs')
        .select('id')
        .eq('event_type', 'message_received')
        .contains('event_data', { whatsapp_message_id: messageId })
        .limit(1);

      if (error) {
        console.error('Error checking message duplicate:', error);
        return false; // Em caso de erro, assumir que é duplicata por segurança
      }

      return !existingLog || existingLog.length === 0;
    } catch (error) {
      console.error('Error validating message duplicate:', error);
      return false;
    }
  }

  async validateRateLimit(connectionId: string): Promise<{ allowed: boolean; remaining: number }> {
    try {
      const connection = await this.repository.findById(connectionId);
      if (!connection) {
        return { allowed: false, remaining: 0 };
      }

      // Rate limit Meta: 250 mensagens/segundo
      // Implementação simplificada: verificar mensagens nos últimos 60 segundos
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
      
      const { data: recentMessages, error } = await databaseService.getClient()
        .from('whatsapp_official_logs')
        .select('id')
        .eq('connection_id', connectionId)
        .eq('event_type', 'message_sent')
        .gte('created_at', oneMinuteAgo);

      if (error) {
        console.error('Error checking rate limit:', error);
        return { allowed: false, remaining: 0 };
      }

      const messagesInLastMinute = recentMessages?.length || 0;
      const maxPerMinute = 250; // Rate limit Meta
      
      return {
        allowed: messagesInLastMinute < maxPerMinute,
        remaining: Math.max(0, maxPerMinute - messagesInLastMinute)
      };

    } catch (error) {
      console.error('Error validating rate limit:', error);
      return { allowed: false, remaining: 0 };
    }
  }

  async validateMessageFormat(messageData: any): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Validações básicas de formato
      if (!messageData) {
        errors.push('Message data is required');
        return { valid: false, errors };
      }

      // Verificar campos obrigatórios
      if (!messageData.to) {
        errors.push('Recipient (to) is required');
      }

      if (!messageData.type) {
        errors.push('Message type is required');
      }

      // Validar formato do número do destinatário
      if (messageData.to && !messageData.to.match(/^\+?[1-9]\d{1,14}$/)) {
        errors.push('Invalid recipient phone number format');
      }

      // Validações específicas por tipo
      switch (messageData.type) {
        case 'text':
          if (!messageData.text?.body) {
            errors.push('Text message body is required');
          }
          if (messageData.text?.body && messageData.text.body.length > 4096) {
            errors.push('Text message exceeds maximum length (4096 characters)');
          }
          break;

        case 'image':
          if (!messageData.image?.link && !messageData.image?.id) {
            errors.push('Image link or media ID is required');
          }
          break;

        case 'document':
          if (!messageData.document?.link && !messageData.document?.id) {
            errors.push('Document link or media ID is required');
          }
          break;

        case 'template':
          if (!messageData.template?.name) {
            errors.push('Template name is required');
          }
          if (!messageData.template?.language?.code) {
            errors.push('Template language is required');
          }
          break;

        default:
          errors.push(`Unsupported message type: ${messageData.type}`);
      }

      return { valid: errors.length === 0, errors };

    } catch (error) {
      console.error('Error validating message format:', error);
      return { valid: false, errors: ['Message format validation failed'] };
    }
  }
}

/**
 * Regra: Toda mensagem recebida deve ser salva no banco
 */
export class SaveIncomingMessageRule extends BaseBusinessRule {
  constructor() {
    super('save_incoming_message', 100, BusinessRuleCategory.MESSAGE);
  }

  async canExecute(context: BusinessRuleContext): Promise<boolean> {
    // Só executar para mensagens recebidas
    return context.message_data?.direction === 'incoming';
  }

  async evaluate(context: BusinessRuleContext): Promise<BusinessRuleResult> {
    const { connection_id, message_data } = context;
    
    if (!connection_id || !message_data) {
      return {
        success: false,
        allowed: false,
        message: 'Connection ID and message data are required',
        errorCode: 'MISSING_MESSAGE_DATA'
      };
    }

    try {
      // Validar dados da mensagem
      const validator = new MessageValidator();
      const formatValidation = await validator.validateMessageFormat(message_data);
      
      if (!formatValidation.valid) {
        return {
          success: true,
          allowed: false,
          message: 'Invalid message format',
          errorCode: 'INVALID_MESSAGE_FORMAT',
          data: { errors: formatValidation.errors }
        };
      }

      return {
        success: true,
        allowed: true,
        message: 'Message can be saved to database',
        actions: [
          {
            type: 'log_event',
            target: 'message_storage',
            params: {
              connection_id,
              message_id: message_data.id,
              from: message_data.from,
              type: message_data.type,
              timestamp: message_data.timestamp
            }
          }
        ]
      };

    } catch (error) {
      console.error('Error evaluating save incoming message rule:', error);
      return {
        success: false,
        allowed: false,
        message: 'Failed to validate message for saving',
        errorCode: 'MESSAGE_SAVE_VALIDATION_ERROR'
      };
    }
  }
}

/**
 * Regra: Mensagens duplicadas (mesmo message_id) são ignoradas
 */
export class DuplicateMessageRule extends BaseBusinessRule {
  private validator = new MessageValidator();

  constructor() {
    super('duplicate_message_prevention', 110, BusinessRuleCategory.MESSAGE);
  }

  async evaluate(context: BusinessRuleContext): Promise<BusinessRuleResult> {
    const { message_data } = context;
    
    if (!message_data?.id) {
      return {
        success: false,
        allowed: false,
        message: 'Message ID is required for duplicate check',
        errorCode: 'MISSING_MESSAGE_ID'
      };
    }

    try {
      const isUnique = await this.validator.validateMessageDuplicate(message_data.id);

      if (!isUnique) {
        return {
          success: true,
          allowed: false,
          message: 'Duplicate message detected - ignoring',
          errorCode: 'DUPLICATE_MESSAGE',
          data: { message_id: message_data.id },
          actions: [
            {
              type: 'log_event',
              target: 'duplicate_messages',
              params: {
                message_id: message_data.id,
                from: message_data.from,
                timestamp: message_data.timestamp,
                action: 'ignored'
              }
            }
          ]
        };
      }

      return {
        success: true,
        allowed: true,
        message: 'Message is unique and can be processed'
      };

    } catch (error) {
      console.error('Error checking message duplicate:', error);
      return {
        success: false,
        allowed: false,
        message: 'Failed to check message duplicate',
        errorCode: 'DUPLICATE_CHECK_ERROR'
      };
    }
  }
}

/**
 * Regra: Rate limit respeitado: max 250 msg/segundo (limite Meta)
 */
export class MessageRateLimitRule extends BaseBusinessRule {
  private validator = new MessageValidator();

  constructor() {
    super('message_rate_limit', 95, BusinessRuleCategory.MESSAGE);
  }

  async canExecute(context: BusinessRuleContext): Promise<boolean> {
    // Só aplicar rate limit para mensagens enviadas
    return context.message_data?.direction === 'outgoing';
  }

  async evaluate(context: BusinessRuleContext): Promise<BusinessRuleResult> {
    const { connection_id } = context;
    
    if (!connection_id) {
      return {
        success: false,
        allowed: false,
        message: 'Connection ID is required for rate limit check',
        errorCode: 'MISSING_CONNECTION_ID'
      };
    }

    try {
      const { allowed, remaining } = await this.validator.validateRateLimit(connection_id);

      if (!allowed) {
        return {
          success: true,
          allowed: false,
          message: 'Rate limit exceeded - message blocked',
          errorCode: 'RATE_LIMIT_EXCEEDED',
          data: { remaining },
          actions: [
            {
              type: 'log_event',
              target: 'rate_limit_violations',
              params: {
                connection_id,
                remaining_quota: remaining,
                timestamp: new Date().toISOString()
              }
            },
            {
              type: 'update_status',
              target: connection_id,
              params: {
                status: 'rate_limited',
                error_message: 'Rate limit exceeded'
              }
            }
          ]
        };
      }

      return {
        success: true,
        allowed: true,
        message: `Message can be sent (${remaining} remaining in current window)`,
        data: { remaining }
      };

    } catch (error) {
      console.error('Error checking rate limit:', error);
      return {
        success: false,
        allowed: false,
        message: 'Failed to validate rate limit',
        errorCode: 'RATE_LIMIT_CHECK_ERROR'
      };
    }
  }
}

/**
 * Regra: Mensagens em erro são reprocessadas max 3x
 */
export class MessageRetryRule extends BaseBusinessRule {
  constructor() {
    super('message_retry_limit', 85, BusinessRuleCategory.MESSAGE);
  }

  async evaluate(context: BusinessRuleContext): Promise<BusinessRuleResult> {
    const { message_data, metadata } = context;
    
    const retryCount = metadata?.retry_count || 0;
    const maxRetries = 3;

    if (retryCount >= maxRetries) {
      return {
        success: true,
        allowed: false,
        message: 'Message has reached maximum retry limit',
        errorCode: 'MAX_RETRIES_EXCEEDED',
        data: { retryCount, maxRetries },
        actions: [
          {
            type: 'log_event',
            target: 'failed_messages',
            params: {
              message_id: message_data?.id,
              retry_count: retryCount,
              final_error: metadata?.last_error,
              timestamp: new Date().toISOString()
            }
          },
          {
            type: 'send_notification',
            target: 'system_admin',
            params: {
              type: 'message_delivery_failed',
              message_id: message_data?.id,
              retry_count: retryCount,
              error: metadata?.last_error
            }
          }
        ]
      };
    }

    return {
      success: true,
      allowed: true,
      message: `Message can be retried (attempt ${retryCount + 1}/${maxRetries})`,
      data: { retryCount, maxRetries }
    };
  }
}

/**
 * Regra: Validação de formato e conteúdo das mensagens
 */
export class MessageFormatValidationRule extends BaseBusinessRule {
  private validator = new MessageValidator();

  constructor() {
    super('message_format_validation', 105, BusinessRuleCategory.MESSAGE);
  }

  async evaluate(context: BusinessRuleContext): Promise<BusinessRuleResult> {
    const { message_data } = context;
    
    if (!message_data) {
      return {
        success: false,
        allowed: false,
        message: 'Message data is required',
        errorCode: 'MISSING_MESSAGE_DATA'
      };
    }

    try {
      const { valid, errors } = await this.validator.validateMessageFormat(message_data);

      if (!valid) {
        return {
          success: true,
          allowed: false,
          message: 'Message format validation failed',
          errorCode: 'INVALID_MESSAGE_FORMAT',
          data: { errors },
          actions: [
            {
              type: 'log_event',
              target: 'message_validation_errors',
              params: {
                message_type: message_data.type,
                errors,
                timestamp: new Date().toISOString()
              }
            }
          ]
        };
      }

      return {
        success: true,
        allowed: true,
        message: 'Message format is valid'
      };

    } catch (error) {
      console.error('Error validating message format:', error);
      return {
        success: false,
        allowed: false,
        message: 'Message format validation failed with error',
        errorCode: 'MESSAGE_FORMAT_VALIDATION_ERROR'
      };
    }
  }
}

/**
 * Regra: Controle de quota de mensagens por conexão
 */
export class MessageQuotaRule extends BaseBusinessRule {
  private repository = getWhatsAppOfficialRepository();

  constructor() {
    super('message_quota_control', 90, BusinessRuleCategory.MESSAGE);
  }

  async canExecute(context: BusinessRuleContext): Promise<boolean> {
    // Só aplicar quota para mensagens enviadas
    return context.message_data?.direction === 'outgoing';
  }

  async evaluate(context: BusinessRuleContext): Promise<BusinessRuleResult> {
    const { connection_id } = context;
    
    if (!connection_id) {
      return {
        success: false,
        allowed: false,
        message: 'Connection ID is required for quota check',
        errorCode: 'MISSING_CONNECTION_ID'
      };
    }

    try {
      const connection = await this.repository.findById(connection_id);
      if (!connection) {
        return {
          success: false,
          allowed: false,
          message: 'Connection not found',
          errorCode: 'CONNECTION_NOT_FOUND'
        };
      }

      const quotaUsed = connection.message_quota_used || 0;
      const quotaLimit = connection.message_quota_limit || 10000;
      const quotaRemaining = quotaLimit - quotaUsed;

      // Verificar se quota resetou (novo dia)
      const quotaResetAt = new Date(connection.quota_reset_at);
      const now = new Date();
      
      if (now > quotaResetAt) {
        // Quota deve ser resetada
        return {
          success: true,
          allowed: true,
          message: 'Quota needs to be reset',
          actions: [
            {
              type: 'schedule_task',
              target: 'reset_quota',
              params: { connection_id }
            }
          ]
        };
      }

      if (quotaRemaining <= 0) {
        return {
          success: true,
          allowed: false,
          message: 'Message quota exceeded',
          errorCode: 'QUOTA_EXCEEDED',
          data: { quotaUsed, quotaLimit, quotaRemaining },
          actions: [
            {
              type: 'send_notification',
              target: 'connection_owner',
              params: {
                type: 'quota_exceeded',
                connection_id,
                quota_used: quotaUsed,
                quota_limit: quotaLimit
              }
            },
            {
              type: 'log_event',
              target: 'quota_exceeded',
              params: { connection_id, quota_used: quotaUsed, quota_limit: quotaLimit }
            }
          ]
        };
      }

      // Alertar quando quota está próxima do limite (90%)
      if (quotaRemaining <= quotaLimit * 0.1) {
        return {
          success: true,
          allowed: true,
          message: 'Message quota is running low',
          data: { quotaUsed, quotaLimit, quotaRemaining },
          actions: [
            {
              type: 'send_notification',
              target: 'connection_owner',
              params: {
                type: 'quota_warning',
                connection_id,
                quota_remaining: quotaRemaining,
                quota_limit: quotaLimit
              }
            }
          ]
        };
      }

      return {
        success: true,
        allowed: true,
        message: `Message can be sent (${quotaRemaining}/${quotaLimit} remaining)`,
        data: { quotaUsed, quotaLimit, quotaRemaining }
      };

    } catch (error) {
      console.error('Error checking message quota:', error);
      return {
        success: false,
        allowed: false,
        message: 'Failed to validate message quota',
        errorCode: 'QUOTA_CHECK_ERROR'
      };
    }
  }
}