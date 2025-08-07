import { 
  BaseBusinessRule, 
  BusinessRuleContext, 
  BusinessRuleResult, 
  BusinessRuleCategory
} from '../interfaces/IBusinessRule';
import { getWhatsAppOfficialRepository } from '@/repositories/whatsapp-official.repository';
import { databaseService } from '@/lib/database';
import * as crypto from 'crypto';

/**
 * Regra: Rate limiting por IP para prevenir abuso
 */
export class IPRateLimitRule extends BaseBusinessRule {
  constructor() {
    super('ip_rate_limit', 100, BusinessRuleCategory.SECURITY);
  }

  async evaluate(context: BusinessRuleContext): Promise<BusinessRuleResult> {
    const { metadata } = context;
    const clientIP = metadata?.client_ip;
    
    if (!clientIP) {
      return {
        success: true,
        allowed: true,
        message: 'No client IP provided, skipping rate limit check'
      };
    }

    try {
      const supabase = databaseService.getClient();
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      // Contar requisições do IP na última hora
      const { data: ipLogs, error } = await supabase
        .from('whatsapp_official_logs')
        .select('id')
        .contains('event_data', { client_ip: clientIP })
        .gte('created_at', oneHourAgo);

      if (error) {
        console.error('Error checking IP rate limit:', error);
        return {
          success: false,
          allowed: false,
          message: 'Failed to validate IP rate limit',
          errorCode: 'RATE_LIMIT_CHECK_ERROR'
        };
      }

      const requestsInLastHour = ipLogs?.length || 0;
      const maxRequestsPerHour = 1000; // Configurável

      if (requestsInLastHour >= maxRequestsPerHour) {
        return {
          success: true,
          allowed: false,
          message: 'IP rate limit exceeded',
          errorCode: 'IP_RATE_LIMIT_EXCEEDED',
          data: { 
            requests_in_hour: requestsInLastHour,
            max_per_hour: maxRequestsPerHour,
            client_ip: clientIP
          },
          actions: [
            {
              type: 'log_event',
              target: 'security_violations',
              params: {
                violation_type: 'ip_rate_limit_exceeded',
                client_ip: clientIP,
                requests_count: requestsInLastHour,
                timestamp: new Date().toISOString()
              }
            }
          ]
        };
      }

      return {
        success: true,
        allowed: true,
        message: `IP rate limit OK (${requestsInLastHour}/${maxRequestsPerHour})`,
        data: { requests_in_hour: requestsInLastHour, max_per_hour: maxRequestsPerHour }
      };

    } catch (error) {
      console.error('Error in IP rate limit rule:', error);
      return {
        success: false,
        allowed: false,
        message: 'IP rate limit check failed',
        errorCode: 'IP_RATE_LIMIT_ERROR'
      };
    }
  }
}

/**
 * Regra: Detecção de padrões suspeitos de atividade
 */
export class SuspiciousActivityDetectionRule extends BaseBusinessRule {
  private repository = getWhatsAppOfficialRepository();

  constructor() {
    super('suspicious_activity_detection', 95, BusinessRuleCategory.SECURITY);
  }

  async evaluate(context: BusinessRuleContext): Promise<BusinessRuleResult> {
    const { connection_id, user_id, metadata } = context;
    
    if (!connection_id && !user_id) {
      return {
        success: true,
        allowed: true,
        message: 'No connection or user specified for suspicious activity check'
      };
    }

    try {
      const suspiciousPatterns: string[] = [];
      const riskScore = await this.calculateRiskScore(connection_id, user_id, metadata);

      // Padrão 1: Muitas tentativas de conexão falhando
      if (connection_id) {
        const connection = await this.repository.findById(connection_id);
        if (connection && connection.consecutive_errors >= 20) {
          suspiciousPatterns.push('excessive_connection_errors');
        }
      }

      // Padrão 2: Tentativas de acesso de IPs múltiplos em pouco tempo
      if (user_id && metadata?.client_ip) {
        const uniqueIPs = await this.getRecentUniqueIPs(user_id);
        if (uniqueIPs.length > 5) {
          suspiciousPatterns.push('multiple_ip_access');
        }
      }

      // Padrão 3: Volume anormal de requisições
      if (connection_id) {
        const requestVolume = await this.getRequestVolume(connection_id);
        if (requestVolume > 10000) { // em 1 hora
          suspiciousPatterns.push('abnormal_request_volume');
        }
      }

      // Padrão 4: Tentativas de acesso fora do horário normal
      const hour = new Date().getHours();
      if (metadata?.unusual_hour_access && (hour < 6 || hour > 22)) {
        suspiciousPatterns.push('unusual_hour_access');
      }

      // Padrão 5: User-Agent suspeito ou ausente
      if (metadata?.user_agent) {
        if (this.isSuspiciousUserAgent(metadata.user_agent)) {
          suspiciousPatterns.push('suspicious_user_agent');
        }
      }

      const isHighRisk = riskScore >= 80 || suspiciousPatterns.length >= 3;
      const isMediumRisk = riskScore >= 50 || suspiciousPatterns.length >= 2;

      if (isHighRisk) {
        return {
          success: true,
          allowed: false,
          message: 'High risk suspicious activity detected',
          errorCode: 'HIGH_RISK_ACTIVITY',
          data: { 
            risk_score: riskScore,
            suspicious_patterns: suspiciousPatterns
          },
          actions: [
            {
              type: 'log_event',
              target: 'security_violations',
              params: {
                violation_type: 'high_risk_suspicious_activity',
                risk_score: riskScore,
                patterns: suspiciousPatterns,
                connection_id,
                user_id,
                client_ip: metadata?.client_ip,
                timestamp: new Date().toISOString()
              }
            },
            {
              type: 'pause_connection',
              target: connection_id || 'user_connections',
              params: { reason: 'suspicious_activity', risk_score: riskScore }
            },
            {
              type: 'send_notification',
              target: 'security_team',
              params: {
                type: 'high_risk_activity_alert',
                connection_id,
                user_id,
                risk_score: riskScore,
                patterns: suspiciousPatterns
              }
            }
          ]
        };
      }

      if (isMediumRisk) {
        return {
          success: true,
          allowed: true,
          message: 'Medium risk activity detected - monitoring',
          data: { 
            risk_score: riskScore,
            suspicious_patterns: suspiciousPatterns
          },
          actions: [
            {
              type: 'log_event',
              target: 'security_monitoring',
              params: {
                alert_type: 'medium_risk_activity',
                risk_score: riskScore,
                patterns: suspiciousPatterns,
                connection_id,
                user_id,
                timestamp: new Date().toISOString()
              }
            }
          ]
        };
      }

      return {
        success: true,
        allowed: true,
        message: 'No suspicious activity detected',
        data: { risk_score: riskScore }
      };

    } catch (error) {
      console.error('Error in suspicious activity detection:', error);
      return {
        success: false,
        allowed: false,
        message: 'Suspicious activity detection failed',
        errorCode: 'SUSPICIOUS_ACTIVITY_CHECK_ERROR'
      };
    }
  }

  private async calculateRiskScore(connectionId?: string, userId?: string, metadata?: any): Promise<number> {
    let score = 0;

    try {
      if (connectionId) {
        const connection = await this.repository.findById(connectionId);
        if (connection) {
          // Erros consecutivos aumentam score
          score += Math.min(connection.consecutive_errors * 2, 30);
          
          // Status error aumenta score
          if (connection.status === 'error') {
            score += 20;
          }
        }
      }

      // IP suspeito ou blacklisted
      if (metadata?.client_ip && this.isBlacklistedIP(metadata.client_ip)) {
        score += 50;
      }

      // User-Agent suspeito
      if (metadata?.user_agent && this.isSuspiciousUserAgent(metadata.user_agent)) {
        score += 25;
      }

      // Acesso em horário incomum
      const hour = new Date().getHours();
      if (hour < 6 || hour > 22) {
        score += 10;
      }

      return Math.min(score, 100); // Máximo 100
    } catch (error) {
      console.error('Error calculating risk score:', error);
      return 0;
    }
  }

  private async getRecentUniqueIPs(userId: string): Promise<string[]> {
    try {
      const supabase = databaseService.getClient();
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data: logs, error } = await supabase
        .from('whatsapp_official_logs')
        .select('event_data')
        .eq('user_id', userId)
        .gte('created_at', last24Hours);

      if (error || !logs) return [];

      const ips = new Set<string>();
      logs.forEach(log => {
        if (log.event_data?.client_ip) {
          ips.add(log.event_data.client_ip);
        }
      });

      return Array.from(ips);
    } catch (error) {
      console.error('Error getting recent unique IPs:', error);
      return [];
    }
  }

  private async getRequestVolume(connectionId: string): Promise<number> {
    try {
      const supabase = databaseService.getClient();
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const { count, error } = await supabase
        .from('whatsapp_official_logs')
        .select('*', { count: 'exact', head: true })
        .eq('connection_id', connectionId)
        .gte('created_at', oneHourAgo);

      return error ? 0 : (count || 0);
    } catch (error) {
      console.error('Error getting request volume:', error);
      return 0;
    }
  }

  private isBlacklistedIP(ip: string): boolean {
    // Lista básica de IPs suspeitos (expandir conforme necessário)
    const blacklistedIPs = [
      '0.0.0.0',
      '127.0.0.1' // Adicionar IPs conhecidamente maliciosos
    ];
    
    return blacklistedIPs.includes(ip);
  }

  private isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /curl/i,
      /wget/i,
      /python/i,
      /^$/,  // Empty user agent
      /postman/i
    ];

    return suspiciousPatterns.some(pattern => pattern.test(userAgent));
  }
}

/**
 * Regra: Validação de integridade dos dados sensíveis
 */
export class DataIntegrityValidationRule extends BaseBusinessRule {
  private repository = getWhatsAppOfficialRepository();

  constructor() {
    super('data_integrity_validation', 90, BusinessRuleCategory.SECURITY);
  }

  async evaluate(context: BusinessRuleContext): Promise<BusinessRuleResult> {
    const { connection_id, connection_data } = context;
    
    if (!connection_id && !connection_data) {
      return {
        success: true,
        allowed: true,
        message: 'No data provided for integrity validation'
      };
    }

    try {
      const integrityIssues: string[] = [];
      let connection = null;

      if (connection_id) {
        connection = await this.repository.findById(connection_id);
        if (!connection) {
          return {
            success: false,
            allowed: false,
            message: 'Connection not found for integrity validation',
            errorCode: 'CONNECTION_NOT_FOUND'
          };
        }
      }

      // Validação 1: Campos obrigatórios não podem ser nulos
      if (connection) {
        const requiredFields = ['phone_number_id', 'business_account_id', 'access_token_encrypted'];
        
        for (const field of requiredFields) {
          if (!connection[field]) {
            integrityIssues.push(`missing_${field}`);
          }
        }
      }

      // Validação 2: Token encrypted deve ter formato válido
      if (connection?.access_token_encrypted) {
        if (!this.isValidEncryptedToken(connection.access_token_encrypted)) {
          integrityIssues.push('invalid_encrypted_token_format');
        }
      }

      // Validação 3: Timestamps devem ser coerentes
      if (connection) {
        const createdAt = new Date(connection.created_at);
        const updatedAt = new Date(connection.updated_at);
        
        if (updatedAt < createdAt) {
          integrityIssues.push('invalid_timestamp_sequence');
        }

        if (connection.token_expires_at) {
          const expiresAt = new Date(connection.token_expires_at);
          if (expiresAt < createdAt) {
            integrityIssues.push('invalid_token_expiry_date');
          }
        }
      }

      // Validação 4: IDs devem ter formato UUID válido
      if (connection) {
        const uuidFields = ['id', 'user_id', 'empresa_id', 'agent_id'];
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        
        for (const field of uuidFields) {
          const value = connection[field];
          if (value && !uuidRegex.test(value)) {
            integrityIssues.push(`invalid_${field}_format`);
          }
        }
      }

      // Validação 5: Números de telefone devem ter formato internacional válido
      if (connection?.phone_number) {
        const phoneRegex = /^\+[1-9]\d{1,14}$/;
        if (!phoneRegex.test(connection.phone_number)) {
          integrityIssues.push('invalid_phone_number_format');
        }
      }

      if (integrityIssues.length > 0) {
        return {
          success: true,
          allowed: false,
          message: 'Data integrity issues detected',
          errorCode: 'DATA_INTEGRITY_VIOLATION',
          data: { integrity_issues: integrityIssues },
          actions: [
            {
              type: 'log_event',
              target: 'security_violations',
              params: {
                violation_type: 'data_integrity_issues',
                connection_id,
                issues: integrityIssues,
                timestamp: new Date().toISOString()
              }
            },
            {
              type: 'send_notification',
              target: 'security_team',
              params: {
                type: 'data_integrity_alert',
                connection_id,
                issues: integrityIssues,
                severity: 'medium'
              }
            }
          ]
        };
      }

      return {
        success: true,
        allowed: true,
        message: 'Data integrity validation passed'
      };

    } catch (error) {
      console.error('Error in data integrity validation:', error);
      return {
        success: false,
        allowed: false,
        message: 'Data integrity validation failed',
        errorCode: 'DATA_INTEGRITY_CHECK_ERROR'
      };
    }
  }

  private isValidEncryptedToken(encryptedToken: string): boolean {
    try {
      // Formato esperado: iv:encrypted_data:auth_tag (base64)
      const parts = encryptedToken.split(':');
      if (parts.length !== 3) return false;
      
      // Verificar se cada parte é base64 válido
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
      return parts.every(part => base64Regex.test(part));
    } catch (error) {
      return false;
    }
  }
}

/**
 * Regra: Prevenção de ataques de força bruta
 */
export class BruteForcePreventionRule extends BaseBusinessRule {
  constructor() {
    super('brute_force_prevention', 85, BusinessRuleCategory.SECURITY);
  }

  async evaluate(context: BusinessRuleContext): Promise<BusinessRuleResult> {
    const { user_id, connection_id, metadata } = context;
    const clientIP = metadata?.client_ip;
    
    if (!user_id && !clientIP) {
      return {
        success: true,
        allowed: true,
        message: 'No user ID or client IP for brute force check'
      };
    }

    try {
      const supabase = databaseService.getClient();
      const last15Minutes = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      
      // Contar falhas de autenticação/autorização recentes
      let failureQuery = supabase
        .from('whatsapp_official_logs')
        .select('id')
        .in('event_type', ['auth_failed', 'access_denied', 'token_validation_failed'])
        .gte('created_at', last15Minutes);

      // Filtrar por user_id ou client_ip
      if (user_id) {
        failureQuery = failureQuery.eq('user_id', user_id);
      } else if (clientIP) {
        failureQuery = failureQuery.contains('event_data', { client_ip: clientIP });
      }

      const { data: failures, error } = await failureQuery;

      if (error) {
        console.error('Error checking brute force attempts:', error);
        return {
          success: false,
          allowed: false,
          message: 'Failed to validate brute force attempts',
          errorCode: 'BRUTE_FORCE_CHECK_ERROR'
        };
      }

      const failureCount = failures?.length || 0;
      const maxFailuresIn15Min = 10; // Configurável

      if (failureCount >= maxFailuresIn15Min) {
        const lockoutMinutes = 30; // Configurável
        
        return {
          success: true,
          allowed: false,
          message: 'Brute force attack detected - access temporarily blocked',
          errorCode: 'BRUTE_FORCE_DETECTED',
          data: { 
            failure_count: failureCount,
            max_allowed: maxFailuresIn15Min,
            lockout_minutes: lockoutMinutes,
            user_id,
            client_ip: clientIP
          },
          actions: [
            {
              type: 'log_event',
              target: 'security_violations',
              params: {
                violation_type: 'brute_force_attack',
                failure_count: failureCount,
                user_id,
                client_ip: clientIP,
                lockout_minutes: lockoutMinutes,
                timestamp: new Date().toISOString()
              }
            },
            {
              type: 'send_notification',
              target: 'security_team',
              params: {
                type: 'brute_force_alert',
                user_id,
                client_ip: clientIP,
                failure_count: failureCount,
                severity: 'high'
              }
            }
          ]
        };
      }

      // Warning se está próximo do limite
      if (failureCount >= maxFailuresIn15Min * 0.7) {
        return {
          success: true,
          allowed: true,
          message: `Approaching brute force threshold (${failureCount}/${maxFailuresIn15Min})`,
          data: { failure_count: failureCount, max_allowed: maxFailuresIn15Min },
          actions: [
            {
              type: 'log_event',
              target: 'security_monitoring',
              params: {
                alert_type: 'brute_force_warning',
                failure_count: failureCount,
                threshold: maxFailuresIn15Min,
                user_id,
                client_ip: clientIP,
                timestamp: new Date().toISOString()
              }
            }
          ]
        };
      }

      return {
        success: true,
        allowed: true,
        message: `Brute force check passed (${failureCount}/${maxFailuresIn15Min})`,
        data: { failure_count: failureCount }
      };

    } catch (error) {
      console.error('Error in brute force prevention rule:', error);
      return {
        success: false,
        allowed: false,
        message: 'Brute force prevention check failed',
        errorCode: 'BRUTE_FORCE_PREVENTION_ERROR'
      };
    }
  }
}

/**
 * Regra: Auditoria de eventos críticos de segurança
 */
export class SecurityAuditRule extends BaseBusinessRule {
  constructor() {
    super('security_audit', 70, BusinessRuleCategory.SECURITY);
  }

  async evaluate(context: BusinessRuleContext): Promise<BusinessRuleResult> {
    const { connection_id, user_id, metadata } = context;
    const eventType = metadata?.event_type;
    
    // Lista de eventos que requerem auditoria obrigatória
    const criticalEvents = [
      'connection_created',
      'connection_deleted',
      'token_refreshed',
      'oauth_completed',
      'webhook_signature_failed',
      'access_denied',
      'suspicious_activity_detected'
    ];

    if (!eventType || !criticalEvents.includes(eventType)) {
      return {
        success: true,
        allowed: true,
        message: 'Event does not require security audit'
      };
    }

    try {
      const auditEntry = {
        event_type: eventType,
        connection_id,
        user_id,
        client_ip: metadata?.client_ip,
        user_agent: metadata?.user_agent,
        timestamp: new Date().toISOString(),
        event_data: {
          context: metadata?.context,
          previous_values: metadata?.previous_values,
          new_values: metadata?.new_values,
          risk_score: metadata?.risk_score
        }
      };

      return {
        success: true,
        allowed: true,
        message: `Security audit logged for ${eventType}`,
        data: { audit_entry: auditEntry },
        actions: [
          {
            type: 'log_event',
            target: 'security_audit',
            params: auditEntry
          },
          // Para eventos de alta criticidade, enviar notificação adicional
          ...(this.isHighCriticalityEvent(eventType) ? [
            {
              type: 'send_notification',
              target: 'security_team',
              params: {
                type: 'critical_security_event',
                event_type: eventType,
                connection_id,
                user_id,
                timestamp: auditEntry.timestamp,
                severity: 'high'
              }
            }
          ] : [])
        ]
      };

    } catch (error) {
      console.error('Error in security audit rule:', error);
      return {
        success: false,
        allowed: false,
        message: 'Security audit logging failed',
        errorCode: 'SECURITY_AUDIT_ERROR'
      };
    }
  }

  private isHighCriticalityEvent(eventType: string): boolean {
    const highCriticalityEvents = [
      'connection_deleted',
      'suspicious_activity_detected',
      'webhook_signature_failed',
      'brute_force_detected'
    ];
    
    return highCriticalityEvents.includes(eventType);
  }
}