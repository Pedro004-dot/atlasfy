/**
 * Interface base para todas as regras de negócio
 * Seguindo Open/Closed principle para extensibilidade
 */

export interface BusinessRuleContext {
  user_id?: string;
  connection_id?: string;
  company_id?: string;
  agent_id?: string;
  message_data?: any;
  webhook_data?: any;
  connection_data?: any;
  metadata?: Record<string, any>;
}

export interface BusinessRuleResult {
  rule_name: string;  
  rule_category: BusinessRuleCategory;
  success: boolean;
  allowed: boolean;
  message?: string;
  errorCode?: string;
  data?: any;
  actions?: RuleAction[];
  nextRules?: string[]; // Chain other rules
}

export interface RuleAction {
  type: 'update_status' | 'send_notification' | 'log_event' | 'schedule_task' | 'increment_counter' | 'reset_counter' | 'pause_connection' | 'activate_connection';
  target: string;
  params?: Record<string, any>;
}

/**
 * Interface base para todas as regras de negócio
 */
export abstract class BaseBusinessRule {
  public readonly name: string;
  public readonly priority: number;
  public readonly category: BusinessRuleCategory;
  
  constructor(name: string, priority: number, category: BusinessRuleCategory) {
    this.name = name;
    this.priority = priority;
    this.category = category;
  }

  abstract evaluate(context: BusinessRuleContext): Promise<BusinessRuleResult>;
  
  /**
   * Permite que regras definam pré-condições
   */
  async canExecute(context: BusinessRuleContext): Promise<boolean> {
    return true;
  }

  /**
   * Ações pós-execução
   */
  async onSuccess(context: BusinessRuleContext, result: BusinessRuleResult): Promise<void> {
    // Override in subclasses if needed
  }

  async onFailure(context: BusinessRuleContext, result: BusinessRuleResult): Promise<void> {
    // Override in subclasses if needed
  }
}

export enum BusinessRuleCategory {
  CONNECTION = 'connection',
  AUTHENTICATION = 'authentication',
  MESSAGE = 'message',
  WEBHOOK = 'webhook',
  MONITORING = 'monitoring',
  SECURITY = 'security',
  STATE_MANAGEMENT = 'state_management'
}

/**
 * Interface para validadores específicos
 */
export interface IConnectionValidator {
  validateUniquePhoneNumber(phoneNumberId: string, excludeConnectionId?: string): Promise<boolean>;
  validateAgentExclusivity(agentId: string, excludeConnectionId?: string): Promise<boolean>;
  validateMaxConnectionsPerCompany(companyId: string): Promise<boolean>;
}

export interface ITokenValidator {
  validateTokenExpiration(connectionId: string): Promise<{ valid: boolean; daysRemaining: number }>;
  validateTokenHealth(connectionId: string): Promise<{ healthy: boolean; lastCheck: Date }>;
}

export interface IMessageValidator {
  validateMessageDuplicate(messageId: string): Promise<boolean>;
  validateRateLimit(connectionId: string): Promise<{ allowed: boolean; remaining: number }>;
  validateMessageFormat(messageData: any): Promise<{ valid: boolean; errors: string[] }>;
}

export interface IWebhookValidator {
  validateSignature(payload: string, signature: string, secret: string): boolean;
  validateTimestamp(timestamp: number, toleranceMinutes?: number): boolean;
  validateWebhookHealth(connectionId: string): Promise<{ healthy: boolean; consecutiveFailures: number }>;
}

/**
 * Interface para o engine de regras
 */
export interface IBusinessRuleEngine {
  registerRule(rule: BaseBusinessRule): void;
  unregisterRule(ruleName: string): void;
  executeRules(context: BusinessRuleContext, category?: BusinessRuleCategory): Promise<BusinessRuleResult[]>;
  executeRule(ruleName: string, context: BusinessRuleContext): Promise<BusinessRuleResult>;
  getRulesByCategory(category: BusinessRuleCategory): BaseBusinessRule[];
  getAllRules(): BaseBusinessRule[];
}

/**
 * Eventos do sistema para auditoria
 */
export interface BusinessRuleEvent {
  id: string;
  rule_name: string;
  context: BusinessRuleContext;
  result: BusinessRuleResult;
  executed_at: Date;
  duration_ms: number;
  user_id?: string;
  connection_id?: string;
}

export interface IBusinessRuleAuditor {
  logRuleExecution(event: BusinessRuleEvent): Promise<void>;
  getRuleExecutionHistory(ruleName: string, limit?: number): Promise<BusinessRuleEvent[]>;
  getConnectionRuleHistory(connectionId: string, limit?: number): Promise<BusinessRuleEvent[]>;
}

/**
 * Types para configuração dinâmica de regras
 */
export interface RuleConfiguration {
  ruleName: string;
  enabled: boolean;
  parameters: Record<string, any>;
  schedule?: {
    type: 'cron' | 'interval';
    expression: string;
  };
  conditions?: {
    field: string;
    operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
    value: any;
  }[];
}

/**
 * Factory para criar regras dinamicamente
 */
export interface IBusinessRuleFactory {
  createRule(type: string, config: RuleConfiguration): BaseBusinessRule;
  getAvailableRuleTypes(): string[];
}