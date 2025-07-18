import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/services/auth.service';

export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization');
    
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        message: 'Token de autorização não fornecido'
      }, { status: 401 });
    }

    const token = authorization.replace('Bearer ', '');
    const verification = await authService.verifyJWT(token);
    
    if (!verification.valid || !verification.payload) {
      return NextResponse.json({
        success: false,
        message: 'Token inválido'
      }, { status: 401 });
    }

    const user = await authService.getCurrentUserByToken(token);
    
    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'Usuário não encontrado'
      }, { status: 401 });
    }

    const { senha_hash, ...userWithoutPassword } = user;
    
    return NextResponse.json({
      success: true,
      message: 'Usuário encontrado',
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Erro na API de usuário atual:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor'
    }, { status: 500 });
  }
}