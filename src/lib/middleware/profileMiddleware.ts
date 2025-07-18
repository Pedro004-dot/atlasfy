import { NextRequest, NextResponse } from 'next/server';
import { userRepository } from '@/repositories/user.repository';
import { userProfileService } from '@/services/UserProfileService';

export async function requireCompleteProfile(request: NextRequest, userId: string) {
  try {
    // Verificar se o perfil está completo
    const profileCheck = await userProfileService.checkProfileCompleteness(userId);
    
    if (!profileCheck.isComplete) {
      // Redirecionar para página de completar perfil
      return NextResponse.redirect(new URL('/completar-perfil', request.url));
    }

    return NextResponse.next();
  } catch (error) {
    console.error('Erro ao verificar perfil completo:', error);
    return NextResponse.redirect(new URL('/completar-perfil', request.url));
  }
}

export async function canCreateCompany(request: NextRequest, userId: string) {
  try {
    const user = await userRepository.findById(userId);
    
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    if (!user.perfil_completo) {
      return NextResponse.redirect(new URL('/completar-perfil', request.url));
    }

    return NextResponse.next();
  } catch (error) {
    console.error('Erro ao verificar permissão para criar empresa:', error);
    return NextResponse.redirect(new URL('/completar-perfil', request.url));
  }
}

export function isProfileRoute(pathname: string): boolean {
  const profileRoutes = [
    '/completar-perfil',
    '/perfil',
    '/api/auth/perfil',
    '/api/auth/completar-perfil',
  ];
  
  return profileRoutes.some(route => pathname.startsWith(route));
}

export function requiresCompleteProfile(pathname: string): boolean {
  const routesRequiringCompleteProfile = [
    '/dashboard/empresas/criar',
    '/dashboard/empresas/nova',
    '/dashboard/empresa',
    '/api/empresas',
  ];
  
  return routesRequiringCompleteProfile.some(route => pathname.startsWith(route));
}

export function getProfileRedirectUrl(pathname: string): string {
  // Salvar a rota original para redirecionar após completar o perfil
  const redirectUrl = encodeURIComponent(pathname);
  return `/completar-perfil?redirect=${redirectUrl}`;
}