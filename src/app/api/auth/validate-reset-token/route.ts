import { NextRequest, NextResponse } from 'next/server';
import { tokenRepository } from '@/repositories/token.repository';
import { userRepository } from '@/repositories/user.repository';

export async function POST(req: NextRequest) {
  try {
    const { email, token } = await req.json();
    if (!email || !token) {
      return NextResponse.json({ success: false, message: 'Email e código são obrigatórios.' }, { status: 400 });
    }

    // Busca o token do tipo password_reset
    const tokenData = await tokenRepository.findByToken(token, 'password_reset');
    if (!tokenData) {
      return NextResponse.json({ success: false, message: 'Código inválido ou expirado.' }, { status: 400 });
    }

    // Busca o usuário
    const user = await userRepository.findById(tokenData.usuario_id);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Usuário não encontrado.' }, { status: 400 });
    }

    // Confere se o email bate
    if (user.email !== email) {
      return NextResponse.json({ success: false, message: 'Email não corresponde ao código.' }, { status: 400 });
    }

    // Confere se o token já foi usado ou expirou
    if (tokenData.usado) {
      return NextResponse.json({ success: false, message: 'Código já utilizado.' }, { status: 400 });
    }
    if (new Date(tokenData.expires_at) < new Date()) {
      return NextResponse.json({ success: false, message: 'Código expirado.' }, { status: 400 });
    }

    // Se chegou aqui, está válido
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Erro interno do servidor.' }, { status: 500 });
  }
} 