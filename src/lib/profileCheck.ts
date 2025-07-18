/**
 * Utilitário para verificar se o perfil do usuário está completo
 */

export interface ProfileCheckResult {
  isComplete: boolean;
  missingFields: string[];
  redirectUrl?: string;
}

export async function checkUserProfile(): Promise<ProfileCheckResult> {
  try {
    const token = localStorage.getItem('token') || localStorage.getItem('auth-token');
    
    if (!token) {
      return {
        isComplete: false,
        missingFields: ['token'],
        redirectUrl: '/login'
      };
    }

    const response = await fetch('/api/auth/completar-perfil', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-user-id': JSON.parse(atob(token.split('.')[1])).userId,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return {
          isComplete: false,
          missingFields: ['authentication'],
          redirectUrl: '/login'
        };
      }
      throw new Error('Erro ao verificar perfil');
    }

    const data = await response.json();
    
    return {
      isComplete: data.data.isComplete,
      missingFields: data.data.missingFields || [],
      redirectUrl: data.data.isComplete ? undefined : '/completar-perfil'
    };
  } catch (error) {
    console.error('Erro ao verificar perfil:', error);
    return {
      isComplete: false,
      missingFields: ['error'],
      redirectUrl: '/completar-perfil'
    };
  }
}

export function redirectToProfileCompletion(currentUrl?: string) {
  const redirectParam = currentUrl ? `?redirect=${encodeURIComponent(currentUrl)}` : '';
  window.location.href = `/completar-perfil${redirectParam}`;
}

export function isProfileIncomplete(profileResult: ProfileCheckResult): boolean {
  return !profileResult.isComplete;
}