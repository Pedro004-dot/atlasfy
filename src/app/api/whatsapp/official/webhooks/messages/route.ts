import { NextRequest, NextResponse } from 'next/server';
import { getWhatsAppOfficialWebhookService } from '@/services/whatsapp-official-webhook.service';
import { 
  MiddlewareFactory, 
  createErrorResponse 
} from '@/lib/middleware/whatsapp-validation.middleware';
import { createBusinessRulesMiddleware } from '@/lib/middleware/business-rules.middleware';

// Força a rota a ser dinâmica
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/whatsapp/official/webhooks/messages
 * Webhook verification endpoint para Meta
 */
export async function GET(request: NextRequest) {
  try {
    console.log('=== Webhook Verification Request ===');

    // Validação usando middleware
    const webhookMiddleware = MiddlewareFactory.createWebhookMiddleware();
    const validationResult = await webhookMiddleware.validate(request);

    if (!validationResult.success) {
      console.log('Webhook verification validation failed:', validationResult.error);
      return createErrorResponse(validationResult);
    }

    const { mode, challenge, verifyToken } = validationResult.data;
    console.log(`Webhook verification: mode=${mode}, verify_token=${verifyToken?.substring(0, 8)}...`);

    // Processar verificação
    const webhookService = getWhatsAppOfficialWebhookService();
    const verificationResult = webhookService.handleVerificationChallenge(mode, verifyToken, challenge);

    if (!verificationResult.success) {
      console.log('Webhook verification failed:', verificationResult.error);
      return NextResponse.json(
        {
          success: false,
          error: verificationResult.error,
          errorCode: verificationResult.error_code
        },
        { status: 403 }
      );
    }

    console.log('Webhook verification successful');

    // Retornar challenge como texto plano (requirement do Meta)
    return new NextResponse(verificationResult.data, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain'
      }
    });

  } catch (error: any) {
    console.error('Webhook verification error:', error);
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
 * POST /api/whatsapp/official/webhooks/messages
 * Processa eventos de webhook do WhatsApp
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('=== Webhook Event Request ===');

    // Validação usando middleware
    const webhookMiddleware = MiddlewareFactory.createWebhookMiddleware();
    const validationResult = await webhookMiddleware.validate(request);

    if (!validationResult.success) {
      console.log('Webhook validation failed:', validationResult.error);
      return createErrorResponse(validationResult);
    }

    const { signature } = validationResult.data;

    // Ler o body da requisição
    let rawBody: string;
    let payload: any;

    try {
      rawBody = await request.text();
      payload = JSON.parse(rawBody);
    } catch (error) {
      console.error('Failed to parse webhook payload:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON payload',
          errorCode: 'INVALID_PAYLOAD'
        },
        { status: 400 }
      );
    }

    console.log(`Webhook payload received: ${rawBody.length} bytes, signature: ${signature?.substring(0, 20)}...`);

    // Aplicar regras de negócio para webhook
    const businessRulesMiddleware = createBusinessRulesMiddleware();
    const businessRulesResult = await businessRulesMiddleware.validateWebhook({
      webhook_data: payload,
      metadata: {
        signature,
        rawBody,
        timestamp: new Date().toISOString()
      }
    });

    if (!businessRulesResult.allowed) {
      console.log('Webhook business rules validation failed:', businessRulesResult.errors);
      return NextResponse.json(
        {
          success: false,
          error: 'Webhook validation failed',
          errorCode: 'WEBHOOK_BUSINESS_RULES_VIOLATION',
          details: businessRulesResult.errors
        },
        { status: 400 }
      );
    }

    // Processar webhook
    const webhookService = getWhatsAppOfficialWebhookService();
    const processingResult = await webhookService.processWebhook(payload, signature, rawBody);

    if (!processingResult.success) {
      console.error('Webhook processing failed:', processingResult.error);
      return NextResponse.json(
        {
          success: false,
          error: processingResult.error,
          errorCode: processingResult.error_code || 'PROCESSING_ERROR'
        },
        { status: 500 }
      );
    }

    const duration = Date.now() - startTime;
    console.log(`Webhook processed successfully in ${duration}ms:`, processingResult.data);

    // Meta espera resposta 200 OK rápida
    return NextResponse.json({
      success: true,
      data: {
        processed_entries: processingResult.data?.processed_entries || 0,
        duration_ms: duration
      }
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`Webhook processing error after ${duration}ms:`, error);

    // Sempre retornar 200 para evitar re-tentativas do Meta
    return NextResponse.json(
      {
        success: false,
        error: 'Internal processing error',
        errorCode: 'INTERNAL_ERROR'
      },
      { status: 200 } // Status 200 para evitar retries
    );
  }
}