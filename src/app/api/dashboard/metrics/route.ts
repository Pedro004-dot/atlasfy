import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/services/auth.service';
import { metricsService } from '@/services/MetricsService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/dashboard/metrics
 * Main endpoint for BI Dashboard metrics
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication
    const authorization = request.headers.get('authorization');
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Token de autorização não fornecido' },
        { status: 401 }
      );
    }

    const token = authorization.replace('Bearer ', '');
    const user = await authService.getCurrentUserByToken(token);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Usuário não autenticado' },
        { status: 401 }
      );
    }

    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get('empresa_id');
    const period = searchParams.get('period') || '24h';
    const refresh = searchParams.get('refresh') === 'true';

    console.log('[API Dashboard] Query params:', { empresaId, period, refresh });

    if (!empresaId) {
      return NextResponse.json(
        { success: false, message: 'empresa_id é obrigatório' },
        { status: 400 }
      );
    }

    // Verify user access to company
    console.log(`[API Dashboard] Verificando acesso: usuário ${user.id} à empresa ${empresaId}`);
    // TODO: Add company access verification logic here

    // Invalidate cache if refresh requested
    if (refresh) {
      await metricsService.invalidateCache(empresaId);
    }

    // Create metrics query
    const query = metricsService.createMetricsQuery(empresaId, period);
    console.log('[API Dashboard] Created query:', { 
      empresaId: query.empresaId, 
      period: query.dateRange.period,
      startDate: query.dateRange.startDate,
      endDate: query.dateRange.endDate
    });

    // Get dashboard metrics
    const startTime = Date.now();
    const metrics = await metricsService.getDashboardMetrics(query);
    const processingTime = Date.now() - startTime;

    console.log(`[API Dashboard] Métricas processadas em ${processingTime}ms para empresa ${empresaId}`);

    return NextResponse.json({
      success: true,
      data: metrics,
      meta: {
        empresaId,
        period,
        processingTime,
        cachedResponse: processingTime < 100, // Heuristic for cache hit
        lastUpdated: metrics.lastUpdated
      }
    });

  } catch (error) {
    console.error('[API Dashboard] Erro ao buscar métricas:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor',
        error: 'METRICS_FETCH_ERROR'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/dashboard/metrics
 * Endpoint for triggering metric calculations with custom filters
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication
    const authorization = request.headers.get('authorization');
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Token de autorização não fornecido' },
        { status: 401 }
      );
    }

    const token = authorization.replace('Bearer ', '');
    const user = await authService.getCurrentUserByToken(token);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Usuário não autenticado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { empresaId, period, filters } = body;

    if (!empresaId) {
      return NextResponse.json(
        { success: false, message: 'empresaId é obrigatório' },
        { status: 400 }
      );
    }

    // Create custom query with filters
    const query = metricsService.createMetricsQuery(empresaId, period || '24h', filters);

    // Get metrics with custom filters
    const metrics = await metricsService.getDashboardMetrics(query);

    return NextResponse.json({
      success: true,
      data: metrics,
      meta: {
        empresaId,
        period: period || '24h',
        filtersApplied: filters || {},
        lastUpdated: metrics.lastUpdated
      }
    });

  } catch (error) {
    console.error('[API Dashboard] Erro ao processar métricas customizadas:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor',
        error: 'CUSTOM_METRICS_ERROR'
      },
      { status: 500 }
    );
  }
}