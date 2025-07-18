import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/services/auth.service';

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const authorization = request.headers.get('authorization');
    
    console.log('Authorization header:', authorization);
    
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Token de autorização não fornecido' },
        { status: 401 }
      );
    }

    const token = authorization.replace('Bearer ', '');
    console.log('Token extracted:', token);
    
    const user = await authService.getCurrentUserByToken(token);
    console.log('User from token:', user);
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Usuário não autenticado' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        userId: user.id,
        userName: user.nome,
        userEmail: user.email,
      }
    });
  } catch (error) {
    console.error('Erro na API test-auth:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      },
      { status: 500 }
    );
  }
}