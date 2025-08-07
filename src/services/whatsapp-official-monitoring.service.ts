import {
  HealthCheckResult,
  HealthStatus,
  ConnectionStats,
  ServiceResult
} from '@/types/whatsapp-official';
import { databaseService } from '@/lib/database';
import { getEncryptionService } from '@/lib/encryption';
import { getMetaAPIService } from './meta-api.service';

/**
 * WhatsApp Official Monitoring Service
 * Provides health checks, monitoring, and alerting for connections
 */
export class WhatsAppOfficialMonitoringService {
  private readonly encryption: typeof import('@/lib/encryption').EncryptionService.prototype;
  private readonly metaAPI: typeof import('./meta-api.service').MetaAPIService.prototype;

  constructor() {
    this.encryption = getEncryptionService();
    this.metaAPI = getMetaAPIService();
  }

  /**
   * Performs comprehensive health check for a connection
   */
  async performHealthCheck(connectionId: string): Promise<ServiceResult<HealthCheckResult>> {
    const supabase = databaseService.getClient();
    const startTime = Date.now();

    try {
      // Get connection details
      const { data: connection, error: connectionError } = await supabase
        .from('whatsapp_official_connections')
        .select('*')
        .eq('id', connectionId)
        .single();

      if (connectionError || !connection) {
        return {
          success: false,
          error: 'Connection not found',
          error_code: 'CONNECTION_NOT_FOUND'
        };
      }

      const checks = {
        token_valid: false,
        webhook_reachable: false,
        phone_number_active: false,
        rate_limit_ok: false
      };

      const issues: string[] = [];
      let overallStatus: HealthStatus = 'healthy';

      // Check 1: Validate access token
      try {
        const accessToken = this.encryption.decrypt(connection.access_token_encrypted);
        const tokenValidation = await this.metaAPI.validateToken(accessToken);
        
        checks.token_valid = tokenValidation.success;
        if (!tokenValidation.success) {
          issues.push(`Token validation failed: ${tokenValidation.error}`);
          overallStatus = 'unhealthy';
        }
      } catch (error) {
        checks.token_valid = false;
        issues.push('Failed to decrypt or validate access token');
        overallStatus = 'unhealthy';
      }

      // Check 2: Verify phone number status (if token is valid)
      if (checks.token_valid) {
        try {
          const accessToken = this.encryption.decrypt(connection.access_token_encrypted);
          const phoneResult = await this.metaAPI.getRateLimitInfo(connection.phone_number_id, accessToken);
          
          checks.phone_number_active = phoneResult.success;
          if (!phoneResult.success) {
            issues.push(`Phone number check failed: ${phoneResult.error}`);
            if (overallStatus === 'healthy') overallStatus = 'degraded';
          }
        } catch (error) {
          checks.phone_number_active = false;
          issues.push('Phone number status check failed');
          if (overallStatus === 'healthy') overallStatus = 'degraded';
        }
      }

      // Check 3: Rate limit status
      const quotaUsage = connection.message_quota_used / connection.message_quota_limit;
      checks.rate_limit_ok = quotaUsage < 0.9; // Alert if over 90% quota used
      
      if (!checks.rate_limit_ok) {
        issues.push(`High quota usage: ${Math.round(quotaUsage * 100)}%`);
        if (overallStatus === 'healthy') overallStatus = 'degraded';
      }

      // Check 4: Webhook reachability (simplified check)
      checks.webhook_reachable = !!connection.webhook_url && connection.webhook_verified;
      if (!checks.webhook_reachable) {
        issues.push('Webhook not configured or not verified');
        if (overallStatus === 'healthy') overallStatus = 'degraded';
      }

      // Check for recent errors
      if (connection.consecutive_errors > 5) {
        issues.push(`High error count: ${connection.consecutive_errors} consecutive errors`);
        overallStatus = 'unhealthy';
      }

      // Update connection health status
      await supabase
        .from('whatsapp_official_connections')
        .update({
          health_status: overallStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', connectionId);

      // Log health check
      await this.logHealthCheck(connectionId, overallStatus, checks, issues, Date.now() - startTime);

      const healthResult: HealthCheckResult = {
        connection_id: connectionId,
        status: overallStatus,
        checks,
        last_checked: new Date(),
        issues
      };

      return {
        success: true,
        data: healthResult
      };

    } catch (error) {
      console.error('Health check error:', error);
      
      // Log failed health check
      await this.logHealthCheck(
        connectionId, 
        'unhealthy', 
        { token_valid: false, webhook_reachable: false, phone_number_active: false, rate_limit_ok: false },
        [`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        Date.now() - startTime
      );

      return {
        success: false,
        error: 'Health check failed',
        error_code: 'HEALTH_CHECK_ERROR'
      };
    }
  }

  /**
   * Runs health checks for all active connections
   */
  async runBulkHealthCheck(): Promise<ServiceResult<HealthCheckResult[]>> {
    const supabase = databaseService.getClient();

    try {
      // Get all active connections
      const { data: connections, error } = await supabase
        .from('whatsapp_official_connections')
        .select('id')
        .in('status', ['active', 'suspended'])
        .order('last_webhook_received_at', { ascending: false });

      if (error) {
        return {
          success: false,
          error: error.message,
          error_code: 'DATABASE_ERROR'
        };
      }

      const healthResults: HealthCheckResult[] = [];
      const batchSize = 5; // Process 5 connections at a time

      // Process in batches to avoid overwhelming the system
      for (let i = 0; i < connections.length; i += batchSize) {
        const batch = connections.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (connection) => {
          try {
            const result = await this.performHealthCheck(connection.id);
            return result.success ? result.data! : null;
          } catch (error) {
            console.error(`Health check failed for connection ${connection.id}:`, error);
            return null;
          }
        });

        const batchResults = await Promise.all(batchPromises);
        healthResults.push(...batchResults.filter(Boolean) as HealthCheckResult[]);

        // Add small delay between batches
        if (i + batchSize < connections.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      return {
        success: true,
        data: healthResults
      };

    } catch (error) {
      console.error('Bulk health check error:', error);
      return {
        success: false,
        error: 'Bulk health check failed',
        error_code: 'BULK_HEALTH_CHECK_ERROR'
      };
    }
  }

  /**
   * Gets connection statistics for a specified period
   */
  async getConnectionStats(
    connectionId: string, 
    periodHours: number = 24
  ): Promise<ServiceResult<ConnectionStats>> {
    const supabase = databaseService.getClient();

    try {
      const periodStart = new Date(Date.now() - periodHours * 60 * 60 * 1000);
      const periodEnd = new Date();

      // Get connection info
      const { data: connection, error: connectionError } = await supabase
        .from('whatsapp_official_connections')
        .select(`
          id,
          total_messages_sent,
          total_messages_received,
          created_at,
          last_webhook_received_at
        `)
        .eq('id', connectionId)
        .single();

      if (connectionError) {
        return {
          success: false,
          error: connectionError.message,
          error_code: 'CONNECTION_NOT_FOUND'
        };
      }

      // Get logs for the period
      const { data: logs, error: logsError } = await supabase
        .from('whatsapp_official_logs')
        .select('event_type, event_status, created_at')
        .eq('connection_id', connectionId)
        .gte('created_at', periodStart.toISOString())
        .lte('created_at', periodEnd.toISOString());

      if (logsError) {
        return {
          success: false,
          error: logsError.message,
          error_code: 'LOGS_ERROR'
        };
      }

      // Calculate statistics
      const messagesSent = logs.filter(log => 
        log.event_type === 'message_sent' && log.event_status === 'success'
      ).length;

      const messagesReceived = logs.filter(log => 
        log.event_type === 'message_received' && log.event_status === 'success'
      ).length;

      const messagesFailed = logs.filter(log => 
        log.event_type === 'message_sent' && log.event_status === 'error'
      ).length;

      const webhookEvents = logs.filter(log => 
        log.event_type === 'webhook_received'
      ).length;

      const errors = logs.filter(log => 
        log.event_status === 'error'
      ).length;

      // Calculate uptime percentage
      const totalMinutes = periodHours * 60;
      const connectionAge = Math.min(
        (Date.now() - new Date(connection.created_at).getTime()) / (1000 * 60),
        totalMinutes
      );
      
      // Simple uptime calculation based on error frequency
      const errorRate = errors / (logs.length || 1);
      const uptimePercentage = Math.max(0, Math.min(100, (1 - errorRate) * 100));

      const stats: ConnectionStats = {
        connection_id: connectionId,
        period_start: periodStart,
        period_end: periodEnd,
        messages_sent: messagesSent,
        messages_received: messagesReceived,
        messages_failed: messagesFailed,
        webhook_events: webhookEvents,
        errors,
        uptime_percentage: Math.round(uptimePercentage * 100) / 100
      };

      return {
        success: true,
        data: stats
      };

    } catch (error) {
      console.error('Error getting connection stats:', error);
      return {
        success: false,
        error: 'Failed to get connection statistics',
        error_code: 'STATS_ERROR'
      };
    }
  }

  /**
   * Gets system-wide monitoring dashboard data
   */
  async getMonitoringDashboard(): Promise<ServiceResult<any>> {
    const supabase = databaseService.getClient();

    try {
      // Get connection summary
      const { data: connectionSummary, error: summaryError } = await supabase
        .from('whatsapp_official_connections')
        .select(`
          status,
          health_status,
          created_at
        `);

      if (summaryError) {
        return {
          success: false,
          error: summaryError.message,
          error_code: 'DATABASE_ERROR'
        };
      }

      // Aggregate connection data
      const statusCounts = connectionSummary.reduce((acc: any, conn: any) => {
        acc[conn.status] = (acc[conn.status] || 0) + 1;
        acc.total = (acc.total || 0) + 1;
        return acc;
      }, {});

      const healthCounts = connectionSummary.reduce((acc: any, conn: any) => {
        acc[conn.health_status] = (acc[conn.health_status] || 0) + 1;
        return acc;
      }, {});

      // Get recent activity (last 24 hours)
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data: recentLogs, error: logsError } = await supabase
        .from('whatsapp_official_logs')
        .select('event_type, event_status, created_at')
        .gte('created_at', last24Hours)
        .order('created_at', { ascending: false })
        .limit(1000);

      if (logsError) {
        return {
          success: false,
          error: logsError.message,
          error_code: 'LOGS_ERROR'
        };
      }

      // Aggregate recent activity
      const recentActivity = recentLogs.reduce((acc: any, log: any) => {
        const key = `${log.event_type}_${log.event_status}`;
        acc[key] = (acc[key] || 0) + 1;
        acc.total_events = (acc.total_events || 0) + 1;
        return acc;
      }, {});

      // Calculate error rates
      const totalEvents = recentActivity.total_events || 0;
      const totalErrors = Object.keys(recentActivity)
        .filter(key => key.endsWith('_error'))
        .reduce((sum, key) => sum + recentActivity[key], 0);

      const errorRate = totalEvents > 0 ? (totalErrors / totalEvents * 100) : 0;

      return {
        success: true,
        data: {
          connections: {
            total: statusCounts.total || 0,
            by_status: statusCounts,
            by_health: healthCounts
          },
          recent_activity: {
            period_hours: 24,
            total_events: totalEvents,
            error_rate: Math.round(errorRate * 100) / 100,
            breakdown: recentActivity
          },
          system_health: {
            overall_status: errorRate < 1 ? 'healthy' : errorRate < 5 ? 'degraded' : 'unhealthy',
            healthy_connections: healthCounts.healthy || 0,
            total_connections: statusCounts.total || 0
          }
        }
      };

    } catch (error) {
      console.error('Error getting monitoring dashboard:', error);
      return {
        success: false,
        error: 'Failed to get monitoring dashboard data',
        error_code: 'DASHBOARD_ERROR'
      };
    }
  }

  /**
   * Cleans up old log entries to manage database size
   */
  async cleanupOldLogs(retentionDays: number = 30): Promise<ServiceResult<any>> {
    const supabase = databaseService.getClient();

    try {
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from('whatsapp_official_logs')
        .delete()
        .lt('created_at', cutoffDate.toISOString())
        .select('id');

      if (error) {
        return {
          success: false,
          error: error.message,
          error_code: 'CLEANUP_ERROR'
        };
      }

      return {
        success: true,
        data: {
          deleted_count: data?.length || 0,
          cutoff_date: cutoffDate.toISOString(),
          retention_days: retentionDays
        }
      };

    } catch (error) {
      console.error('Error cleaning up old logs:', error);
      return {
        success: false,
        error: 'Failed to cleanup old logs',
        error_code: 'CLEANUP_ERROR'
      };
    }
  }

  /**
   * Logs health check results
   */
  private async logHealthCheck(
    connectionId: string,
    status: HealthStatus,
    checks: any,
    issues: string[],
    durationMs: number
  ): Promise<void> {
    const supabase = databaseService.getClient();

    try {
      await supabase
        .from('whatsapp_official_logs')
        .insert([{
          connection_id: connectionId,
          event_type: 'health_check',
          event_status: status === 'healthy' ? 'success' : status === 'degraded' ? 'warning' : 'error',
          event_data: {
            health_status: status,
            checks,
            issues,
            checks_passed: Object.values(checks).filter(Boolean).length,
            total_checks: Object.keys(checks).length
          },
          duration_ms: durationMs,
          created_at: new Date().toISOString()
        }]);

    } catch (error) {
      console.error('Failed to log health check:', error);
    }
  }

  /**
   * Checks for connections that need token refresh
   */
  async checkTokenExpirations(): Promise<ServiceResult<any>> {
    const supabase = databaseService.getClient();

    try {
      // Find connections with tokens expiring in the next 7 days
      const warningDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      
      const { data: expiringSoon, error: soonError } = await supabase
        .from('whatsapp_official_connections')
        .select('id, phone_number, display_name, token_expires_at')
        .lt('token_expires_at', warningDate.toISOString())
        .eq('status', 'active');

      // Find connections with already expired tokens
      const { data: expired, error: expiredError } = await supabase
        .from('whatsapp_official_connections')
        .select('id, phone_number, display_name, token_expires_at')
        .lt('token_expires_at', new Date().toISOString())
        .eq('status', 'active');

      if (soonError || expiredError) {
        return {
          success: false,
          error: 'Failed to check token expirations',
          error_code: 'TOKEN_CHECK_ERROR'
        };
      }

      return {
        success: true,
        data: {
          expiring_soon: expiringSoon || [],
          expired: expired || [],
          warning_threshold_days: 7
        }
      };

    } catch (error) {
      console.error('Error checking token expirations:', error);
      return {
        success: false,
        error: 'Failed to check token expirations',
        error_code: 'TOKEN_CHECK_ERROR'
      };
    }
  }
}

// Singleton instance
let whatsappOfficialMonitoringService: WhatsAppOfficialMonitoringService;

export function getWhatsAppOfficialMonitoringService(): WhatsAppOfficialMonitoringService {
  if (!whatsappOfficialMonitoringService) {
    whatsappOfficialMonitoringService = new WhatsAppOfficialMonitoringService();
  }
  return whatsappOfficialMonitoringService;
}