'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface Empresa {
  id: string;
  nome: string;
}

interface EmpresaContextType {
  empresas: Empresa[];
  empresaSelecionada: string | null;
  selecionarEmpresa: (empresaId: string) => void;
  isLoading: boolean;
  error: string | null;
}

const EmpresaContext = createContext<EmpresaContextType | undefined>(undefined);

interface EmpresaProviderProps {
  children: ReactNode;
}

export function EmpresaProvider({ children }: EmpresaProviderProps) {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresaSelecionada, setEmpresaSelecionada] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Buscar empresas do usuário
  const fetchEmpresas = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) {
        throw new Error('Token não encontrado');
      }

      const res = await fetch(`/api/empresas/usuario`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.message || 'Erro ao buscar empresas');
      }

      setEmpresas(json.data || []);
      
      // Validar e selecionar empresa
      if (json.data && json.data.length > 0) {
        const savedEmpresa = localStorage.getItem('empresa-selecionada');
        const empresaValida = savedEmpresa && json.data.find((e: Empresa) => e.id === savedEmpresa);
        
        if (empresaValida) {
          // Empresa salva é válida para este usuário
          setEmpresaSelecionada(savedEmpresa);
        } else {
          // Empresa salva não existe ou usuário não tem acesso, selecionar a primeira
          const empresaId = json.data[0].id;
          setEmpresaSelecionada(empresaId);
          localStorage.setItem('empresa-selecionada', empresaId);
        }
      }
    } catch (err: any) {
      console.error('Erro ao buscar empresas:', err);
      setError(err.message || 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  };

  // Selecionar empresa
  const selecionarEmpresa = (empresaId: string) => {
    setEmpresaSelecionada(empresaId);
    localStorage.setItem('empresa-selecionada', empresaId);
  };

  // Carregar empresas quando o usuário estiver logado
  useEffect(() => {
    if (user?.id) {
      fetchEmpresas();
    }
  }, [user?.id]);

  // A seleção da empresa é feita apenas em fetchEmpresas após validar acesso

  return (
    <EmpresaContext.Provider 
      value={{
        empresas,
        empresaSelecionada,
        selecionarEmpresa,
        isLoading,
        error,
      }}
    >
      {children}
    </EmpresaContext.Provider>
  );
}

export function useEmpresa() {
  const context = useContext(EmpresaContext);
  if (context === undefined) {
    throw new Error('useEmpresa deve ser usado dentro de um EmpresaProvider');
  }
  return context;
}