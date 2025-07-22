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
import { useToast } from '@/components/ui/toast';
import { Building2, MapPin, Phone, Mail, Globe, FileText, Users, Briefcase, Loader2, Edit } from 'lucide-react';
import { Empresa } from '@/types';

// Validation schema (same as create but without required fields for editing)
const empresaEditSchema = z.object({
  nome: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  cnpj: z.string()
    .regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, 'CNPJ deve estar no formato XX.XXX.XXX/XXXX-XX')
    .optional(),
  endereco: z.string()
    .min(5, 'Endereço deve ter pelo menos 5 caracteres')
    .max(255, 'Endereço deve ter no máximo 255 caracteres')
    .optional(),
  telefone: z.string()
    .regex(/^\d{10,11}$/, 'Telefone deve conter apenas números e ter 10 ou 11 dígitos')
    .optional(),
  email: z.string()
    .email('Email inválido')
    .optional(),
  website: z.string()
    .url('Website deve ser uma URL válida')
    .optional(),
  descricao: z.string()
    .max(500, 'Descrição deve ter no máximo 500 caracteres')
    .optional(),
  setor: z.string()
    .max(100, 'Setor deve ter no máximo 100 caracteres')
    .optional(),
  ativo: z.boolean().optional(),
});

type EmpresaEditFormData = z.infer<typeof empresaEditSchema>;

interface EditCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompanyUpdated: (company: Empresa) => void;
  company: Empresa | null;
}

export function EditCompanyModal({ isOpen, onClose, onCompanyUpdated, company }: EditCompanyModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addToast } = useToast();

  const form = useForm<EmpresaEditFormData>({
    resolver: zodResolver(empresaEditSchema),
    defaultValues: {
      nome: '',
      cnpj: '',
      endereco: '',
      telefone: '',
      email: '',
      website: '',
      descricao: '',
      setor: '',
      ativo: true,
    },
  });

  const { register, handleSubmit, formState: { errors }, reset, setValue } = form;

  // Populate form when company changes
  useEffect(() => {
    if (company && isOpen) {
      setValue('nome', company.nome || '');
      setValue('cnpj', company.cnpj || '');
      setValue('endereco', company.endereco || '');
      setValue('telefone', company.telefone || '');
      setValue('email', company.email || '');
      setValue('website', company.website || '');
      setValue('descricao', company.descricao || '');
      setValue('setor', company.setor || '');
      setValue('ativo', company.ativo);
    }
  }, [company, isOpen, setValue]);

  const onSubmit = async (data: EmpresaEditFormData) => {
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
        throw new Error(result.error || 'Erro ao atualizar empresa');
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
    if (digits.length <= 10) {
      return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  if (!company) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <ModalBody>
        <div className="space-y-6" style={{ fontFamily: 'var(--font-sans)', letterSpacing: 'var(--tracking-normal)' }}>
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/10 flex items-center justify-center mx-auto mb-4" style={{ borderRadius: 'var(--radius-lg)' }}>
              <Edit className="h-8 w-8 text-primary" />
            </div>
            <h1 className="atlas-heading text-2xl font-bold text-foreground mb-2">
              Editar Empresa
            </h1>
            <p className="atlas-muted text-sm">
              Atualize as informações da empresa {company.nome}
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Informações básicas */}
            <div className="bg-muted p-6" style={{ borderRadius: 'var(--radius)' }}>
              <div className="flex items-center gap-2 mb-4">
                <Briefcase className="h-5 w-5 text-muted-foreground" />
                <h3 className="atlas-heading font-semibold text-foreground">Informações Básicas</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  />
                  {errors.nome && (
                    <p className="text-destructive text-xs">{errors.nome.message}</p>
                  )}
                </div>

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
                  />
                  {errors.cnpj && (
                    <p className="text-destructive text-xs">{errors.cnpj.message}</p>
                  )}
                </div>

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
                  />
                  {errors.setor && (
                    <p className="text-destructive text-xs">{errors.setor.message}</p>
                  )}
                </div>

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
                  />
                  {errors.descricao && (
                    <p className="text-destructive text-xs">{errors.descricao.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Contato */}
            <div className="bg-muted p-6" style={{ borderRadius: 'var(--radius)' }}>
              <div className="flex items-center gap-2 mb-4">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <h3 className="atlas-heading font-semibold text-foreground">Informações de Contato</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telefone" className="atlas-label">
                    Telefone
                  </Label>
                  <Input
                    id="telefone"
                    {...register('telefone')}
                    type="text"
                    maxLength={15}
                    onChange={(e) => {
                      e.target.value = formatPhone(e.target.value);
                    }}
                    className="atlas-input"
                    placeholder="(00) 00000-0000"
                  />
                  {errors.telefone && (
                    <p className="text-destructive text-xs">{errors.telefone.message}</p>
                  )}
                </div>

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
                  />
                  {errors.email && (
                    <p className="text-destructive text-xs">{errors.email.message}</p>
                  )}
                </div>

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
                  />
                  {errors.website && (
                    <p className="text-destructive text-xs">{errors.website.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endereco" className="atlas-label">
                    Endereço
                  </Label>
                  <Input
                    id="endereco"
                    {...register('endereco')}
                    type="text"
                    className="atlas-input"
                    placeholder="Rua, número, bairro, cidade - UF"
                  />
                  {errors.endereco && (
                    <p className="text-destructive text-xs">{errors.endereco.message}</p>
                  )}
                </div>
              </div>
            </div>

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

            {/* Dica */}
            <div className="bg-primary/5 border border-primary/20 p-4" style={{ borderRadius: 'var(--radius)' }}>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary/10 flex items-center justify-center flex-shrink-0" style={{ borderRadius: 'var(--radius-sm)' }}>
                  <Edit className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h4 className="atlas-heading font-medium text-primary mb-1">Edição</h4>
                  <p className="atlas-text text-sm text-primary/80">
                    Atualize as informações da sua empresa. As alterações serão aplicadas imediatamente 
                    após salvar.
                  </p>
                </div>
              </div>
            </div>
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
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="atlas-button-primary"
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