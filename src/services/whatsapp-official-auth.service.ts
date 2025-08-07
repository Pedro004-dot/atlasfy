import crypto from 'crypto';
import { 
  OAuth2Result, 
  OAuth2Tokens, 
  TokenRefreshResult, 
  WhatsAppBusinessAccount,
  ServiceResult,
  CreateOfficialConnectionData
} from '@/types/whatsapp-official';
import { getMetaAPIService } from './meta-api.service';
import { getEncryptionService } from '@/lib/encryption';
import { databaseService } from '@/lib/database';

/**
 * WhatsApp Official OAuth2 Authentication Service
 * Manages the complete OAuth2 flow for Meta WhatsApp Cloud API
 */
export class WhatsAppOfficialAuthService {
  private readonly metaAPI: typeof import('./meta-api.service').MetaAPIService.prototype;
  private readonly encryption: typeof import('@/lib/encryption').EncryptionService.prototype;
  private readonly stateExpiryTime = 10 * 60 * 1000; // 10 minutes

  constructor() {
    this.metaAPI = getMetaAPIService();
    this.encryption = getEncryptionService();
  }

  /**
   * Initiates OAuth2 flow by generating auth URL with secure state
   */
  async generateAuthUrl(userId: string, empresaId?: string, agentId?: string): Promise<ServiceResult<string>> {
    try {
      // Generate secure state parameter with user info
      const stateData = {
        userId,
        empresaId,
        agentId,
        timestamp: Date.now(),
        nonce: crypto.randomBytes(16).toString('hex')
      };

      // Encrypt state data for security
      const encryptedState = this.encryption.encrypt(JSON.stringify(stateData));

      // Store state temporarily in database for validation
      await this.storeTemporaryState(encryptedState, userId);

      // Generate OAuth2 URL
      const authUrl = this.metaAPI.generateAuthUrl(encryptedState);

      return {
        success: true,
        data: authUrl
      };

    } catch (error) {
      console.error('Error generating auth URL:', error);
      return {
        success: false,
        error: 'Failed to generate authorization URL',
        error_code: 'AUTH_URL_ERROR'
      };
    }
  }

  /**
   * Handles OAuth2 callback and completes the flow
   */
  async handleCallback(code: string, state: string): Promise<ServiceResult<any>> {
    try {
      // Validate and decrypt state
      const stateValidation = await this.validateState(state);
      if (!stateValidation.success) {
        return stateValidation;
      }

      const stateData = stateValidation.data;

      // Exchange authorization code for tokens
      const tokenResult = await this.metaAPI.exchangeCodeForTokens(code);
      if (!tokenResult.success) {
        return {
          success: false,
          error: tokenResult.error,
          error_code: tokenResult.error_code
        };
      }

      const tokens = tokenResult.tokens!;

      // Get user's WhatsApp Business Accounts
      const accountsResult = await this.metaAPI.getBusinessAccounts(tokens.access_token);
      if (!accountsResult.success) {
        return {
          success: false,
          error: accountsResult.error,
          error_code: accountsResult.error_code
        };
      }

      const businessAccounts = accountsResult.data!;

      // Clean up temporary state
      await this.cleanupTemporaryState(state);

      return {
        success: true,
        data: {
          tokens,
          businessAccounts,
          stateData,
          message: 'OAuth2 flow completed successfully'
        }
      };

    } catch (error) {
      console.error('OAuth2 callback error:', error);
      return {
        success: false,
        error: 'Failed to process OAuth2 callback',
        error_code: 'CALLBACK_ERROR'
      };
    }
  }

  /**
   * Creates a WhatsApp Official connection from OAuth2 result
   */
  async createConnection(
    tokens: OAuth2Tokens,
    businessAccount: WhatsAppBusinessAccount,
    phoneNumberId: string,
    stateData: any,
    webhookUrl?: string
  ): Promise<ServiceResult<any>> {
    const supabase = databaseService.getClient();
    
    try {
      // Find the selected phone number
      const selectedPhone = businessAccount.phone_numbers.find(p => p.id === phoneNumberId);
      if (!selectedPhone) {
        return {
          success: false,
          error: 'Selected phone number not found',
          error_code: 'PHONE_NOT_FOUND'
        };
      }

      // Encrypt sensitive data
      const encryptedAccessToken = this.encryption.encrypt(tokens.access_token);
      const encryptedRefreshToken = tokens.refresh_token ? 
        this.encryption.encrypt(tokens.refresh_token) : null;

      // Generate app secret (in production, get from Meta Business settings)
      const appSecret = process.env.META_APP_SECRET!;
      const encryptedAppSecret = this.encryption.encrypt(appSecret);

      // Prepare connection data
      const connectionData = {
        user_id: stateData.userId,
        empresa_id: stateData.empresaId || null,
        agent_id: stateData.agentId || null,
        business_account_id: businessAccount.id,
        app_id: process.env.META_APP_ID!,
        app_secret_encrypted: encryptedAppSecret,
        access_token_encrypted: encryptedAccessToken,
        refresh_token_encrypted: encryptedRefreshToken,
        token_type: tokens.token_type,
        token_expires_at: tokens.expires_at.toISOString(),
        token_created_at: new Date().toISOString(),
        waba_id: businessAccount.id,
        waba_name: businessAccount.name,
        phone_number_id: selectedPhone.id,
        phone_number: selectedPhone.phone_number,
        display_name: selectedPhone.verified_name,
        verified_status: businessAccount.verified_status,
        quality_rating: selectedPhone.quality_rating,
        status: 'active',
        health_status: 'healthy',
        webhook_url: webhookUrl,
        webhook_verified: false,
        webhook_verify_token: crypto.randomBytes(32).toString('hex'),
        connection_metadata: {
          oauth_completed_at: new Date().toISOString(),
          initial_setup: true,
          phone_number_data: selectedPhone
        }
      };

      // Insert connection into database
      const { data: connection, error } = await supabase
        .from('whatsapp_official_connections')
        .insert([connectionData])
        .select(`
          *,
          agente:agent_id (
            id,
            nome,
            genero,
            personalidade,
            empresa_id,
            ativo,
            whatsapp_conectado,
            whatsapp_numero,
            fluxo_conversa,
            created_at,
            updated_at
          ),
          empresa:empresa_id (
            id,
            nome,
            cnpj,
            setor,
            created_at
          ),
          usuario:user_id (
            id,
            nome,
            email,
            created_at
          )
        `)
        .single();

      if (error) {
        console.error('Database error creating connection:', error);
        return {
          success: false,
          error: `Failed to create connection: ${error.message}`,
          error_code: 'DATABASE_ERROR'
        };
      }

      // Log the successful connection creation
      await this.logEvent(connection.id, 'connection_created', 'success', {
        phone_number: selectedPhone.phone_number,
        display_name: selectedPhone.verified_name,
        business_account_name: businessAccount.name
      });

      // Update agent WhatsApp status if agent is linked
      if (stateData.agentId) {
        await supabase
          .from('agente')
          .update({
            whatsapp_conectado: true,
            whatsapp_numero: selectedPhone.phone_number
          })
          .eq('id', stateData.agentId);
      }

      return {
        success: true,
        data: connection,
        message: 'WhatsApp connection created successfully'
      };

    } catch (error) {
      console.error('Error creating connection:', error);
      return {
        success: false,
        error: 'Failed to create WhatsApp connection',
        error_code: 'CONNECTION_CREATE_ERROR'
      };
    }
  }

  /**
   * Refreshes expired access tokens
   */
  async refreshTokens(connectionId: string): Promise<ServiceResult<any>> {
    const supabase = databaseService.getClient();

    try {
      // Get current connection data
      const { data: connection, error: fetchError } = await supabase
        .from('whatsapp_official_connections')
        .select('*')
        .eq('id', connectionId)
        .single();

      if (fetchError) {
        return {
          success: false,
          error: `Connection not found: ${fetchError.message}`,
          error_code: 'CONNECTION_NOT_FOUND'
        };
      }

      // Decrypt refresh token
      if (!connection.refresh_token_encrypted) {
        return {
          success: false,
          error: 'No refresh token available',
          error_code: 'NO_REFRESH_TOKEN'
        };
      }

      const refreshToken = this.encryption.decrypt(connection.refresh_token_encrypted);

      // Refresh tokens via Meta API
      const refreshResult = await this.metaAPI.refreshAccessToken(refreshToken);
      if (!refreshResult.success) {
        // Log the failed refresh
        await this.logEvent(connectionId, 'token_refreshed', 'error', {
          error: refreshResult.error,
          error_code: refreshResult.error_code
        });

        return {
          success: false,
          error: refreshResult.error,
          error_code: refreshResult.error_code
        };
      }

      const newTokens = refreshResult.tokens!;

      // Encrypt new tokens
      const encryptedAccessToken = this.encryption.encrypt(newTokens.access_token);
      const encryptedRefreshToken = newTokens.refresh_token ? 
        this.encryption.encrypt(newTokens.refresh_token) : null;

      // Update database with new tokens
      const { error: updateError } = await supabase
        .from('whatsapp_official_connections')
        .update({
          access_token_encrypted: encryptedAccessToken,
          refresh_token_encrypted: encryptedRefreshToken,
          token_expires_at: newTokens.expires_at.toISOString(),
          token_created_at: new Date().toISOString(),
          status: 'active',
          last_error_message: null,
          last_error_code: null,
          consecutive_errors: 0
        })
        .eq('id', connectionId);

      if (updateError) {
        return {
          success: false,
          error: `Failed to update tokens: ${updateError.message}`,
          error_code: 'TOKEN_UPDATE_ERROR'
        };
      }

      // Log successful refresh
      await this.logEvent(connectionId, 'token_refreshed', 'success', {
        expires_at: newTokens.expires_at.toISOString()
      });

      return {
        success: true,
        data: {
          expires_at: newTokens.expires_at,
          message: 'Tokens refreshed successfully'
        }
      };

    } catch (error) {
      console.error('Token refresh error:', error);
      
      // Log the error
      await this.logEvent(connectionId, 'token_refreshed', 'error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: 'Failed to refresh tokens',
        error_code: 'TOKEN_REFRESH_ERROR'
      };
    }
  }

  /**
   * Validates OAuth2 state parameter
   */
  private async validateState(state: string): Promise<ServiceResult<any>> {
    try {
      // Check if state exists in temporary storage
      const stateExists = await this.checkTemporaryState(state);
      if (!stateExists) {
        return {
          success: false,
          error: 'Invalid or expired state parameter',
          error_code: 'INVALID_STATE'
        };
      }

      // Decrypt and parse state data
      const decryptedState = this.encryption.decrypt(state);
      const stateData = JSON.parse(decryptedState);

      // Validate timestamp (10 minute expiry)
      const now = Date.now();
      if (now - stateData.timestamp > this.stateExpiryTime) {
        await this.cleanupTemporaryState(state);
        return {
          success: false,
          error: 'State parameter expired',
          error_code: 'STATE_EXPIRED'
        };
      }

      return {
        success: true,
        data: stateData
      };

    } catch (error) {
      console.error('State validation error:', error);
      return {
        success: false,
        error: 'Failed to validate state parameter',
        error_code: 'STATE_VALIDATION_ERROR'
      };
    }
  }

  /**
   * Stores temporary state for OAuth2 validation
   */
  private async storeTemporaryState(state: string, userId: string): Promise<void> {
    const supabase = databaseService.getClient();
    
    // Store in a temporary table or cache (using user sessions table for now)
    await supabase
      .from('auth_tokens')
      .insert([{
        user_id: userId,
        token: state,
        token_type: 'oauth_state',
        expires_at: new Date(Date.now() + this.stateExpiryTime).toISOString()
      }]);
  }

  /**
   * Checks if temporary state exists
   */
  private async checkTemporaryState(state: string): Promise<boolean> {
    const supabase = databaseService.getClient();
    
    const { data } = await supabase
      .from('auth_tokens')
      .select('id')
      .eq('token', state)
      .eq('token_type', 'oauth_state')
      .gt('expires_at', new Date().toISOString())
      .single();

    return !!data;
  }

  /**
   * Cleans up temporary state
   */
  private async cleanupTemporaryState(state: string): Promise<void> {
    const supabase = databaseService.getClient();
    
    await supabase
      .from('auth_tokens')
      .delete()
      .eq('token', state)
      .eq('token_type', 'oauth_state');
  }

  /**
   * Logs events to the official logs table
   */
  private async logEvent(
    connectionId: string, 
    eventType: string, 
    eventStatus: string, 
    eventData: any = {}
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
          created_at: new Date().toISOString()
        }]);
    } catch (error) {
      console.error('Failed to log event:', error);
      // Don't throw - logging shouldn't break the main flow
    }
  }

  /**
   * Gets connection status and health
   */
  async getConnectionStatus(connectionId: string): Promise<ServiceResult<any>> {
    const supabase = databaseService.getClient();

    try {
      const { data: connection, error } = await supabase
        .from('whatsapp_official_connections')
        .select(`
          id,
          status,
          health_status,
          phone_number,
          display_name,
          verified_status,
          quality_rating,
          message_quota_limit,
          message_quota_used,
          quota_reset_at,
          last_error_message,
          last_error_code,
          consecutive_errors,
          last_message_sent_at,
          last_message_received_at,
          total_messages_sent,
          total_messages_received,
          created_at,
          updated_at
        `)
        .eq('id', connectionId)
        .single();

      if (error) {
        return {
          success: false,
          error: `Connection not found: ${error.message}`,
          error_code: 'CONNECTION_NOT_FOUND'
        };
      }

      return {
        success: true,
        data: connection
      };

    } catch (error) {
      console.error('Error getting connection status:', error);
      return {
        success: false,
        error: 'Failed to get connection status',
        error_code: 'STATUS_ERROR'
      };
    }
  }
}

// Singleton instance
let whatsappOfficialAuthService: WhatsAppOfficialAuthService;

export function getWhatsAppOfficialAuthService(): WhatsAppOfficialAuthService {
  if (!whatsappOfficialAuthService) {
    whatsappOfficialAuthService = new WhatsAppOfficialAuthService();
  }
  return whatsappOfficialAuthService;
}