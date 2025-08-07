import {
  BaseBusinessRule,
  BusinessRuleContext,
  BusinessRuleResult,
  BusinessRuleCategory,
  IBusinessRuleEngine,
  BusinessRuleEvent,
  IBusinessRuleAuditor,
  RuleAction
} from '../interfaces/IBusinessRule';
import { databaseService } from '@/lib/database';
import { v4 as uuidv4 } from 'uuid';

/**
 * Engine principal de execução de regras de negócio
 * Implementa o padrão Chain of Responsibility para execução ordenada
 */
export class BusinessRuleEngine implements IBusinessRuleEngine {
  private rules: Map<string, BaseBusinessRule> = new Map();
  private auditor: BusinessRuleAuditor;

  constructor() {
    this.auditor = new BusinessRuleAuditor();
  }

  /**
   * Registra uma nova regra no engine
   */
  registerRule(rule: BaseBusinessRule): void {
    if (this.rules.has(rule.name)) {
      console.warn(`Rule ${rule.name} is already registered. Overwriting.`);
    }
    
    this.rules.set(rule.name, rule);
    console.log(`Registered business rule: ${rule.name} (priority: ${rule.priority}, category: ${rule.category})`);
  }

  /**
   * Remove uma regra do engine
   */
  unregisterRule(ruleName: string): void {
    if (this.rules.delete(ruleName)) {
      console.log(`Unregistered business rule: ${ruleName}`);
    } else {
      console.warn(`Rule ${ruleName} was not found for unregistration`);
    }
  }

  /**
   * Executa todas as regras aplicáveis para um contexto
   * Ordenadas por prioridade (maior primeiro)
   */
  async executeRules(context: BusinessRuleContext, category?: BusinessRuleCategory): Promise<BusinessRuleResult[]> {
    const applicableRules = this.getApplicableRules(context, category);
    const results: BusinessRuleResult[] = [];

    console.log(`Executing ${applicableRules.length} business rules for context:`, {
      connection_id: context.connection_id,
      user_id: context.user_id,
      category: category || 'all'
    });

    for (const rule of applicableRules) {
      try {
        const startTime = Date.now();
        
        // Verificar se regra pode ser executada
        const canExecute = await rule.canExecute(context);
        if (!canExecute) {
          console.log(`Skipping rule ${rule.name} - canExecute returned false`);
          continue;
        }

        // Executar regra
        const result = await rule.evaluate(context);
        const duration = Date.now() - startTime;

        // Auditar execução
        await this.auditRuleExecution({
          id: uuidv4(),
          rule_name: rule.name,
          context,
          result,
          executed_at: new Date(),
          duration_ms: duration,
          user_id: context.user_id,
          connection_id: context.connection_id
        });

        // Executar ações da regra
        if (result.actions) {
          await this.executeRuleActions(result.actions, context);
        }

        // Callbacks de sucesso/falha
        if (result.success && result.allowed) {
          await rule.onSuccess(context, result);
        } else if (result.success && !result.allowed) {
          await rule.onFailure(context, result);
        }

        results.push({
          ...result,
          rule_name: rule.name,
          rule_category: rule.category,
          execution_duration_ms: duration
        } as BusinessRuleResult);

        // Se resultado não permite continuação e não há regras em chain
        if (!result.allowed && !result.nextRules) {
          console.log(`Rule ${rule.name} blocked execution - stopping rule chain`);
          break;
        }

        // Executar regras em chain se especificadas
        if (result.nextRules) {
          const chainResults = await this.executeChainedRules(result.nextRules, context);
          results.push(...chainResults);
        }

      } catch (error) {
        console.error(`Error executing rule ${rule.name}:`, error);
        
        const errorResult: BusinessRuleResult = {
          success: false,
          allowed: false,
          message: `Rule execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          errorCode: 'RULE_EXECUTION_ERROR',
          rule_name: rule.name,
          rule_category: rule.category
        };

        results.push(errorResult);

        // Callback de falha
        try {
          await rule.onFailure(context, errorResult);
        } catch (callbackError) {
          console.error(`Error in rule failure callback for ${rule.name}:`, callbackError);
        }
      }
    }

    return results;
  }

  /**
   * Executa uma regra específica pelo nome
   */
  async executeRule(ruleName: string, context: BusinessRuleContext): Promise<BusinessRuleResult> {
    const rule = this.rules.get(ruleName);
    
    if (!rule) {
      return {
        success: false,
        allowed: false,
        message: `Rule '${ruleName}' not found`,
        errorCode: 'RULE_NOT_FOUND',
        rule_name: ruleName,
        rule_category: BusinessRuleCategory.CONNECTION
      };
    }

    try {
      const startTime = Date.now();
      
      // Verificar se pode executar
      const canExecute = await rule.canExecute(context);
      if (!canExecute) {
        return {
          success: true,
          allowed: true,
          message: `Rule '${ruleName}' skipped - preconditions not met`,
          rule_name: ruleName,
          rule_category: BusinessRuleCategory.CONNECTION
        };
      }

      // Executar regra
      const result = await rule.evaluate(context);
      const duration = Date.now() - startTime;

      // Auditar
      await this.auditRuleExecution({
        id: uuidv4(),
        rule_name: rule.name,
        context,
        result,
        executed_at: new Date(),
        duration_ms: duration,
        user_id: context.user_id,
        connection_id: context.connection_id
      });

      // Executar ações
      if (result.actions) {
        await this.executeRuleActions(result.actions, context);
      }

      return {
        ...result,
        rule_name: rule.name,
        rule_category: rule.category,
        execution_duration_ms: duration
      } as BusinessRuleResult;

    } catch (error) {
      console.error(`Error executing rule ${ruleName}:`, error);
      return {
        success: false,
        allowed: false,
        message: `Rule execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'RULE_EXECUTION_ERROR',
        rule_name: ruleName,
        rule_category: BusinessRuleCategory.CONNECTION
      };
    }
  }

  /**
   * Obtém regras por categoria
   */
  getRulesByCategory(category: BusinessRuleCategory): BaseBusinessRule[] {
    return Array.from(this.rules.values())
      .filter(rule => rule.category === category)
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Obtém todas as regras registradas
   */
  getAllRules(): BaseBusinessRule[] {
    return Array.from(this.rules.values())
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Executa validação em lote para múltiplas operações
   */
  async executeBatchValidation(
    contexts: BusinessRuleContext[], 
    category?: BusinessRuleCategory
  ): Promise<BusinessRuleResult[][]> {
    const results: BusinessRuleResult[][] = [];
    
    for (const context of contexts) {
      const contextResults = await this.executeRules(context, category);
      results.push(contextResults);
    }

    return results;
  }

  /**
   * Executa regras específicas de health check
   */
  async executeHealthCheck(connectionId: string): Promise<{ healthy: boolean; results: BusinessRuleResult[] }> {
    const context: BusinessRuleContext = {
      connection_id: connectionId,
      metadata: { health_check: true }
    };

    const results = await this.executeRules(context, BusinessRuleCategory.MONITORING);
    
    // Determinar saúde geral baseada nos resultados
    const hasBlockingIssues = results.some(result => 
      !result.allowed && result.errorCode && [
        'TOKEN_EXPIRED',
        'CONNECTION_IN_ERROR',
        'QUOTA_EXCEEDED',
        'WEBHOOK_UNHEALTHY'
      ].includes(result.errorCode)
    );

    return {
      healthy: !hasBlockingIssues,
      results
    };
  }

  /**
   * Executa regras de segurança para uma operação
   */
  async executeSecurityValidation(context: BusinessRuleContext): Promise<{ allowed: boolean; results: BusinessRuleResult[] }> {
    const results = await this.executeRules(context, BusinessRuleCategory.SECURITY);
    
    const allowed = results.every(result => result.allowed);
    
    return { allowed, results };
  }

  private getApplicableRules(context: BusinessRuleContext, category?: BusinessRuleCategory): BaseBusinessRule[] {
    const rules = Array.from(this.rules.values());
    
    return rules
      .filter(rule => !category || rule.category === category)
      .sort((a, b) => b.priority - a.priority); // Ordenar por prioridade decrescente
  }

  private async executeChainedRules(nextRules: string[], context: BusinessRuleContext): Promise<BusinessRuleResult[]> {
    const chainResults: BusinessRuleResult[] = [];
    
    for (const ruleName of nextRules) {
      const result = await this.executeRule(ruleName, context);
      chainResults.push(result);
    }

    return chainResults;
  }

  private async executeRuleActions(actions: RuleAction[], context: BusinessRuleContext): Promise<void> {
    for (const action of actions) {
      try {
        await this.executeAction(action, context);
      } catch (error) {
        console.error(`Error executing action ${action.type}:`, error);
      }
    }
  }

  private async executeAction(action: RuleAction, context: BusinessRuleContext): Promise<void> {
    switch (action.type) {
      case 'log_event':
        await this.logEvent(action.target, action.params, context);
        break;

      case 'update_status':
        await this.updateConnectionStatus(action.target, action.params);
        break;

      case 'send_notification':
        await this.sendNotification(action.target, action.params, context);
        break;

      case 'schedule_task':
        await this.scheduleTask(action.target, action.params, context);
        break;

      case 'increment_counter':
      case 'reset_counter':
        await this.updateCounter(action.target, action.params, action.type);
        break;

      case 'pause_connection':
        await this.pauseConnection(action.target, action.params);
        break;

      case 'activate_connection':
        await this.activateConnection(action.target, action.params);
        break;

      default:
        console.warn(`Unknown action type: ${action.type}`);
    }
  }

  private async logEvent(target: string, params: any, context: BusinessRuleContext): Promise<void> {
    try {
      const supabase = databaseService.getClient();
      
      await supabase.from('whatsapp_official_logs').insert({
        connection_id: context.connection_id,
        user_id: context.user_id,
        event_type: target,
        event_data: params,
        created_at: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error logging event:', error);
    }
  }

  private async updateConnectionStatus(connectionId: string, params: any): Promise<void> {
    try {
      const supabase = databaseService.getClient();
      
      await supabase
        .from('whatsapp_official_connections')
        .update({
          ...params,
          updated_at: new Date().toISOString()
        })
        .eq('id', connectionId);

    } catch (error) {
      console.error('Error updating connection status:', error);
    }
  }

  private async sendNotification(target: string, params: any, context: BusinessRuleContext): Promise<void> {
    // Implementação de notificações (email, webhook, etc.)
    console.log(`[NOTIFICATION] ${target}:`, params);
    
    // Log da notificação
    await this.logEvent('notification_sent', {
      target,
      notification_params: params,
      context
    }, context);
  }

  private async scheduleTask(target: string, params: any, context: BusinessRuleContext): Promise<void> {
    // Implementação de agendamento de tarefas
    console.log(`[SCHEDULED_TASK] ${target}:`, params);
    
    // Log da tarefa agendada
    await this.logEvent('task_scheduled', {
      task_type: target,
      task_params: params,
      scheduled_at: new Date().toISOString()
    }, context);
  }

  private async updateCounter(connectionId: string, params: any, operation: string): Promise<void> {
    try {
      const supabase = databaseService.getClient();
      const counter = params.counter;
      
      if (operation === 'increment_counter') {
        // Incrementar contador
        await supabase.rpc('increment_connection_counter', {
          connection_id: connectionId,
          counter_name: counter,
          increment_by: params.increment || 1
        });
      } else {
        // Reset contador
        const updateData: any = { updated_at: new Date().toISOString() };
        updateData[counter] = 0;
        
        await supabase
          .from('whatsapp_official_connections')
          .update(updateData)
          .eq('id', connectionId);
      }

    } catch (error) {
      console.error(`Error ${operation}:`, error);
    }
  }

  private async pauseConnection(connectionId: string, params: any): Promise<void> {
    await this.updateConnectionStatus(connectionId, {
      status: 'paused',
      pause_reason: params.reason,
      paused_at: new Date().toISOString()
    });
  }

  private async activateConnection(connectionId: string, params: any): Promise<void> {
    await this.updateConnectionStatus(connectionId, {
      status: 'active',
      pause_reason: null,
      paused_at: null,
      activated_at: new Date().toISOString()
    });
  }

  private async auditRuleExecution(event: BusinessRuleEvent): Promise<void> {
    await this.auditor.logRuleExecution(event);
  }
}

/**
 * Auditor para log de execução de regras
 */
export class BusinessRuleAuditor implements IBusinessRuleAuditor {
  async logRuleExecution(event: BusinessRuleEvent): Promise<void> {
    try {
      const supabase = databaseService.getClient();
      
      await supabase.from('whatsapp_official_logs').insert({
        connection_id: event.connection_id,
        user_id: event.user_id,
        event_type: 'business_rule_executed',
        event_data: {
          rule_name: event.rule_name,
          context: event.context,
          result: event.result,
          duration_ms: event.duration_ms,
          executed_at: event.executed_at.toISOString()
        },
        created_at: event.executed_at.toISOString()
      });

    } catch (error) {
      console.error('Error logging rule execution:', error);
    }
  }

  async getRuleExecutionHistory(ruleName: string, limit: number = 100): Promise<BusinessRuleEvent[]> {
    try {
      const supabase = databaseService.getClient();
      
      const { data, error } = await supabase
        .from('whatsapp_official_logs')
        .select('*')
        .eq('event_type', 'business_rule_executed')
        .contains('event_data', { rule_name: ruleName })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map(log => ({
        id: log.id,
        rule_name: ruleName,
        context: log.event_data.context,
        result: log.event_data.result,
        executed_at: new Date(log.created_at),
        duration_ms: log.event_data.duration_ms,
        user_id: log.user_id,
        connection_id: log.connection_id
      }));

    } catch (error) {
      console.error('Error getting rule execution history:', error);
      return [];
    }
  }

  async getConnectionRuleHistory(connectionId: string, limit: number = 100): Promise<BusinessRuleEvent[]> {
    try {
      const supabase = databaseService.getClient();
      
      const { data, error } = await supabase
        .from('whatsapp_official_logs')
        .select('*')
        .eq('connection_id', connectionId)
        .eq('event_type', 'business_rule_executed')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map(log => ({
        id: log.id,
        rule_name: log.event_data.rule_name,
        context: log.event_data.context,
        result: log.event_data.result,
        executed_at: new Date(log.created_at),
        duration_ms: log.event_data.duration_ms,
        user_id: log.user_id,
        connection_id: log.connection_id
      }));

    } catch (error) {
      console.error('Error getting connection rule history:', error);
      return [];
    }
  }
}

/**
 * Singleton instance do Business Rule Engine
 */
let businessRuleEngineInstance: BusinessRuleEngine | null = null;

export function getBusinessRuleEngine(): BusinessRuleEngine {
  if (!businessRuleEngineInstance) {
    businessRuleEngineInstance = new BusinessRuleEngine();
  }
  return businessRuleEngineInstance;
}

/**
 * Factory para inicializar engine com todas as regras
 */
export async function initializeBusinessRuleEngine(): Promise<BusinessRuleEngine> {
  const engine = getBusinessRuleEngine();

  // Importar e registrar todas as regras
  try {
    // Connection Rules
    const { 
      UniquePhoneNumberRule,
      AgentExclusivityRule,
      MaxConnectionsPerCompanyRule,
      ConnectionDataValidationRule,
      PreventDuplicateConnectionsRule
    } = await import('../connection/WhatsAppConnectionRules');

    engine.registerRule(new UniquePhoneNumberRule());
    engine.registerRule(new AgentExclusivityRule());
    engine.registerRule(new MaxConnectionsPerCompanyRule());
    engine.registerRule(new ConnectionDataValidationRule());
    engine.registerRule(new PreventDuplicateConnectionsRule());

    // Authentication Rules
    const {
      TokenExpirationRule,
      TokenRefreshFailureRule,
      ErrorConnectionBlockRule,
      AutoTokenRefreshRule,
      TokenIntegrityRule
    } = await import('../authentication/TokenRules');

    engine.registerRule(new TokenExpirationRule());
    engine.registerRule(new TokenRefreshFailureRule());
    engine.registerRule(new ErrorConnectionBlockRule());
    engine.registerRule(new AutoTokenRefreshRule());
    engine.registerRule(new TokenIntegrityRule());

    // Message Rules
    const {
      SaveIncomingMessageRule,
      DuplicateMessageRule,
      MessageRateLimitRule,
      MessageRetryRule,
      MessageFormatValidationRule,
      MessageQuotaRule
    } = await import('../message/MessageRules');

    engine.registerRule(new SaveIncomingMessageRule());
    engine.registerRule(new DuplicateMessageRule());
    engine.registerRule(new MessageRateLimitRule());
    engine.registerRule(new MessageRetryRule());
    engine.registerRule(new MessageFormatValidationRule());
    engine.registerRule(new MessageQuotaRule());

    // Webhook Rules
    const {
      WebhookSignatureValidationRule,
      WebhookTimestampValidationRule,
      DuplicateWebhookPreventionRule,
      WebhookRateLimitRule,
      WebhookFormatValidationRule,
      WebhookHealthMonitoringRule,
      WebhookAutoRecoveryRule
    } = await import('../webhook/WebhookRules');

    engine.registerRule(new WebhookSignatureValidationRule());
    engine.registerRule(new WebhookTimestampValidationRule());
    engine.registerRule(new DuplicateWebhookPreventionRule());
    engine.registerRule(new WebhookRateLimitRule());
    engine.registerRule(new WebhookFormatValidationRule());
    engine.registerRule(new WebhookHealthMonitoringRule());
    engine.registerRule(new WebhookAutoRecoveryRule());

    // Monitoring Rules
    const {
      ConnectionHealthMonitoringRule,
      PerformanceMonitoringRule,
      LogCleanupRule,
      ProactiveAlertRule,
      SystemResourceMonitoringRule
    } = await import('../monitoring/HealthMonitoringRules');

    engine.registerRule(new ConnectionHealthMonitoringRule());
    engine.registerRule(new PerformanceMonitoringRule());
    engine.registerRule(new LogCleanupRule());
    engine.registerRule(new ProactiveAlertRule());
    engine.registerRule(new SystemResourceMonitoringRule());

    // Security Rules
    const {
      IPRateLimitRule,
      SuspiciousActivityDetectionRule,
      DataIntegrityValidationRule,
      BruteForcePreventionRule,
      SecurityAuditRule
    } = await import('../security/SecurityRules');

    engine.registerRule(new IPRateLimitRule());
    engine.registerRule(new SuspiciousActivityDetectionRule());
    engine.registerRule(new DataIntegrityValidationRule());
    engine.registerRule(new BruteForcePreventionRule());
    engine.registerRule(new SecurityAuditRule());

    // State Management Rules
    const {
      ConnectionStateTransitionRule,
      StateConsistencyRule,
      StateRecoveryRule,
      StateCleanupRule
    } = await import('../state/StateManagementRules');

    engine.registerRule(new ConnectionStateTransitionRule());
    engine.registerRule(new StateConsistencyRule());
    engine.registerRule(new StateRecoveryRule());
    engine.registerRule(new StateCleanupRule());

    console.log(`Business Rule Engine initialized with ${engine.getAllRules().length} rules`);
    
    return engine;

  } catch (error) {
    console.error('Error initializing Business Rule Engine:', error);
    throw error;
  }
}