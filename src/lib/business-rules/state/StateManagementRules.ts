import { 
  BaseBusinessRule, 
  BusinessRuleContext, 
  BusinessRuleResult, 
  BusinessRuleCategory
} from '../interfaces/IBusinessRule';
import { getWhatsAppOfficialRepository } from '@/repositories/whatsapp-official.repository';

/**
 * Regra: Transições de estado válidas para conexões
 */
export class ConnectionStateTransitionRule extends BaseBusinessRule {
  private repository = getWhatsAppOfficialRepository();

  constructor() {
    super('connection_state_transition', 100, BusinessRuleCategory.STATE_MANAGEMENT);
  }

  async evaluate(context: BusinessRuleContext): Promise<BusinessRuleResult> {
    const { connection_id, metadata } = context;
    const newStatus = metadata?.new_status;
    
    if (!connection_id || !newStatus) {
      return {
        success: false,
        allowed: false,
        message: 'Connection ID and new status are required',
        errorCode: 'MISSING_STATE_DATA'
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

      const currentStatus = connection.status;
      const isValidTransition = this.isValidStateTransition(currentStatus, newStatus);

      if (!isValidTransition) {
        return {
          success: true,
          allowed: false,
          message: `Invalid state transition from '${currentStatus}' to '${newStatus}'`,
          errorCode: 'INVALID_STATE_TRANSITION',
          data: {
            current_status: currentStatus,
            requested_status: newStatus,
            valid_transitions: this.getValidTransitions(currentStatus)
          },
          actions: [
            {
              type: 'log_event',
              target: 'state_violations',
              params: {
                connection_id,
                invalid_transition: `${currentStatus} -> ${newStatus}`,
                timestamp: new Date().toISOString()
              }
            }
          ]
        };
      }

      return {
        success: true,
        allowed: true,
        message: `Valid state transition from '${currentStatus}' to '${newStatus}'`,
        data: {
          current_status: currentStatus,
          new_status: newStatus,
          transition_type: this.getTransitionType(currentStatus, newStatus)
        },
        actions: [
          {
            type: 'log_event',
            target: 'state_transitions',
            params: {
              connection_id,
              transition: `${currentStatus} -> ${newStatus}`,
              transition_type: this.getTransitionType(currentStatus, newStatus),
              timestamp: new Date().toISOString()
            }
          }
        ]
      };

    } catch (error) {
      console.error('Error in connection state transition rule:', error);
      return {
        success: false,
        allowed: false,
        message: 'State transition validation failed',
        errorCode: 'STATE_TRANSITION_ERROR'
      };
    }
  }

  private isValidStateTransition(currentStatus: string, newStatus: string): boolean {
    // Definição das transições válidas
    const validTransitions: Record<string, string[]> = {
      // Pending pode ir para active, error ou disconnected
      'pending': ['active', 'error', 'disconnected'],
      
      // Active pode ir para error, paused ou disconnected
      'active': ['error', 'paused', 'disconnected'],
      
      // Error pode ir para active (recovery), paused ou disconnected
      'error': ['active', 'paused', 'disconnected'],
      
      // Paused pode ir para active ou disconnected
      'paused': ['active', 'disconnected'],
      
      // Disconnected pode ir para pending (reconectar)
      'disconnected': ['pending'],
      
      // Deleted é estado final
      'deleted': []
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  private getValidTransitions(currentStatus: string): string[] {
    const validTransitions: Record<string, string[]> = {
      'pending': ['active', 'error', 'disconnected'],
      'active': ['error', 'paused', 'disconnected'],
      'error': ['active', 'paused', 'disconnected'],
      'paused': ['active', 'disconnected'],
      'disconnected': ['pending'],
      'deleted': []
    };

    return validTransitions[currentStatus] || [];
  }

  private getTransitionType(fromStatus: string, toStatus: string): string {
    // Categorizar tipos de transição para auditoria
    if (toStatus === 'active') {
      if (fromStatus === 'pending') return 'activation';
      if (fromStatus === 'error' || fromStatus === 'paused') return 'recovery';
    }
    
    if (toStatus === 'error') return 'failure';
    if (toStatus === 'paused') return 'suspension';
    if (toStatus === 'disconnected') return 'disconnection';
    if (toStatus === 'deleted') return 'deletion';
    
    return 'state_change';
  }
}

/**
 * Regra: Prevenção de estados inconsistentes
 */
export class StateConsistencyRule extends BaseBusinessRule {
  private repository = getWhatsAppOfficialRepository();

  constructor() {
    super('state_consistency', 90, BusinessRuleCategory.STATE_MANAGEMENT);
  }

  async evaluate(context: BusinessRuleContext): Promise<BusinessRuleResult> {
    const { connection_id } = context;
    
    if (!connection_id) {
      return {
        success: true,
        allowed: true,
        message: 'No connection specified for consistency check'
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

      const inconsistencies: string[] = [];

      // 1. Status vs health_status consistency
      if (connection.status === 'active' && connection.health_status === 'unhealthy') {
        inconsistencies.push('active_status_but_unhealthy');
      }

      // 2. Token expiry vs status
      if (connection.token_expires_at) {
        const isTokenExpired = new Date(connection.token_expires_at) < new Date();
        if (isTokenExpired && connection.status === 'active') {
          inconsistencies.push('expired_token_but_active_status');
        }
      }

      // 3. Webhook vs connection status
      if (connection.webhook_consecutive_failures >= 5 && connection.status === 'active') {
        inconsistencies.push('webhook_failures_but_active_status');
      }

      // 4. Error count vs status
      if (connection.consecutive_errors >= 10 && connection.status === 'active') {
        inconsistencies.push('high_errors_but_active_status');
      }

      // 5. Agent connection consistency
      if (connection.agent_id && connection.status === 'disconnected') {
        inconsistencies.push('agent_assigned_but_disconnected');
      }

      // 6. Quota vs activity consistency
      const quotaUsed = connection.message_quota_used || 0;
      const lastActivity = connection.last_message_sent_at;
      
      if (quotaUsed > 0 && !lastActivity) {
        inconsistencies.push('quota_used_but_no_activity_record');
      }

      if (inconsistencies.length > 0) {
        return {
          success: true,
          allowed: false,
          message: 'State inconsistencies detected',
          errorCode: 'STATE_INCONSISTENCY',
          data: { 
            inconsistencies,
            current_state: {
              status: connection.status,
              health_status: connection.health_status,
              consecutive_errors: connection.consecutive_errors,
              webhook_failures: connection.webhook_consecutive_failures,
              token_expired: connection.token_expires_at ? 
                new Date(connection.token_expires_at) < new Date() : false
            }
          },
          actions: [
            {
              type: 'log_event',
              target: 'state_inconsistencies',
              params: {
                connection_id,
                inconsistencies,
                current_status: connection.status,
                timestamp: new Date().toISOString()
              }
            },
            ...this.getFixActions(inconsistencies, connection_id)
          ]
        };
      }

      return {
        success: true,
        allowed: true,
        message: 'Connection state is consistent'
      };

    } catch (error) {
      console.error('Error in state consistency rule:', error);
      return {
        success: false,
        allowed: false,
        message: 'State consistency check failed',
        errorCode: 'STATE_CONSISTENCY_ERROR'
      };
    }
  }

  private getFixActions(inconsistencies: string[], connectionId: string): any[] {
    const actions: any[] = [];

    if (inconsistencies.includes('expired_token_but_active_status')) {
      actions.push({
        type: 'update_status',
        target: connectionId,
        params: { status: 'error', error_message: 'Token expired' }
      });
    }

    if (inconsistencies.includes('high_errors_but_active_status')) {
      actions.push({
        type: 'update_status',
        target: connectionId,
        params: { status: 'error', error_message: 'Too many consecutive errors' }
      });
    }

    if (inconsistencies.includes('webhook_failures_but_active_status')) {
      actions.push({
        type: 'update_status',
        target: connectionId,
        params: { health_status: 'unhealthy', webhook_status: 'failing' }
      });
    }

    return actions;
  }
}

/**
 * Regra: Auto-recuperação de estados de erro
 */
export class StateRecoveryRule extends BaseBusinessRule {
  private repository = getWhatsAppOfficialRepository();

  constructor() {
    super('state_recovery', 80, BusinessRuleCategory.STATE_MANAGEMENT);
  }

  async canExecute(context: BusinessRuleContext): Promise<boolean> {
    // Só executar para processos automáticos de recovery
    return context.metadata?.auto_recovery === true;
  }

  async evaluate(context: BusinessRuleContext): Promise<BusinessRuleResult> {
    const { connection_id } = context;
    
    if (!connection_id) {
      return {
        success: false,
        allowed: false,
        message: 'Connection ID is required for state recovery',
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

      // Só tentar recovery se estiver em estado de erro
      if (connection.status !== 'error') {
        return {
          success: true,
          allowed: true,
          message: 'Connection is not in error state, no recovery needed',
          data: { current_status: connection.status }
        };
      }

      // Verificar se recovery é possível
      const canRecover = await this.canAttemptRecovery(connection);
      
      if (!canRecover.possible) {
        return {
          success: true,
          allowed: false,
          message: 'Recovery not possible at this time',
          errorCode: 'RECOVERY_NOT_POSSIBLE',
          data: { reason: canRecover.reason },
          actions: [
            {
              type: 'schedule_task',
              target: 'retry_recovery',
              params: {
                connection_id,
                retry_after_minutes: 30,
                reason: canRecover.reason
              }
            }
          ]
        };
      }

      // Tentar recovery
      const recoveryActions = this.getRecoveryActions(connection);

      return {
        success: true,
        allowed: true,
        message: 'State recovery initiated',
        data: {
          current_status: connection.status,
          recovery_strategy: canRecover.strategy,
          actions_count: recoveryActions.length
        },
        actions: [
          ...recoveryActions,
          {
            type: 'log_event',
            target: 'state_recovery',
            params: {
              connection_id,
              recovery_strategy: canRecover.strategy,
              previous_status: connection.status,
              timestamp: new Date().toISOString()
            }
          }
        ]
      };

    } catch (error) {
      console.error('Error in state recovery rule:', error);
      return {
        success: false,
        allowed: false,
        message: 'State recovery check failed',
        errorCode: 'STATE_RECOVERY_ERROR'
      };
    }
  }

  private async canAttemptRecovery(connection: any): Promise<{ possible: boolean; reason?: string; strategy?: string }> {
    // Recovery não é possível se:
    
    // 1. Token expirado
    if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
      return { 
        possible: false, 
        reason: 'token_expired' 
      };
    }

    // 2. Muitas tentativas de recovery recentes
    const lastRecoveryAttempt = connection.last_recovery_attempt_at;
    if (lastRecoveryAttempt) {
      const timeSinceLastAttempt = Date.now() - new Date(lastRecoveryAttempt).getTime();
      const minimumWaitTime = 30 * 60 * 1000; // 30 minutos
      
      if (timeSinceLastAttempt < minimumWaitTime) {
        return { 
          possible: false, 
          reason: 'recovery_cooldown' 
        };
      }
    }

    // 3. Muitos erros consecutivos (> 50)
    if (connection.consecutive_errors > 50) {
      return { 
        possible: false, 
        reason: 'excessive_errors' 
      };
    }

    // Determinar estratégia de recovery
    let strategy = 'basic_recovery';
    
    if (connection.consecutive_errors < 5) {
      strategy = 'simple_restart';
    } else if (connection.consecutive_errors < 20) {
      strategy = 'token_refresh_and_restart';
    } else {
      strategy = 'full_recovery_with_validation';
    }

    return { 
      possible: true, 
      strategy 
    };
  }

  private getRecoveryActions(connection: any): any[] {
    const actions: any[] = [];
    const consecutiveErrors = connection.consecutive_errors || 0;

    // Sempre resetar contadores primeiro
    actions.push({
      type: 'reset_counter',
      target: connection.id,
      params: { counter: 'consecutive_errors' }
    });

    actions.push({
      type: 'reset_counter',
      target: connection.id,
      params: { counter: 'webhook_consecutive_failures' }
    });

    // Estratégias baseadas na quantidade de erros
    if (consecutiveErrors < 5) {
      // Recovery simples
      actions.push({
        type: 'update_status',
        target: connection.id,
        params: { 
          status: 'active',
          health_status: 'healthy',
          last_recovery_attempt_at: new Date().toISOString()
        }
      });
    } else if (consecutiveErrors < 20) {
      // Recovery com refresh de token
      actions.push({
        type: 'schedule_task',
        target: 'token_refresh',
        params: { 
          connection_id: connection.id,
          priority: 'high'
        }
      });

      actions.push({
        type: 'update_status',
        target: connection.id,
        params: { 
          status: 'pending',
          last_recovery_attempt_at: new Date().toISOString()
        }
      });
    } else {
      // Recovery completo com validação
      actions.push({
        type: 'schedule_task',
        target: 'full_health_check',
        params: { 
          connection_id: connection.id,
          include_token_validation: true
        }
      });

      actions.push({
        type: 'update_status',
        target: connection.id,
        params: { 
          status: 'paused',
          last_recovery_attempt_at: new Date().toISOString()
        }
      });
    }

    return actions;
  }
}

/**
 * Regra: Limpeza de estados obsoletos
 */
export class StateCleanupRule extends BaseBusinessRule {
  private repository = getWhatsAppOfficialRepository();

  constructor() {
    super('state_cleanup', 60, BusinessRuleCategory.STATE_MANAGEMENT);
  }

  async canExecute(context: BusinessRuleContext): Promise<boolean> {
    // Só executar para processos de limpeza automática
    return context.metadata?.cleanup_task === true;
  }

  async evaluate(context: BusinessRuleContext): Promise<BusinessRuleResult> {
    const { metadata } = context;
    const cleanupType = metadata?.cleanup_type || 'all';

    try {
      const cleanupResults: any = {};
      
      if (cleanupType === 'all' || cleanupType === 'disconnected') {
        // Limpar conexões disconnected há mais de 30 dias
        cleanupResults.disconnected = await this.cleanupDisconnectedConnections();
      }

      if (cleanupType === 'all' || cleanupType === 'error') {
        // Resetar conexões em erro há muito tempo sem tentativa de recovery
        cleanupResults.error_reset = await this.resetStalledErrorConnections();
      }

      if (cleanupType === 'all' || cleanupType === 'counters') {
        // Resetar contadores antigos
        cleanupResults.counters = await this.resetOldCounters();
      }

      const totalCleaned = Object.values(cleanupResults)
        .reduce((sum: number, result: any) => sum + (result?.count || 0), 0);

      return {
        success: true,
        allowed: true,
        message: `State cleanup completed - ${totalCleaned} items processed`,
        data: {
          cleanup_type: cleanupType,
          results: cleanupResults,
          total_cleaned: totalCleaned
        },
        actions: [
          {
            type: 'log_event',
            target: 'system_maintenance',
            params: {
              operation: 'state_cleanup',
              cleanup_type: cleanupType,
              results: cleanupResults,
              timestamp: new Date().toISOString()
            }
          }
        ]
      };

    } catch (error) {
      console.error('Error in state cleanup rule:', error);
      return {
        success: false,
        allowed: false,
        message: 'State cleanup failed',
        errorCode: 'STATE_CLEANUP_ERROR'
      };
    }
  }

  private async cleanupDisconnectedConnections(): Promise<{ count: number }> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
      // Marcar como deleted conexões disconnected há mais de 30 dias
      const disconnectedConnections = await this.repository.findByStatus('disconnected');
      
      let cleanedCount = 0;
      for (const connection of disconnectedConnections) {
        if (connection.updated_at < thirtyDaysAgo) {
          await this.repository.update(connection.id, { status: 'deleted' });
          cleanedCount++;
        }
      }

      return { count: cleanedCount };
    } catch (error) {
      console.error('Error cleaning disconnected connections:', error);
      return { count: 0 };
    }
  }

  private async resetStalledErrorConnections(): Promise<{ count: number }> {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      
      // Pausar conexões em erro há mais de 7 dias sem recovery attempt
      const errorConnections = await this.repository.findByStatus('error');
      
      let resetCount = 0;
      for (const connection of errorConnections) {
        const lastRecoveryAttempt = connection.last_recovery_attempt_at;
        const shouldReset = !lastRecoveryAttempt || lastRecoveryAttempt < sevenDaysAgo;
        
        if (shouldReset && connection.updated_at < sevenDaysAgo) {
          await this.repository.update(connection.id, { 
            status: 'paused',
            error_message: 'Automatically paused due to prolonged error state'
          });
          resetCount++;
        }
      }

      return { count: resetCount };
    } catch (error) {
      console.error('Error resetting stalled error connections:', error);
      return { count: 0 };
    }
  }

  private async resetOldCounters(): Promise<{ count: number }> {
    try {
      // Reset de contadores para conexões que não tiveram atividade há 24h
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const staleConnections = await this.repository.findStaleConnections(dayAgo);
      
      let resetCount = 0;
      for (const connection of staleConnections) {
        if (connection.consecutive_errors > 0 || connection.webhook_consecutive_failures > 0) {
          await this.repository.resetErrorCount(connection.id);
          await this.repository.resetWebhookFailures(connection.id);
          resetCount++;
        }
      }

      return { count: resetCount };
    } catch (error) {
      console.error('Error resetting old counters:', error);
      return { count: 0 };
    }
  }
}