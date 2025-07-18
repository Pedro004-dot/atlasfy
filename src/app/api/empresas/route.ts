import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { databaseService } from '@/lib/database';
import { userRepository } from '@/repositories/user.repository';

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

export async function GET(request: NextRequest) {
  try {
    // Validar token
    const authResult = await validateToken(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: 401 }
      );
    }

    const supabase = databaseService.getClient();

    // Buscar empresas do usuário
    const { data: empresas, error } = await supabase
      .from('empresa')
      .select(`
        *,
        usuario_empresa!inner(usuario_id)
      `)
      .eq('usuario_empresa.usuario_id', authResult.userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar empresas:', error);
      return NextResponse.json(
        { success: false, message: 'Erro ao carregar empresas' },
        { status: 500 }
      );
    }

    // Processar empresas para incluir contagens (mock por enquanto)
    const empresasComContadores = empresas.map(empresa => ({
      ...empresa,
      _count: {
        usuarios: 1, // Mock - implementar contagem real depois
        agentes: 0   // Mock - implementar contagem real depois
      }
    }));

    return NextResponse.json({
      success: true,
      data: empresasComContadores,
      message: 'Empresas carregadas com sucesso'
    });

  } catch (error: any) {
    console.error('Erro na API de empresas:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Validar token
    const authResult = await validateToken(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: 401 }
      );
    }

    // Verificar se o perfil do usuário está completo
    const user = await userRepository.findById(authResult.userId as string);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    if (!user.perfil_completo) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Perfil incompleto. Complete seu perfil para criar empresas.',
          code: 'PROFILE_INCOMPLETE',
          redirectTo: '/completar-perfil'
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { nome, cnpj, telefone, endereco, email, website, setor, descricao } = body;

    // Validação básica
    if (!nome || nome.trim().length < 2) {
      return NextResponse.json(
        { success: false, message: 'Nome da empresa é obrigatório' },
        { status: 400 }
      );
    }

    const supabase = databaseService.getClient();

    // Iniciar transação - criar empresa
    const { data: empresa, error: empresaError } = await supabase
      .from('empresa')
      .insert([{
        nome: nome.trim(),
        cnpj: cnpj?.trim() || null,
        telefone: telefone?.trim() || null,
        endereco: endereco?.trim() || null,
        email: email?.trim() || null,
        website: website?.trim() || null,
        setor: setor?.trim() || null,
        descricao: descricao?.trim() || null,
        ativo: true
      }])
      .select()
      .single();

    if (empresaError) {
      console.error('Erro ao criar empresa:', empresaError);
      return NextResponse.json(
        { success: false, message: 'Erro ao criar empresa' },
        { status: 500 }
      );
    }

    // Associar usuário à empresa
    const { error: associacaoError } = await supabase
      .from('usuario_empresa')
      .insert([{
        usuario_id: authResult.userId,
        empresa_id: empresa.id,
        papel: 'admin'
      }]);

    if (associacaoError) {
      console.error('Erro ao associar usuário à empresa:', associacaoError);
      // Tentar reverter a criação da empresa
      await supabase
        .from('empresa')
        .delete()
        .eq('id', empresa.id);
      
      return NextResponse.json(
        { success: false, message: 'Erro ao associar usuário à empresa' },
        { status: 500 }
      );
    }

    // Retornar empresa criada com contadores
    const empresaComContadores = {
      ...empresa,
      _count: {
        usuarios: 1,
        agentes: 0
      }
    };

    return NextResponse.json({
      success: true,
      empresa: empresaComContadores,
      message: 'Empresa criada com sucesso'
    });

  } catch (error: any) {
    console.error('Erro na criação de empresa:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}