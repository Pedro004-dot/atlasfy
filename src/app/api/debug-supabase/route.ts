import { NextRequest, NextResponse } from 'next/server';
import { databaseService } from '@/lib/database';

// Força a rota a ser dinâmica
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    console.log('=== SUPABASE CONNECTION DEBUG ===');
    
    const supabase = databaseService.getClient();
    
    // Teste 1: Verificar se consegue conectar
    console.log('1. Testando conexão com Supabase...');
    
    // Teste 2: Tentar buscar todos os usuários
    console.log('2. Buscando todos os usuários...');
    const { data: users, error: usersError } = await supabase
      .from('usuario')
      .select('id, nome, email, email_verificado, ativo, created_at')
      .limit(5);
    
    if (usersError) {
      console.error('Erro ao buscar usuários:', usersError);
      return NextResponse.json({
        success: false,
        message: 'Erro ao conectar com Supabase',
        error: usersError.message
      }, { status: 500 });
    }
    
    console.log('3. Usuários encontrados:', users?.length || 0);
    
    // Teste 3: Verificar estrutura da tabela
    console.log('4. Verificando estrutura da tabela...');
    const { data: tableInfo, error: tableError } = await supabase
      .from('usuario')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.error('Erro ao verificar estrutura:', tableError);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Debug de conexão Supabase',
      data: {
        connection: 'OK',
        usersFound: users?.length || 0,
        users: users?.map(user => ({
          id: user.id,
          nome: user.nome,
          email: user.email,
          email_verificado: user.email_verificado,
          ativo: user.ativo,
          created_at: user.created_at
        })),
        tableStructure: tableInfo ? Object.keys(tableInfo[0] || {}) : 'Error'
      }
    });
    
  } catch (error) {
    console.error('Erro no debug Supabase:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 