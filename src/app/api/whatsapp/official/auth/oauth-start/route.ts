import { NextRequest, NextResponse } from 'next/server';
import { getWhatsAppOfficialAuthService } from '@/services/whatsapp-official-auth.service';
import { 
  MiddlewareFactory, 
  createErrorResponse 
} from '@/lib/middleware/whatsapp-validation.middleware';
import { z } from 'zod';

// Força a rota a ser dinâmica
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Schema de validação para iniciar OAuth2
 */
const startOAuthSchema = z.object({
  empresaId: z.string().uuid().optional(),
  agentId: z.string().uuid().optional(),
  redirectUrl: z.string().url().optional()
});

/**
 * POST /api/whatsapp/official/auth/oauth-start
 * Inicia o fluxo OAuth2 do WhatsApp Official API
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('=== OAuth2 Start Request ===');

    // Validação usando middleware compositor
    const authMiddleware = MiddlewareFactory.createAuthMiddleware();
    const authResult = await authMiddleware.validate(request);

    if (!authResult.success) {
      console.log('Auth validation failed:', authResult.error);
      return createErrorResponse(authResult);
    }

    const { userId } = authResult.data;
    console.log('Authenticated user:', userId);

    // Validação do body da requisição
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (error) {
      console.log('Invalid JSON body');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid JSON body',
          errorCode: 'INVALID_JSON'
        },
        { status: 400 }
      );
    }

    // Validação dos parâmetros
    const validation = startOAuthSchema.safeParse(requestBody);
    if (!validation.success) {
      const errorMessage = validation.error.errors
        .map(e => `${e.path.join('.')}: ${e.message}`)
        .join(', ');

      console.log('Request validation failed:', errorMessage);
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          errorCode: 'VALIDATION_ERROR'
        },
        { status: 400 }
      );
    }

    const { empresaId, agentId } = validation.data;

    // Iniciar fluxo OAuth2
    const authService = getWhatsAppOfficialAuthService();
    const result = await authService.generateAuthUrl(userId, empresaId, agentId);

    if (!result.success) {
      console.error('OAuth2 start failed:', result.error);
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          errorCode: result.error_code || 'OAUTH_START_ERROR'
        },
        { status: 500 }
      );
    }

    const duration = Date.now() - startTime;
    console.log(`OAuth2 start successful in ${duration}ms`);

    return NextResponse.json({
      success: true,
      data: {
        authUrl: result.data,
        message: 'OAuth2 flow started successfully',
        expiresIn: 600 // 10 minutes
      }
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`OAuth2 start error after ${duration}ms:`, error);

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

/**
 * GET /api/whatsapp/official/auth/oauth-start
 * Retorna informações sobre o estado do OAuth2 (opcional)
 */
export async function GET(request: NextRequest) {
  try {
    // Validação de autenticação
    const authMiddleware = MiddlewareFactory.createAuthMiddleware();
    const authResult = await authMiddleware.validate(request);

    if (!authResult.success) {
      return createErrorResponse(authResult);
    }

    const { userId } = authResult.data;

    // Retorna informações sobre OAuth2 disponível
    return NextResponse.json({
      success: true,
      data: {
        available: true,
        scopes: [
          'whatsapp_business_management',
          'whatsapp_business_messaging'
        ],
        provider: 'Meta WhatsApp Cloud API',
        version: 'v18.0',
        userId
      }
    });

  } catch (error: any) {
    console.error('OAuth2 info error:', error);
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