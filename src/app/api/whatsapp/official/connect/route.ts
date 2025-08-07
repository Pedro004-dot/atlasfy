import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/auth';
import { getBusinessRuleEngine } from '@/lib/business-rules/engine/BusinessRuleEngine';
import { BusinessRuleContext, BusinessRuleCategory } from '@/lib/business-rules/interfaces/IBusinessRule';
import { getWhatsAppOfficialRepository } from '@/repositories/whatsapp-official.repository';
import * as crypto from 'crypto';

interface OfficialConnectRequest {
  useSystemConfig?: boolean; // New flag to use system configuration
  phoneNumberId?: string;
  businessAccountId?: string;
  accessToken?: string;
  appSecret?: string;
  webhookUrl?: string;
  agentType?: string;
  empresaId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Token inválido' }, 
        { status: 401 }
      );
    }

    const body: OfficialConnectRequest = await request.json();
    const { 
      useSystemConfig,
      phoneNumberId, 
      businessAccountId, 
      accessToken, 
      appSecret, 
      webhookUrl,
      agentType,
      empresaId 
    } = body;

    let finalPhoneNumberId: string;
    let finalBusinessAccountId: string;
    let finalAccessToken: string;
    let finalAppSecret: string;
    let finalWebhookUrl: string;

    if (useSystemConfig) {
      // Para SaaS multi-tenant, cada empresa deve fornecer suas credenciais
      // Esta opção está desabilitada para forçar entrada manual das credenciais
      return NextResponse.json({
        success: false,
        error: 'System configuration is disabled. Each company must provide their own WhatsApp Business API credentials.',
        errorCode: 'SYSTEM_CONFIG_DISABLED'
      }, { status: 400 });
    } else {
      // Use provided fields (fallback for manual configuration)
      if (!phoneNumberId || !businessAccountId || !accessToken || !appSecret || !webhookUrl) {
        return NextResponse.json({
          success: false,
          error: 'All WhatsApp Business API fields are required when not using system config'
        }, { status: 400 });
      }
      
      finalPhoneNumberId = phoneNumberId;
      finalBusinessAccountId = businessAccountId;
      finalAccessToken = accessToken;
      finalAppSecret = appSecret;
      finalWebhookUrl = webhookUrl;
    }

    const engine = getBusinessRuleEngine();
    const repository = getWhatsAppOfficialRepository();

    // Step 1: Validate with WhatsApp Business API
    let whatsappResponse;
    try {
      // Get phone number information
      const phoneResponse = await fetch(`https://graph.facebook.com/v18.0/${finalPhoneNumberId}`, {
        headers: {
          'Authorization': `Bearer ${finalAccessToken}`
        }
      });

      if (!phoneResponse.ok) {
        const errorData = await phoneResponse.json().catch(() => null);
        throw new Error(`WhatsApp API error: ${errorData?.error?.message || 'Unknown error'}`);
      }

      whatsappResponse = await phoneResponse.json();

      // Validate webhook URL by setting it
      const webhookResponse = await fetch(`https://graph.facebook.com/v18.0/${finalBusinessAccountId}/subscriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${finalAccessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          object: 'whatsapp_business_account',
          callback_url: finalWebhookUrl,
          verify_token: finalAppSecret,
          fields: 'messages,message_deliveries,message_reads,message_reactions'
        })
      });

      if (!webhookResponse.ok) {
        const webhookError = await webhookResponse.json().catch(() => null);
        console.warn('Webhook setup failed:', webhookError);
        // Don't fail connection for webhook setup issues, just log warning
      }

    } catch (error) {
      console.error('WhatsApp Business API validation error:', error);
      return NextResponse.json({
        success: false,
        error: `Failed to validate WhatsApp Business API: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'WHATSAPP_API_ERROR'
      }, { status: 500 });
    }

    // Step 2: Business rules validation
    const context: BusinessRuleContext = {
      user_id: authResult.user.id,
      empresa_id: empresaId,
      metadata: {
        connection_type: 'official',
        phone_number_id: finalPhoneNumberId,
        business_account_id: finalBusinessAccountId,
        agent_type: agentType,
        phone_number: whatsappResponse.display_phone_number,
        verified_name: whatsappResponse.verified_name
      }
    };

    // Execute business rules
    const rulesResults = await engine.executeRules(context, BusinessRuleCategory.CONNECTION);
    const violations = rulesResults.filter(result => !result.allowed);

    if (violations.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Business rules validation failed',
        errorCode: 'CONNECTION_BUSINESS_RULES_VIOLATION',
        details: violations.map(v => v.message),
        data: { violations }
      }, { status: 400 });
    }

    // Step 3: Encrypt sensitive data
    const encryptionKey = process.env.ENCRYPTION_KEY || 'fallback-key-change-in-production';
    
    const encryptedAccessToken = encrypt(finalAccessToken, encryptionKey);
    const encryptedAppSecret = encrypt(finalAppSecret, encryptionKey);

    // Step 4: Save connection to database
    try {
      const connectionData = {
        user_id: authResult.user.id,
        empresa_id: empresaId,
        connection_type: 'official' as const,
        phone_number_id: finalPhoneNumberId,
        business_account_id: finalBusinessAccountId,
        phone_number: whatsappResponse.display_phone_number,
        profile_name: whatsappResponse.verified_name,
        status: 'active' as const,
        health_status: 'healthy' as const,
        webhook_url: finalWebhookUrl,
        // Encrypted sensitive fields
        access_token_encrypted: encryptedAccessToken,
        app_secret_encrypted: encryptedAppSecret,
        // API-specific fields
        verified_name: whatsappResponse.verified_name,
        code_verification_status: whatsappResponse.code_verification_status,
        quality_rating: whatsappResponse.quality_rating,
        agent_type: agentType,
        // Token expiration (WhatsApp tokens typically don't expire but have rate limits)
        token_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      };

      const savedConnection = await repository.create(connectionData);

      // Step 5: Execute post-creation business rules
      const postCreationContext: BusinessRuleContext = {
        connection_id: savedConnection.id,
        user_id: authResult.user.id,
        empresa_id: empresaId,
        metadata: {
          event_type: 'connection_created',
          connection_type: 'official',
          agent_type: agentType
        }
      };

      await engine.executeRules(postCreationContext, BusinessRuleCategory.CONNECTION);

      return NextResponse.json({
        success: true,
        message: 'WhatsApp Business API connection created successfully',
        data: {
          connection: {
            id: savedConnection.id,
            phoneNumberId: savedConnection.phone_number_id,
            businessAccountId: savedConnection.business_account_id,
            phoneNumber: savedConnection.phone_number,
            profileName: savedConnection.profile_name,
            verifiedName: savedConnection.verified_name,
            status: savedConnection.status,
            healthStatus: savedConnection.health_status
          },
          whatsappData: {
            displayPhoneNumber: whatsappResponse.display_phone_number,
            verifiedName: whatsappResponse.verified_name,
            qualityRating: whatsappResponse.quality_rating
          }
        }
      });

    } catch (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json({
        success: false,
        error: 'Failed to save connection to database',
        errorCode: 'DATABASE_ERROR'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('WhatsApp Business API connect error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error during WhatsApp Business API connection',
      errorCode: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}

// Helper function to encrypt sensitive data
function encrypt(text: string, key: string): string {
  try {
    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
  } catch (error) {
    console.error('Encryption error:', error);
    // Fallback to base64 encoding if encryption fails
    return Buffer.from(text).toString('base64');
  }
}

// Get connection status
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Token inválido' }, 
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const phoneNumberId = searchParams.get('phoneNumberId');

    if (!phoneNumberId) {
      return NextResponse.json({
        success: false,
        error: 'Phone Number ID is required'
      }, { status: 400 });
    }

    const repository = getWhatsAppOfficialRepository();
    const connection = await repository.findByPhoneNumberId(phoneNumberId);

    if (!connection) {
      return NextResponse.json({
        success: false,
        error: 'Connection not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        connection: {
          id: connection.id,
          phoneNumberId: connection.phone_number_id,
          businessAccountId: connection.business_account_id,
          phoneNumber: connection.phone_number,
          profileName: connection.profile_name,
          status: connection.status,
          healthStatus: connection.health_status,
          lastActivity: connection.last_webhook_received_at,
          qualityRating: connection.quality_rating,
          verifiedName: connection.verified_name
        }
      }
    });

  } catch (error) {
    console.error('Get WhatsApp Business API connection error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get connection status'
    }, { status: 500 });
  }
}