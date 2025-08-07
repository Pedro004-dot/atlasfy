import { NextRequest, NextResponse } from 'next/server';
import { getWhatsAppOfficialRepository } from '@/repositories/whatsapp-official.repository';
import { getWhatsAppOfficialMonitoringService } from '@/services/whatsapp-official-monitoring.service';
import { 
  MiddlewareFactory, 
  createErrorResponse 
} from '@/lib/middleware/whatsapp-validation.middleware';
import { createBusinessRulesMiddleware } from '@/lib/middleware/business-rules.middleware';

// Força a rota a ser dinâmica
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/whatsapp/official/connections
 * Lista todas as conexões WhatsApp Official do usuário
 */
export async function GET(request: NextRequest) {
  try {
    console.log('=== List Official Connections Request ===');

    // Validação de autenticação
    const authMiddleware = MiddlewareFactory.createAuthMiddleware();
    const authResult = await authMiddleware.validate(request);

    if (!authResult.success) {
      console.log('Auth validation failed:', authResult.error);
      return createErrorResponse(authResult);
    }

    const { userId } = authResult.data;
    const { searchParams } = new URL(request.url);
    
    // Parâmetros opcionais de filtro
    const status = searchParams.get('status');
    const healthStatus = searchParams.get('healthStatus');
    const agentId = searchParams.get('agentId');
    const empresaId = searchParams.get('empresaId');
    const includeStats = searchParams.get('includeStats') === 'true';

    const repository = getWhatsAppOfficialRepository();

    // Buscar conexões do usuário
    let connections = await repository.findByUserId(userId);

    // Aplicar filtros se fornecidos
    if (status) {
      connections = connections.filter(conn => conn.status === status);
    }

    if (healthStatus) {
      connections = connections.filter(conn => conn.health_status === healthStatus);
    }

    if (agentId) {
      connections = connections.filter(conn => conn.agent_id === agentId);
    }

    if (empresaId) {
      connections = connections.filter(conn => conn.empresa_id === empresaId);
    }

    // Incluir estatísticas se solicitado
    let enhancedConnections = connections;

    if (includeStats) {
      const monitoringService = getWhatsAppOfficialMonitoringService();
      
      enhancedConnections = await Promise.all(
        connections.map(async (connection) => {
          try {
            const statsResult = await monitoringService.getConnectionStats(connection.id);
            return {
              ...connection,
              stats: statsResult.success ? statsResult.data : null
            };
          } catch (error) {
            return {
              ...connection,
              stats: null
            };
          }
        })
      );
    }

    // Calcular resumo
    const summary = connections.reduce((acc, conn) => {
      acc.total++;
      acc.by_status[conn.status] = (acc.by_status[conn.status] || 0) + 1;
      acc.by_health[conn.health_status] = (acc.by_health[conn.health_status] || 0) + 1;
      
      if (conn.status === 'active') {
        acc.active++;
      }
      
      if (conn.health_status === 'healthy') {
        acc.healthy++;
      }
      
      return acc;
    }, {
      total: 0,
      active: 0,
      healthy: 0,
      by_status: {} as Record<string, number>,
      by_health: {} as Record<string, number>
    });

    console.log(`Found ${connections.length} connections for user ${userId}`);

    return NextResponse.json({
      success: true,
      data: {
        summary,
        connections: enhancedConnections.map(conn => ({
          id: conn.id,
          phone_number: conn.phone_number,
          phone_number_id: conn.phone_number_id,
          display_name: conn.display_name,
          status: conn.status,
          health_status: conn.health_status,
          verified_status: conn.verified_status,
          quality_rating: conn.quality_rating,
          webhook_verified: conn.webhook_verified,
          message_quota_limit: conn.message_quota_limit,
          message_quota_used: conn.message_quota_used,
          quota_reset_at: conn.quota_reset_at,
          total_messages_sent: conn.total_messages_sent,
          total_messages_received: conn.total_messages_received,
          last_message_sent_at: conn.last_message_sent_at,
          last_message_received_at: conn.last_message_received_at,
          last_webhook_received_at: conn.last_webhook_received_at,
          last_error_message: conn.last_error_message,
          error_count: conn.error_count,
          consecutive_errors: conn.consecutive_errors,
          created_at: conn.created_at,
          updated_at: conn.updated_at,
          token_expires_at: conn.token_expires_at,
          // Relacionamentos
          agente: conn.agente,
          empresa: conn.empresa,
          // Stats opcionais
          ...(includeStats && { stats: (conn as any).stats })
        }))
      }
    });

  } catch (error: any) {
    console.error('List connections error:', error);
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
 * POST /api/whatsapp/official/connections
 * Cria nova conexão (usado quando há múltiplas opções após OAuth2)
 */
export async function POST(request: NextRequest) {
  try {
    console.log('=== Create Official Connection Request ===');

    // Validação completa usando middleware compositor
    const connectionMiddleware = MiddlewareFactory.createConnectionMiddleware();
    const validationResult = await connectionMiddleware.validate(request);

    if (!validationResult.success) {
      console.log('Connection validation failed:', validationResult.error);
      return createErrorResponse(validationResult);
    }

    const { userId, ...connectionData } = validationResult.data;

    // Aplicar regras de negócio para criação de conexão
    const businessRulesMiddleware = createBusinessRulesMiddleware();
    const businessRulesResult = await businessRulesMiddleware.validateConnection({
      user_id: userId,
      connection_data: connectionData,
      metadata: {
        operation: 'create',
        timestamp: new Date().toISOString()
      }
    });

    if (!businessRulesResult.allowed) {
      console.log('Connection creation business rules validation failed:', businessRulesResult.errors);
      return NextResponse.json(
        {
          success: false,
          error: 'Connection validation failed',
          errorCode: 'CONNECTION_BUSINESS_RULES_VIOLATION',
          details: businessRulesResult.errors
        },
        { status: 400 }
      );
    }

    const repository = getWhatsAppOfficialRepository();

    // Verificar se já existe uma conexão para este phone_number_id
    const existingConnection = await repository.findByPhoneNumberId(connectionData.phoneNumberId);
    if (existingConnection) {
      return NextResponse.json(
        {
          success: false,
          error: 'Phone number already connected',
          errorCode: 'PHONE_ALREADY_CONNECTED',
          data: {
            existing_connection_id: existingConnection.id,
            existing_user_id: existingConnection.user_id
          }
        },
        { status: 409 }
      );
    }

    // Preparar dados para criação
    const createData = {
      user_id: userId,
      empresa_id: connectionData.empresaId,
      agent_id: connectionData.agentId,
      business_account_id: connectionData.businessAccountId,
      app_id: process.env.META_APP_ID!,
      app_secret: process.env.META_APP_SECRET!, // Will be encrypted in repository
      waba_id: connectionData.businessAccountId,
      phone_number_id: connectionData.phoneNumberId,
      phone_number: connectionData.phoneNumber,
      display_name: connectionData.instanceName,
      webhook_url: connectionData.webhookUrl,
      // Dados que serão obtidos via tokens (temporariamente vazios)
      access_token_encrypted: 'placeholder', // Will be updated when tokens are available
      verified_status: 'unverified',
      quality_rating: 'unknown'
    };

    // Criar conexão
    const connection = await repository.create(createData);

    console.log(`Created connection ${connection.id} for user ${userId}`);

    // Retornar dados da conexão (sem dados sensíveis)
    return NextResponse.json({
      success: true,
      data: {
        id: connection.id,
        phone_number: connection.phone_number,
        phone_number_id: connection.phone_number_id,
        display_name: connection.display_name,
        status: connection.status,
        webhook_url: connection.webhook_url,
        created_at: connection.created_at,
        message: 'Connection created successfully. Please complete OAuth2 flow.'
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('Create connection error:', error);
    
    if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Connection already exists',
          errorCode: 'DUPLICATE_CONNECTION'
        },
        { status: 409 }
      );
    }

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
 * DELETE /api/whatsapp/official/connections
 * Remove múltiplas conexões (operação em lote)
 */
export async function DELETE(request: NextRequest) {
  try {
    console.log('=== Bulk Delete Connections Request ===');

    // Validação de autenticação
    const authMiddleware = MiddlewareFactory.createAuthMiddleware();
    const authResult = await authMiddleware.validate(request);

    if (!authResult.success) {
      return createErrorResponse(authResult);
    }

    const { userId } = authResult.data;

    // Parse do body para obter IDs das conexões
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

    const { connectionIds, confirmDelete } = body;

    if (!Array.isArray(connectionIds) || connectionIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Connection IDs array is required',
          errorCode: 'MISSING_CONNECTION_IDS'
        },
        { status: 400 }
      );
    }

    if (!confirmDelete) {
      return NextResponse.json(
        {
          success: false,
          error: 'Delete confirmation required',
          errorCode: 'DELETE_NOT_CONFIRMED'
        },
        { status: 400 }
      );
    }

    const repository = getWhatsAppOfficialRepository();
    const results = {
      deleted: 0,
      failed: 0,
      details: [] as any[]
    };

    // Processar cada conexão
    for (const connectionId of connectionIds) {
      try {
        // Verificar se a conexão existe e pertence ao usuário
        const connection = await repository.findById(connectionId);
        
        if (!connection) {
          results.details.push({
            connection_id: connectionId,
            status: 'not_found',
            error: 'Connection not found'
          });
          results.failed++;
          continue;
        }

        if (connection.user_id !== userId) {
          results.details.push({
            connection_id: connectionId,
            status: 'access_denied',
            error: 'Access denied'
          });
          results.failed++;
          continue;
        }

        // Deletar conexão
        await repository.delete(connectionId);
        
        results.details.push({
          connection_id: connectionId,
          phone_number: connection.phone_number,
          status: 'deleted'
        });
        results.deleted++;

        console.log(`Deleted connection ${connectionId}`);

      } catch (error) {
        console.error(`Failed to delete connection ${connectionId}:`, error);
        
        results.details.push({
          connection_id: connectionId,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        results.failed++;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        message: `Bulk delete completed: ${results.deleted} deleted, ${results.failed} failed`,
        summary: {
          total: connectionIds.length,
          deleted: results.deleted,
          failed: results.failed
        },
        details: results.details
      }
    });

  } catch (error: any) {
    console.error('Bulk delete error:', error);
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