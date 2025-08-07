import { 
  OAuth2Result, 
  OAuth2Tokens, 
  TokenRefreshResult, 
  WhatsAppBusinessAccount,
  MetaAPIError,
  ServiceResult 
} from '@/types/whatsapp-official';
import { getEncryptionService } from '@/lib/encryption';

/**
 * Meta API Service for WhatsApp Cloud API integration
 * Handles OAuth2 flow, token management, and API communications
 */
export class MetaAPIService {
  private readonly graphApiUrl: string;
  private readonly oauthUrl: string;
  private readonly appId: string;
  private readonly appSecret: string;
  private readonly redirectUri: string;
  private readonly scopes: string[];

  constructor() {
    this.graphApiUrl = process.env.META_GRAPH_API_URL || 'https://graph.facebook.com/v18.0';
    this.oauthUrl = process.env.META_OAUTH_URL || 'https://www.facebook.com/v18.0/dialog/oauth';
    this.appId = process.env.META_APP_ID!;
    this.appSecret = process.env.META_APP_SECRET!;
    this.redirectUri = process.env.WHATSAPP_OAUTH_REDIRECT_URI!;
    this.scopes = (process.env.WHATSAPP_OAUTH_SCOPES || '').split(',');

    if (!this.appId || !this.appSecret || !this.redirectUri) {
      throw new Error('Missing required Meta API configuration');
    }
  }

  /**
   * Generates OAuth2 authorization URL for user consent
   */
  generateAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: this.scopes.join(','),
      state: state // Used to prevent CSRF and track the user
    });

    return `${this.oauthUrl}?${params.toString()}`;
  }

  /**
   * Exchanges authorization code for access tokens
   */
  async exchangeCodeForTokens(code: string): Promise<OAuth2Result> {
    try {
      const params = new URLSearchParams({
        client_id: this.appId,
        client_secret: this.appSecret,
        redirect_uri: this.redirectUri,
        code: code,
        grant_type: 'authorization_code'
      });

      const response = await fetch(`${this.graphApiUrl}/oauth/access_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString()
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error?.message || 'Failed to exchange code for tokens',
          error_code: data.error?.code?.toString() || 'OAUTH_EXCHANGE_ERROR'
        };
      }

      // Calculate expiration time
      const expiresAt = new Date(Date.now() + (data.expires_in * 1000));

      const tokens: OAuth2Tokens = {
        access_token: data.access_token,
        token_type: data.token_type || 'Bearer',
        expires_in: data.expires_in,
        expires_at: expiresAt
      };

      return {
        success: true,
        tokens
      };

    } catch (error) {
      console.error('OAuth2 token exchange error:', error);
      return {
        success: false,
        error: 'Network error during token exchange',
        error_code: 'NETWORK_ERROR'
      };
    }
  }

  /**
   * Refreshes an expired access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenRefreshResult> {
    try {
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.appId,
        client_secret: this.appSecret
      });

      const response = await fetch(`${this.graphApiUrl}/oauth/access_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString()
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error?.message || 'Failed to refresh token',
          error_code: data.error?.code?.toString() || 'TOKEN_REFRESH_ERROR'
        };
      }

      const expiresAt = new Date(Date.now() + (data.expires_in * 1000));

      const tokens: OAuth2Tokens = {
        access_token: data.access_token,
        refresh_token: data.refresh_token || refreshToken, // Keep old if not provided
        token_type: data.token_type || 'Bearer',
        expires_in: data.expires_in,
        expires_at: expiresAt
      };

      return {
        success: true,
        tokens
      };

    } catch (error) {
      console.error('Token refresh error:', error);
      return {
        success: false,
        error: 'Network error during token refresh',
        error_code: 'NETWORK_ERROR'
      };
    }
  }

  /**
   * Gets user's WhatsApp Business Accounts
   */
  async getBusinessAccounts(accessToken: string): Promise<ServiceResult<WhatsAppBusinessAccount[]>> {
    try {
      const response = await fetch(
        `${this.graphApiUrl}/me/businesses?fields=id,name,verification_status`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error?.message || 'Failed to fetch business accounts',
          error_code: data.error?.code?.toString() || 'API_ERROR'
        };
      }

      // Get WhatsApp Business Accounts for each business
      const whatsappAccounts: WhatsAppBusinessAccount[] = [];
      
      for (const business of data.data || []) {
        const wabaResponse = await fetch(
          `${this.graphApiUrl}/${business.id}/whatsapp_business_accounts?fields=id,name,verified_status`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        const wabaData = await wabaResponse.json();
        
        if (wabaResponse.ok && wabaData.data) {
          for (const waba of wabaData.data) {
            // Get phone numbers for each WABA
            const phoneResponse = await fetch(
              `${this.graphApiUrl}/${waba.id}/phone_numbers?fields=id,phone_number,display_phone_number,verified_name,status,quality_rating`,
              {
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json'
                }
              }
            );

            const phoneData = await phoneResponse.json();
            
            whatsappAccounts.push({
              id: waba.id,
              name: waba.name,
              verified_status: waba.verified_status,
              phone_numbers: phoneResponse.ok ? phoneData.data || [] : []
            });
          }
        }
      }

      return {
        success: true,
        data: whatsappAccounts
      };

    } catch (error) {
      console.error('Error fetching business accounts:', error);
      return {
        success: false,
        error: 'Network error while fetching business accounts',
        error_code: 'NETWORK_ERROR'
      };
    }
  }

  /**
   * Validates if an access token is still valid
   */
  async validateToken(accessToken: string): Promise<ServiceResult<any>> {
    try {
      const response = await fetch(
        `${this.graphApiUrl}/me?fields=id,name`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error?.message || 'Token validation failed',
          error_code: data.error?.code?.toString() || 'TOKEN_INVALID'
        };
      }

      return {
        success: true,
        data: data
      };

    } catch (error) {
      console.error('Token validation error:', error);
      return {
        success: false,
        error: 'Network error during token validation',
        error_code: 'NETWORK_ERROR'
      };
    }
  }

  /**
   * Creates a System User Token for permanent API access
   * This requires Business Manager admin permissions
   */
  async createSystemUserToken(businessId: string, accessToken: string): Promise<ServiceResult<string>> {
    try {
      // First, create a system user
      const systemUserResponse = await fetch(
        `${this.graphApiUrl}/${businessId}/system_users`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: `Atlas WhatsApp Integration ${Date.now()}`,
            role: 'ADMIN'
          })
        }
      );

      const systemUserData = await systemUserResponse.json();

      if (!systemUserResponse.ok) {
        return {
          success: false,
          error: systemUserData.error?.message || 'Failed to create system user',
          error_code: systemUserData.error?.code?.toString() || 'SYSTEM_USER_ERROR'
        };
      }

      const systemUserId = systemUserData.id;

      // Generate token for the system user
      const tokenResponse = await fetch(
        `${this.graphApiUrl}/${systemUserId}/access_tokens`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            scope: this.scopes.join(',')
          })
        }
      );

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok) {
        return {
          success: false,
          error: tokenData.error?.message || 'Failed to generate system user token',
          error_code: tokenData.error?.code?.toString() || 'TOKEN_GENERATION_ERROR'
        };
      }

      return {
        success: true,
        data: tokenData.access_token
      };

    } catch (error) {
      console.error('System user token creation error:', error);
      return {
        success: false,
        error: 'Network error during system user token creation',
        error_code: 'NETWORK_ERROR'
      };
    }
  }

  /**
   * Sends a WhatsApp message using the Cloud API
   */
  async sendMessage(
    phoneNumberId: string, 
    accessToken: string, 
    message: any
  ): Promise<ServiceResult<any>> {
    try {
      const response = await fetch(
        `${this.graphApiUrl}/${phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            ...message
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error?.message || 'Failed to send message',
          error_code: data.error?.code?.toString() || 'MESSAGE_SEND_ERROR',
          data: data
        };
      }

      return {
        success: true,
        data: data
      };

    } catch (error) {
      console.error('Message send error:', error);
      return {
        success: false,
        error: 'Network error while sending message',
        error_code: 'NETWORK_ERROR'
      };
    }
  }

  /**
   * Gets account rate limiting information
   */
  async getRateLimitInfo(phoneNumberId: string, accessToken: string): Promise<ServiceResult<any>> {
    try {
      const response = await fetch(
        `${this.graphApiUrl}/${phoneNumberId}?fields=rate_limit_hit,quality_rating`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error?.message || 'Failed to get rate limit info',
          error_code: data.error?.code?.toString() || 'RATE_LIMIT_ERROR'
        };
      }

      return {
        success: true,
        data: data
      };

    } catch (error) {
      console.error('Rate limit check error:', error);
      return {
        success: false,
        error: 'Network error while checking rate limits',
        error_code: 'NETWORK_ERROR'
      };
    }
  }

  /**
   * Handles Meta API errors and provides user-friendly messages
   */
  private handleAPIError(error: MetaAPIError): string {
    const { code, message } = error.error;
    
    switch (code) {
      case 190: return 'Access token expired or invalid';
      case 102: return 'API session expired';
      case 104: return 'Access token required';
      case 132: return 'Rate limit exceeded';
      case 2500: return 'Business account not verified';
      case 131030: return 'Phone number not registered';
      case 131031: return 'Phone number already registered';
      default: return message || 'Unknown API error occurred';
    }
  }
}

// Singleton instance
let metaAPIService: MetaAPIService;

export function getMetaAPIService(): MetaAPIService {
  if (!metaAPIService) {
    metaAPIService = new MetaAPIService();
  }
  return metaAPIService;
}