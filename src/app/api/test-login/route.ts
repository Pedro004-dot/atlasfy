import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/services/auth.service';
import { userRepository } from '@/repositories/user.repository';

// Força a rota a ser dinâmica
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    console.log('=== TEST LOGIN ROUTE ===');
    
    const body = await request.json();
    const { email, senha } = body;
    
    console.log('Testando login para:', email);
    
    // Teste 1: Verificar se o usuário existe
    console.log('1. Verificando se usuário existe...');
    const user = await userRepository.findByEmail(email);
    console.log('Usuário encontrado:', !!user);
    
    if (!user) {
      return NextResponse.json({
        success: false,
        step: 'user_not_found',
        message: 'Usuário não encontrado'
      }, { status: 401 });
    }
    
    console.log('2. Verificando status do usuário...');
    console.log('- Email verificado:', user.email_verificado);
    console.log('- Usuário ativo:', user.ativo);
    
    if (!user.email_verificado) {
      return NextResponse.json({
        success: false,
        step: 'email_not_verified',
        message: 'Email não verificado'
      }, { status: 401 });
    }
    
    if (!user.ativo) {
      return NextResponse.json({
        success: false,
        step: 'user_inactive',
        message: 'Usuário inativo'
      }, { status: 401 });
    }
    
    // Teste 2: Verificar senha
    console.log('3. Verificando senha...');
    const isValidPassword = await authService.comparePassword(senha, user.senha_hash);
    console.log('Senha válida:', isValidPassword);
    
    if (!isValidPassword) {
      return NextResponse.json({
        success: false,
        step: 'invalid_password',
        message: 'Senha incorreta'
      }, { status: 401 });
    }
    
    // Teste 3: Gerar JWT
    console.log('4. Gerando JWT...');
    const token = await authService.generateJWT(user.id, user.email, user.nome, user.plano_id || '');
    console.log('JWT gerado com sucesso');
    
    // Teste 4: Atualizar último acesso
    console.log('5. Atualizando último acesso...');
    await userRepository.updateLastAccess(user.id);
    console.log('Último acesso atualizado');
    
    return NextResponse.json({
      success: true,
      step: 'login_successful',
      message: 'Login bem-sucedido',
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        email_verificado: user.email_verificado,
        ativo: user.ativo
      },
      token
    });
    
  } catch (error) {
    console.error('Erro no teste de login:', error);
    return NextResponse.json({
      success: false,
      step: 'error',
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 