import { NextRequest, NextResponse } from 'next/server';
import { userProfileService } from '@/services/UserProfileService';
import { validateUserProfile } from '@/lib/validations';
import { handleError } from '@/lib/error-handler';

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Token de autenticação inválido' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Debug logs detalhados dos dados recebidos
    console.log('=== COMPLETAR PERFIL - DADOS RECEBIDOS ===');
    console.log('User ID:', userId);
    console.log('Body completo:', JSON.stringify(body, null, 2));
    console.log('Campos individuais:');
    console.log('- cpf_cnpj:', body.cpf_cnpj);
    console.log('- telefone:', body.telefone);
    console.log('- email:', body.email);
    console.log('- faturamento_mensal:', body.faturamento_mensal);
    console.log('- endereco:', body.endereco);
    console.log('- bairro:', body.bairro);
    console.log('- cep:', body.cep);
    console.log('- tipo_pessoa:', body.tipo_pessoa);
    console.log('==========================================');
    
    const validation = validateUserProfile(body);
    if (!validation.success) {
      console.log('❌ VALIDAÇÃO FALHOU:');
      console.log('Erros de validação:', validation.error?.errors);
      return NextResponse.json(
        {
          success: false,
          message: 'Dados inválidos',
          errors: validation.error?.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })) || [],
        },
        { status: 400 }
      );
    }

    console.log('✅ VALIDAÇÃO PASSOU:');
    console.log('Dados validados:', JSON.stringify(validation.data, null, 2));
    console.log('Iniciando criação do perfil...');

    const updatedUser = await userProfileService.completeUserProfile(userId, validation.data);
    
    return NextResponse.json({
      success: true,
      message: 'Perfil completado com sucesso! Sua conta bancária foi criada.',
      data: {
        user: {
          id: updatedUser.id,
          nome: updatedUser.nome,
          email: updatedUser.email,
          telefone: updatedUser.telefone,
          cpf_cnpj: updatedUser.cpf_cnpj,
          faturamento_mensal: updatedUser.faturamento_mensal,
          endereco: updatedUser.endereco,
          bairro: updatedUser.bairro,
          cep: updatedUser.cep,
          tipo_pessoa: updatedUser.tipo_pessoa,
          perfil_completo: updatedUser.perfil_completo,
          conta_bancaria_id: updatedUser.conta_bancaria_id,
          updated_at: updatedUser.updated_at,
        },
      },
    });
  } catch (error) {
    console.error('Erro ao completar perfil:', error);
    return NextResponse.json(
      handleError(error),
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Token de autenticação inválido' },
        { status: 401 }
      );
    }

    const profileCheck = await userProfileService.checkProfileCompleteness(userId);
    
    return NextResponse.json({
      success: true,
      message: 'Status do perfil obtido com sucesso',
      data: profileCheck,
    });
  } catch (error) {
    console.error('Erro ao verificar perfil:', error);
    return NextResponse.json(
      handleError(error),
      { status: 500 }
    );
  }
}