'use client';

import React from 'react';
import { useEmpresa } from '@/contexts/EmpresaContext';

interface EmpresaSelectorProps {
  className?: string;
}

export function EmpresaSelector({ className = '' }: EmpresaSelectorProps) {
  const { empresas, empresaSelecionada, selecionarEmpresa, isLoading, error } = useEmpresa();

  if (isLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-10 bg-muted rounded-md"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-sm text-destructive ${className}`}>
        Erro ao carregar empresas
      </div>
    );
  }

  if (!empresas || empresas.length === 0) {
    return (
      <div className={`text-sm text-muted-foreground ${className}`}>
        Nenhuma empresa encontrada
      </div>
    );
  }

  if (empresas.length === 1) {
    return (
      <div className={`text-sm text-foreground font-medium ${className}`}>
        {empresas[0].nome}
      </div>
    );
  }

  return (
    <div className={className}>
      <label htmlFor="empresa-select" className="block text-sm font-medium text-foreground mb-1" >
        Empresa:
      </label>
      <select
        id="empresa-select"
        value={empresaSelecionada || ''}
        onChange={(e) => selecionarEmpresa(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
      >
        <option value="">Selecione uma empresa</option>
        {empresas.map((empresa) => (
          <option key={empresa.id} value={empresa.id}>
            {empresa.nome }
          </option>
        ))}
      </select>
    </div>
  );
}