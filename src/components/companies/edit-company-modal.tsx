'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { Building2, Phone, Shield, Edit, Loader2, AlertCircle } from 'lucide-react';
import { Empresa } from '@/types/index';

// Validation schema based on agent type
const createEmpresaEditSchema = (agentType: 'sentinela' | 'vendas') => {
  const baseSchema = {
    nome: z.string()
      .min(2, 'Nome deve ter pelo menos 2 caracteres')
      .max(100, 'Nome deve ter no máximo 100 caracteres'),
    descricao: z.string()
      .max(500, 'Descrição deve ter no máximo 500 caracteres')
      .optional(),
    ativo: z.boolean().optional(),
  };

  if (agentType === 'sentinela') {
    return z.object({
      ...baseSchema,
      telefone: z.string()
        .regex(/^55\d{11}$/, 'Telefone deve ter 13 dígitos no formato 5531996997292')
        .refine((value) => value.startsWith('55'), 'Telefone deve começar com 55')
        .refine((value) => value.length === 13, 'Telefone deve ter exatamente 13 dígitos'),
    });
  } else {
    return z.object({
      ...baseSchema,
      cnpj: z.string()
        .regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, 'CNPJ deve estar no formato XX.XXX.XXX/XXXX-XX')
        .optional(),
      telefone: z.string()
        .regex(/^55\d{11}$/, 'Telefone deve ter 13 dígitos no formato 5531996997292')
        .optional(),
      email: z.string()
        .email('Email inválido')
        .optional(),
      website: z.string()
        .url('Website deve ser uma URL válida')
        .optional(),
      endereco: z.string()
        .min(5, 'Endereço deve ter pelo menos 5 caracteres')
        .max(255, 'Endereço deve ter no máximo 255 caracteres')
        .optional(),
      setor: z.string()
        .max(100, 'Setor deve ter no máximo 100 caracteres')
        .optional(),
    });
  }
};

interface EditCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompanyUpdated: (company: Empresa) => void;
  company: Empresa | null;
}

export function EditCompanyModal({ isOpen, onClose, onCompanyUpdated, company }: EditCompanyModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addToast } = useToast();

  const agentType = (company?.agent_type || 'vendas') as 'sentinela' | 'vendas';
  const schema = createEmpresaEditSchema(agentType);
  
  const form = useForm();

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = form;

  // Populate form when company changes
  useEffect(() => {
    if (company && isOpen) {
      setValue('nome', company.nome || '');
      setValue('descricao', company.descricao || '');
      setValue('ativo', company.ativo);

      if (agentType === 'sentinela') {
        setValue('telefone', company.telefone || '');
      } else {
        setValue('cnpj', company.cnpj || '');
        setValue('telefone', company.telefone || '');
        setValue('email', company.email || '');
        setValue('website', company.website || '');
        setValue('endereco', company.endereco || '');
        setValue('setor', company.setor || '');
      }
    }
  }, [company, isOpen, setValue, agentType]);

  const onSubmit = async (data: any) => {
    if (!company) return;

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('auth-token');
      if (!token) throw new Error('Token não encontrado');

      const response = await fetch(`/api/empresas/${company.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Erro ao atualizar empresa');
      }

      addToast({
        type: 'success',
        message: 'Empresa atualizada com sucesso!'
      });

      onCompanyUpdated(result.empresa);
      handleClose();

    } catch (error: any) {
      addToast({
        type: 'error',
        message: error.message || 'Erro ao atualizar empresa'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const formatCNPJ = (value: string) => {
    const digits = value.replace(/\D/g, '');
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 13 && digits.startsWith('55')) {
      return `+${digits.substring(0, 2)} (${digits.substring(2, 4)}) ${digits.substring(4, 5)} ${digits.substring(5, 9)}-${digits.substring(9)}`;
    }
    return digits;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 13) {
      e.target.value = value;
    }
  };

  if (!company) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <ModalBody>
        <div className="space-y-6" style={{ fontFamily: 'var(--font-sans)', letterSpacing: 'var(--tracking-normal)' }}>
          {/* Header */}
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/10 flex items-center justify-center mx-auto mb-4" style={{ borderRadius: 'var(--radius-lg)' }}>
              {agentType === 'sentinela' ? (
                <Shield className="h-8 w-8 text-primary" />
              ) : (
                <Building2 className="h-8 w-8 text-primary" />
              )}
            </div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <h1 className="atlas-heading text-2xl font-bold text-foreground">
                Editar Empresa
              </h1>
              <Badge variant={agentType === 'sentinela' ? 'default' : 'secondary'}>
                {agentType === 'sentinela' ? 'Agente Sentinela' : 'Agente Vendas'}
              </Badge>
            </div>
            <p className="atlas-muted text-sm">
              Atualize as informações da empresa {company.nome}
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Informações Básicas */}
            <div className="bg-muted p-6" style={{ borderRadius: 'var(--radius)' }}>
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <h3 className="atlas-heading font-semibold text-foreground">Informações Básicas</h3>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                {/* Nome */}
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
                    <p className="text-destructive text-xs">{String(errors.nome.message || errors.nome)}</p>
                  )}
                </div>

                {/* Telefone */}
                <div className="space-y-2">
                  <Label htmlFor="telefone" className="atlas-label">
                    Telefone {agentType === 'sentinela' ? '*' : ''}
                  </Label>
                  <Input
                    id="telefone"
                    {...register('telefone')}
                    type="text"
                    maxLength={13}
                    onChange={handlePhoneChange}
                    className="atlas-input"
                    placeholder="5531996997292"
                    style={{ borderRadius: 'var(--radius-sm)' }}
                  />
                  {errors.telefone && (
                    <p className="text-destructive text-xs">{String(errors.telefone.message || errors.telefone)}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Formato: 13 dígitos sem pontuação (55 + DDD + número com 9)
                  </p>
                </div>

                {/* Descrição */}
                <div className="space-y-2">
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
                    <p className="text-destructive text-xs">{String(errors.descricao.message || errors.descricao)}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Campos específicos para Agente Vendas */}
            {agentType === 'vendas' && (
              <div className="bg-muted p-6" style={{ borderRadius: 'var(--radius)' }}>
                <div className="flex items-center gap-2 mb-4">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <h3 className="atlas-heading font-semibold text-foreground">Informações Adicionais</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* CNPJ */}
                  <div className="space-y-2">
                    <Label htmlFor="cnpj" className="atlas-label">
                      CNPJ
                    </Label>
                    <Input
                      id="cnpj"
                      {...register('cnpj')}
                      type="text"
                      maxLength={18}
                      onChange={(e) => {
                        e.target.value = formatCNPJ(e.target.value);
                      }}
                      className="atlas-input"
                      placeholder="00.000.000/0000-00"
                      style={{ borderRadius: 'var(--radius-sm)' }}
                    />
                    {errors.cnpj && (
                      <p className="text-destructive text-xs">{String(errors.cnpj.message || errors.cnpj)}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="atlas-label">
                      E-mail
                    </Label>
                    <Input
                      id="email"
                      {...register('email')}
                      type="email"
                      className="atlas-input"
                      placeholder="contato@minhaempresa.com"
                      style={{ borderRadius: 'var(--radius-sm)' }}
                    />
                    {errors.email && (
                      <p className="text-destructive text-xs">{String(errors.email.message || errors.email)}</p>
                    )}
                  </div>

                  {/* Website */}
                  <div className="space-y-2">
                    <Label htmlFor="website" className="atlas-label">
                      Website
                    </Label>
                    <Input
                      id="website"
                      {...register('website')}
                      type="url"
                      className="atlas-input"
                      placeholder="https://www.minhaempresa.com"
                      style={{ borderRadius: 'var(--radius-sm)' }}
                    />
                    {errors.website && (
                      <p className="text-destructive text-xs">{String(errors.website.message || errors.website)}</p>
                    )}
                  </div>

                  {/* Setor */}
                  <div className="space-y-2">
                    <Label htmlFor="setor" className="atlas-label">
                      Setor de Atuação
                    </Label>
                    <Input
                      id="setor"
                      {...register('setor')}
                      type="text"
                      className="atlas-input"
                      placeholder="Ex: Tecnologia, Varejo, Consultoria..."
                      style={{ borderRadius: 'var(--radius-sm)' }}
                    />
                    {errors.setor && (
                      <p className="text-destructive text-xs">{String(errors.setor.message || errors.setor)}</p>
                    )}
                  </div>

                  {/* Endereço */}
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="endereco" className="atlas-label">
                      Endereço
                    </Label>
                    <Input
                      id="endereco"
                      {...register('endereco')}
                      type="text"
                      className="atlas-input"
                      placeholder="Rua, número, bairro, cidade - UF"
                      style={{ borderRadius: 'var(--radius-sm)' }}
                    />
                    {errors.endereco && (
                      <p className="text-destructive text-xs">{String(errors.endereco.message || errors.endereco)}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Status */}
            <div className="bg-muted p-6" style={{ borderRadius: 'var(--radius)' }}>
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <h3 className="atlas-heading font-semibold text-foreground">Status</h3>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  id="ativo"
                  {...register('ativo')}
                  type="checkbox"
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="ativo" className="atlas-label">
                  Empresa ativa
                </Label>
              </div>
            </div>

            {/* Informações sobre restrições para Sentinela */}
            {agentType === 'sentinela' && (
              <div className="bg-orange-50 border border-orange-200 p-4" style={{ borderRadius: 'var(--radius)' }}>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-orange-100 flex items-center justify-center flex-shrink-0" style={{ borderRadius: 'var(--radius-sm)' }}>
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="atlas-heading font-medium text-orange-800 mb-1">Agente Sentinela</h4>
                    <p className="atlas-text text-sm text-orange-700">
                      Para agentes Sentinela, apenas o nome, telefone, descrição e status podem ser alterados. 
                      CNPJ e outros campos não são editáveis para este tipo de agente.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>
      </ModalBody>

      <ModalFooter>
        <div className="flex justify-end gap-3 w-full">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            className="atlas-button-secondary"
            style={{ borderRadius: 'var(--radius)' }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="atlas-button-primary"
            style={{ borderRadius: 'var(--radius)' }}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Edit className="h-4 w-4 mr-2" />
                Salvar Alterações
              </>
            )}
          </Button>
        </div>
      </ModalFooter>
    </Modal>
  );
}