import { NextRequest, NextResponse } from 'next/server';
import { metricsService } from '@/services/MetricsService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/dashboard/health
 * Health check endpoint for dashboard services
 */
export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now();
    
    // Check all service health
    const health = await metricsService.healthCheck();
    const cacheStats = await metricsService.getCacheStats();
    
    const responseTime = Date.now() - startTime;
    const isHealthy = health.repository && health.cache;

    return NextResponse.json({
      success: true,
      status: isHealthy ? 'healthy' : 'degraded',
      data: {
        services: {
          repository: health.repository ? 'up' : 'down',
          cache: health.cache ? 'up' : 'down'
        },
        performance: {
          responseTime: `${responseTime}ms`,
          cacheStats
        },
        timestamp: new Date().toISOString()
      }
    }, { 
      status: isHealthy ? 200 : 503 
    });

  } catch (error) {
    console.error('[API Health] Erro no health check:', error);
    return NextResponse.json(
      {
        success: false,
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Erro interno do servidor',
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}