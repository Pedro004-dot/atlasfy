import { NextRequest, NextResponse } from 'next/server';
import { dashboardService } from '@/services/dashboard.service';
import { authService } from '@/services/auth.service';
import { databaseService } from '@/lib/database';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const authorization = request.headers.get('authorization');
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, message: 'Token de autorização não fornecido' }, { status: 401 });
    }
    
    const token = authorization.replace('Bearer ', '');
    const user = await authService.getCurrentUserByToken(token);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Usuário não autenticado' }, { status: 401 });
    }

    // Buscar empresas do usuário
    const supabase = databaseService.getClient();
    const { data: empresasUsuario, error } = await supabase
      .from('usuario_empresa')
      .select(`
        empresa:empresa_id (
          id,
          nome
        )
      `)
      .eq('usuario_id', user.id)
      .eq('ativo', true);

    if (error) {
      throw new Error(`Erro ao buscar empresas: ${error.message}`);
    }

    // Extrair dados das empresas
    const empresas = empresasUsuario?.map(item => ({
      id: (item.empresa as any)?.id,
      nome: (item.empresa as any)?.nome
    })).filter(empresa => empresa.id && empresa.nome) || [];

    return NextResponse.json({ 
      success: true, 
      data: empresas
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}