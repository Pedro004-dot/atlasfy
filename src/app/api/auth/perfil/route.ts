import { NextRequest, NextResponse } from 'next/server';
import { userRepository } from '@/repositories/user.repository';
import { userProfileService } from '@/services/UserProfileService';
import { validateUpdateUserProfile } from '@/lib/validations';
import { handleError } from '@/lib/error-handler';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Token de autenticação inválido' },
        { status: 401 }
      );
    }

    const user = await userRepository.findById(userId);
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    const profileCheck = await userProfileService.checkProfileCompleteness(userId);
    
    return NextResponse.json({
      success: true,
      message: 'Perfil obtido com sucesso',
      data: {
        user: {
          id: user.id,
          nome: user.nome,
          email: user.email,
          telefone: user.telefone,
          cpf_cnpj: user.cpf_cnpj,
          faturamento_mensal: user.faturamento_mensal,
          endereco: user.endereco,
          bairro: user.bairro,
          cep: user.cep,
          tipo_pessoa: user.tipo_pessoa,
          perfil_completo: user.perfil_completo,
          created_at: user.created_at,
          updated_at: user.updated_at,
        },
        profileStatus: profileCheck,
      },
    });
  } catch (error) {
    console.error('Erro ao obter perfil:', error);
    return NextResponse.json(
      handleError(error),
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Token de autenticação inválido' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    const validation = validateUpdateUserProfile(body);
    if (!validation.success) {
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

    const updatedUser = await userProfileService.updateUserProfile(userId, validation.data);
    
    return NextResponse.json({
      success: true,
      message: 'Perfil atualizado com sucesso',
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
          updated_at: updatedUser.updated_at,
        },
      },
    });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    return NextResponse.json(
      handleError(error),
      { status: 500 }
    );
  }
}