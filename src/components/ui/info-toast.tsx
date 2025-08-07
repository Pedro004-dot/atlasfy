'use client';

import React from 'react';
import { Info, BarChart3, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InfoToastProps {
  isVisible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  icon?: React.ReactNode;
}

export function InfoToast({ isVisible, onClose, title, message, icon }: InfoToastProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md w-full">
      <div
        className={cn(
          'bg-card border shadow-lg rounded-lg p-4 transition-all duration-300',
          'animate-in slide-in-from-right-full',
          isVisible ? 'opacity-100' : 'opacity-0'
        )}
      >
        <div className="flex items-start space-x-3">
          {/* Icon */}
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
              {icon || <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-foreground mb-1">
              {title}
            </h4>
            <p className="text-sm text-muted-foreground">
              {message}
            </p>
          </div>
          
          {/* Close Button */}
          <div className="flex-shrink-0">
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <span className="sr-only">Fechar</span>
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AnalysisInfoToast({ isVisible, onClose }: { isVisible: boolean; onClose: () => void }) {
  return (
    <InfoToast
      isVisible={isVisible}
      onClose={onClose}
      title="Análise não encontrada"
      message="Este cliente ainda não possui análises de conversação disponíveis. As análises são geradas automaticamente após interações via WhatsApp."
      icon={<BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
    />
  );
}