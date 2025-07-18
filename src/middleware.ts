import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const protectedRoutes = ['/dashboard'];
  const authRoutes = ['/login', '/cadastro', '/confirmar-email', '/esqueci-senha'];

  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    return await handleProtectedRoute(request);
  }

  if (authRoutes.some(route => pathname.startsWith(route))) {
    return await handleAuthRoute(request);
  }

  return NextResponse.next();
}

async function handleProtectedRoute(request: NextRequest) {
  // Com localStorage, não podemos verificar token no middleware
  // O middleware só roda no servidor, localStorage só existe no cliente
  // Vamos permitir acesso e verificar no lado cliente
  return NextResponse.next();
}

async function handleAuthRoute(request: NextRequest) {
  // Com localStorage, não podemos verificar no middleware
  // Permitir acesso às páginas de auth
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/login',
    '/cadastro',
    '/confirmar-email',
    '/esqueci-senha',
  ],
};