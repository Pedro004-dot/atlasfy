import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/services/auth.service';
import { validateLogin, formatValidationErrors } from '@/lib/validations';

// Força a rota a ser dinâmica
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    console.log('=== LOGIN ROUTE DEBUG ===');
    console.log('Request method:', request.method);
    console.log('Request headers:', Object.fromEntries(request.headers.entries()));
    
    const body = await request.json();
    console.log('Request body:', { email: body.email, senha: body.senha ? '[HIDDEN]' : 'NOT_PROVIDED' });
    
    const validation = validateLogin(body);
    console.log('Validation result:', validation.success);
    
    if (!validation.success) {
      console.log('Validation errors:', formatValidationErrors(validation.error));
      return NextResponse.json({
        success: false,
        message: 'Dados inválidos',
        errors: formatValidationErrors(validation.error)
      }, { status: 400 });
    }

    console.log('Calling authService.login...');
    const result = await authService.login(validation.data);
    console.log('Auth service result:', { success: result.success, message: result.message });
    
    const response = NextResponse.json(result, { 
      status: result.success ? 200 : 401 
    });
    
    // Adicionar headers CORS
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return response;
  } catch (error) {
    console.error('Erro na API de login:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor'
    }, { status: 500 });
  }
}

// Adicionar suporte para OPTIONS (CORS preflight)
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}