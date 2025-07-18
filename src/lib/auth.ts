import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { userRepository } from '@/repositories/user.repository';
import { User } from '@/types';

export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return null;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return null;
    }

    const payload = jwt.verify(token, jwtSecret) as any;
    
    if (!payload?.userId) {
      return null;
    }

    const user = await userRepository.findById(payload.userId);
    
    if (!user || !user.ativo || !user.email_verificado) {
      return null;
    }

    return user;
  } catch (error) {
    console.error('Erro ao obter usuário atual:', error);
    return null;
  }
}

export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return !!user;
}

export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error('Usuário não autenticado');
  }

  return user;
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24, // 24 horas
  });
}

export async function removeAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete('auth-token');
}

export function verifyJWT(token: string): { userId: string; email: string } {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET não configurado');
  }

  try {
    const payload = jwt.verify(token, jwtSecret) as any;
    
    if (!payload?.userId || !payload?.email) {
      throw new Error('Token inválido');
    }

    return {
      userId: payload.userId,
      email: payload.email
    };
  } catch (error) {
    throw new Error('Token inválido ou expirado');
  }
}