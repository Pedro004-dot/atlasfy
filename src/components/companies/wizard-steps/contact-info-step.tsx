'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Phone, ArrowRight, ArrowLeft, Mail, Globe, MapPin } from 'lucide-react';
import { empresaContactSchema, EmpresaContactFormData } from '@/lib/validations/empresa';
import { formatPhoneDisplay, formatPhoneForDatabase, formatPhoneFromDatabase } from '@/lib/utils';

interface ContactInfoStepProps {
  data: Partial<EmpresaContactFormData>;
  onNext: (data: EmpresaContactFormData) => void;
  onPrevious: () => void;
}

export function ContactInfoStep({ data, onNext, onPrevious }: ContactInfoStepProps) {
  const form = useForm<EmpresaContactFormData>({
    resolver: zodResolver(empresaContactSchema),
    defaultValues: {
      telefone: formatPhoneFromDatabase(data.telefone || ''),
      email: data.email || '',
      website: data.website || '',
      endereco: data.endereco || '',
    },
  });

  const { register, handleSubmit, formState: { errors } } = form;


  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const field = 'telefone';
    const value = e.target.value;
    
    if (field === 'telefone') {
      // Remove tudo que não for número
      const cleaned = String(value).replace(/\D/g, '');
      // Só permite até 11 dígitos
      if (cleaned.length > 11) return;
      form.setValue(field, cleaned);
      if (errors[field]) {
        form.setError(field, { message: '' });
      }
      return;
      
    }
    
  };

  const onSubmit = (formData: EmpresaContactFormData) => {
    // Converter telefone para formato internacional antes de enviar
    const processedData = {
      ...formData,
      telefone: formData.telefone ? formatPhoneForDatabase(formData.telefone) : formData.telefone
    };
    
    console.log('ContactInfoStep - Telefone original:', formData.telefone);
    console.log('ContactInfoStep - Telefone formatado para DB:', processedData.telefone);
    
    onNext(processedData);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Step Title */}
      <div className="text-center">
        <div className="w-12 h-12 bg-primary/10 flex items-center justify-center mx-auto mb-3" style={{ borderRadius: 'var(--radius)' }}>
          <Phone className="h-6 w-6 text-primary" />
        </div>
        <h2 className="atlas-heading text-xl font-semibold text-foreground mb-1">
          Informações de Contato
        </h2>
        <p className="atlas-muted text-sm">
          Configure os canais de comunicação da sua empresa
        </p>
      </div>

      {/* Form Fields */}
      <div className="bg-muted p-6 space-y-4" style={{ borderRadius: 'var(--radius)' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Telefone */}
          <div className="space-y-2">
            <Label htmlFor="telefone" className="atlas-label flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Telefone
            </Label>
            <Input
              id="telefone"
              {...register('telefone')}
              type="text"
              maxLength={11}
              minLength={11}
              onChange={handlePhoneChange}
              className="atlas-input"
              placeholder="31999999999"
              style={{ borderRadius: 'var(--radius-sm)' }}
            />
            {errors.telefone && (
              <p className="text-destructive text-xs">{errors.telefone.message}</p>
            )}
             <p className="text-sm text-muted-foreground mt-1">
                Não use pontuação no telefone.
              </p>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="atlas-label flex items-center gap-2">
              <Mail className="h-4 w-4" />
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
              <p className="text-destructive text-xs">{errors.email.message}</p>
            )}
          </div>

          {/* Website */}
          <div className="space-y-2">
            <Label htmlFor="website" className="atlas-label flex items-center gap-2">
              <Globe className="h-4 w-4" />
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
              <p className="text-destructive text-xs">{errors.website.message}</p>
            )}
          </div>

          {/* Endereço */}
          <div className="space-y-2">
            <Label htmlFor="endereco" className="atlas-label flex items-center gap-2">
              <MapPin className="h-4 w-4" />
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
              <p className="text-destructive text-xs">{errors.endereco.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Tips Card */}
      <div className="bg-primary/5 border border-primary/20 p-4" style={{ borderRadius: 'var(--radius)' }}>
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 bg-primary/10 flex items-center justify-center flex-shrink-0" style={{ borderRadius: 'var(--radius-sm)' }}>
            <Phone className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h4 className="atlas-heading font-medium text-primary mb-1">Informação</h4>
            <p className="atlas-text text-sm text-primary/80">
              Esses dados ajudarão seus clientes a entrar em contato e darão mais credibilidade 
              ao seu agente de vendas. O telefone será salvo no formato internacional (55DDNÚMERO) 
              para integração com WhatsApp.
              <br />
              <span className="font-medium">Exemplo:</span> (31) 99999-9999 → 5531999999999
              <br />
              Todos os campos são opcionais.
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