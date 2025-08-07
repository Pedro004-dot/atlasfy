import { NextRequest, NextResponse } from 'next/server';
import { getWhatsAppOfficialWebhookService } from '@/services/whatsapp-official-webhook.service';
import { getWhatsAppOfficialRepository } from '@/repositories/whatsapp-official.repository';
import { 
  MiddlewareFactory, 
  createErrorResponse 
} from '@/lib/middleware/whatsapp-validation.middleware';

// Força a rota a ser dinâmica
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/whatsapp/official/webhooks/status
 * Retorna estatísticas e status dos webhooks
 */
export async function GET(request: NextRequest) {
  try {
    console.log('=== Webhook Status Request ===');

    // Validação de autenticação
    const authMiddleware = MiddlewareFactory.createAuthMiddleware();
    const authResult = await authMiddleware.validate(request);

    if (!authResult.success) {
      console.log('Auth validation failed:', authResult.error);
      return createErrorResponse(authResult);
    }

    const { userId } = authResult.data;
    const { searchParams } = new URL(request.url);
    
    const connectionId = searchParams.get('connectionId');
    const hours = parseInt(searchParams.get('hours') || '24');

    const repository = getWhatsAppOfficialRepository();
    const webhookService = getWhatsAppOfficialWebhookService();

    let connections: any[] = [];

    if (connectionId) {
      // Verificar conexão específica
      const connection = await repository.findById(connectionId);
      if (!connection) {
        return NextResponse.json(
          {
            success: false,
            error: 'Connection not found',
            errorCode: 'CONNECTION_NOT_FOUND'
          },
          { status: 404 }
        );
      }

      // Verificar se pertence ao usuário
      if (connection.user_id !== userId) {
        return NextResponse.json(
          {
            success: false,
            error: 'Access denied',
            errorCode: 'ACCESS_DENIED'
          },
          { status: 403 }
        );
      }

      connections = [connection];
    } else {
      // Buscar todas as conexões do usuário
      connections = await repository.findByUserId(userId);
    }

    if (connections.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          message: 'No connections found',
          connections: []
        }
      });
    }

    // Obter estatísticas para cada conexão
    const connectionStats = await Promise.all(
      connections.map(async (connection) => {
        try {
          const stats = await webhookService.getWebhookStats(connection.id, hours);
          
          return {
            connection_id: connection.id,
            phone_number: connection.phone_number,
            display_name: connection.display_name,
            status: connection.status,
            health_status: connection.health_status,
            webhook_verified: connection.webhook_verified,
            webhook_url: connection.webhook_url,
            last_webhook_received_at: connection.last_webhook_received_at,
            last_message_received_at: connection.last_message_received_at,
            last_message_sent_at: connection.last_message_sent_at,
            total_messages_sent: connection.total_messages_sent,
            total_messages_received: connection.total_messages_received,
            stats: stats.success ? stats.data : { error: stats.error }
          };
        } catch (error) {
          return {
            connection_id: connection.id,
            phone_number: connection.phone_number,
            display_name: connection.display_name,
            status: connection.status,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );

    // Calcular resumo geral
    const summary = connectionStats.reduce((acc, conn) => {
      acc.total_connections++;
      
      if (conn.webhook_verified) {
        acc.verified_webhooks++;
      }
      
      if (conn.status === 'active') {
        acc.active_connections++;
      }
      
      if (conn.health_status === 'healthy') {
        acc.healthy_connections++;
      }
      
      acc.total_messages_sent += conn.total_messages_sent || 0;
      acc.total_messages_received += conn.total_messages_received || 0;
      
      return acc;
    }, {
      total_connections: 0,
      active_connections: 0,
      healthy_connections: 0,
      verified_webhooks: 0,
      total_messages_sent: 0,
      total_messages_received: 0
    });

    return NextResponse.json({
      success: true,
      data: {
        period_hours: hours,
        summary,
        connections: connectionStats
      }
    });

  } catch (error: any) {
    console.error('Webhook status error:', error);
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
 * POST /api/whatsapp/official/webhooks/status
 * Atualiza configuração de webhook para uma conexão
 */
export async function POST(request: NextRequest) {
  try {
    console.log('=== Webhook Configuration Update Request ===');

    // Validação de autenticação
    const authMiddleware = MiddlewareFactory.createAuthMiddleware();
    const authResult = await authMiddleware.validate(request);

    if (!authResult.success) {
      console.log('Auth validation failed:', authResult.error);
      return createErrorResponse(authResult);
    }

    const { userId } = authResult.data;

    // Parse do body
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

    const { connectionId, webhookUrl, webhookSecret, verified } = body;

    if (!connectionId || !webhookUrl) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters',
          errorCode: 'MISSING_PARAMETERS'
        },
        { status: 400 }
      );
    }

    const repository = getWhatsAppOfficialRepository();

    // Verificar se a conexão existe e pertence ao usuário
    const connection = await repository.findById(connectionId);
    if (!connection) {
      return NextResponse.json(
        {
          success: false,
          error: 'Connection not found',
          errorCode: 'CONNECTION_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    if (connection.user_id !== userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied',
          errorCode: 'ACCESS_DENIED'
        },
        { status: 403 }
      );
    }

    // Atualizar configuração do webhook
    const updatedConnection = await repository.updateWebhookConfig(
      connectionId,
      webhookUrl,
      webhookSecret,
      verified ?? false
    );

    console.log(`Webhook configuration updated for connection ${connectionId}`);

    return NextResponse.json({
      success: true,
      data: {
        connection_id: updatedConnection.id,
        webhook_url: updatedConnection.webhook_url,
        webhook_verified: updatedConnection.webhook_verified,
        message: 'Webhook configuration updated successfully'
      }
    });

  } catch (error: any) {
    console.error('Webhook configuration error:', error);
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
 * DELETE /api/whatsapp/official/webhooks/status
 * Remove configuração de webhook (desativa)
 */
export async function DELETE(request: NextRequest) {
  try {
    console.log('=== Webhook Disable Request ===');

    // Validação de autenticação
    const authMiddleware = MiddlewareFactory.createAuthMiddleware();
    const authResult = await authMiddleware.validate(request);

    if (!authResult.success) {
      return createErrorResponse(authResult);
    }

    const { userId } = authResult.data;
    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');

    if (!connectionId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Connection ID is required',
          errorCode: 'MISSING_CONNECTION_ID'
        },
        { status: 400 }
      );
    }

    const repository = getWhatsAppOfficialRepository();

    // Verificar conexão
    const connection = await repository.findById(connectionId);
    if (!connection || connection.user_id !== userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Connection not found or access denied',
          errorCode: 'CONNECTION_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // Desativar webhook
    const updatedConnection = await repository.updateWebhookConfig(
      connectionId,
      '', // URL vazia
      undefined, // Manter secret existente
      false // Não verificado
    );

    console.log(`Webhook disabled for connection ${connectionId}`);

    return NextResponse.json({
      success: true,
      data: {
        connection_id: updatedConnection.id,
        message: 'Webhook disabled successfully'
      }
    });

  } catch (error: any) {
    console.error('Webhook disable error:', error);
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