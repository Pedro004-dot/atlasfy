import { NextRequest, NextResponse } from 'next/server';
import { getWhatsAppOfficialRepository } from '@/repositories/whatsapp-official.repository';
import { getWhatsAppOfficialMonitoringService } from '@/services/whatsapp-official-monitoring.service';
import { getWhatsAppOfficialAuthService } from '@/services/whatsapp-official-auth.service';
import { 
  MiddlewareFactory, 
  createErrorResponse 
} from '@/lib/middleware/whatsapp-validation.middleware';
import { createBusinessRulesMiddleware } from '@/lib/middleware/business-rules.middleware';
import { z } from 'zod';

// Força a rota a ser dinâmica
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Schema para validação de parâmetros
 */
const connectionParamsSchema = z.object({
  id: z.string().uuid('Invalid connection ID format')
});

const updateConnectionSchema = z.object({
  display_name: z.string().min(1).max(255).optional(),
  webhook_url: z.string().url().optional(),
  message_quota_limit: z.number().min(1).max(10000).optional(),
  agent_id: z.string().uuid().optional().nullable(),
  empresa_id: z.string().uuid().optional().nullable()
});

/**
 * GET /api/whatsapp/official/connections/[id]
 * Obtém detalhes de uma conexão específica
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('=== Get Connection Details Request ===');

    // Validação de autenticação
    const authMiddleware = MiddlewareFactory.createAuthMiddleware();
    const authResult = await authMiddleware.validate(request);

    if (!authResult.success) {
      console.log('Auth validation failed:', authResult.error);
      return createErrorResponse(authResult);
    }

    const { userId } = authResult.data;

    // Validação do parâmetro ID
    const paramValidation = connectionParamsSchema.safeParse(params);
    if (!paramValidation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid connection ID format',
          errorCode: 'INVALID_CONNECTION_ID'
        },
        { status: 400 }
      );
    }

    const { id: connectionId } = paramValidation.data;
    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get('includeStats') === 'true';
    const includeHealthCheck = searchParams.get('includeHealthCheck') === 'true';

    const repository = getWhatsAppOfficialRepository();

    // Buscar conexão
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

    // Aplicar regras de negócio para visualização da conexão
    const businessRulesMiddleware = createBusinessRulesMiddleware();
    const businessRulesResult = await businessRulesMiddleware.validateConnection({
      user_id: userId,
      connection_id: connectionId,
      connection_data: connection
    });

    if (!businessRulesResult.allowed) {
      console.log('Business rules validation failed:', businessRulesResult.errors);
      return NextResponse.json(
        {
          success: false,
          error: 'Business rules validation failed',
          errorCode: 'BUSINESS_RULES_VIOLATION',
          details: businessRulesResult.errors
        },
        { status: 403 }
      );
    }

    // Dados básicos da conexão (sem dados sensíveis)
    const connectionData = {
      id: connection.id,
      phone_number: connection.phone_number,
      phone_number_id: connection.phone_number_id,
      display_name: connection.display_name,
      status: connection.status,
      health_status: connection.health_status,
      verified_status: connection.verified_status,
      quality_rating: connection.quality_rating,
      webhook_url: connection.webhook_url,
      webhook_verified: connection.webhook_verified,
      message_quota_limit: connection.message_quota_limit,
      message_quota_used: connection.message_quota_used,
      quota_reset_at: connection.quota_reset_at,
      total_messages_sent: connection.total_messages_sent,
      total_messages_received: connection.total_messages_received,
      last_message_sent_at: connection.last_message_sent_at,
      last_message_received_at: connection.last_message_received_at,
      last_webhook_received_at: connection.last_webhook_received_at,
      last_error_message: connection.last_error_message,
      last_error_code: connection.last_error_code,
      error_count: connection.error_count,
      consecutive_errors: connection.consecutive_errors,
      token_expires_at: connection.token_expires_at,
      created_at: connection.created_at,
      updated_at: connection.updated_at,
      // Relacionamentos
      agente: connection.agente,
      empresa: connection.empresa,
      usuario: connection.usuario
    };

    const response: any = {
      success: true,
      data: {
        connection: connectionData
      }
    };

    // Incluir estatísticas se solicitado
    if (includeStats) {
      try {
        const monitoringService = getWhatsAppOfficialMonitoringService();
        const statsResult = await monitoringService.getConnectionStats(connectionId);
        response.data.stats = statsResult.success ? statsResult.data : null;
      } catch (error) {
        console.error('Failed to get connection stats:', error);
        response.data.stats = null;
      }
    }

    // Incluir health check se solicitado
    if (includeHealthCheck) {
      try {
        const monitoringService = getWhatsAppOfficialMonitoringService();
        const healthResult = await monitoringService.performHealthCheck(connectionId);
        response.data.health_check = healthResult.success ? healthResult.data : null;
      } catch (error) {
        console.error('Failed to perform health check:', error);
        response.data.health_check = null;
      }
    }

    console.log(`Retrieved connection details for ${connectionId}`);
    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Get connection details error:', error);
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
 * PUT /api/whatsapp/official/connections/[id]
 * Atualiza uma conexão específica
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('=== Update Connection Request ===');

    // Validação de autenticação
    const authMiddleware = MiddlewareFactory.createAuthMiddleware();
    const authResult = await authMiddleware.validate(request);

    if (!authResult.success) {
      return createErrorResponse(authResult);
    }

    const { userId } = authResult.data;

    // Validação do parâmetro ID
    const paramValidation = connectionParamsSchema.safeParse(params);
    if (!paramValidation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid connection ID format',
          errorCode: 'INVALID_CONNECTION_ID'
        },
        { status: 400 }
      );
    }

    const { id: connectionId } = paramValidation.data;

    // Parse e validação do body
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

    const validation = updateConnectionSchema.safeParse(body);
    if (!validation.success) {
      const errorMessage = validation.error.errors
        .map(e => `${e.path.join('.')}: ${e.message}`)
        .join(', ');

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          errorCode: 'VALIDATION_ERROR'
        },
        { status: 400 }
      );
    }

    const updateData = validation.data;
    const repository = getWhatsAppOfficialRepository();

    // Verificar se a conexão existe e pertence ao usuário
    const existingConnection = await repository.findById(connectionId);
    if (!existingConnection) {
      return NextResponse.json(
        {
          success: false,
          error: 'Connection not found',
          errorCode: 'CONNECTION_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    if (existingConnection.user_id !== userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied',
          errorCode: 'ACCESS_DENIED'
        },
        { status: 403 }
      );
    }

    // Atualizar conexão
    const updatedConnection = await repository.update(connectionId, updateData);

    console.log(`Updated connection ${connectionId}`);

    return NextResponse.json({
      success: true,
      data: {
        connection: {
          id: updatedConnection.id,
          phone_number: updatedConnection.phone_number,
          display_name: updatedConnection.display_name,
          status: updatedConnection.status,
          webhook_url: updatedConnection.webhook_url,
          message_quota_limit: updatedConnection.message_quota_limit,
          agent_id: updatedConnection.agent_id,
          empresa_id: updatedConnection.empresa_id,
          updated_at: updatedConnection.updated_at
        },
        message: 'Connection updated successfully'
      }
    });

  } catch (error: any) {
    console.error('Update connection error:', error);
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
 * DELETE /api/whatsapp/official/connections/[id]
 * Remove uma conexão específica
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('=== Delete Connection Request ===');

    // Validação de autenticação
    const authMiddleware = MiddlewareFactory.createAuthMiddleware();
    const authResult = await authMiddleware.validate(request);

    if (!authResult.success) {
      return createErrorResponse(authResult);
    }

    const { userId } = authResult.data;

    // Validação do parâmetro ID
    const paramValidation = connectionParamsSchema.safeParse(params);
    if (!paramValidation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid connection ID format',
          errorCode: 'INVALID_CONNECTION_ID'
        },
        { status: 400 }
      );
    }

    const { id: connectionId } = paramValidation.data;
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

    // Atualizar agente se conectado
    if (connection.agent_id) {
      try {
        // Desconectar do agente
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        await supabase
          .from('agente')
          .update({
            whatsapp_conectado: false,
            whatsapp_numero: null
          })
          .eq('id', connection.agent_id);

        console.log(`Disconnected agent ${connection.agent_id}`);
      } catch (error) {
        console.error('Failed to disconnect agent:', error);
        // Continue com a deleção mesmo se falhar
      }
    }

    // Deletar conexão
    await repository.delete(connectionId);

    console.log(`Deleted connection ${connectionId}`);

    return NextResponse.json({
      success: true,
      data: {
        connection_id: connectionId,
        phone_number: connection.phone_number,
        message: 'Connection deleted successfully'
      }
    });

  } catch (error: any) {
    console.error('Delete connection error:', error);
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
 * PATCH /api/whatsapp/official/connections/[id]
 * Operações específicas na conexão (refresh tokens, health check, etc.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('=== Connection Operation Request ===');

    // Validação de autenticação
    const authMiddleware = MiddlewareFactory.createAuthMiddleware();
    const authResult = await authMiddleware.validate(request);

    if (!authResult.success) {
      return createErrorResponse(authResult);
    }

    const { userId } = authResult.data;

    // Validação do parâmetro ID
    const paramValidation = connectionParamsSchema.safeParse(params);
    if (!paramValidation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid connection ID format',
          errorCode: 'INVALID_CONNECTION_ID'
        },
        { status: 400 }
      );
    }

    const { id: connectionId } = paramValidation.data;

    // Parse do body para obter operação
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

    const { operation } = body;

    if (!operation) {
      return NextResponse.json(
        {
          success: false,
          error: 'Operation is required',
          errorCode: 'MISSING_OPERATION'
        },
        { status: 400 }
      );
    }

    const repository = getWhatsAppOfficialRepository();

    // Verificar se a conexão existe e pertence ao usuário
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

    let operationResult;

    switch (operation) {
      case 'refresh_tokens':
        const authService = getWhatsAppOfficialAuthService();
        operationResult = await authService.refreshTokens(connectionId);
        break;

      case 'health_check':
        const monitoringService = getWhatsAppOfficialMonitoringService();
        operationResult = await monitoringService.performHealthCheck(connectionId);
        break;

      case 'reset_quota':
        await repository.resetDailyQuota(connectionId);
        operationResult = {
          success: true,
          data: { message: 'Daily quota reset successfully' }
        };
        break;

      case 'reset_errors':
        await repository.resetErrorCount(connectionId);
        operationResult = {
          success: true,
          data: { message: 'Error count reset successfully' }
        };
        break;

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid operation',
            errorCode: 'INVALID_OPERATION'
          },
          { status: 400 }
        );
    }

    console.log(`Performed operation '${operation}' on connection ${connectionId}`);

    return NextResponse.json({
      success: operationResult.success,
      data: {
        operation,
        connection_id: connectionId,
        result: operationResult.data,
        error: operationResult.error
      }
    });

  } catch (error: any) {
    console.error('Connection operation error:', error);
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