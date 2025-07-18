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
    const { nome, cnpj, telefone, endereco, email, website, setor, descricao, ativo } = body;

    // Validação básica
    if (!nome || nome.trim().length < 2) {
      return NextResponse.json(
        { success: false, message: 'Nome da empresa é obrigatório' },
        { status: 400 }
      );
    }

    const supabase = databaseService.getClient();

    // Atualizar empresa
    const { data: empresa, error } = await supabase
      .from('empresa')
      .update({
        nome: nome.trim(),
        cnpj: cnpj?.trim() || null,
        telefone: telefone?.trim() || null,
        endereco: endereco?.trim() || null,
        email: email?.trim() || null,
        website: website?.trim() || null,
        setor: setor?.trim() || null,
        descricao: descricao?.trim() || null,
        ativo: ativo !== undefined ? ativo : true,
        updated_at: new Date().toISOString()
      })
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

    // Verificar se há dependências (agentes, clientes, etc.)
    // Por enquanto, vamos permitir a exclusão direta
    // TODO: Implementar verificação de dependências

    // Remover associações usuario_empresa primeiro
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

    // Remover empresa
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
      message: 'Empresa excluída com sucesso'
    });

  } catch (error: any) {
    console.error('Erro na exclusão de empresa:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}