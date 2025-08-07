import { NextRequest, NextResponse } from 'next/server';
import { getWhatsAppOfficialAuthService } from '@/services/whatsapp-official-auth.service';
import { getWhatsAppOfficialRepository } from '@/repositories/whatsapp-official.repository';
import { 
  MiddlewareFactory, 
  createErrorResponse 
} from '@/lib/middleware/whatsapp-validation.middleware';

// Força a rota a ser dinâmica
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/whatsapp/official/auth/verify-tokens
 * Verifica e renova tokens expirados/próximos do vencimento
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('=== Token Verification Request ===');

    // Validação de autenticação
    const authMiddleware = MiddlewareFactory.createAuthMiddleware();
    const authResult = await authMiddleware.validate(request);

    if (!authResult.success) {
      console.log('Auth validation failed:', authResult.error);
      return createErrorResponse(authResult);
    }

    const { userId } = authResult.data;

    // Parse opcional do body para parâmetros específicos
    let body = {};
    try {
      body = await request.json();
    } catch (error) {
      // Body opcional para esta rota
      body = {};
    }

    const { connectionId, forceRefresh = false } = body as any;

    const repository = getWhatsAppOfficialRepository();
    const authService = getWhatsAppOfficialAuthService();

    let connectionsToCheck: any[] = [];

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

      // Verificar se a conexão pertence ao usuário
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

      connectionsToCheck = [connection];
    } else {
      // Verificar todas as conexões do usuário
      connectionsToCheck = await repository.findByUserId(userId);
    }

    if (connectionsToCheck.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          message: 'No connections to verify',
          verified: 0,
          refreshed: 0
        }
      });
    }

    console.log(`Verifying tokens for ${connectionsToCheck.length} connections`);

    const results = {
      verified: 0,
      refreshed: 0,
      failed: 0,
      details: [] as any[]
    };

    // Processar cada conexão
    for (const connection of connectionsToCheck) {
      try {
        const connectionResult = {
          connection_id: connection.id,
          phone_number: connection.phone_number,
          status: connection.status,
          action: 'none' as 'none' | 'verified' | 'refreshed' | 'failed',
          error: null as string | null
        };

        // Verificar se token precisa de renovação
        const tokenExpiresAt = new Date(connection.token_expires_at);
        const now = new Date();
        const hoursUntilExpiry = (tokenExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);

        const needsRefresh = forceRefresh || 
          hoursUntilExpiry < 168 || // Menos de 7 dias
          tokenExpiresAt <= now; // Já expirado

        if (needsRefresh) {
          console.log(`Refreshing tokens for connection ${connection.id} (expires in ${Math.round(hoursUntilExpiry)} hours)`);
          
          const refreshResult = await authService.refreshTokens(connection.id);
          
          if (refreshResult.success) {
            connectionResult.action = 'refreshed';
            results.refreshed++;
            console.log(`Successfully refreshed tokens for connection ${connection.id}`);
          } else {
            connectionResult.action = 'failed';
            connectionResult.error = refreshResult.error || 'Unknown error';
            results.failed++;
            console.error(`Failed to refresh tokens for connection ${connection.id}:`, refreshResult.error);

            // Atualizar status da conexão para error se refresh falhou
            await repository.updateStatus(connection.id, 'error', refreshResult.error);
          }
        } else {
          connectionResult.action = 'verified';
          results.verified++;
          console.log(`Connection ${connection.id} tokens are still valid (expires in ${Math.round(hoursUntilExpiry)} hours)`);
        }

        results.details.push(connectionResult);

      } catch (error) {
        console.error(`Error processing connection ${connection.id}:`, error);
        
        results.details.push({
          connection_id: connection.id,
          phone_number: connection.phone_number,
          status: connection.status,
          action: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        results.failed++;
      }
    }

    const duration = Date.now() - startTime;
    console.log(`Token verification completed in ${duration}ms - ${results.verified} verified, ${results.refreshed} refreshed, ${results.failed} failed`);

    return NextResponse.json({
      success: true,
      data: {
        message: 'Token verification completed',
        summary: {
          total: connectionsToCheck.length,
          verified: results.verified,
          refreshed: results.refreshed,
          failed: results.failed
        },
        details: results.details,
        duration_ms: duration
      }
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`Token verification error after ${duration}ms:`, error);

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
 * GET /api/whatsapp/official/auth/verify-tokens
 * Retorna status dos tokens para as conexões do usuário
 */
export async function GET(request: NextRequest) {
  try {
    console.log('=== Token Status Request ===');

    // Validação de autenticação
    const authMiddleware = MiddlewareFactory.createAuthMiddleware();
    const authResult = await authMiddleware.validate(request);

    if (!authResult.success) {
      return createErrorResponse(authResult);
    }

    const { userId } = authResult.data;
    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');

    const repository = getWhatsAppOfficialRepository();
    let connections: any[] = [];

    if (connectionId) {
      const connection = await repository.findById(connectionId);
      if (connection && connection.user_id === userId) {
        connections = [connection];
      }
    } else {
      connections = await repository.findByUserId(userId);
    }

    // Calcular status dos tokens
    const tokenStatus = connections.map(connection => {
      const tokenExpiresAt = new Date(connection.token_expires_at);
      const now = new Date();
      const hoursUntilExpiry = (tokenExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);

      let tokenHealth: 'healthy' | 'warning' | 'expired' | 'unknown' = 'unknown';
      
      if (tokenExpiresAt <= now) {
        tokenHealth = 'expired';
      } else if (hoursUntilExpiry < 168) { // Menos de 7 dias
        tokenHealth = 'warning';
      } else if (hoursUntilExpiry > 168) {
        tokenHealth = 'healthy';
      }

      return {
        connection_id: connection.id,
        phone_number: connection.phone_number,
        display_name: connection.display_name,
        status: connection.status,
        token_health: tokenHealth,
        token_expires_at: connection.token_expires_at,
        hours_until_expiry: Math.round(hoursUntilExpiry),
        needs_refresh: hoursUntilExpiry < 168,
        last_error: connection.last_error_message
      };
    });

    // Sumarizar status
    const summary = tokenStatus.reduce((acc, token) => {
      acc.total++;
      acc.by_health[token.token_health] = (acc.by_health[token.token_health] || 0) + 1;
      
      if (token.needs_refresh) {
        acc.needs_refresh++;
      }
      
      return acc;
    }, {
      total: 0,
      needs_refresh: 0,
      by_health: {} as Record<string, number>
    });

    return NextResponse.json({
      success: true,
      data: {
        summary,
        connections: tokenStatus
      }
    });

  } catch (error: any) {
    console.error('Token status error:', error);
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