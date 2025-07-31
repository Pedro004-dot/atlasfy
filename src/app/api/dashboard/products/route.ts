import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/services/auth.service';
import { metricsService } from '@/services/MetricsService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/dashboard/products
 * Endpoint for product efficiency and top products data
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
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!empresaId) {
      return NextResponse.json(
        { success: false, message: 'empresa_id é obrigatório' },
        { status: 400 }
      );
    }

    // Create query
    const query = metricsService.createMetricsQuery(empresaId, period);
    
    // Get both product efficiency and top products in parallel
    const [productEfficiency, topProducts] = await Promise.all([
      metricsService.getSpecificMetric(
        'product_efficiency',
        query,
        () => metricsService['metricsRepository'].getProductEfficiency(query)
      ),
      metricsService.getSpecificMetric(
        'top_products',
        query,
        () => metricsService['metricsRepository'].getTopProducts(query)
      )
    ]);

    // Limit results if requested
    const limitedEfficiency = productEfficiency.slice(0, limit);
    const limitedTopProducts = topProducts.slice(0, limit);

    // Calculate insights
    const totalRevenue = productEfficiency.reduce((sum, product) => sum + product.totalRevenue, 0);
    const bestPerformer = productEfficiency[0];
    const averageEfficiency = productEfficiency.length > 0 ?
      productEfficiency.reduce((sum, product) => sum + product.efficiency, 0) / productEfficiency.length : 0;

    return NextResponse.json({
      success: true,
      data: {
        efficiency: limitedEfficiency,
        topProducts: limitedTopProducts,
        insights: {
          totalRevenue,
          bestPerformer: bestPerformer ? {
            name: bestPerformer.productName,
            efficiency: bestPerformer.efficiency,
            conversionRate: bestPerformer.conversionRate
          } : null,
          averageEfficiency: Math.round(averageEfficiency),
          totalProducts: productEfficiency.length
        }
      },
      meta: {
        empresaId,
        period,
        limit,
        totalFound: productEfficiency.length,
        requestedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[API Products] Erro ao buscar dados de produtos:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      },
      { status: 500 }
    );
  }
}