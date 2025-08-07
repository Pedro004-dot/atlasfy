import { 
  BaseBusinessRule, 
  BusinessRuleContext, 
  BusinessRuleResult, 
  BusinessRuleCategory,
  IWebhookValidator 
} from '../interfaces/IBusinessRule';
import { getWhatsAppOfficialRepository } from '@/repositories/whatsapp-official.repository';
import { getWhatsAppOfficialLogsRepository } from '@/repositories/whatsapp-official.repository';
import { databaseService } from '@/lib/database';
import * as crypto from 'crypto';

/**
 * Implementação do validador de webhooks
 */
export class WebhookValidator implements IWebhookValidator {
  private repository = getWhatsAppOfficialRepository();
  private logsRepository = getWhatsAppOfficialLogsRepository();

  validateSignature(payload: string, signature: string, secret: string): boolean {
    try {
      // Meta usa HMAC SHA256 com formato: sha256=<hash>
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload, 'utf8')
        .digest('hex');

      // Remover prefixo "sha256=" se presente
      const receivedSignature = signature.replace('sha256=', '');
      
      // Comparação segura contra timing attacks
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(receivedSignature, 'hex')
      );
    } catch (error) {
      console.error('Error validating webhook signature:', error);
      return false;
    }
  }

  validateTimestamp(timestamp: number, toleranceMinutes: number = 5): boolean {
    try {
      const now = Math.floor(Date.now() / 1000);
      const toleranceSeconds = toleranceMinutes * 60;
      
      // Verificar se timestamp não é muito antigo nem muito futuro
      return Math.abs(now - timestamp) <= toleranceSeconds;
    } catch (error) {
      console.error('Error validating webhook timestamp:', error);
      return false;
    }
  }

  async validateWebhookHealth(connectionId: string): Promise<{ healthy: boolean; consecutiveFailures: number }> {
    try {
      const connection = await this.repository.findById(connectionId);
      if (!connection) {
        return { healthy: false, consecutiveFailures: 0 };
      }

      const consecutiveFailures = connection.webhook_consecutive_failures || 0;
      const lastWebhookReceived = connection.last_webhook_received_at;
      
      // Considerar unhealthy se:
      // 1. Muitas falhas consecutivas (>= 5)
      // 2. Não recebe webhook há mais de 24 horas (para conexões ativas)
      const hasExcessiveFailures = consecutiveFailures >= 5;
      const isStale = lastWebhookReceived && 
        (Date.now() - new Date(lastWebhookReceived).getTime()) > 24 * 60 * 60 * 1000;

      return {
        healthy: !hasExcessiveFailures && !isStale,
        consecutiveFailures
      };
    } catch (error) {
      console.error('Error validating webhook health:', error);
      return { healthy: false, consecutiveFailures: 0 };
    }
  }

  async validateWebhookDuplicate(webhookId: string, connectionId: string): Promise<boolean> {
    try {
      const supabase = databaseService.getClient();
      
      // Verificar se webhook já foi processado
      const { data: existingLog, error } = await supabase
        .from('whatsapp_official_logs')
        .select('id')
        .eq('connection_id', connectionId)
        .eq('event_type', 'webhook_received')
        .contains('event_data', { webhook_id: webhookId })
        .limit(1);

      if (error) {
        console.error('Error checking webhook duplicate:', error);
        return false; // Em caso de erro, assumir duplicata por segurança
      }

      return !existingLog || existingLog.length === 0;
    } catch (error) {
      console.error('Error validating webhook duplicate:', error);
      return false;
    }
  }
}

/**
 * Regra: Validação obrigatória de assinatura HMAC dos webhooks
 */
export class WebhookSignatureValidationRule extends BaseBusinessRule {
  private validator = new WebhookValidator();

  constructor() {
    super('webhook_signature_validation', 100, BusinessRuleCategory.WEBHOOK);
  }

  async evaluate(context: BusinessRuleContext): Promise<BusinessRuleResult> {
    const { webhook_data, connection_id } = context;
    
    if (!webhook_data || !connection_id) {
      return {
        success: false,
        allowed: false,
        message: 'Webhook data and connection ID are required',
        errorCode: 'MISSING_WEBHOOK_DATA'
      };
    }

    const { payload, signature, app_secret } = webhook_data;

    if (!payload || !signature || !app_secret) {
      return {
        success: true,
        allowed: false,
        message: 'Payload, signature and app secret are required for validation',
        errorCode: 'MISSING_SIGNATURE_DATA',
        actions: [
          {
            type: 'log_event',
            target: 'webhook_validation_failures',
            params: {
              connection_id,
              error: 'missing_signature_data',
              timestamp: new Date().toISOString()
            }
          }
        ]
      };
    }

    const isValidSignature = this.validator.validateSignature(payload, signature, app_secret);

    if (!isValidSignature) {
      return {
        success: true,
        allowed: false,
        message: 'Invalid webhook signature',
        errorCode: 'INVALID_WEBHOOK_SIGNATURE',
        actions: [
          {
            type: 'log_event',
            target: 'security_violations',
            params: {
              connection_id,
              violation_type: 'invalid_webhook_signature',
              received_signature: signature,
              timestamp: new Date().toISOString()
            }
          },
          {
            type: 'increment_counter',
            target: connection_id,
            params: { counter: 'webhook_consecutive_failures' }
          }
        ]
      };
    }

    return {
      success: true,
      allowed: true,
      message: 'Webhook signature is valid',
      actions: [
        {
          type: 'reset_counter',
          target: connection_id,
          params: { counter: 'webhook_consecutive_failures' }
        }
      ]
    };
  }
}

/**
 * Regra: Validação de timestamp para prevenir replay attacks
 */
export class WebhookTimestampValidationRule extends BaseBusinessRule {
  private validator = new WebhookValidator();

  constructor() {
    super('webhook_timestamp_validation', 95, BusinessRuleCategory.WEBHOOK);
  }

  async evaluate(context: BusinessRuleContext): Promise<BusinessRuleResult> {
    const { webhook_data, connection_id } = context;
    
    if (!webhook_data?.timestamp) {
      return {
        success: true,
        allowed: false,
        message: 'Webhook timestamp is required',
        errorCode: 'MISSING_WEBHOOK_TIMESTAMP',
        actions: [
          {
            type: 'log_event',
            target: 'webhook_validation_failures',
            params: {
              connection_id,
              error: 'missing_timestamp',
              timestamp: new Date().toISOString()
            }
          }
        ]
      };
    }

    const toleranceMinutes = 5; // Configurável
    const isValidTimestamp = this.validator.validateTimestamp(
      webhook_data.timestamp, 
      toleranceMinutes
    );

    if (!isValidTimestamp) {
      const now = Math.floor(Date.now() / 1000);
      const timeDiff = Math.abs(now - webhook_data.timestamp);

      return {
        success: true,
        allowed: false,
        message: 'Webhook timestamp is outside acceptable range',
        errorCode: 'INVALID_WEBHOOK_TIMESTAMP',
        data: { 
          received_timestamp: webhook_data.timestamp,
          current_timestamp: now,
          time_difference_seconds: timeDiff,
          tolerance_minutes: toleranceMinutes
        },
        actions: [
          {
            type: 'log_event',
            target: 'security_violations',
            params: {
              connection_id,
              violation_type: 'timestamp_outside_range',
              time_difference: timeDiff,
              tolerance_minutes: toleranceMinutes,
              timestamp: new Date().toISOString()
            }
          }
        ]
      };
    }

    return {
      success: true,
      allowed: true,
      message: 'Webhook timestamp is within acceptable range'
    };
  }
}

/**
 * Regra: Prevenção de webhooks duplicados
 */
export class DuplicateWebhookPreventionRule extends BaseBusinessRule {
  private validator = new WebhookValidator();

  constructor() {
    super('duplicate_webhook_prevention', 90, BusinessRuleCategory.WEBHOOK);
  }

  async evaluate(context: BusinessRuleContext): Promise<BusinessRuleResult> {
    const { webhook_data, connection_id } = context;
    
    if (!webhook_data?.id || !connection_id) {
      return {
        success: false,
        allowed: false,
        message: 'Webhook ID and connection ID are required',
        errorCode: 'MISSING_WEBHOOK_ID'
      };
    }

    try {
      const isUnique = await this.validator.validateWebhookDuplicate(
        webhook_data.id, 
        connection_id
      );

      if (!isUnique) {
        return {
          success: true,
          allowed: false,
          message: 'Duplicate webhook detected - ignoring',
          errorCode: 'DUPLICATE_WEBHOOK',
          data: { webhook_id: webhook_data.id },
          actions: [
            {
              type: 'log_event',
              target: 'duplicate_webhooks',
              params: {
                connection_id,
                webhook_id: webhook_data.id,
                timestamp: new Date().toISOString(),
                action: 'ignored'
              }
            }
          ]
        };
      }

      return {
        success: true,
        allowed: true,
        message: 'Webhook is unique and can be processed'
      };

    } catch (error) {
      console.error('Error checking webhook duplicate:', error);
      return {
        success: false,
        allowed: false,
        message: 'Failed to check webhook duplicate',
        errorCode: 'DUPLICATE_CHECK_ERROR'
      };
    }
  }
}

/**
 * Regra: Limite de rate para webhooks por conexão
 */
export class WebhookRateLimitRule extends BaseBusinessRule {
  constructor() {
    super('webhook_rate_limit', 85, BusinessRuleCategory.WEBHOOK);
  }

  async evaluate(context: BusinessRuleContext): Promise<BusinessRuleResult> {
    const { connection_id } = context;
    
    if (!connection_id) {
      return {
        success: false,
        allowed: false,
        message: 'Connection ID is required for webhook rate limit check',
        errorCode: 'MISSING_CONNECTION_ID'
      };
    }

    try {
      // Rate limit: max 100 webhooks por minuto por conexão
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
      
      const { data: recentWebhooks, error } = await databaseService.getClient()
        .from('whatsapp_official_logs')
        .select('id')
        .eq('connection_id', connection_id)
        .eq('event_type', 'webhook_received')
        .gte('created_at', oneMinuteAgo);

      if (error) {
        console.error('Error checking webhook rate limit:', error);
        return {
          success: false,
          allowed: false,
          message: 'Failed to validate webhook rate limit',
          errorCode: 'RATE_LIMIT_CHECK_ERROR'
        };
      }

      const webhooksInLastMinute = recentWebhooks?.length || 0;
      const maxPerMinute = 100; // Configurável

      if (webhooksInLastMinute >= maxPerMinute) {
        return {
          success: true,
          allowed: false,
          message: 'Webhook rate limit exceeded',
          errorCode: 'WEBHOOK_RATE_LIMIT_EXCEEDED',
          data: { 
            webhooks_in_minute: webhooksInLastMinute,
            max_per_minute: maxPerMinute
          },
          actions: [
            {
              type: 'log_event',
              target: 'webhook_rate_limit_violations',
              params: {
                connection_id,
                webhooks_count: webhooksInLastMinute,
                max_allowed: maxPerMinute,
                timestamp: new Date().toISOString()
              }
            },
            {
              type: 'update_status',
              target: connection_id,
              params: {
                webhook_status: 'rate_limited',
                error_message: 'Webhook rate limit exceeded'
              }
            }
          ]
        };
      }

      const remaining = maxPerMinute - webhooksInLastMinute;
      return {
        success: true,
        allowed: true,
        message: `Webhook can be processed (${remaining} remaining in current window)`,
        data: { remaining, webhooks_in_minute: webhooksInLastMinute }
      };

    } catch (error) {
      console.error('Error checking webhook rate limit:', error);
      return {
        success: false,
        allowed: false,
        message: 'Failed to validate webhook rate limit',
        errorCode: 'RATE_LIMIT_CHECK_ERROR'
      };
    }
  }
}

/**
 * Regra: Validação de formato e estrutura do webhook
 */
export class WebhookFormatValidationRule extends BaseBusinessRule {
  constructor() {
    super('webhook_format_validation', 105, BusinessRuleCategory.WEBHOOK);
  }

  async evaluate(context: BusinessRuleContext): Promise<BusinessRuleResult> {
    const { webhook_data } = context;
    
    if (!webhook_data) {
      return {
        success: false,
        allowed: false,
        message: 'Webhook data is required',
        errorCode: 'MISSING_WEBHOOK_DATA'
      };
    }

    const errors: string[] = [];

    // Validações básicas de estrutura
    if (!webhook_data.object) {
      errors.push('Missing webhook object type');
    }

    if (!webhook_data.entry || !Array.isArray(webhook_data.entry)) {
      errors.push('Missing or invalid entry array');
    }

    // Validações específicas para WhatsApp webhook
    if (webhook_data.object === 'whatsapp_business_account') {
      if (!webhook_data.entry || webhook_data.entry.length === 0) {
        errors.push('WhatsApp webhook must have at least one entry');
      }

      // Validar estrutura de cada entry
      webhook_data.entry?.forEach((entry: any, index: number) => {
        if (!entry.id) {
          errors.push(`Entry ${index}: missing business account ID`);
        }

        if (!entry.changes || !Array.isArray(entry.changes)) {
          errors.push(`Entry ${index}: missing changes array`);
        }

        entry.changes?.forEach((change: any, changeIndex: number) => {
          if (!change.field) {
            errors.push(`Entry ${index}, change ${changeIndex}: missing field`);
          }

          if (!change.value) {
            errors.push(`Entry ${index}, change ${changeIndex}: missing value`);
          }
        });
      });
    }

    if (errors.length > 0) {
      return {
        success: true,
        allowed: false,
        message: 'Webhook format validation failed',
        errorCode: 'INVALID_WEBHOOK_FORMAT',
        data: { errors },
        actions: [
          {
            type: 'log_event',
            target: 'webhook_validation_errors',
            params: {
              webhook_object: webhook_data.object,
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
      message: 'Webhook format is valid'
    };
  }
}

/**
 * Regra: Monitoramento de saúde dos webhooks
 */
export class WebhookHealthMonitoringRule extends BaseBusinessRule {
  private validator = new WebhookValidator();

  constructor() {
    super('webhook_health_monitoring', 75, BusinessRuleCategory.WEBHOOK);
  }

  async evaluate(context: BusinessRuleContext): Promise<BusinessRuleResult> {
    const { connection_id } = context;
    
    if (!connection_id) {
      return {
        success: true,
        allowed: true,
        message: 'No connection specified for webhook health check'
      };
    }

    try {
      const { healthy, consecutiveFailures } = await this.validator.validateWebhookHealth(connection_id);

      if (!healthy) {
        return {
          success: true,
          allowed: false,
          message: 'Webhook health check failed',
          errorCode: 'WEBHOOK_UNHEALTHY',
          data: { consecutive_failures: consecutiveFailures },
          actions: [
            {
              type: 'log_event',
              target: 'webhook_health_issues',
              params: {
                connection_id,
                consecutive_failures: consecutiveFailures,
                timestamp: new Date().toISOString()
              }
            },
            {
              type: 'send_notification',
              target: 'connection_owner',
              params: {
                type: 'webhook_health_warning',
                connection_id,
                consecutive_failures: consecutiveFailures,
                message: 'Webhook health check detected issues with your WhatsApp connection'
              }
            }
          ]
        };
      }

      return {
        success: true,
        allowed: true,
        message: 'Webhook health is good',
        data: { consecutive_failures: consecutiveFailures }
      };

    } catch (error) {
      console.error('Error checking webhook health:', error);
      return {
        success: false,
        allowed: false,
        message: 'Failed to validate webhook health',
        errorCode: 'WEBHOOK_HEALTH_CHECK_ERROR'
      };
    }
  }
}

/**
 * Regra: Auto-recovery para webhooks com falhas
 */
export class WebhookAutoRecoveryRule extends BaseBusinessRule {
  private repository = getWhatsAppOfficialRepository();

  constructor() {
    super('webhook_auto_recovery', 70, BusinessRuleCategory.WEBHOOK);
  }

  async canExecute(context: BusinessRuleContext): Promise<boolean> {
    // Só executar se for um processo automático de recovery
    return context.metadata?.auto_recovery === true;
  }

  async evaluate(context: BusinessRuleContext): Promise<BusinessRuleResult> {
    const { connection_id } = context;
    
    if (!connection_id) {
      return {
        success: false,
        allowed: false,
        message: 'Connection ID is required for auto recovery',
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

      const consecutiveFailures = connection.webhook_consecutive_failures || 0;

      // Tentar recovery se houver falhas consecutivas
      if (consecutiveFailures >= 3) {
        // Reset do contador de falhas
        await this.repository.resetWebhookFailures(connection_id);

        return {
          success: true,
          allowed: true,
          message: 'Webhook auto recovery attempted',
          data: { 
            previous_failures: consecutiveFailures,
            recovery_action: 'reset_failure_counter'
          },
          actions: [
            {
              type: 'log_event',
              target: 'webhook_auto_recovery',
              params: {
                connection_id,
                previous_failures: consecutiveFailures,
                action: 'reset_failure_counter',
                timestamp: new Date().toISOString()
              }
            },
            {
              type: 'update_status',
              target: connection_id,
              params: {
                webhook_status: 'recovering',
                webhook_consecutive_failures: 0
              }
            }
          ]
        };
      }

      return {
        success: true,
        allowed: true,
        message: 'No recovery needed',
        data: { consecutive_failures: consecutiveFailures }
      };

    } catch (error) {
      console.error('Error in webhook auto recovery:', error);
      return {
        success: false,
        allowed: false,
        message: 'Webhook auto recovery failed',
        errorCode: 'AUTO_RECOVERY_ERROR'
      };
    }
  }
}