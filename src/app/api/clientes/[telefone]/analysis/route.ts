import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/services/auth.service';
import { databaseService } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { telefone: string } }
) {
  try {
    // Autenticação
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

    // Parâmetros
    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get('empresa_id');
    const telefone = decodeURIComponent(params.telefone);
    
    console.log('Buscando análise para:', {
      telefone: telefone,
      empresaId: empresaId,
      telefoneOriginal: params.telefone
    });

    if (!empresaId) {
      return NextResponse.json(
        { success: false, message: 'empresa_id é obrigatório' },
        { status: 400 }
      );
    }

    if (!telefone) {
      return NextResponse.json(
        { success: false, message: 'Telefone é obrigatório' },
        { status: 400 }
      );
    }

    const supabase = databaseService.getClient();

    // Verificar se o usuário tem acesso à empresa
    const { data: userCompanyAccess, error: accessError } = await supabase
      .from('usuario_empresa')
      .select('id')
      .eq('usuario_id', user.id)
      .eq('empresa_id', empresaId)
      .eq('ativo', true)
      .single();

    if (accessError || !userCompanyAccess) {
      return NextResponse.json(
        { success: false, message: 'Usuário não tem acesso a esta empresa' },
        { status: 403 }
      );
    }

    // Buscar a conversa mais recente com análise para este telefone
    // Primeiro buscar as conversas para este telefone
    const { data: conversationsData, error: conversationsError } = await supabase
      .from('conversations')
      .select('id')
      .eq('empresa_id', empresaId)
      .eq('cliente_telefone', telefone)
      .order('last_message_at', { ascending: false });

    if (conversationsError) {
      console.error('Erro ao buscar conversações:', conversationsError);
      return NextResponse.json(
        { success: false, message: `Erro ao buscar conversações: ${conversationsError.message}` },
        { status: 500 }
      );
    }

    if (!conversationsData || conversationsData.length === 0) {
      console.log(`Nenhuma conversa encontrada para telefone: ${telefone} na empresa: ${empresaId}`);
      return NextResponse.json(
        { success: false, message: 'Nenhuma conversação encontrada para este cliente' },
        { status: 404 }
      );
    }
    
    console.log(`Encontradas ${conversationsData.length} conversas para o telefone ${telefone}`);

    // Buscar análise para as conversas encontradas (da mais recente para a mais antiga)
    const conversationIds = conversationsData.map(conv => conv.id);
    
    const { data: analysisData, error: analysisError } = await supabase
      .from('conversation_analysis')
      .select(`
        conversation_id,
        analysis_data,
        conversations!inner (
          id,
          cliente_telefone,
          status,
          created_at,
          last_message_at,
          message_count,
          empresa_id
        )
      `)
      .in('conversation_id', conversationIds)
      .not('analysis_data', 'is', null)
      .limit(1);

    if (analysisError) {
      console.error('Erro ao buscar análise:', analysisError);
      return NextResponse.json(
        { success: false, message: `Erro ao buscar análise de conversação: ${analysisError.message}` },
        { status: 500 }
      );
    }

    if (!analysisData || analysisData.length === 0) {
      console.log(`Nenhuma análise encontrada para telefone: ${telefone} nas conversas:`, conversationIds);
      return NextResponse.json(
        { success: false, message: 'Nenhuma análise de conversação encontrada para este cliente' },
        { status: 404 }
      );
    }

    console.log(`Análise encontrada para telefone: ${telefone}`, {
      analysisDataLength: analysisData.length,
      conversationId: analysisData[0]?.conversation_id
    });

    // Buscar dados do cliente para enriquecer a resposta
    const { data: clienteData, error: clienteError } = await supabase
      .from('cliente')
      .select('id, nome, telefone, empresa_id')
      .eq('empresa_id', empresaId)
      .eq('telefone', telefone)
      .single();

    const item = analysisData[0];
    const conversation = Array.isArray(item.conversations) ? item.conversations[0] : item.conversations;
    
    // Criar objeto ConversationAnalysis
    const conversationAnalysis = {
      conversation_id: conversation.id,
      cliente_telefone: conversation.cliente_telefone,
      cliente_nome: clienteData?.nome || 'Nome não informado',
      status: conversation.status,
      created_at: conversation.created_at,
      last_message_at: conversation.last_message_at,
      message_count: conversation.message_count,
      analysis_data: item.analysis_data
    };

    return NextResponse.json({
      success: true,
      conversation: conversationAnalysis
    });

  } catch (error) {
    console.error('Erro na API de análise do cliente:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      },
      { status: 500 }
    );
  }
}