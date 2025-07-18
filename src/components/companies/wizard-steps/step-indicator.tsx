'use client';

import React from 'react';
import { Check, LucideIcon } from 'lucide-react';

interface Step {
  id: number;
  name: string;
  icon: LucideIcon;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (step: number) => void;
  isDevelopmentMode?: boolean;
}

export function StepIndicator({ steps, currentStep, onStepClick, isDevelopmentMode = false }: StepIndicatorProps) {
  return (
    <div className="relative">
      {/* Progress Line */}
      <div className="absolute top-5 left-0 w-full h-0.5 bg-border"></div>
      <div 
        className="absolute top-5 left-0 h-0.5 bg-primary transition-all duration-300 ease-out"
        style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
      ></div>

      {/* Steps */}
      <div className="relative flex justify-between">
        {steps.map((step) => {
          const isCompleted = step.id < currentStep;
          const isCurrent = step.id === currentStep;
          const isUpcoming = step.id > currentStep;

          const canClick = isDevelopmentMode && onStepClick;

          return (
            <div key={step.id} className="flex flex-col items-center group">
              {/* Step Circle */}
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300
                  ${isCompleted 
                    ? 'bg-primary border-primary text-primary-foreground' 
                    : isCurrent 
                    ? 'bg-background border-primary text-primary ring-4 ring-primary/20' 
                    : 'bg-background border-border text-muted-foreground'
                  }
                  ${canClick ? 'cursor-pointer hover:scale-105 hover:border-primary hover:text-primary' : ''}
                `}
                style={{ borderRadius: 'var(--radius-lg)' }}
                onClick={() => canClick && onStepClick(step.id)}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <span className="text-sm font-semibold">{step.id}</span>
                )}
              </div>

              {/* Step Label */}
              <div className="mt-2 text-center max-w-[120px]">
                <p
                  className={`
                    text-xs font-medium transition-colors duration-300
                    ${isCurrent 
                      ? 'text-primary' 
                      : isCompleted 
                      ? 'text-foreground' 
                      : 'text-muted-foreground'
                    }
                    ${canClick ? 'hover:text-primary' : ''}
                  `}
                  style={{ letterSpacing: 'var(--tracking-wide)' }}
                  onClick={() => canClick && onStepClick(step.id)}
                  title={canClick ? 'Clique para navegar diretamente para este step' : undefined}
                >
                  {step.name}
                </p>
              </div>

              {/* Hover Effect */}
              {isCompleted && (
                <div className="absolute -inset-2 bg-primary/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 -z-10"></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}