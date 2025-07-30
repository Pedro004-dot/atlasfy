import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/services/auth.service';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
  try {
    const jwtSecret = process.env.JWT_SECRET!;
    
    if (!jwtSecret) {
      return NextResponse.json({
        success: false,
        message: 'JWT_SECRET não configurado'
      });
    }

    // Generate a token for the test user
    const userId = 'e8e11df6-9ebd-4eaf-bc50-6056144e888d';
    const email = 'pedro.rocha@aluno.lsb.com.br';
    
    const token = await authService.generateJWT(userId, email, 'Usuário Teste');
    
    // Test token verification
    const verification = await authService.verifyJWT(token);
    
    // Test getting user by token
    const user = await authService.getCurrentUserByToken(token);
    
    return NextResponse.json({
      success: true,
      data: {
        token,
        verification,
        user: user ? { id: user.id, nome: user.nome, email: user.email } : null,
        jwtSecretExists: !!jwtSecret,
        jwtSecretLength: jwtSecret.length
      }
    });
  } catch (error) {
    console.error('Erro no debug JWT:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}