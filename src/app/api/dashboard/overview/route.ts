import { NextRequest, NextResponse } from 'next/server';
import { dashboardService } from '@/services/dashboard.service';
import { authService } from '@/services/auth.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization');
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, message: 'Token de autorização não fornecido' }, { status: 401 });
    }
    const token = authorization.replace('Bearer ', '');
    const user = await authService.getCurrentUserByToken(token);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Usuário não autenticado' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get('empresa_id');
    const period = searchParams.get('period') || '24h';
    
    if (!empresaId) {
      return NextResponse.json({ success: false, message: 'empresa_id é obrigatório' }, { status: 400 });
    }
    
    const overview = await dashboardService.getOverview(empresaId, period);
    return NextResponse.json({ success: true, data: overview });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 