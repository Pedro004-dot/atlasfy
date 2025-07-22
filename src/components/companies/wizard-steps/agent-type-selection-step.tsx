'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, ShoppingCart, ArrowRight, Lock, Check } from 'lucide-react';

export enum AgentType {
  SENTINELA = 'sentinela',
  VENDAS = 'vendas'
}

interface AgentOption {
  type: AgentType;
  title: string;
  description: string;
  features: string[];
  available: boolean;
  comingSoon?: boolean;
  icon: any;
}

interface AgentTypeSelectionStepProps {
  selectedType?: AgentType;
  onNext: (agentType: AgentType) => void;
}

const AGENT_OPTIONS: AgentOption[] = [
  {
    type: AgentType.SENTINELA,
    title: 'Agente Sentinela',
    description: 'Organize e monitore todas as conversas do WhatsApp da sua empresa',
    features: [
      'Organiza conversas automaticamente',
      'Gera insights sobre clientes',
      'Mapeia todo histórico WhatsApp',
      'Relatórios de conversas',
      'Análise de padrões de comportamento'
    ],
    available: true,
    icon: Search
  },
  {
    type: AgentType.VENDAS,
    title: 'Agente Vendas',
    description: 'Automatize vendas com IA avançada e resposta inteligente',
    features: [
      'Respostas automáticas inteligentes',
      'Processamento de objeções',
      'Gestão de pipeline de vendas',
      'Follow-ups automatizados',
      'Integração com catálogo de produtos'
    ],
    available: false,
    comingSoon: true,
    icon: ShoppingCart
  }
];

export function AgentTypeSelectionStep({ selectedType, onNext }: AgentTypeSelectionStepProps) {
  const [selected, setSelected] = React.useState<AgentType | undefined>(selectedType);

  const handleSelect = (agentType: AgentType) => {
    setSelected(agentType);
  };

  const handleNext = () => {
    if (selected) {
      onNext(selected);
    }
  };

  return (
    <div className="space-y-6">
      {/* Step Title */}
      <div className="text-center">
        <div className="w-12 h-12 bg-primary/10 flex items-center justify-center mx-auto mb-3" style={{ borderRadius: 'var(--radius)' }}>
          <Search className="h-6 w-6 text-primary" />
        </div>
        <h2 className="atlas-heading text-xl font-semibold text-foreground mb-1">
          Escolha o Tipo de Agente
        </h2>
        <p className="atlas-muted text-sm">
          Selecione o agente que melhor atende às necessidades da sua empresa
        </p>
      </div>

      {/* Agent Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {AGENT_OPTIONS.map((option) => {
          const IconComponent = option.icon;
          const isSelected = selected === option.type;
          const isAvailable = option.available;
          
          return (
            <div
              key={option.type}
              className={`
                relative border-2 p-6 cursor-pointer transition-all duration-200
                ${isSelected 
                  ? 'border-primary bg-primary/5 shadow-lg' 
                  : isAvailable 
                    ? 'border-border hover:border-primary/50 hover:shadow-md' 
                    : 'border-border/50 opacity-60 cursor-not-allowed'
                }
              `}
              style={{ borderRadius: 'var(--radius-lg)' }}
              onClick={() => isAvailable && handleSelect(option.type)}
            >
              {/* Selection Indicator */}
              {isSelected && (
                <div className="absolute top-4 right-4 w-6 h-6 bg-primary text-primary-foreground flex items-center justify-center" style={{ borderRadius: 'var(--radius)' }}>
                  <Check className="h-4 w-4" />
                </div>
              )}

              {/* Status Badge */}
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-primary/10 flex items-center justify-center" style={{ borderRadius: 'var(--radius)' }}>
                  <IconComponent className={`h-6 w-6 ${isAvailable ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                
                <div className="flex gap-2">
                  {isAvailable ? (
                    <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                      <Check className="h-3 w-3 mr-1" />
                      Disponível
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200">
                      <Lock className="h-3 w-3 mr-1" />
                      Em Breve
                    </Badge>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="space-y-3">
                <h3 className="atlas-heading text-lg font-semibold text-foreground">
                  {option.title}
                </h3>
                
                <p className="atlas-text text-sm text-muted-foreground">
                  {option.description}
                </p>

                {/* Features */}
                <div className="space-y-2">
                  <h4 className="atlas-label text-xs font-medium text-foreground/80 uppercase tracking-wide">
                    Recursos Inclusos
                  </h4>
                  <ul className="space-y-1">
                    {option.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <div className="w-1 h-1 bg-primary rounded-full mt-2 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Coming Soon Message */}
                {option.comingSoon && (
                  <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded text-center">
                    <p className="text-xs text-orange-800 font-medium">
                      🚀 Lançamento previsto para as próximas semanas
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Agent Info */}
      {selected && (
        <div className="bg-primary/5 border border-primary/20 p-4" style={{ borderRadius: 'var(--radius)' }}>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-primary/10 flex items-center justify-center flex-shrink-0" style={{ borderRadius: 'var(--radius-sm)' }}>
              <Check className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h4 className="atlas-heading font-medium text-primary mb-1">
                {AGENT_OPTIONS.find(opt => opt.type === selected)?.title} Selecionado
              </h4>
              <p className="atlas-text text-sm text-primary/80">
                {selected === AgentType.SENTINELA 
                  ? "Você precisará apenas de informações básicas e conexão WhatsApp (3 etapas)"
                  : "Configure produtos, objeções e configurações avançadas (7 etapas)"
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action Button */}
      <div className="flex justify-end pt-4">
        <Button
          onClick={handleNext}
          disabled={!selected}
          className="atlas-button-primary"
          style={{ borderRadius: 'var(--radius)' }}
        >
          Continuar
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}