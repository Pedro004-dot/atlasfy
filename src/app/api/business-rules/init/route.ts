import { NextRequest, NextResponse } from 'next/server';
import { initializeBusinessRules, isBusinessRulesInitialized } from '@/lib/business-rules/init';
import { authService } from '@/services/auth.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/business-rules/init
 * Inicializa o sistema de regras de negócio
 */
export async function POST(request: NextRequest) {
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

    // Verificar se já está inicializado
    if (isBusinessRulesInitialized()) {
      return NextResponse.json({
        success: true,
        message: 'Business rules already initialized',
        data: {
          status: 'already_initialized',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Inicializar sistema de regras
    await initializeBusinessRules();

    return NextResponse.json({
      success: true,
      message: 'Business rules initialized successfully',
      data: {
        status: 'initialized',
        timestamp: new Date().toISOString(),
        userId: user.id
      }
    });

  } catch (error) {
    console.error('[Business Rules Init] Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/business-rules/init
 * Verifica o status de inicialização
 */
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

    const isInitialized = isBusinessRulesInitialized();

    return NextResponse.json({
      success: true,
      data: {
        initialized: isInitialized,
        status: isInitialized ? 'ready' : 'not_initialized',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[Business Rules Init Status] Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      },
      { status: 500 }
    );
  }
} 