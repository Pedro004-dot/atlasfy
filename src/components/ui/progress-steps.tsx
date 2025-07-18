import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  id: number;
  title: string;
  description?: string;
  required?: boolean;
}

interface ProgressStepsProps {
  steps: Step[];
  currentStep: number;
  completedSteps: number[];
  onStepClick?: (stepId: number) => void;
  className?: string;
}

export function ProgressSteps({ steps, currentStep, completedSteps, onStepClick, className }: ProgressStepsProps) {
  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = currentStep === step.id;
          const isUpcoming = step.id > currentStep;
          
          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                {/* Circle */}
                <button
                  onClick={() => onStepClick?.(step.id)}
                  disabled={!onStepClick}
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all',
                    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
                    onStepClick && 'hover:scale-105 cursor-pointer',
                    !onStepClick && 'cursor-default',
                    isCompleted && 'bg-green-500 text-white hover:bg-green-600',
                    isCurrent && 'bg-blue-500 text-white hover:bg-blue-600',
                    isUpcoming && 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    step.id
                  )}
                </button>
                
                {/* Title */}
                <div className="mt-2 text-center max-w-24">
                  <p
                    className={cn(
                      'text-xs font-medium',
                      isCompleted && 'text-green-600',
                      isCurrent && 'text-blue-600',
                      isUpcoming && 'text-gray-500'
                    )}
                  >
                    {step.title}
                  </p>
                  {step.description && (
                    <p className={cn(
                      'text-xs mt-1',
                      step.required ? 'text-red-500 font-medium' : 'text-gray-400'
                    )}>
                      {step.description}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="flex-1 h-0.5 mx-4 -mt-5">
                  <div
                    className={cn(
                      'h-full transition-all',
                      step.id < currentStep ? 'bg-green-500' : 'bg-gray-200'
                    )}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}