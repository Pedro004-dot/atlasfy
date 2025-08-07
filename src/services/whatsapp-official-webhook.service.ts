import crypto from 'crypto';
import {
  WebhookPayload,
  WebhookEntry,
  WebhookMessage,
  WebhookStatus,
  ServiceResult
} from '@/types/whatsapp-official';
import { databaseService } from '@/lib/database';
import { getEncryptionService } from '@/lib/encryption';

/**
 * WhatsApp Official Webhook Service
 * Handles webhook validation, processing, and message handling
 */
export class WhatsAppOfficialWebhookService {
  private readonly encryption: typeof import('@/lib/encryption').EncryptionService.prototype;

  constructor() {
    this.encryption = getEncryptionService();
  }

  /**
   * Validates webhook signature from Meta
   */
  validateWebhookSignature(payload: string, signature: string, secret: string): boolean {
    try {
      // Meta sends signature as sha256=<hash>
      const expectedSignature = signature.replace('sha256=', '');
      
      // Calculate HMAC SHA256
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(payload, 'utf8');
      const calculatedSignature = hmac.digest('hex');

      // Compare signatures using constant-time comparison
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(calculatedSignature, 'hex')
      );

    } catch (error) {
      console.error('Signature validation error:', error);
      return false;
    }
  }

  /**
   * Handles webhook verification challenge from Meta
   */
  handleVerificationChallenge(
    mode: string,
    token: string,
    challenge: string
  ): ServiceResult<string> {
    const verifyToken = process.env.META_VERIFY_TOKEN;

    if (mode === 'subscribe' && token === verifyToken) {
      console.log('Webhook verification successful');
      return {
        success: true,
        data: challenge
      };
    }

    console.warn('Webhook verification failed:', { mode, token: token?.substring(0, 8) + '...' });
    return {
      success: false,
      error: 'Verification failed',
      error_code: 'VERIFICATION_FAILED'
    };
  }

  /**
   * Processes incoming webhook payload
   */
  async processWebhook(
    payload: WebhookPayload,
    signature?: string,
    rawBody?: string
  ): Promise<ServiceResult<any>> {
    try {
      if (payload.object !== 'whatsapp_business_account') {
        return {
          success: false,
          error: 'Invalid webhook object type',
          error_code: 'INVALID_OBJECT_TYPE'
        };
      }

      const results = [];

      // Process each entry in the webhook
      for (const entry of payload.entry) {
        const entryResult = await this.processWebhookEntry(entry, signature, rawBody);
        results.push(entryResult);
      }

      return {
        success: true,
        data: {
          processed_entries: results.length,
          results
        }
      };

    } catch (error) {
      console.error('Webhook processing error:', error);
      return {
        success: false,
        error: 'Failed to process webhook',
        error_code: 'WEBHOOK_PROCESSING_ERROR'
      };
    }
  }

  /**
   * Processes a single webhook entry
   */
  private async processWebhookEntry(
    entry: WebhookEntry,
    signature?: string,
    rawBody?: string
  ): Promise<ServiceResult<any>> {
    const supabase = databaseService.getClient();

    try {
      for (const change of entry.changes) {
        if (change.field === 'messages') {
          const { value } = change;
          const phoneNumberId = value.metadata.phone_number_id;

          // Find the connection by phone number ID
          const { data: connection, error: connectionError } = await supabase
            .from('whatsapp_official_connections')
            .select('*')
            .eq('phone_number_id', phoneNumberId)
            .single();

          if (connectionError || !connection) {
            console.warn(`No connection found for phone number ID: ${phoneNumberId}`);
            continue;
          }

          // Validate signature if provided
          if (signature && rawBody) {
            const webhookSecret = connection.webhook_secret_encrypted ? 
              this.encryption.decrypt(connection.webhook_secret_encrypted) : 
              process.env.META_WEBHOOK_SECRET;

            if (webhookSecret && !this.validateWebhookSignature(rawBody, signature, webhookSecret)) {
              await this.logWebhookEvent(connection.id, 'webhook_failed', 'error', {
                error: 'Invalid signature',
                phone_number_id: phoneNumberId
              });
              
              return {
                success: false,
                error: 'Invalid webhook signature',
                error_code: 'INVALID_SIGNATURE'
              };
            }
          }

          // Process messages
          if (value.messages) {
            for (const message of value.messages) {
              await this.processIncomingMessage(connection.id, message, value.contacts);
            }
          }

          // Process message statuses
          if (value.statuses) {
            for (const status of value.statuses) {
              await this.processMessageStatus(connection.id, status);
            }
          }

          // Process errors
          if (value.errors) {
            for (const error of value.errors) {
              await this.processWebhookError(connection.id, error);
            }
          }

          // Update connection activity
          await this.updateConnectionActivity(connection.id);
        }
      }

      return {
        success: true,
        data: { entry_id: entry.id }
      };

    } catch (error) {
      console.error('Error processing webhook entry:', error);
      return {
        success: false,
        error: 'Failed to process webhook entry',
        error_code: 'ENTRY_PROCESSING_ERROR'
      };
    }
  }

  /**
   * Processes incoming WhatsApp message
   */
  private async processIncomingMessage(
    connectionId: string,
    message: WebhookMessage,
    contacts?: any[]
  ): Promise<void> {
    const supabase = databaseService.getClient();

    try {
      // Get contact info
      const contact = contacts?.find(c => c.wa_id === message.from);
      const contactName = contact?.profile?.name || 'Unknown';

      // Store message in database (you might want a separate messages table)
      const messageData = {
        connection_id: connectionId,
        whatsapp_message_id: message.id,
        from_number: message.from,
        contact_name: contactName,
        message_type: message.type,
        message_content: this.extractMessageContent(message),
        timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString(),
        context: message.context || null,
        raw_message: message
      };

      // For now, log the message
      await this.logWebhookEvent(connectionId, 'message_received', 'success', {
        from: message.from,
        contact_name: contactName,
        message_type: message.type,
        message_id: message.id,
        content_preview: this.getMessagePreview(message)
      });

      // Update connection statistics
      await supabase
        .from('whatsapp_official_connections')
        .update({
          last_message_received_at: new Date().toISOString(),
          total_messages_received: supabase.from('whatsapp_official_connections').select('total_messages_received').eq('id', connectionId).single()
        })
        .eq('id', connectionId);

      console.log(`Processed incoming message from ${message.from} to connection ${connectionId}`);

    } catch (error) {
      console.error('Error processing incoming message:', error);
      await this.logWebhookEvent(connectionId, 'message_received', 'error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        message_id: message.id,
        from: message.from
      });
    }
  }

  /**
   * Processes message status updates (sent, delivered, read, failed)
   */
  private async processMessageStatus(connectionId: string, status: WebhookStatus): Promise<void> {
    const supabase = databaseService.getClient();

    try {
      // Log status update
      await this.logWebhookEvent(connectionId, 'message_status', 'success', {
        message_id: status.id,
        status: status.status,
        recipient_id: status.recipient_id,
        timestamp: new Date(parseInt(status.timestamp) * 1000).toISOString(),
        errors: status.errors
      });

      // If status is failed, increment error counter
      if (status.status === 'failed') {
        await supabase
          .from('whatsapp_official_connections')
          .update({
            consecutive_errors: supabase.from('whatsapp_official_connections').select('consecutive_errors').eq('id', connectionId).single(),
            last_error_at: new Date().toISOString(),
            last_error_message: status.errors?.[0]?.message || 'Message delivery failed'
          })
          .eq('id', connectionId);
      } else {
        // Reset error counter on successful delivery
        await supabase
          .from('whatsapp_official_connections')
          .update({
            consecutive_errors: 0,
            last_error_message: null
          })
          .eq('id', connectionId);
      }

      console.log(`Processed status update for message ${status.id}: ${status.status}`);

    } catch (error) {
      console.error('Error processing message status:', error);
      await this.logWebhookEvent(connectionId, 'message_status', 'error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        message_id: status.id,
        status: status.status
      });
    }
  }

  /**
   * Processes webhook errors
   */
  private async processWebhookError(connectionId: string, error: any): Promise<void> {
    const supabase = databaseService.getClient();

    try {
      await this.logWebhookEvent(connectionId, 'error_occurred', 'error', {
        error_code: error.code,
        error_title: error.title,
        error_message: error.message,
        error_details: error.error_data
      });

      // Update connection error counters
      await supabase
        .from('whatsapp_official_connections')
        .update({
          error_count: supabase.from('whatsapp_official_connections').select('error_count').eq('id', connectionId).single(),
          consecutive_errors: supabase.from('whatsapp_official_connections').select('consecutive_errors').eq('id', connectionId).single(),
          last_error_at: new Date().toISOString(),
          last_error_code: error.code?.toString(),
          last_error_message: error.message
        })
        .eq('id', connectionId);

      console.error(`Processed webhook error for connection ${connectionId}:`, error);

    } catch (dbError) {
      console.error('Error processing webhook error:', dbError);
    }
  }

  /**
   * Updates connection last activity timestamp
   */
  private async updateConnectionActivity(connectionId: string): Promise<void> {
    const supabase = databaseService.getClient();

    try {
      await supabase
        .from('whatsapp_official_connections')
        .update({
          last_webhook_received_at: new Date().toISOString()
        })
        .eq('id', connectionId);

    } catch (error) {
      console.error('Error updating connection activity:', error);
    }
  }

  /**
   * Logs webhook events
   */
  private async logWebhookEvent(
    connectionId: string,
    eventType: string,
    eventStatus: string,
    eventData: any = {},
    duration?: number
  ): Promise<void> {
    const supabase = databaseService.getClient();

    try {
      await supabase
        .from('whatsapp_official_logs')
        .insert([{
          connection_id: connectionId,
          event_type: eventType,
          event_status: eventStatus,
          event_data: eventData,
          duration_ms: duration,
          created_at: new Date().toISOString()
        }]);

    } catch (error) {
      console.error('Failed to log webhook event:', error);
      // Don't throw - logging shouldn't break webhook processing
    }
  }

  /**
   * Extracts message content based on message type
   */
  private extractMessageContent(message: WebhookMessage): any {
    switch (message.type) {
      case 'text':
        return { text: message.text?.body };
      case 'image':
        return {
          media_id: message.image?.id,
          mime_type: message.image?.mime_type,
          caption: message.image?.caption
        };
      case 'document':
        return {
          media_id: message.document?.id,
          filename: message.document?.filename,
          mime_type: message.document?.mime_type,
          caption: message.document?.caption
        };
      case 'audio':
        return {
          media_id: message.audio?.id,
          mime_type: message.audio?.mime_type
        };
      case 'video':
        return {
          media_id: message.video?.id,
          mime_type: message.video?.mime_type,
          caption: message.video?.caption
        };
      default:
        return { type: message.type, raw: message };
    }
  }

  /**
   * Gets a preview of message content for logging
   */
  private getMessagePreview(message: WebhookMessage): string {
    switch (message.type) {
      case 'text':
        return message.text?.body?.substring(0, 100) + (message.text?.body?.length && message.text?.body?.length > 100 ? '...' : '') || '';
      case 'image':
        return `Image${message.image?.caption ? ': ' + message.image.caption.substring(0, 50) : ''}`;
      case 'document':
        return `Document: ${message.document?.filename || 'unknown'}`;
      case 'audio':
        return 'Audio message';
      case 'video':
        return `Video${message.video?.caption ? ': ' + message.video.caption.substring(0, 50) : ''}`;
      default:
        return `${message.type} message`;
    }
  }

  /**
   * Gets webhook processing statistics
   */
  async getWebhookStats(connectionId: string, hours: number = 24): Promise<ServiceResult<any>> {
    const supabase = databaseService.getClient();

    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

      const { data: stats, error } = await supabase
        .from('whatsapp_official_logs')
        .select('event_type, event_status')
        .eq('connection_id', connectionId)
        .gte('created_at', since);

      if (error) {
        return {
          success: false,
          error: error.message,
          error_code: 'STATS_ERROR'
        };
      }

      // Aggregate statistics
      const summary = stats.reduce((acc: any, log: any) => {
        const key = `${log.event_type}_${log.event_status}`;
        acc[key] = (acc[key] || 0) + 1;
        acc.total = (acc.total || 0) + 1;
        return acc;
      }, {});

      return {
        success: true,
        data: {
          period_hours: hours,
          since,
          summary,
          raw_count: stats.length
        }
      };

    } catch (error) {
      console.error('Error getting webhook stats:', error);
      return {
        success: false,
        error: 'Failed to get webhook statistics',
        error_code: 'STATS_ERROR'
      };
    }
  }
}

// Singleton instance
let whatsappOfficialWebhookService: WhatsAppOfficialWebhookService;

export function getWhatsAppOfficialWebhookService(): WhatsAppOfficialWebhookService {
  if (!whatsappOfficialWebhookService) {
    whatsappOfficialWebhookService = new WhatsAppOfficialWebhookService();
  }
  return whatsappOfficialWebhookService;
}