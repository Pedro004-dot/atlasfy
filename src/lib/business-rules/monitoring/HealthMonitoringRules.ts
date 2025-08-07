import { 
  BaseBusinessRule, 
  BusinessRuleContext, 
  BusinessRuleResult, 
  BusinessRuleCategory
} from '../interfaces/IBusinessRule';
import { getWhatsAppOfficialRepository } from '@/repositories/whatsapp-official.repository';
import { getWhatsAppOfficialLogsRepository } from '@/repositories/whatsapp-official.repository';
import { databaseService } from '@/lib/database';

/**
 * Regra: Monitoramento de saúde geral das conexões
 */
export class ConnectionHealthMonitoringRule extends BaseBusinessRule {
  private repository = getWhatsAppOfficialRepository();

  constructor() {
    super('connection_health_monitoring', 100, BusinessRuleCategory.MONITORING);
  }

  async evaluate(context: BusinessRuleContext): Promise<BusinessRuleResult> {
    const { connection_id } = context;
    
    if (!connection_id) {
      return {
        success: true,
        allowed: true,
        message: 'No connection specified for health monitoring'
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

      const healthIssues: string[] = [];
      const warnings: string[] = [];

      // 1. Verificar status da conexão
      if (connection.status === 'error') {
        healthIssues.push('connection_in_error_state');
      }

      // 2. Verificar expiração do token
      if (connection.token_expires_at) {
        const daysUntilExpiry = Math.ceil(
          (new Date(connection.token_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysUntilExpiry <= 0) {
          healthIssues.push('token_expired');
        } else if (daysUntilExpiry <= 7) {
          warnings.push(`token_expiring_in_${daysUntilExpiry}_days`);
        }
      }

      // 3. Verificar erros consecutivos
      if (connection.consecutive_errors >= 5) {
        healthIssues.push('excessive_consecutive_errors');
      } else if (connection.consecutive_errors >= 3) {
        warnings.push('elevated_error_count');
      }

      // 4. Verificar webhook health
      if (connection.webhook_consecutive_failures >= 3) {
        healthIssues.push('webhook_delivery_issues');
      }

      // 5. Verificar atividade recente
      const lastActivity = connection.last_webhook_received_at || connection.last_message_sent_at;
      if (lastActivity) {
        const hoursSinceActivity = (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceActivity > 72) { // 3 dias
          healthIssues.push('no_recent_activity');
        } else if (hoursSinceActivity > 24) { // 1 dia
          warnings.push('reduced_activity');
        }
      }

      // 6. Verificar quota
      const quotaUsage = (connection.message_quota_used || 0) / (connection.message_quota_limit || 1);
      if (quotaUsage >= 1) {
        healthIssues.push('quota_exceeded');
      } else if (quotaUsage >= 0.9) {
        warnings.push('quota_nearly_exceeded');
      }

      // Determinar status geral
      const overallHealth = healthIssues.length === 0 ? 'healthy' : 'unhealthy';
      const severity = healthIssues.length > 0 ? 'critical' : warnings.length > 0 ? 'warning' : 'ok';

      const result: BusinessRuleResult = {
        success: true,
        allowed: healthIssues.length === 0,
        message: `Connection health: ${overallHealth}`,
        data: {
          health_status: overallHealth,
          severity,
          health_issues: healthIssues,
          warnings,
          metrics: {
            consecutive_errors: connection.consecutive_errors,
            webhook_failures: connection.webhook_consecutive_failures,
            quota_usage: quotaUsage,
            days_until_token_expiry: connection.token_expires_at ? Math.ceil(
              (new Date(connection.token_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            ) : null
          }
        }
      };

      // Adicionar ações baseadas nos problemas encontrados
      const actions = [];

      if (healthIssues.includes('token_expired')) {
        actions.push({
          type: 'send_notification',
          target: 'connection_owner',
          params: {
            type: 'token_expired',
            connection_id,
            urgency: 'high'
          }
        });
      }

      if (healthIssues.includes('excessive_consecutive_errors')) {
        actions.push({
          type: 'pause_connection',
          target: connection_id,
          params: { reason: 'excessive_errors' }
        });
      }

      if (healthIssues.length > 0 || warnings.length > 0) {
        actions.push({
          type: 'log_event',
          target: 'health_monitoring',
          params: {
            connection_id,
            health_status: overallHealth,
            severity,
            issues: healthIssues,
            warnings,
            timestamp: new Date().toISOString()
          }
        });
      }

      if (actions.length > 0) {
        result.actions = actions;
      }

      return result;

    } catch (error) {
      console.error('Error in connection health monitoring:', error);
      return {
        success: false,
        allowed: false,
        message: 'Health monitoring check failed',
        errorCode: 'HEALTH_MONITORING_ERROR'
      };
    }
  }
}

/**
 * Regra: Monitoramento de performance e métricas
 */
export class PerformanceMonitoringRule extends BaseBusinessRule {
  private repository = getWhatsAppOfficialRepository();

  constructor() {
    super('performance_monitoring', 90, BusinessRuleCategory.MONITORING);
  }

  async evaluate(context: BusinessRuleContext): Promise<BusinessRuleResult> {
    const { connection_id } = context;
    
    if (!connection_id) {
      return {
        success: true,
        allowed: true,
        message: 'No connection specified for performance monitoring'
      };
    }

    try {
      // Coletar métricas de performance das últimas 24 horas
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const supabase = databaseService.getClient();

      // Métricas de mensagens
      const { data: messageLogs, error: messageError } = await supabase
        .from('whatsapp_official_logs')
        .select('*')
        .eq('connection_id', connection_id)
        .in('event_type', ['message_sent', 'message_received', 'message_failed'])
        .gte('created_at', last24Hours);

      if (messageError) {
        console.error('Error fetching message logs:', messageError);
        return {
          success: false,
          allowed: false,
          message: 'Failed to fetch performance metrics',
          errorCode: 'METRICS_FETCH_ERROR'
        };
      }

      // Calcular métricas
      const messagesSent = messageLogs?.filter(log => log.event_type === 'message_sent').length || 0;
      const messagesReceived = messageLogs?.filter(log => log.event_type === 'message_received').length || 0;
      const messagesFailed = messageLogs?.filter(log => log.event_type === 'message_failed').length || 0;
      
      const totalMessages = messagesSent + messagesReceived + messagesFailed;
      const successRate = totalMessages > 0 ? ((messagesSent + messagesReceived) / totalMessages) : 1;
      const failureRate = totalMessages > 0 ? (messagesFailed / totalMessages) : 0;

      // Métricas de webhooks
      const { data: webhookLogs, error: webhookError } = await supabase
        .from('whatsapp_official_logs')
        .select('*')
        .eq('connection_id', connection_id)
        .in('event_type', ['webhook_received', 'webhook_failed'])
        .gte('created_at', last24Hours);

      if (webhookError) {
        console.error('Error fetching webhook logs:', webhookError);
      }

      const webhooksReceived = webhookLogs?.filter(log => log.event_type === 'webhook_received').length || 0;
      const webhooksFailed = webhookLogs?.filter(log => log.event_type === 'webhook_failed').length || 0;
      const totalWebhooks = webhooksReceived + webhooksFailed;
      const webhookSuccessRate = totalWebhooks > 0 ? (webhooksReceived / totalWebhooks) : 1;

      // Avaliar thresholds de performance
      const performanceIssues: string[] = [];
      const warnings: string[] = [];

      if (successRate < 0.95 && totalMessages > 10) {
        performanceIssues.push('low_message_success_rate');
      } else if (successRate < 0.98 && totalMessages > 10) {
        warnings.push('decreased_message_success_rate');
      }

      if (webhookSuccessRate < 0.95 && totalWebhooks > 5) {
        performanceIssues.push('low_webhook_success_rate');
      }

      if (totalMessages === 0 && messagesReceived === 0) {
        warnings.push('no_message_activity');
      }

      const performanceGrade = this.calculatePerformanceGrade(successRate, webhookSuccessRate, totalMessages);

      return {
        success: true,
        allowed: performanceIssues.length === 0,
        message: `Performance monitoring completed - Grade: ${performanceGrade}`,
        data: {
          performance_grade: performanceGrade,
          issues: performanceIssues,
          warnings,
          metrics: {
            messages_sent: messagesSent,
            messages_received: messagesReceived,
            messages_failed: messagesFailed,
            message_success_rate: successRate,
            message_failure_rate: failureRate,
            webhooks_received: webhooksReceived,
            webhooks_failed: webhooksFailed,
            webhook_success_rate: webhookSuccessRate,
            total_activity: totalMessages + totalWebhooks
          },
          period: '24_hours'
        },
        actions: performanceIssues.length > 0 ? [
          {
            type: 'log_event',
            target: 'performance_monitoring',
            params: {
              connection_id,
              performance_grade: performanceGrade,
              issues: performanceIssues,
              warnings,
              metrics: {
                message_success_rate: successRate,
                webhook_success_rate: webhookSuccessRate,
                total_messages: totalMessages,
                total_webhooks: totalWebhooks
              },
              timestamp: new Date().toISOString()
            }
          }
        ] : undefined
      };

    } catch (error) {
      console.error('Error in performance monitoring:', error);
      return {
        success: false,
        allowed: false,
        message: 'Performance monitoring check failed',
        errorCode: 'PERFORMANCE_MONITORING_ERROR'
      };
    }
  }

  private calculatePerformanceGrade(messageSuccessRate: number, webhookSuccessRate: number, totalActivity: number): string {
    // Fator de atividade (conexões com pouca atividade têm grade menor)
    const activityFactor = Math.min(totalActivity / 100, 1); // Normalizar para max 1
    
    // Score combinado
    const combinedScore = (messageSuccessRate * 0.7 + webhookSuccessRate * 0.3) * activityFactor;
    
    if (combinedScore >= 0.95) return 'A';
    if (combinedScore >= 0.90) return 'B';
    if (combinedScore >= 0.80) return 'C';
    if (combinedScore >= 0.70) return 'D';
    return 'F';
  }
}

/**
 * Regra: Limpeza automática de logs antigos
 */
export class LogCleanupRule extends BaseBusinessRule {
  constructor() {
    super('log_cleanup', 50, BusinessRuleCategory.MONITORING);
  }

  async canExecute(context: BusinessRuleContext): Promise<boolean> {
    // Só executar se for um processo de limpeza automática
    return context.metadata?.cleanup_task === true;
  }

  async evaluate(context: BusinessRuleContext): Promise<BusinessRuleResult> {
    const { connection_id } = context;
    const retentionDays = context.metadata?.retention_days || 30;

    try {
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
      const supabase = databaseService.getClient();

      // Contar logs que serão removidos
      let deleteQuery = supabase
        .from('whatsapp_official_logs')
        .delete()
        .lt('created_at', cutoffDate);

      // Se connection_id especificado, limpar apenas dessa conexão
      if (connection_id) {
        deleteQuery = deleteQuery.eq('connection_id', connection_id);
      }

      const { count: deletedCount, error } = await deleteQuery;

      if (error) {
        console.error('Error cleaning up logs:', error);
        return {
          success: false,
          allowed: false,
          message: 'Log cleanup failed',
          errorCode: 'LOG_CLEANUP_ERROR',
          data: { error: error.message }
        };
      }

      return {
        success: true,
        allowed: true,
        message: `Log cleanup completed - ${deletedCount || 0} records removed`,
        data: {
          deleted_count: deletedCount || 0,
          retention_days: retentionDays,
          cutoff_date: cutoffDate,
          connection_id: connection_id || 'all_connections'
        },
        actions: [
          {
            type: 'log_event',
            target: 'system_maintenance',
            params: {
              operation: 'log_cleanup',
              deleted_count: deletedCount || 0,
              retention_days: retentionDays,
              connection_id,
              timestamp: new Date().toISOString()
            }
          }
        ]
      };

    } catch (error) {
      console.error('Error in log cleanup rule:', error);
      return {
        success: false,
        allowed: false,
        message: 'Log cleanup rule failed',
        errorCode: 'LOG_CLEANUP_RULE_ERROR'
      };
    }
  }
}

/**
 * Regra: Alertas proativos para administradores
 */
export class ProactiveAlertRule extends BaseBusinessRule {
  private repository = getWhatsAppOfficialRepository();

  constructor() {
    super('proactive_alert', 80, BusinessRuleCategory.MONITORING);
  }

  async evaluate(context: BusinessRuleContext): Promise<BusinessRuleResult> {
    const { connection_id, metadata } = context;
    
    try {
      const alerts: any[] = [];

      // Se connection_id específico, verificar apenas essa conexão
      if (connection_id) {
        const connection = await this.repository.findById(connection_id);
        if (connection) {
          const connectionAlerts = this.analyzeConnectionForAlerts(connection);
          alerts.push(...connectionAlerts);
        }
      } else {
        // Verificar todas as conexões ativas
        const activeConnections = await this.repository.findActiveConnections();
        
        for (const connection of activeConnections) {
          const connectionAlerts = this.analyzeConnectionForAlerts(connection);
          alerts.push(...connectionAlerts);
        }
      }

      // Filtrar apenas alertas críticos ou de alta prioridade
      const criticalAlerts = alerts.filter(alert => 
        alert.severity === 'critical' || alert.priority === 'high'
      );

      if (criticalAlerts.length === 0) {
        return {
          success: true,
          allowed: true,
          message: 'No critical alerts detected',
          data: { total_alerts: alerts.length, critical_alerts: 0 }
        };
      }

      return {
        success: true,
        allowed: true,
        message: `${criticalAlerts.length} critical alerts detected`,
        data: {
          total_alerts: alerts.length,
          critical_alerts: criticalAlerts.length,
          alerts: criticalAlerts
        },
        actions: criticalAlerts.map(alert => ({
          type: 'send_notification',
          target: 'system_admin',
          params: {
            type: 'proactive_alert',
            alert_type: alert.type,
            connection_id: alert.connection_id,
            severity: alert.severity,
            message: alert.message,
            data: alert.data
          }
        }))
      };

    } catch (error) {
      console.error('Error in proactive alert rule:', error);
      return {
        success: false,
        allowed: false,
        message: 'Proactive alert check failed',
        errorCode: 'PROACTIVE_ALERT_ERROR'
      };
    }
  }

  private analyzeConnectionForAlerts(connection: any): any[] {
    const alerts: any[] = [];

    // Alert 1: Token expirando em 24 horas
    if (connection.token_expires_at) {
      const hoursUntilExpiry = (new Date(connection.token_expires_at).getTime() - Date.now()) / (1000 * 60 * 60);
      
      if (hoursUntilExpiry <= 24 && hoursUntilExpiry > 0) {
        alerts.push({
          type: 'token_expiring_soon',
          connection_id: connection.id,
          severity: 'critical',
          priority: 'high',
          message: `Token expires in ${Math.round(hoursUntilExpiry)} hours`,
          data: { hours_until_expiry: Math.round(hoursUntilExpiry) }
        });
      }
    }

    // Alert 2: Quota quase esgotada (> 95%)
    const quotaUsage = (connection.message_quota_used || 0) / (connection.message_quota_limit || 1);
    if (quotaUsage > 0.95) {
      alerts.push({
        type: 'quota_nearly_exhausted',
        connection_id: connection.id,
        severity: 'high',
        priority: 'high',
        message: `Message quota ${Math.round(quotaUsage * 100)}% used`,
        data: { quota_usage_percent: Math.round(quotaUsage * 100) }
      });
    }

    // Alert 3: Muitos erros consecutivos
    if (connection.consecutive_errors >= 10) {
      alerts.push({
        type: 'excessive_errors',
        connection_id: connection.id,
        severity: 'critical',
        priority: 'high',
        message: `${connection.consecutive_errors} consecutive errors`,
        data: { consecutive_errors: connection.consecutive_errors }
      });
    }

    // Alert 4: Webhook health deteriorada
    if (connection.webhook_consecutive_failures >= 5) {
      alerts.push({
        type: 'webhook_health_critical',
        connection_id: connection.id,
        severity: 'high',
        priority: 'medium',
        message: `${connection.webhook_consecutive_failures} consecutive webhook failures`,
        data: { webhook_failures: connection.webhook_consecutive_failures }
      });
    }

    return alerts;
  }
}

/**
 * Regra: Monitoramento de recursos do sistema
 */
export class SystemResourceMonitoringRule extends BaseBusinessRule {
  constructor() {
    super('system_resource_monitoring', 60, BusinessRuleCategory.MONITORING);
  }

  async evaluate(context: BusinessRuleContext): Promise<BusinessRuleResult> {
    try {
      const supabase = databaseService.getClient();
      
      // Métricas gerais do sistema
      const systemMetrics: any = {};

      // 1. Contagem total de conexões ativas
      const { count: activeConnections, error: connectionError } = await supabase
        .from('whatsapp_official_connections')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      if (connectionError) {
        console.error('Error counting active connections:', connectionError);
      } else {
        systemMetrics.active_connections = activeConnections || 0;
      }

      // 2. Volume de logs nas últimas 24 horas
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count: recentLogs, error: logsError } = await supabase
        .from('whatsapp_official_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', last24Hours);

      if (logsError) {
        console.error('Error counting recent logs:', logsError);
      } else {
        systemMetrics.logs_24h = recentLogs || 0;
      }

      // 3. Taxa de erro geral
      const { count: errorLogs, error: errorLogsError } = await supabase
        .from('whatsapp_official_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', last24Hours)
        .in('event_type', ['webhook_failed', 'message_failed', 'connection_error']);

      if (errorLogsError) {
        console.error('Error counting error logs:', errorLogsError);
      } else {
        systemMetrics.error_logs_24h = errorLogs || 0;
        systemMetrics.error_rate_24h = systemMetrics.logs_24h > 0 
          ? (errorLogs || 0) / systemMetrics.logs_24h 
          : 0;
      }

      // Avaliar thresholds do sistema
      const systemIssues: string[] = [];
      const warnings: string[] = [];

      // High error rate
      if (systemMetrics.error_rate_24h > 0.1) { // 10%
        systemIssues.push('high_system_error_rate');
      } else if (systemMetrics.error_rate_24h > 0.05) { // 5%
        warnings.push('elevated_system_error_rate');
      }

      // High log volume (pode indicar spam ou problemas)
      if (systemMetrics.logs_24h > 10000) {
        warnings.push('high_log_volume');
      }

      // Muitas conexões ativas (pode necessitar scaling)
      if (systemMetrics.active_connections > 500) {
        warnings.push('high_connection_count');
      }

      return {
        success: true,
        allowed: systemIssues.length === 0,
        message: `System resource monitoring completed`,
        data: {
          system_health: systemIssues.length === 0 ? 'healthy' : 'degraded',
          issues: systemIssues,
          warnings,
          metrics: systemMetrics
        },
        actions: systemIssues.length > 0 ? [
          {
            type: 'log_event',
            target: 'system_monitoring',
            params: {
              system_health: systemIssues.length === 0 ? 'healthy' : 'degraded',
              issues: systemIssues,
              warnings,
              metrics: systemMetrics,
              timestamp: new Date().toISOString()
            }
          }
        ] : undefined
      };

    } catch (error) {
      console.error('Error in system resource monitoring:', error);
      return {
        success: false,
        allowed: false,
        message: 'System resource monitoring failed',
        errorCode: 'SYSTEM_MONITORING_ERROR'
      };
    }
  }
}