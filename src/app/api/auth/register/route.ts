import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/services/auth.service';
import { validateRegister, formatValidationErrors } from '@/lib/validations';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const validation = validateRegister(body);
    
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        message: 'Dados inválidos',
        errors: formatValidationErrors(validation.error)
      }, { status: 400 });
    }

    const result = await authService.register(validation.data);
    
    const status = result.success ? 201 : 400;
    
    return NextResponse.json(result, { status });
  } catch (error) {
    console.error('Erro na API de registro:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor'
    }, { status: 500 });
  }
}