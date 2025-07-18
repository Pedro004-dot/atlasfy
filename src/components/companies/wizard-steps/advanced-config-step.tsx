'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Settings, ArrowRight, ArrowLeft, Shield, Clock, HelpCircle, TrendingUp } from 'lucide-react';
import {
  GatilhoEscalacaoFormData,
  FollowUpFormData,
  PerguntaQualificacaoFormData,
  EtapaFunilFormData
} from '@/lib/validations/empresa';

interface AdvancedConfigStepProps {
  gatilhosData: Partial<GatilhoEscalacaoFormData>;
  followUpsData: FollowUpFormData[];
  perguntasData: PerguntaQualificacaoFormData[];
  etapasData: EtapaFunilFormData[];
  onNext: (data: any) => void;
  onPrevious: () => void;
}

export function AdvancedConfigStep({
  gatilhosData,
  followUpsData,
  perguntasData,
  etapasData,
  onNext,
  onPrevious
}: AdvancedConfigStepProps) {
  const [gatilhos, setGatilhos] = useState<Partial<GatilhoEscalacaoFormData>>({
    solicitacao_humano: gatilhosData.solicitacao_humano || false,
    apos_objecoes_limite: gatilhosData.apos_objecoes_limite || 3,
    valor_venda_limite: gatilhosData.valor_venda_limite || undefined,
    alta_irritacao: gatilhosData.alta_irritacao || false,
    duvidas_tecnicas: gatilhosData.duvidas_tecnicas || false,
    mensagem_transferencia: gatilhosData.mensagem_transferencia || 'Vou transferir você para um de nossos especialistas que poderá ajudá-lo melhor.',
    ativo: true
  });

  const [followUps, setFollowUps] = useState<FollowUpFormData[]>(
    followUpsData.length > 0 ? followUpsData : [
      {
        timing_dias: 1,
        condicao: 'Se não houve resposta',
        mensagem: 'Olá! Vi que você demonstrou interesse em nossa solução. Tem alguma dúvida que posso esclarecer?',
        ativo: true,
        ordem: 1
      }
    ]
  );

  const [etapas, setEtapas] = useState<EtapaFunilFormData[]>(
    etapasData.length > 0 ? etapasData : [
      {
        nome: 'Prospecção',
        percentual: 20,
        criterios_avancar: ['Cliente respondeu positivamente', 'Demonstrou interesse'],
        acoes_automaticas: ['Enviar material comercial'],
        ordem: 1,
        ativo: true
      },
      {
        nome: 'Qualificação',
        percentual: 40,
        criterios_avancar: ['Budget confirmado', 'Autoridade identificada'],
        acoes_automaticas: ['Agendar reunião'],
        ordem: 2,
        ativo: true
      },
      {
        nome: 'Proposta',
        percentual: 70,
        criterios_avancar: ['Proposta enviada', 'Cliente interessado'],
        acoes_automaticas: ['Notificar vendedor'],
        ordem: 3,
        ativo: true
      },
      {
        nome: 'Fechamento',
        percentual: 100,
        criterios_avancar: ['Contrato assinado'],
        acoes_automaticas: ['Iniciar onboarding'],
        ordem: 4,
        ativo: true
      }
    ]
  );

  const handleNext = () => {
    onNext({
      gatilhos_escalacao: gatilhos,
      follow_ups: followUps,
      perguntas_qualificacao: [],
      etapas_funil: etapas
    });
  };

  const handleSkip = () => {
    onNext({
      gatilhos_escalacao: {},
      follow_ups: [],
      perguntas_qualificacao: [],
      etapas_funil: []
    });
  };

  return (
    <div className="space-y-6">
      {/* Step Title */}
      <div className="text-center">
        <div className="w-12 h-12 bg-primary/10 flex items-center justify-center mx-auto mb-3" style={{ borderRadius: 'var(--radius)' }}>
          <Settings className="h-6 w-6 text-primary" />
        </div>
        <h2 className="atlas-heading text-xl font-semibold text-foreground mb-1">
          Configurações Avançadas
        </h2>
        <p className="atlas-muted text-sm">
          Configure automações e fluxos avançados para seu agente
        </p>
      </div>

      {/* Gatilhos de Escalação */}
      <div className="bg-muted p-6 space-y-4" style={{ borderRadius: 'var(--radius)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-muted-foreground" />
          <h3 className="atlas-heading font-semibold text-foreground">Gatilhos de Escalação</h3>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="solicitacao_humano"
              checked={gatilhos.solicitacao_humano}
              onCheckedChange={(checked) => setGatilhos(prev => ({ ...prev, solicitacao_humano: checked as boolean }))}
            />
            <Label htmlFor="solicitacao_humano" className="atlas-label text-sm">
              Cliente solicita falar com humano
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="alta_irritacao"
              checked={gatilhos.alta_irritacao}
              onCheckedChange={(checked) => setGatilhos(prev => ({ ...prev, alta_irritacao: checked as boolean }))}
            />
            <Label htmlFor="alta_irritacao" className="atlas-label text-sm">
              Cliente demonstra alta irritação
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="duvidas_tecnicas"
              checked={gatilhos.duvidas_tecnicas}
              onCheckedChange={(checked) => setGatilhos(prev => ({ ...prev, duvidas_tecnicas: checked as boolean }))}
            />
            <Label htmlFor="duvidas_tecnicas" className="atlas-label text-sm">
              Dúvidas técnicas complexas
            </Label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="objecoes_limite" className="atlas-label">
                Limite de Objeções
              </Label>
              <Input
                id="objecoes_limite"
                type="number"
                min="1"
                max="10"
                value={gatilhos.apos_objecoes_limite}
                onChange={(e) => setGatilhos(prev => ({ ...prev, apos_objecoes_limite: parseInt(e.target.value) }))}
                className="atlas-input"
                style={{ borderRadius: 'var(--radius-sm)' }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor_limite" className="atlas-label">
                Valor Limite (R$)
              </Label>
              <Input
                id="valor_limite"
                type="number"
                min="0"
                step="0.01"
                value={gatilhos.valor_venda_limite || ''}
                onChange={(e) => setGatilhos(prev => ({ ...prev, valor_venda_limite: e.target.value ? parseFloat(e.target.value) : undefined }))}
                className="atlas-input"
                placeholder="Ex: 1000.00"
                style={{ borderRadius: 'var(--radius-sm)' }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mensagem_transferencia" className="atlas-label">
              Mensagem de Transferência
            </Label>
            <Textarea
              id="mensagem_transferencia"
              value={gatilhos.mensagem_transferencia}
              onChange={(e) => setGatilhos(prev => ({ ...prev, mensagem_transferencia: e.target.value }))}
              rows={2}
              className="atlas-input resize-none"
              style={{ borderRadius: 'var(--radius-sm)' }}
            />
          </div>
        </div>
      </div>

      {/* Follow-ups */}
      <div className="bg-muted p-6 space-y-4" style={{ borderRadius: 'var(--radius)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <h3 className="atlas-heading font-semibold text-foreground">Scripts de Follow-up</h3>
        </div>
        
        <div className="space-y-3">
          {followUps.map((followUp, index) => (
            <div key={index} className="p-3 bg-background border border-border" style={{ borderRadius: 'var(--radius-sm)' }}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="font-medium text-muted-foreground">Timing:</span>
                  <p>{followUp.timing_dias} dia(s) após contato</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Condição:</span>
                  <p>{followUp.condicao}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Mensagem:</span>
                  <p className="text-xs">{followUp.mensagem.substring(0, 100)}...</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Funil de Vendas */}
      <div className="bg-muted p-6 space-y-4" style={{ borderRadius: 'var(--radius)' }}>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-muted-foreground" />
          <h3 className="atlas-heading font-semibold text-foreground">Funil de Vendas</h3>
        </div>
        
        <div className="space-y-3">
          {etapas.map((etapa, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-background border border-border" style={{ borderRadius: 'var(--radius-sm)' }}>
              <div className="flex items-center gap-3">
                <div 
                  className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium"
                >
                  {etapa.ordem}
                </div>
                <div>
                  <span className="font-medium">{etapa.nome}</span>
                  <p className="text-xs text-muted-foreground">
                    {etapa.criterios_avancar.join(', ')}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="font-bold text-primary">{etapa.percentual}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tips Card */}
      <div className="bg-primary/5 border border-primary/20 p-4" style={{ borderRadius: 'var(--radius)' }}>
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 bg-primary/10 flex items-center justify-center flex-shrink-0" style={{ borderRadius: 'var(--radius-sm)' }}>
            <HelpCircle className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h4 className="atlas-heading font-medium text-primary mb-1">Automação Inteligente</h4>
            <p className="atlas-text text-sm text-primary/80">
              Essas configurações tornam seu agente mais inteligente e eficiente. 
              Você pode ajustar tudo isso depois na área de configurações.
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between pt-4">
        <Button
          type="button"
          onClick={onPrevious}
          variant="outline"
          className="atlas-button-secondary"
          style={{ borderRadius: 'var(--radius)' }}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Anterior
        </Button>

        <div className="flex gap-3">
          <Button
            type="button"
            onClick={handleSkip}
            variant="outline"
            className="atlas-button-secondary"
            style={{ borderRadius: 'var(--radius)' }}
          >
            Usar Padrões
          </Button>
          
          <Button
            onClick={handleNext}
            className="atlas-button-primary"
            style={{ borderRadius: 'var(--radius)' }}
          >
            Finalizar
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}