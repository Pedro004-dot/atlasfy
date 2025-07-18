import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/services/auth.service';
import { validateLogin, formatValidationErrors } from '@/lib/validations';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const validation = validateLogin(body);
    
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        message: 'Dados inválidos',
        errors: formatValidationErrors(validation.error)
      }, { status: 400 });
    }

    const result = await authService.login(validation.data);
    
    return NextResponse.json(result, { 
      status: result.success ? 200 : 401 
    });
  } catch (error) {
    console.error('Erro na API de login:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor'
    }, { status: 500 });
  }
}