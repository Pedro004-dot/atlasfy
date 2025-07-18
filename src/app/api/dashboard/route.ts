import { NextRequest, NextResponse } from 'next/server';
import { dashboardService } from '@/services/dashboard.service';
import { authService } from '@/services/auth.service';

// Força a rota a ser dinâmica
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
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

    // Buscar dados do dashboard
    const dashboardData = await dashboardService.getDashboardData(user.id);

    return NextResponse.json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    console.error('Erro na API dashboard:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      },
      { status: 500 }
    );
  }
}