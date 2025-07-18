import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth';

// Força a rota a ser dinâmica
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const authorization = request.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token não fornecido' },
        { status: 401 }
      );
    }

    const token = authorization.split(' ')[1];
    const { userId } = await verifyJWT(token);

    // Conectar ao Supabase
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Buscar conexões do usuário
    const { data: connections, error } = await supabase
      .from('whatsapp_connections')
      .select(`
        id,
        instance_name,
        evolution_instance_id,
        evolution_hash,
        status,
        phone_number,
        qr_code,
        created_at,
        last_updated,
        expires_at,
        agent_id,
        evolution_instance_data
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase Error:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar conexões' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: connections || []
    });

  } catch (error: any) {
    console.error('Error fetching connections:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 