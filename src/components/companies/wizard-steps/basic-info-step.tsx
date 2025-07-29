'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Briefcase, ArrowRight } from 'lucide-react';
import { empresaBasicSchema, empresaBasicSentinelaSchema, EmpresaBasicFormData, EmpresaBasicSentinelaFormData } from '@/lib/validations/empresa';
import { SETORES_OPCOES } from '@/types/empresa';

interface BasicInfoStepProps {
  data: Partial<EmpresaBasicFormData | EmpresaBasicSentinelaFormData>;
  onNext: (data: EmpresaBasicFormData | EmpresaBasicSentinelaFormData) => void;
  agentType?: 'sentinela' | 'vendas';
}

export function BasicInfoStep({ data, onNext, agentType = 'vendas' }: BasicInfoStepProps) {
  const isSentinela = agentType === 'sentinela';
  const schema = isSentinela ? empresaBasicSentinelaSchema : empresaBasicSchema;
  
  type FormData = typeof isSentinela extends true ? EmpresaBasicSentinelaFormData : EmpresaBasicFormData;
  
  const form = useForm({
    defaultValues: {
      nome: data.nome || '',
      ...(isSentinela ? {
        telefone: (data as any).telefone || '',
      } : {
        cnpj: (data as any).cnpj || '',
      }),
      setor: data.setor || undefined,
      descricao: data.descricao || '',
    },
  });

  const { register, handleSubmit, formState: { errors }, setValue, watch } = form;

  const formatCNPJ = (value: string) => {
    const digits = value.replace(/\D/g, '');
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  const handleCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCNPJ(e.target.value);
    e.target.value = formatted;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 12) {
      e.target.value = value;
    }
  };

  const onSubmit = (formData: any) => {
    onNext(formData);
  };


  const selectedSetor = watch('setor');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Step Title */}
      <div className="text-center">
        <div className="w-12 h-12 bg-primary/10 flex items-center justify-center mx-auto mb-3" style={{ borderRadius: 'var(--radius)' }}>
          <Briefcase className="h-6 w-6 text-primary" />
        </div>
        <h2 className="atlas-heading text-xl font-semibold text-foreground mb-1">
          Informações Básicas
        </h2>
        <p className="atlas-muted text-sm">
          Vamos começar com as informações fundamentais da sua empresa
        </p>
      </div>

      {/* Form Fields */}
      <div className="bg-muted p-6 space-y-4" style={{ borderRadius: 'var(--radius)' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Nome da Empresa */}
          <div className="space-y-2">
            <Label htmlFor="nome" className="atlas-label">
              Nome da Empresa *
            </Label>
            <Input
              id="nome"
              {...register('nome')}
              type="text"
              className="atlas-input"
              placeholder="Ex: Minha Empresa Ltda"
              style={{ borderRadius: 'var(--radius-sm)' }}
            />
            {errors.nome && (
              <p className="text-destructive text-xs">{errors.nome.message}</p>
            )}
          </div>

          {/* CNPJ (apenas para Vendas) ou Telefone (apenas para Sentinela) */}
          {!isSentinela ? (
            <div className="space-y-2">
              <Label htmlFor="cnpj" className="atlas-label">
                CNPJ
              </Label>
              <Input
                id="cnpj"
                {...register('cnpj')}
                type="text"
                maxLength={18}
                onChange={handleCNPJChange}
                className="atlas-input"
                placeholder="00.000.000/0000-00"
                style={{ borderRadius: 'var(--radius-sm)' }}
              />
              {(errors as any).cnpj && (
                <p className="text-destructive text-xs">{String((errors as any).cnpj?.message || (errors as any).cnpj || '')}</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="telefone" className="atlas-label">
                Telefone *
              </Label>
              <Input
                id="telefone"
                {...register('telefone')}
                type="text"
                maxLength={12}
                onChange={handlePhoneChange}
                className="atlas-input"
                placeholder="553196997292"
                style={{ borderRadius: 'var(--radius-sm)' }}
              />
              {(errors as any).telefone && (
                <p className="text-destructive text-xs">{String((errors as any).telefone?.message || (errors as any).telefone || '')}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Formato: 12 dígitos sem pontuação (55 + DDD + número sem o 9 adicional)
              </p>
            </div>
          )}

          {/* Setor */}
          <div className="space-y-2">
            <Label htmlFor="setor" className="atlas-label">
              Setor de Atuação *
            </Label>
            <Select
              value={selectedSetor}
              onValueChange={(value) => setValue('setor', value as any)}
            >
              <SelectTrigger className="atlas-input" style={{ borderRadius: 'var(--radius-sm)' }}>
                <SelectValue placeholder="Selecione o setor" />
              </SelectTrigger>
              <SelectContent className="atlas-select-content">
                {SETORES_OPCOES.map((setor) => (
                  <SelectItem key={setor} value={setor} className="atlas-select-item">
                    {setor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.setor && (
              <p className="text-destructive text-xs">{errors.setor.message}</p>
            )}
          </div>

          {/* Descrição */}
          <div className="space-y-2 md:col-span-1">
            <Label htmlFor="descricao" className="atlas-label">
              Descrição
            </Label>
            <Textarea
              id="descricao"
              {...register('descricao')}
              rows={3}
              className="atlas-input resize-none"
              placeholder="Breve descrição da empresa..."
              style={{ borderRadius: 'var(--radius-sm)' }}
            />
            {errors.descricao && (
              <p className="text-destructive text-xs">{errors.descricao.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Tips Card */}
      <div className="bg-primary/5 border border-primary/20 p-4" style={{ borderRadius: 'var(--radius)' }}>
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 bg-primary/10 flex items-center justify-center flex-shrink-0" style={{ borderRadius: 'var(--radius-sm)' }}>
            <Briefcase className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h4 className="atlas-heading font-medium text-primary mb-1">Dica</h4>
            <p className="atlas-text text-sm text-primary/80">
              Essas informações serão usadas para personalizar seu agente de vendas, detalhe sempre o máximo possivel. 
              Você pode editá-las posteriormente se necessário.
            </p>
            <p className="atlas-text text-xs text-primary/60 mt-2">
              ⚡ O setor selecionado determinará o webhook usado na conexão WhatsApp para seu agente especializado.
            </p>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="flex justify-end pt-4">
        <Button
          type="submit"
          className="atlas-button-primary"
          style={{ borderRadius: 'var(--radius)' }}
        >
          Continuar
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </form>
  );
}
