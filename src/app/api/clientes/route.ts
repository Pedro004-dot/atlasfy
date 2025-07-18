import { NextRequest, NextResponse } from 'next/server';
import { clienteService } from '@/services/cliente.service';
import { authService } from '@/services/auth.service';
import { dashboardService } from '@/services/dashboard.service';

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

    // Buscar empresas do usuário
    const empresas = await dashboardService.getEmpresasByUsuario(user.id);
    
    if (empresas.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Usuário não possui empresas ativas' },
        { status: 403 }
      );
    }

    // Para este exemplo, vamos usar a primeira empresa
    // Em uma implementação real, você pode permitir que o usuário escolha a empresa
    const empresaId = empresas[0];

    // Extrair parâmetros de query
    const { searchParams } = new URL(request.url);
    const nome = searchParams.get('nome') || undefined;
    const orderBy = searchParams.get('orderBy') || 'recent';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Validar parâmetros
    if (page < 1) {
      return NextResponse.json(
        { success: false, message: 'Página deve ser maior que 0' },
        { status: 400 }
      );
    }

    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { success: false, message: 'Limite deve ser entre 1 e 100' },
        { status: 400 }
      );
    }

    if (!['recent', 'name', 'date'].includes(orderBy)) {
      return NextResponse.json(
        { success: false, message: 'Ordenação inválida' },
        { status: 400 }
      );
    }

    // Debug: log empresa info
    console.log('Buscando clientes para empresa:', empresaId);
    console.log('Filtros:', { nome, orderBy, page, limit });

    // Buscar clientes
    const clientesData = await clienteService.getClientesByEmpresa(empresaId, {
      nome,
      orderBy: orderBy as 'recent' | 'name' | 'date',
      page,
      limit,
    });

    console.log('Resultado dos clientes:', clientesData);

    return NextResponse.json({
      success: true,
      data: clientesData,
    });
  } catch (error) {
    console.error('Erro na API clientes:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    // Parse do corpo da requisição
    const body = await request.json();
    const { nome, telefone } = body;

    // Validar dados obrigatórios
    if (!nome && !telefone) {
      return NextResponse.json(
        { success: false, message: 'Nome ou telefone é obrigatório' },
        { status: 400 }
      );
    }

    // Criar cliente
    const cliente = await clienteService.createCliente({
      nome,
      telefone,
    });

    return NextResponse.json({
      success: true,
      data: cliente,
      message: 'Cliente criado com sucesso',
    });
  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      },
      { status: 500 }
    );
  }
}