import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/services/auth.service';
import { validatePasswordReset, formatValidationErrors } from '@/lib/validations';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const validation = validatePasswordReset(body);
    
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        message: 'Dados inválidos',
        errors: formatValidationErrors(validation.error)
      }, { status: 400 });
    }

    const result = await authService.resetPassword({
      email: validation.data.email,
      token: validation.data.token,
      nova_senha: validation.data.nova_senha
    });
    
    const response = NextResponse.json(result, { 
      status: result.success ? 200 : 400 
    });

    if (result.success && result.token) {
      response.cookies.set('auth-token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24, // 24 horas
        path: '/',
      });
    }
    
    return response;
  } catch (error) {
    console.error('Erro na API de reset de senha:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor'
    }, { status: 500 });
  }
}