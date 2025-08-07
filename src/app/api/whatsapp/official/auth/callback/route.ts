import { NextRequest, NextResponse } from 'next/server';
import { getWhatsAppOfficialAuthService } from '@/services/whatsapp-official-auth.service';
import { 
  MiddlewareFactory, 
  createErrorResponse 
} from '@/lib/middleware/whatsapp-validation.middleware';

// Força a rota a ser dinâmica
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/whatsapp/official/auth/callback
 * Processa o callback do OAuth2 do Meta
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('=== OAuth2 Callback Request ===');

    // Validação usando middleware compositor
    const callbackMiddleware = MiddlewareFactory.createOAuth2CallbackMiddleware();
    const validationResult = await callbackMiddleware.validate(request);

    if (!validationResult.success) {
      console.log('Callback validation failed:', validationResult.error);
      return createErrorResponse(validationResult);
    }

    const { code, state } = validationResult.data;
    console.log('OAuth2 callback received with code and state');

    // Processar callback
    const authService = getWhatsAppOfficialAuthService();
    const callbackResult = await authService.handleCallback(code, state);

    if (!callbackResult.success) {
      console.error('OAuth2 callback processing failed:', callbackResult.error);
      
      // Redirect para frontend com erro
      const errorUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?oauth_error=${encodeURIComponent(callbackResult.error || 'OAuth2 failed')}&error_code=${callbackResult.error_code || 'CALLBACK_ERROR'}`;
      
      return NextResponse.redirect(errorUrl);
    }

    const { tokens, businessAccounts, stateData } = callbackResult.data;
    console.log(`OAuth2 callback successful - found ${businessAccounts.length} business accounts`);

    // Se houver apenas uma conta business com um número, criar conexão automaticamente
    if (businessAccounts.length === 1 && businessAccounts[0].phone_numbers.length === 1) {
      const businessAccount = businessAccounts[0];
      const phoneNumber = businessAccount.phone_numbers[0];
      
      console.log('Auto-creating connection for single phone number');

      const connectionResult = await authService.createConnection(
        tokens,
        businessAccount,
        phoneNumber.id,
        stateData,
        process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/api/whatsapp/official/webhooks/messages` : undefined
      );

      if (connectionResult.success) {
        const duration = Date.now() - startTime;
        console.log(`Connection created successfully in ${duration}ms`);

        // Redirect para dashboard com sucesso
        const successUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?oauth_success=true&connection_id=${connectionResult.data.id}&phone_number=${encodeURIComponent(phoneNumber.phone_number)}`;
        
        return NextResponse.redirect(successUrl);
      } else {
        console.error('Failed to create connection:', connectionResult.error);
        
        // Redirect com erro de conexão
        const errorUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?oauth_error=${encodeURIComponent(connectionResult.error || 'Failed to create connection')}&error_code=${connectionResult.error_code || 'CONNECTION_ERROR'}`;
        
        return NextResponse.redirect(errorUrl);
      }
    }

    // Múltiplas contas ou números - redirect para seleção
    const duration = Date.now() - startTime;
    console.log(`OAuth2 callback processed successfully in ${duration}ms - redirecting for selection`);

    // Armazenar dados temporariamente para seleção (poderia usar cache/session)
    const selectionUrl = `${process.env.NEXT_PUBLIC_APP_URL}/whatsapp/select-account?` + 
      `tokens=${encodeURIComponent(Buffer.from(JSON.stringify(tokens)).toString('base64'))}&` +
      `accounts=${encodeURIComponent(Buffer.from(JSON.stringify(businessAccounts)).toString('base64'))}&` +
      `state=${encodeURIComponent(state)}`;

    return NextResponse.redirect(selectionUrl);

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`OAuth2 callback error after ${duration}ms:`, error);

    // Redirect para frontend com erro interno
    const errorUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?oauth_error=Internal%20server%20error&error_code=INTERNAL_ERROR`;
    
    return NextResponse.redirect(errorUrl);
  }
}

/**
 * POST /api/whatsapp/official/auth/callback
 * Permite finalizar conexão quando usuário seleciona conta/número específico
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('=== OAuth2 Connection Completion Request ===');

    // Validação de autenticação (usuário deve estar logado)
    const authMiddleware = MiddlewareFactory.createAuthMiddleware();
    const authResult = await authMiddleware.validate(request);

    if (!authResult.success) {
      console.log('Auth validation failed:', authResult.error);
      return createErrorResponse(authResult);
    }

    const { userId } = authResult.data;

    // Parse do body da requisição
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid JSON body',
          errorCode: 'INVALID_JSON'
        },
        { status: 400 }
      );
    }

    const { tokens, businessAccount, phoneNumberId, state, webhookUrl } = body;

    if (!tokens || !businessAccount || !phoneNumberId || !state) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters',
          errorCode: 'MISSING_PARAMETERS'
        },
        { status: 400 }
      );
    }

    // Validar que o state ainda é válido
    const authService = getWhatsAppOfficialAuthService();
    
    // Recriar stateData a partir do state (decrypt)
    const callbackResult = await authService.handleCallback('dummy_code', state);
    if (!callbackResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or expired state',
          errorCode: 'INVALID_STATE'
        },
        { status: 400 }
      );
    }

    const stateData = callbackResult.data.stateData;

    // Verificar se userId do token corresponde ao state
    if (stateData.userId !== userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'User mismatch',
          errorCode: 'USER_MISMATCH'
        },
        { status: 403 }
      );
    }

    // Criar conexão
    const connectionResult = await authService.createConnection(
      tokens,
      businessAccount,
      phoneNumberId,
      stateData,
      webhookUrl
    );

    if (!connectionResult.success) {
      console.error('Failed to create connection:', connectionResult.error);
      return NextResponse.json(
        {
          success: false,
          error: connectionResult.error,
          errorCode: connectionResult.error_code || 'CONNECTION_ERROR'
        },
        { status: 500 }
      );
    }

    const duration = Date.now() - startTime;
    console.log(`Connection created successfully in ${duration}ms`);

    return NextResponse.json({
      success: true,
      data: {
        connection: connectionResult.data,
        message: 'WhatsApp connection created successfully'
      }
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`OAuth2 completion error after ${duration}ms:`, error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        errorCode: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}