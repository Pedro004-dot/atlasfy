import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/services/auth.service';
import { metricsService } from '@/services/MetricsService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/dashboard/funnel
 * Specific endpoint for conversion funnel data
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

    // Extract parameters
    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get('empresa_id');
    const period = searchParams.get('period') || '24h';

    if (!empresaId) {
      return NextResponse.json(
        { success: false, message: 'empresa_id é obrigatório' },
        { status: 400 }
      );
    }

    // Create query and get funnel data
    const query = metricsService.createMetricsQuery(empresaId, period);
    
    const funnelData = await metricsService.getSpecificMetric(
      'conversion_funnel',
      query,
      () => metricsService['metricsRepository'].getConversionFunnelData(query)
    );

    return NextResponse.json({
      success: true,
      data: {
        funnel: funnelData,
        totalStages: funnelData.length,
        conversionRate: funnelData.length > 0 ? 
          (funnelData[funnelData.length - 1].count / funnelData[0].count) * 100 : 0
      },
      meta: {
        empresaId,
        period,
        requestedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[API Funnel] Erro ao buscar dados do funil:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      },
      { status: 500 }
    );
  }
}