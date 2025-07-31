import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/services/auth.service';
import { metricsService } from '@/services/MetricsService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/dashboard/lost-leads
 * Endpoint for lost leads analysis
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
    const includeRecoverable = searchParams.get('include_recoverable') === 'true';

    if (!empresaId) {
      return NextResponse.json(
        { success: false, message: 'empresa_id é obrigatório' },
        { status: 400 }
      );
    }

    // Create query and get lost leads data
    const query = metricsService.createMetricsQuery(empresaId, period);
    
    const lostLeadsData = await metricsService.getSpecificMetric(
      'lost_leads',
      query,
      () => metricsService['metricsRepository'].getLostLeadsAnalysis(query)
    );

    // Filter recoverable leads if requested
    let recoverableLeads: any[] = [];
    if (includeRecoverable) {
      recoverableLeads = lostLeadsData.lostByStage.filter(stage => 
        stage.recoveryPotential === 'high'
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...lostLeadsData,
        recoverableLeads: includeRecoverable ? recoverableLeads : undefined,
        insights: {
          topLossReason: lostLeadsData.lostByReason[0]?.reason || 'N/A',
          averageLossValue: lostLeadsData.lostByReason.length > 0 ?
            lostLeadsData.lostByReason.reduce((sum, reason) => 
              sum + reason.avgTicketValue, 0) / lostLeadsData.lostByReason.length : 0,
          criticalStage: lostLeadsData.lostByStage.sort((a, b) => b.count - a.count)[0]?.stage || 'N/A'
        }
      },
      meta: {
        empresaId,
        period,
        includeRecoverable,
        requestedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[API Lost Leads] Erro ao buscar leads perdidos:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      },
      { status: 500 }
    );
  }
}