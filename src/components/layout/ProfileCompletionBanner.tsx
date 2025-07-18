'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, AlertTriangle, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProfileComplete } from '@/hooks/useUserProfile';

interface ProfileCompletionBannerProps {
  className?: string;
}

export function ProfileCompletionBanner({ className }: ProfileCompletionBannerProps) {
  const { isComplete, isLoading } = useProfileComplete();
  const [isDismissed, setIsDismissed] = useState(false);
  const router = useRouter();

  // Não mostrar se estiver carregando, perfil completo ou já foi dismissado
  if (isLoading || isComplete || isDismissed) {
    return null;
  }

  const handleCompleteProfile = () => {
    const currentUrl = window.location.pathname;
    router.push(`/completar-perfil?redirect=${encodeURIComponent(currentUrl)}`);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  return (
    <div className={`bg-yellow-50 border-b border-yellow-200 ${className}`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  Complete seu perfil para criar empresas
                </p>
                <p className="text-xs text-yellow-700">
                  Precisamos de algumas informações para integração com sistema bancário
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={handleCompleteProfile}
              size="sm"
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              <User className="h-4 w-4 mr-2" />
              Completar Perfil
            </Button>
            
            <Button
              onClick={handleDismiss}
              variant="ghost"
              size="sm"
              className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente para mostrar apenas quando perfil incompleto
export function ConditionalProfileBanner() {
  const { isComplete, isLoading } = useProfileComplete();

  if (isLoading || isComplete) {
    return null;
  }

  return <ProfileCompletionBanner />;
}