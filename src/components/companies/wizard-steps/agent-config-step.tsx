'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bot, ArrowRight, ArrowLeft, User, MessageSquare, Target, Lightbulb } from 'lucide-react';
import { agenteConfigSchema, AgenteConfigFormData } from '@/lib/validations/empresa';
import { GENEROS_OPCOES, TONS_VOZ_OPCOES } from '@/types/empresa';

interface AgentConfigStepProps {
  data: Partial<AgenteConfigFormData>;
  onNext: (data: AgenteConfigFormData) => void;
  onPrevious: () => void;
}

export function AgentConfigStep({ data, onNext, onPrevious }: AgentConfigStepProps) {
  const form = useForm<AgenteConfigFormData>({
    resolver: zodResolver(agenteConfigSchema),
    defaultValues: {
      nome_agente: data.nome_agente || '',
      genero: data.genero || undefined,
      tom_voz: data.tom_voz || undefined,
      publico_alvo: data.publico_alvo || '',
      proposta_valor: data.proposta_valor || '',
      script_abertura: data.script_abertura || '',
    },
  });

  const { register, handleSubmit, formState: { errors }, setValue, watch } = form;

  const selectedGenero = watch('genero');
  const selectedTomVoz = watch('tom_voz');
  const scriptAbertura = watch('script_abertura');

  const onSubmit = (formData: AgenteConfigFormData) => {
    onNext(formData);
  };

  const handleSkip = () => {
    onNext({} as AgenteConfigFormData);
  };

  return (
    <div className="space-y-6">
      {/* Step Title */}
      <div className="text-center">
        <div className="w-12 h-12 bg-primary/10 flex items-center justify-center mx-auto mb-3" style={{ borderRadius: 'var(--radius)' }}>
          <Bot className="h-6 w-6 text-primary" />
        </div>
        <h2 className="atlas-heading text-xl font-semibold text-foreground mb-1">
          Configuração do Agente de Vendas
        </h2>
        <p className="atlas-muted text-sm">
          Personalize seu agente de IA para vendas mais eficazes
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Agent Basic Settings */}
        <div className="bg-muted p-6 space-y-4" style={{ borderRadius: 'var(--radius)' }}>
          <div className="flex items-center gap-2 mb-4">
            <User className="h-5 w-5 text-muted-foreground" />
            <h3 className="atlas-heading font-semibold text-foreground">Configurações Básicas</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nome do Agente */}
            <div className="space-y-2">
              <Label htmlFor="nome_agente" className="atlas-label">
                Nome do Agente *
              </Label>
              <Input
                id="nome_agente"
                {...register('nome_agente')}
                type="text"
                className="atlas-input"
                placeholder="Ex: Sofia, Carlos, Ana..."
                style={{ borderRadius: 'var(--radius-sm)' }}
              />
              {errors.nome_agente && (
                <p className="text-destructive text-xs">{errors.nome_agente.message}</p>
              )}
            </div>

            {/* Gênero */}
            <div className="space-y-2">
              <Label htmlFor="genero" className="atlas-label">
                Gênero *
              </Label>
              <Select
                value={selectedGenero}
                onValueChange={(value) => setValue('genero', value as any)}
              >
                <SelectTrigger className="atlas-input" style={{ borderRadius: 'var(--radius-sm)' }}>
                  <SelectValue placeholder="Selecione o gênero" />
                </SelectTrigger>
                <SelectContent className="atlas-select-content">
                  {GENEROS_OPCOES.map((genero) => (
                    <SelectItem key={genero} value={genero} className="atlas-select-item">
                      {genero}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.genero && (
                <p className="text-destructive text-xs">{errors.genero.message}</p>
              )}
            </div>

            {/* Tom de Voz */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="tom_voz" className="atlas-label">
                Tom de Voz *
              </Label>
              <Select
                value={selectedTomVoz}
                onValueChange={(value) => setValue('tom_voz', value as any)}
              >
                <SelectTrigger className="atlas-input" style={{ borderRadius: 'var(--radius-sm)' }}>
                  <SelectValue placeholder="Selecione o tom de voz" />
                </SelectTrigger>
                <SelectContent className="atlas-select-content">
                  {TONS_VOZ_OPCOES.map((tom) => (
                    <SelectItem key={tom} value={tom} className="atlas-select-item">
                      {tom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.tom_voz && (
                <p className="text-destructive text-xs">{errors.tom_voz.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Business Settings */}
        <div className="bg-muted p-6 space-y-4" style={{ borderRadius: 'var(--radius)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-5 w-5 text-muted-foreground" />
            <h3 className="atlas-heading font-semibold text-foreground">Estratégia de Vendas</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Público-Alvo */}
            <div className="space-y-2">
              <Label htmlFor="publico_alvo" className="atlas-label">
                Público-Alvo *
              </Label>
              <Textarea
                id="publico_alvo"
                {...register('publico_alvo')}
                rows={3}
                className="atlas-input resize-none"
                placeholder="Ex: Pequenos empresários do varejo que buscam automatizar vendas..."
                style={{ borderRadius: 'var(--radius-sm)' }}
              />
              {errors.publico_alvo && (
                <p className="text-destructive text-xs">{errors.publico_alvo.message}</p>
              )}
            </div>

            {/* Proposta de Valor */}
            <div className="space-y-2">
              <Label htmlFor="proposta_valor" className="atlas-label">
                Proposta de Valor *
              </Label>
              <Textarea
                id="proposta_valor"
                {...register('proposta_valor')}
                rows={3}
                className="atlas-input resize-none"
                placeholder="Ex: Aumente suas vendas em 300% com automação inteligente..."
                style={{ borderRadius: 'var(--radius-sm)' }}
              />
              {errors.proposta_valor && (
                <p className="text-destructive text-xs">{errors.proposta_valor.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Script de Abertura */}
        <div className="bg-muted p-6 space-y-4" style={{ borderRadius: 'var(--radius)' }}>
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
            <h3 className="atlas-heading font-semibold text-foreground">Script de Abertura</h3>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="script_abertura" className="atlas-label">
              Mensagem de Abertura *
            </Label>
            <Textarea
              id="script_abertura"
              {...register('script_abertura')}
              rows={4}
              className="atlas-input resize-none"
              placeholder="Ex: Olá! Sou a Sofia, assistente virtual da [EMPRESA]. Estou aqui para ajudá-lo a encontrar a melhor solução para [NECESSIDADE]. Como posso ajudá-lo hoje?"
              style={{ borderRadius: 'var(--radius-sm)' }}
            />
            {errors.script_abertura && (
              <p className="text-destructive text-xs">{errors.script_abertura.message}</p>
            )}
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Use [EMPRESA] e [NECESSIDADE] como variáveis dinâmicas</span>
              <span>{scriptAbertura?.length || 0}/500 caracteres</span>
            </div>
          </div>
        </div>

        {/* Tips Card */}
        <div className="bg-primary/5 border border-primary/20 p-4" style={{ borderRadius: 'var(--radius)' }}>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-primary/10 flex items-center justify-center flex-shrink-0" style={{ borderRadius: 'var(--radius-sm)' }}>
              <Lightbulb className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h4 className="atlas-heading font-medium text-primary mb-1">Dica de Especialista</h4>
              <p className="atlas-text text-sm text-primary/80">
                Um agente bem configurado pode aumentar suas conversões em até 70%. 
                Seja específico sobre seu público-alvo e proposta de valor para melhores resultados.
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
              Pular Esta Etapa
            </Button>
            
            <Button
              type="submit"
              className="atlas-button-primary"
              style={{ borderRadius: 'var(--radius)' }}
            >
              Continuar
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}