import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/services/auth.service';
import { validatePasswordResetRequest, formatValidationErrors } from '@/lib/validations';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const validation = validatePasswordResetRequest(body);
    
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        message: 'Dados inválidos',
        errors: formatValidationErrors(validation.error)
      }, { status: 400 });
    }

    const result = await authService.requestPasswordReset(validation.data.email);
    
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Erro na API de solicitação de reset de senha:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor'
    }, { status: 500 });
  }
}