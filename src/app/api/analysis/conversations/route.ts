import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/services/auth.service';
import { databaseService } from '@/lib/database';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
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
    const period = searchParams.get('period') || '24h';

    if (!empresaId) {
      return NextResponse.json(
        { success: false, message: 'empresa_id é obrigatório' },
        { status: 400 }
      );
    }

    const supabase = databaseService.getClient();

    // Verificar se o usuário tem acesso à empresa solicitada
    console.log(`[API Analysis] Verificando acesso: usuário ${user.id} à empresa ${empresaId}`);
    const { data: userCompanyAccess, error: accessError } = await supabase
      .from('usuario_empresa')
      .select('id')
      .eq('usuario_id', user.id)
      .eq('empresa_id', empresaId)
      .eq('ativo', true)
      .single();

    if (accessError || !userCompanyAccess) {
      console.log(`[API Analysis] Acesso negado:`, accessError);
      return NextResponse.json(
        { success: false, message: 'Usuário não tem acesso a esta empresa' },
        { status: 403 }
      );
    }
    console.log(`[API Analysis] Acesso aprovado para usuário ${user.id}`);;

    // Calcular filtro de data baseado no período
    let dateFilter = '';
    let dateFilterSuperbase = '';
    const now = new Date();
    
    switch (period) {
      case '6h':
        const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        dateFilter = `AND c.created_at >= '${sixHoursAgo.toISOString()}'`;
        dateFilterSuperbase = sixHoursAgo.toISOString();
        break;
      case '24h':
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        dateFilter = `AND c.created_at >= '${oneDayAgo.toISOString()}'`;
        dateFilterSuperbase = oneDayAgo.toISOString();
        break;
      case '7d':
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFilter = `AND c.created_at >= '${sevenDaysAgo.toISOString()}'`;
        dateFilterSuperbase = sevenDaysAgo.toISOString();
        break;
      case '30d':
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateFilter = `AND c.created_at >= '${thirtyDaysAgo.toISOString()}'`;
        dateFilterSuperbase = thirtyDaysAgo.toISOString();
        break;
      case 'all':
        // Sem filtro de data
        dateFilter = '';
        dateFilterSuperbase = '';
        break;
    }

    // Buscar conversas com análises
    const { data: conversations, error: conversationsError } = await supabase
      .rpc('get_conversations_with_analysis', {
        p_empresa_id: empresaId,
        p_date_filter: dateFilter
      });

    if (conversationsError) {
      console.error('Erro ao buscar conversas:', conversationsError);
      
      // Fallback: buscar diretamente da conversation_analysis e fazer JOIN manual
      let analysisQuery = supabase
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
        .eq('conversations.empresa_id', empresaId)
        .not('analysis_data', 'is', null);
      
      // Aplicar filtro de data apenas se não for 'all'
      if (dateFilterSuperbase) {
        analysisQuery = analysisQuery.gte('conversations.created_at', dateFilterSuperbase);
      }
      
      const { data: fallbackData, error: fallbackError } = await analysisQuery;

      if (fallbackError) {
        console.error('Fallback query error:', fallbackError);
        throw new Error(`Erro ao buscar conversas: ${fallbackError.message}`);
      }

      console.log(`[API Analysis] Aplicando filtro '${period}' - dateFilter: ${dateFilterSuperbase || 'SEM FILTRO'}`);
      console.log(`[API Analysis] Total conversas encontradas: ${fallbackData?.length || 0}`);
      console.log('Fallback data sample:', fallbackData?.slice(0, 2));

      // Buscar dados dos clientes para fazer o join manual
      const phoneSet = new Set(fallbackData?.map(item => {
        const conversation = Array.isArray(item.conversations) ? item.conversations[0] : item.conversations;
        return conversation.cliente_telefone;
      }));
      const uniquePhones = Array.from(phoneSet);

      const { data: clientesData, error: clientesError } = await supabase
        .from('cliente')
        .select('id, nome, telefone, empresa_id')
        .eq('empresa_id', empresaId)
        .in('telefone', uniquePhones);

      if (clientesError) {
        console.error('Erro ao buscar clientes:', clientesError);
      }

      // Criar um mapa de telefone -> cliente para lookup rápido
      const clienteMap = new Map();
      clientesData?.forEach(cliente => {
        clienteMap.set(cliente.telefone, cliente);
      });

      const processedConversations = fallbackData?.map(item => {
        // Agora vamos da conversation_analysis para conversations
        const conversation = Array.isArray(item.conversations) ? item.conversations[0] : item.conversations;
        const cliente = clienteMap.get(conversation.cliente_telefone);
        
        return {
          conversation_id: conversation.id, 
          cliente_telefone: conversation.cliente_telefone,
          cliente_nome: cliente?.nome || 'Nome não informado',
          status: conversation.status,
          created_at: conversation.created_at,
          last_message_at: conversation.last_message_at,
          message_count: conversation.message_count,
          analysis_data: item.analysis_data
        };
      }) || [];

      // Sort by last_message_at or created_at descending
      processedConversations.sort((a, b) => {
        const dateA = new Date(a.last_message_at || a.created_at).getTime();
        const dateB = new Date(b.last_message_at || b.created_at).getTime();
        return dateB - dateA; // Most recent first
      });

      console.log('Processed conversations sample:', processedConversations?.slice(0, 2));

      // Calcular métricas
      const metrics = calculateMetrics(processedConversations);

      return NextResponse.json({
        success: true,
        conversations: processedConversations,
        metrics,
        period
      });
    }

    // Processar dados das conversas (caso a RPC funcione no futuro)
    const processedConversations = conversations?.map((conv: any) => ({
      ...conv,
      cliente_nome: conv.cliente_nome || 'Nome não informado'
    })) || [];
    
    // Calcular métricas agregadas
    const metrics = calculateMetrics(processedConversations);

    return NextResponse.json({
      success: true,
      conversations: processedConversations,
      metrics,
      period
    });

  } catch (error) {
    console.error('Erro na API de análise:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      },
      { status: 500 }
    );
  }
}

function calculateMetrics(conversations: any[]) {
  if (!conversations.length) {
    return {
      totalConversations: 0,
      avgConversionRate: 0,
      totalRevenue: 0,
      avgTicket: 0,
      avgResponseTime: 0,
      alertsByPriority: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      }
    };
  }

  let totalConversionScore = 0;
  let totalRevenue = 0;
  let totalTicketValues = 0;
  let validTicketCount = 0;
  let totalResponseTime = 0;
  let validResponseCount = 0;
  let alertCounts = { critical: 0, high: 0, medium: 0, low: 0 };

  conversations.forEach(conv => {
    const analysis = conv.analysis_data;
    
    if (analysis) {
      // Taxa de conversão
      if (typeof analysis.purchase_intent?.score === 'number') {
        totalConversionScore += analysis.purchase_intent.score;
      }

      // Receita estimada - tratar diferentes formatos de resposta da IA
      const ticketValue = analysis.sales_prediction?.estimated_ticket_value;
      if (ticketValue && ticketValue !== 'N/A' && ticketValue !== 'não_aplicável' && 
          ticketValue !== 'Não especificado na conversa' && ticketValue !== '[Não especificado na conversa]' &&
          ticketValue !== 'INDEFINIDO' && ticketValue !== 'Não informado' && ticketValue !== 'indefinido' && 
          ticketValue !== 'Inválido') {
        
        let numericValue = 0;
        if (typeof ticketValue === 'string') {
          // Parsing simples e eficaz: extrair todos os números e pegar o maior
          const matches = ticketValue.match(/\d+/g);
          if (matches && matches.length > 0) {
            const valores = matches.map(match => parseFloat(match)).filter(v => !isNaN(v) && v > 0);
            numericValue = valores.length > 0 ? Math.max(...valores) : 0;
          }
        } else if (typeof ticketValue === 'number') {
          numericValue = ticketValue;
        }
        
        // Validação de segurança para evitar valores absurdos
        if (!isNaN(numericValue) && numericValue > 0 && numericValue <= 500000) {
          totalRevenue += numericValue;
          totalTicketValues += numericValue;
          validTicketCount++;
        } else if (numericValue > 500000) {
          console.warn(`[VALOR SUSPEITO IGNORADO] ${numericValue} de: "${ticketValue}"`);
        }
      }

      // Tempo de resposta
      const responseTime = analysis.conversation_metrics?.response_time_avg_minutes;
      if (typeof responseTime === 'number' && !isNaN(responseTime)) {
        totalResponseTime += responseTime;
        validResponseCount++;
      }

      // Alertas - mapear diferentes formatos de severidade da IA
      analysis.alerts?.forEach((alert: any) => {
        const severity = alert.severity?.toLowerCase();
        
        if (severity === 'crítico' || severity === 'critical') {
          alertCounts.critical++;
        } else if (severity === 'alto' || severity === 'high' || severity === 'alta') {
          alertCounts.high++;
        } else if (severity === 'médio' || severity === 'medium' || severity === 'media' || 
                   severity === 'moderado' || severity === 'moderate' || severity === 'moderada') {
          alertCounts.medium++;
        } else if (severity === 'baixo' || severity === 'low' || severity === 'menor' || 
                   severity === 'normal' || severity === 'baixa') {
          alertCounts.low++;
        } else {
          // Alertas sem severidade definida ou outros
          alertCounts.low++;
        }
      });
    }
  });

  return {
    totalConversations: conversations.length,
    avgConversionRate: conversations.length > 0 ? (totalConversionScore / conversations.length) * 100 : 0,
    totalRevenue,
    avgTicket: validTicketCount > 0 ? totalTicketValues / validTicketCount : 0,
    avgResponseTime: validResponseCount > 0 ? totalResponseTime / validResponseCount : 0,
    alertsByPriority: alertCounts
  };
}