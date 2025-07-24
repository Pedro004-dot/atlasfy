import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { databaseService } from '@/lib/database';

const JWT_SECRET = process.env.JWT_SECRET!;

interface JWTPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

async function validateToken(request: NextRequest): Promise<{ success: boolean; userId?: string; error?: string }> {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { success: false, error: 'Token não fornecido' };
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    
    return { success: true, userId: decoded.userId };
  } catch (error) {
    return { success: false, error: 'Token inválido' };
  }
}

async function validateUserAccess(userId: string, empresaId: string): Promise<boolean> {
  try {
    const supabase = databaseService.getClient();
    
    const { data, error } = await supabase
      .from('usuario_empresa')
      .select('id')
      .eq('usuario_id', userId)
      .eq('empresa_id', empresaId)
      .single();

    return !error && !!data;
  } catch (error) {
    return false;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validar token
    const authResult = await validateToken(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: 401 }
      );
    }

    const empresaId = params.id;

    // Verificar se o usuário tem acesso à empresa
    const hasAccess = await validateUserAccess(authResult.userId!, empresaId);
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, message: 'Acesso negado à empresa' },
        { status: 403 }
      );
    }

    const supabase = databaseService.getClient();

    // Buscar empresa
    const { data: empresa, error } = await supabase
      .from('empresa')
      .select('*')
      .eq('id', empresaId)
      .single();

    if (error || !empresa) {
      return NextResponse.json(
        { success: false, message: 'Empresa não encontrada' },
        { status: 404 }
      );
    }

    // Adicionar contadores (mock por enquanto)
    const empresaComContadores = {
      ...empresa,
      _count: {
        usuarios: 1, // Mock - implementar contagem real depois
        agentes: 0   // Mock - implementar contagem real depois
      }
    };

    return NextResponse.json({
      success: true,
      data: empresaComContadores,
      message: 'Empresa carregada com sucesso'
    });

  } catch (error: any) {
    console.error('Erro ao buscar empresa:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validar token
    const authResult = await validateToken(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: 401 }
      );
    }

    const empresaId = params.id;

    // Verificar se o usuário tem acesso à empresa
    const hasAccess = await validateUserAccess(authResult.userId!, empresaId);
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, message: 'Acesso negado à empresa' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { nome, cnpj, telefone, endereco, email, website, setor, descricao, ativo, agent_type } = body;

    // Buscar empresa existente para determinar o tipo de agente
    const supabase = databaseService.getClient();
    
    const { data: empresaExistente, error: fetchError } = await supabase
      .from('empresa')
      .select('agent_type')
      .eq('id', empresaId)
      .single();

    if (fetchError || !empresaExistente) {
      return NextResponse.json(
        { success: false, message: 'Empresa não encontrada' },
        { status: 404 }
      );
    }

    const currentAgentType = empresaExistente.agent_type || 'vendas';

    // Validação básica
    if (!nome || nome.trim().length < 2) {
      return NextResponse.json(
        { success: false, message: 'Nome da empresa é obrigatório' },
        { status: 400 }
      );
    }

    // Validação específica para Sentinela: telefone obrigatório e formato correto
    if (currentAgentType === 'sentinela') {
      if (!telefone || telefone.trim().length === 0) {
        return NextResponse.json(
          { success: false, message: 'Telefone é obrigatório para agente Sentinela' },
          { status: 400 }
        );
      }
      
      const cleanPhone = telefone.replace(/\D/g, '');
      if (cleanPhone.length !== 13 || !cleanPhone.startsWith('55')) {
        return NextResponse.json(
          { success: false, message: 'Telefone deve ter 13 dígitos no formato 5531996997292' },
          { status: 400 }
        );
      }
    }

    // Preparar dados de atualização baseados no tipo de agente
    let updateData: any = {
      nome: nome.trim(),
      updated_at: new Date().toISOString()
    };

    if (currentAgentType === 'sentinela') {
      // Para Sentinela: apenas campos específicos podem ser alterados
      // CNPJ e número não podem ser alterados conforme solicitado
      updateData = {
        ...updateData,
        telefone: telefone?.replace(/\D/g, '') || null, // Garantir formato limpo
        descricao: descricao?.trim() || null,
        ativo: ativo !== undefined ? ativo : true,
      };
    } else {
      // Para Vendas: todos os campos podem ser alterados
      updateData = {
        ...updateData,
        cnpj: cnpj?.trim() || null,
        telefone: telefone?.replace(/\D/g, '') || null, // Garantir formato limpo  
        endereco: endereco?.trim() || null,
        email: email?.trim() || null,
        website: website?.trim() || null,
        setor: setor?.trim() || null,
        descricao: descricao?.trim() || null,
        ativo: ativo !== undefined ? ativo : true,
      };
    }

    // Atualizar empresa
    const { data: empresa, error } = await supabase
      .from('empresa')
      .update(updateData)
      .eq('id', empresaId)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar empresa:', error);
      return NextResponse.json(
        { success: false, message: 'Erro ao atualizar empresa' },
        { status: 500 }
      );
    }

    // Retornar empresa atualizada com contadores
    const empresaComContadores = {
      ...empresa,
      _count: {
        usuarios: 1, // Mock - implementar contagem real depois
        agentes: 0   // Mock - implementar contagem real depois
      }
    };

    return NextResponse.json({
      success: true,
      empresa: empresaComContadores,
      message: 'Empresa atualizada com sucesso'
    });

  } catch (error: any) {
    console.error('Erro na atualização de empresa:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validar token
    const authResult = await validateToken(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: 401 }
      );
    }

    const empresaId = params.id;

    // Verificar se o usuário tem acesso à empresa
    const hasAccess = await validateUserAccess(authResult.userId!, empresaId);
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, message: 'Acesso negado à empresa' },
        { status: 403 }
      );
    }

    const supabase = databaseService.getClient();

    // Deleção em cascade manual
    // 1. Remover conversas relacionadas
    const { error: conversationsError } = await supabase
      .from('conversations')
      .delete()
      .eq('empresa_id', empresaId);
    if (conversationsError) {
      console.error('Erro ao remover conversas:', conversationsError);
      return NextResponse.json(
        { success: false, message: 'Erro ao remover conversas da empresa' },
        { status: 500 }
      );
    }

    // 2. Remover agentes relacionados
    const { error: agentesError } = await supabase
      .from('agente')
      .delete()
      .eq('empresa_id', empresaId);
    if (agentesError) {
      console.error('Erro ao remover agentes:', agentesError);
      return NextResponse.json(
        { success: false, message: 'Erro ao remover agentes da empresa' },
        { status: 500 }
      );
    }

    // 3. Remover clientes relacionados
    const { error: clientesError } = await supabase
      .from('cliente')
      .delete()
      .eq('empresa_id', empresaId);
    if (clientesError) {
      console.error('Erro ao remover clientes:', clientesError);
      return NextResponse.json(
        { success: false, message: 'Erro ao remover clientes da empresa' },
        { status: 500 }
      );
    }

    // 4. Remover associações usuario_empresa
    const { error: associacaoError } = await supabase
      .from('usuario_empresa')
      .delete()
      .eq('empresa_id', empresaId);
    if (associacaoError) {
      console.error('Erro ao remover associações:', associacaoError);
      return NextResponse.json(
        { success: false, message: 'Erro ao remover associações da empresa' },
        { status: 500 }
      );
    }

    // 5. Remover empresa
    const { error: empresaError } = await supabase
      .from('empresa')
      .delete()
      .eq('id', empresaId);
    if (empresaError) {
      console.error('Erro ao excluir empresa:', empresaError);
      return NextResponse.json(
        { success: false, message: 'Erro ao excluir empresa' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Empresa excluída com sucesso (cascade manual)'
    });

  } catch (error: any) {
    console.error('Erro na exclusão de empresa:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}