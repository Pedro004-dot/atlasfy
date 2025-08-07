import { 
  BaseBusinessRule, 
  BusinessRuleContext, 
  BusinessRuleResult, 
  BusinessRuleCategory,
  ITokenValidator 
} from '../interfaces/IBusinessRule';
import { getWhatsAppOfficialRepository } from '@/repositories/whatsapp-official.repository';
import { getWhatsAppOfficialAuthService } from '@/services/whatsapp-official-auth.service';

/**
 * Implementação do validador de tokens
 */
export class TokenValidator implements ITokenValidator {
  private repository = getWhatsAppOfficialRepository();

  async validateTokenExpiration(connectionId: string): Promise<{ valid: boolean; daysRemaining: number }> {
    try {
      const connection = await this.repository.findById(connectionId);
      if (!connection || !connection.token_expires_at) {
        return { valid: false, daysRemaining: 0 };
      }

      const expirationDate = new Date(connection.token_expires_at);
      const now = new Date();
      const msRemaining = expirationDate.getTime() - now.getTime();
      const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));

      return {
        valid: daysRemaining > 0,
        daysRemaining: Math.max(0, daysRemaining)
      };
    } catch (error) {
      console.error('Error validating token expiration:', error);
      return { valid: false, daysRemaining: 0 };
    }
  }

  async validateTokenHealth(connectionId: string): Promise<{ healthy: boolean; lastCheck: Date }> {
    try {
      const connection = await this.repository.findById(connectionId);
      if (!connection) {
        return { healthy: false, lastCheck: new Date() };
      }

      // Considerar token saudável se:
      // 1. Não expirou
      // 2. Não tem muitos erros consecutivos (< 5)
      // 3. Status da conexão não é 'error'
      const tokenExpiration = await this.validateTokenExpiration(connectionId);
      const hasLowErrors = connection.consecutive_errors < 5;
      const statusOk = connection.status !== 'error';

      return {
        healthy: tokenExpiration.valid && hasLowErrors && statusOk,
        lastCheck: new Date()
      };
    } catch (error) {
      console.error('Error validating token health:', error);
      return { healthy: false, lastCheck: new Date() };
    }
  }
}

/**
 * Regra: Tokens expiram em 60 dias (Meta) - Renovar quando restam < 7 dias
 */
export class TokenExpirationRule extends BaseBusinessRule {
  private validator = new TokenValidator();
  private authService = getWhatsAppOfficialAuthService();

  constructor() {
    super('token_expiration', 100, BusinessRuleCategory.AUTHENTICATION);
  }

  async evaluate(context: BusinessRuleContext): Promise<BusinessRuleResult> {
    const { connection_id } = context;
    
    if (!connection_id) {
      return {
        success: false,
        allowed: false,
        message: 'Connection ID is required for token validation',
        errorCode: 'MISSING_CONNECTION_ID'
      };
    }

    const { valid, daysRemaining } = await this.validator.validateTokenExpiration(connection_id);

    // Token já expirado
    if (!valid) {
      return {
        success: true,
        allowed: false,
        message: 'Token has expired',
        errorCode: 'TOKEN_EXPIRED',
        actions: [
          {
            type: 'update_status',
            target: connection_id,
            params: { status: 'error', error_message: 'Token expired' }
          },
          {
            type: 'send_notification',
            target: 'connection_owner',
            params: {
              type: 'token_expired',
              connection_id,
              message: 'WhatsApp connection token has expired. Please reconnect.'
            }
          }
        ]
      };
    }

    // Token próximo do vencimento (< 7 dias)
    if (daysRemaining < 7) {
      return {
        success: true,
        allowed: true,
        message: `Token expires in ${daysRemaining} days - refresh needed`,
        errorCode: 'TOKEN_EXPIRING_SOON',
        data: { daysRemaining },
        actions: [
          {
            type: 'schedule_task',
            target: 'token_refresh',
            params: {
              connection_id,
              priority: daysRemaining < 2 ? 'high' : 'medium',
              execute_at: new Date(Date.now() + 60 * 60 * 1000) // 1 hora
            }
          },
          {
            type: 'send_notification',
            target: 'connection_owner',
            params: {
              type: 'token_expiring',
              connection_id,
              days_remaining: daysRemaining,
              message: `WhatsApp connection token expires in ${daysRemaining} days.`
            }
          }
        ]
      };
    }

    return {
      success: true,
      allowed: true,
      message: `Token is valid for ${daysRemaining} more days`,
      data: { daysRemaining }
    };
  }
}

/**
 * Regra: Se renovação falhar 3x, marcar conexão como "error"
 */
export class TokenRefreshFailureRule extends BaseBusinessRule {
  private repository = getWhatsAppOfficialRepository();

  constructor() {
    super('token_refresh_failure', 90, BusinessRuleCategory.AUTHENTICATION);
  }

  async evaluate(context: BusinessRuleContext): Promise<BusinessRuleResult> {
    const { connection_id, metadata } = context;
    
    if (!connection_id) {
      return {
        success: false,
        allowed: false,
        message: 'Connection ID is required',
        errorCode: 'MISSING_CONNECTION_ID'
      };
    }

    const refreshFailures = metadata?.refresh_failures || 0;
    const maxFailures = 3;

    if (refreshFailures >= maxFailures) {
      return {
        success: true,
        allowed: false,
        message: 'Token refresh has failed maximum number of times',
        errorCode: 'MAX_REFRESH_FAILURES',
        actions: [
          {
            type: 'update_status',
            target: connection_id,
            params: { 
              status: 'error', 
              error_message: `Token refresh failed ${refreshFailures} times`,
              consecutive_errors: refreshFailures
            }
          },
          {
            type: 'pause_connection',
            target: connection_id,
            params: { reason: 'token_refresh_failures' }
          },
          {
            type: 'send_notification',
            target: 'connection_owner',
            params: {
              type: 'connection_error',
              connection_id,
              error: 'Token refresh failed multiple times',
              action_required: 'Manual reconnection needed'
            }
          }
        ]
      };
    }

    return {
      success: true,
      allowed: true,
      message: `Token refresh can be attempted (${refreshFailures}/${maxFailures} failures)`,
      data: { refreshFailures, maxFailures }
    };
  }
}

/**
 * Regra: Conexões "error" não processam mensagens
 */
export class ErrorConnectionBlockRule extends BaseBusinessRule {
  private repository = getWhatsAppOfficialRepository();

  constructor() {
    super('error_connection_block', 95, BusinessRuleCategory.AUTHENTICATION);
  }

  async evaluate(context: BusinessRuleContext): Promise<BusinessRuleResult> {
    const { connection_id } = context;
    
    if (!connection_id) {
      return {
        success: true,
        allowed: true,
        message: 'No connection specified, rule skipped'
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

      if (connection.status === 'error') {
        return {
          success: true,
          allowed: false,
          message: 'Connection is in error state - operations blocked',
          errorCode: 'CONNECTION_IN_ERROR',
          data: {
            last_error: connection.last_error_message,
            error_count: connection.consecutive_errors
          },
          actions: [{
            type: 'log_event',
            target: 'blocked_operations',
            params: {
              connection_id,
              operation: context.metadata?.operation || 'unknown',
              reason: 'connection_in_error_state'
            }
          }]
        };
      }

      return {
        success: true,
        allowed: true,
        message: 'Connection is healthy for operations'
      };

    } catch (error) {
      console.error('Error checking connection status:', error);
      return {
        success: false,
        allowed: false,
        message: 'Failed to validate connection status',
        errorCode: 'CONNECTION_STATUS_CHECK_ERROR'
      };
    }
  }
}

/**
 * Regra: Auto-renovação de tokens próximos do vencimento
 */
export class AutoTokenRefreshRule extends BaseBusinessRule {
  private validator = new TokenValidator();
  private authService = getWhatsAppOfficialAuthService();

  constructor() {
    super('auto_token_refresh', 85, BusinessRuleCategory.AUTHENTICATION);
  }

  async canExecute(context: BusinessRuleContext): Promise<boolean> {
    // Só executar se for um processo automático (não manual)
    return context.metadata?.automatic === true;
  }

  async evaluate(context: BusinessRuleContext): Promise<BusinessRuleResult> {
    const { connection_id } = context;
    
    if (!connection_id) {
      return {
        success: false,
        allowed: false,
        message: 'Connection ID is required for auto refresh',
        errorCode: 'MISSING_CONNECTION_ID'
      };
    }

    try {
      const { valid, daysRemaining } = await this.validator.validateTokenExpiration(connection_id);

      // Se token expira em menos de 7 dias, tentar renovar
      if (valid && daysRemaining < 7) {
        const refreshResult = await this.authService.refreshTokens(connection_id);

        if (refreshResult.success) {
          return {
            success: true,
            allowed: true,
            message: 'Token refreshed automatically',
            data: refreshResult.data,
            actions: [
              {
                type: 'log_event',
                target: 'auto_token_refresh',
                params: {
                  connection_id,
                  old_expiry_days: daysRemaining,
                  new_expiry: refreshResult.data?.expires_at
                }
              },
              {
                type: 'reset_counter',
                target: connection_id,
                params: { counter: 'refresh_failures' }
              }
            ]
          };
        } else {
          return {
            success: true,
            allowed: false,
            message: 'Auto token refresh failed',
            errorCode: 'AUTO_REFRESH_FAILED',
            data: { error: refreshResult.error },
            actions: [
              {
                type: 'increment_counter',
                target: connection_id,
                params: { counter: 'refresh_failures' }
              },
              {
                type: 'log_event',
                target: 'auto_token_refresh_failures',
                params: {
                  connection_id,
                  error: refreshResult.error,
                  days_remaining: daysRemaining
                }
              }
            ],
            nextRules: ['token_refresh_failure'] // Chain para verificar limite de falhas
          };
        }
      }

      return {
        success: true,
        allowed: true,
        message: 'Token does not need refresh yet',
        data: { daysRemaining }
      };

    } catch (error) {
      console.error('Error in auto token refresh:', error);
      return {
        success: false,
        allowed: false,
        message: 'Auto token refresh failed with error',
        errorCode: 'AUTO_REFRESH_ERROR'
      };
    }
  }
}

/**
 * Regra: Validação de integridade dos tokens armazenados
 */
export class TokenIntegrityRule extends BaseBusinessRule {
  private repository = getWhatsAppOfficialRepository();

  constructor() {
    super('token_integrity', 75, BusinessRuleCategory.AUTHENTICATION);
  }

  async evaluate(context: BusinessRuleContext): Promise<BusinessRuleResult> {
    const { connection_id } = context;
    
    if (!connection_id) {
      return {
        success: true,
        allowed: true,
        message: 'No connection specified for token integrity check'
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

      const issues: string[] = [];

      // Verificar se tokens estão presentes
      if (!connection.access_token_encrypted) {
        issues.push('missing_access_token');
      }

      if (!connection.token_expires_at) {
        issues.push('missing_expiration_date');
      }

      if (!connection.token_created_at) {
        issues.push('missing_creation_date');
      }

      // Verificar se data de expiração é válida
      if (connection.token_expires_at) {
        const expirationDate = new Date(connection.token_expires_at);
        const creationDate = new Date(connection.token_created_at || connection.created_at);
        
        if (expirationDate <= creationDate) {
          issues.push('invalid_expiration_date');
        }
      }

      if (issues.length > 0) {
        return {
          success: true,
          allowed: false,
          message: 'Token integrity issues detected',
          errorCode: 'TOKEN_INTEGRITY_ISSUES',
          data: { issues },
          actions: [
            {
              type: 'log_event',
              target: 'token_integrity_issues',
              params: { connection_id, issues }
            },
            {
              type: 'update_status',
              target: connection_id,
              params: { 
                status: 'error',
                error_message: `Token integrity issues: ${issues.join(', ')}`
              }
            }
          ]
        };
      }

      return {
        success: true,
        allowed: true,
        message: 'Token integrity is valid'
      };

    } catch (error) {
      console.error('Error checking token integrity:', error);
      return {
        success: false,
        allowed: false,
        message: 'Failed to validate token integrity',
        errorCode: 'TOKEN_INTEGRITY_CHECK_ERROR'
      };
    }
  }
}