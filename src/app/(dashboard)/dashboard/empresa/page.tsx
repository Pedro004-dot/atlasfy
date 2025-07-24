'use client';
import React, { useState, useEffect } from 'react';
import { Plus, Building2, AlertCircle, Search, Filter, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CompanyCard } from '@/components/companies/company-card';
import { CreateCompanyWizard } from '@/components/companies/create-company-wizard';
import { EditCompanyModal } from '@/components/companies/edit-company-modal';
import { useToast } from '@/components/ui/toast';
import { Empresa } from '@/types/empresa';
import { useUser } from "@/contexts/UserContext";
import { canCreateEmpresa } from "@/lib/planPermissions";
import { useProfileComplete } from '@/hooks/useUserProfile';

export default function EmpresaPage() {
  const [companies, setCompanies] = useState<Empresa[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Empresa | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const user = useUser();
  const { addToast } = useToast();
  const { isComplete: isProfileComplete, isLoading: isProfileLoading } = useProfileComplete();
  console.log(`user: ${user}`);
  const podeCriar = user ? canCreateEmpresa(user.plano_id, companies.length) : false;
  const podeIniciarCriacao = podeCriar && isProfileComplete;

 console.log(`empresas atuais: ${companies.length}`);
 console.log(`plano_id do usuário: ${user?.plano_id}`);
 console.log(`pode criar: ${podeCriar}`);

  const fetchCompanies = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('auth-token');
      
      if (!token) {
        setError('Token não encontrado');
        return;
      }

      const response = await fetch('/api/empresas', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar empresas');
      }

      const data = await response.json();
      setCompanies(data.data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching companies:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleCompanyCreated = (newCompany: Empresa) => {
    setCompanies(prev => [newCompany, ...prev]);
    setIsCreateModalOpen(false);
  };

  const handleEdit = async (company: Empresa) => {
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) {
        throw new Error('Token não encontrado');
      }

      console.log('[EDIT] Buscando dados completos da empresa:', company.id);

      const response = await fetch(`/api/empresas/${company.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      if (result.success) {
        console.log('[EDIT] Dados completos carregados:', result.data);
        setSelectedCompany(result.data); // Dados completos com blocked_numbers
        setIsEditModalOpen(true);
      } else {
        throw new Error(result.message || 'Erro ao carregar empresa');
      }
    } catch (error) {
      console.error('Erro ao carregar empresa para edição:', error);
      addToast({
        type: 'error',
        message: 'Erro ao carregar dados da empresa'
      });
    }
  };

  const handleCardClick = async (company: Empresa) => {
    await handleEdit(company);
  };

  const handleCompanyUpdated = (updatedCompany: Empresa) => {
    setCompanies(prev => prev.map(company => 
      company.id === updatedCompany.id ? updatedCompany : company
    ));
    setIsEditModalOpen(false);
    setSelectedCompany(null);
  };

  const handleDelete = async (company: Empresa) => {
    if (!confirm(`Tem certeza que deseja excluir a empresa "${company.nome}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('auth-token');
      if (!token) {
        addToast({
          type: 'error',
          message: 'Token não encontrado'
        });
        return;
      }

      const response = await fetch(`/api/empresas/${company.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Erro ao excluir empresa');
      }

      addToast({
        type: 'success',
        message: 'Empresa excluída com sucesso!'
      });

      setCompanies(prev => prev.filter(c => c.id !== company.id));
    } catch (error: any) {
      addToast({
        type: 'error',
        message: error.message || 'Erro ao excluir empresa'
      });
    }
  };

  const filteredCompanies = companies.filter(company => {
    const matchesSearch = company.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         company.setor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         company.cnpj?.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && company.ativo) ||
                         (statusFilter === 'inactive' && !company.ativo);
    
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div 
        className="space-y-6 min-h-screen bg-background"
        style={{ fontFamily: 'var(--font-sans)', letterSpacing: 'var(--tracking-normal)' }}
      >
        <div className="mb-8">
          <h1 className="atlas-heading text-3xl font-bold text-foreground">Minhas Empresas</h1>
          <p className="atlas-muted mt-2">
            Gerencie suas empresas e organize seus negócios
          </p>
        </div>
        <div className="text-center py-16">
          <Loader2 className="h-12 w-12 text-primary mx-auto animate-spin" />
          <p className="atlas-text mt-4 text-muted-foreground">Carregando empresas...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="space-y-6 min-h-screen bg-background"
      style={{ fontFamily: 'var(--font-sans)', letterSpacing: 'var(--tracking-normal)' }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="atlas-heading text-3xl font-bold text-foreground">Minhas Empresas</h1>
          <p className="atlas-muted mt-2">
            Gerencie suas empresas e organize seus negócios
          </p>
        </div>
        <div className="flex flex-col items-end">
          <Button
            onClick={() => {
              if (!isProfileComplete) {
                const currentUrl = window.location.pathname;
                window.location.href = `/completar-perfil?redirect=${encodeURIComponent(currentUrl)}`;
                return;
              }
              setIsCreateModalOpen(true);
            }}
            className="atlas-button-primary flex items-center gap-2"
            style={{ borderRadius: 'var(--radius)' }}
            disabled={!podeCriar || isProfileLoading}
          >
            <Plus className="h-4 w-4" />
            Nova Empresa
          </Button>
          {!podeCriar && (
            <span className="text-xs text-red-500 mt-1">Limite de empresas atingido para seu plano.</span>
          )}
          {podeCriar && !isProfileComplete && !isProfileLoading && (
            <span className="text-xs text-yellow-600 mt-1">Complete seu perfil para criar empresas.</span>
          )}
        </div>
      </div>

      {/* Profile Completion Warning */}
      {!isProfileComplete && !isProfileLoading && (
        <Card 
          className="p-4 border-l-4 border-l-yellow-500 bg-yellow-50"
          style={{ borderRadius: 'var(--radius)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  Complete seu perfil para criar empresas
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  Para criar empresas e gerar links de pagamento, você precisa completar algumas informações do seu perfil.
                </p>
              </div>
            </div>
            <Button
              onClick={() => {
                const currentUrl = window.location.pathname;
                window.location.href = `/completar-perfil?redirect=${encodeURIComponent(currentUrl)}`;
              }}
              size="sm"
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              Completar Perfil
            </Button>
          </div>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card 
          className="atlas-card p-6"
          style={{ 
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="atlas-muted text-sm font-medium">Total de Empresas</p>
              <p className="atlas-heading text-2xl font-bold text-foreground">{companies.length}</p>
            </div>
            <div 
              className="w-12 h-12 bg-primary/10 flex items-center justify-center"
              style={{ borderRadius: 'var(--radius)' }}
            >
              <Building2 className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card 
          className="atlas-card p-6"
          style={{ 
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="atlas-muted text-sm font-medium">Empresas Ativas</p>
              <p className="atlas-heading text-2xl font-bold text-green-600">
                {companies.filter(c => c.ativo).length}
              </p>
            </div>
            <div 
              className="w-12 h-12 bg-green-100 flex items-center justify-center"
              style={{ borderRadius: 'var(--radius)' }}
            >
              <Building2 className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card 
          className="atlas-card p-6"
          style={{ 
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="atlas-muted text-sm font-medium">Empresas Inativas</p>
              <p className="atlas-heading text-2xl font-bold text-red-600">
                {companies.filter(c => !c.ativo).length}
              </p>
            </div>
            <div 
              className="w-12 h-12 bg-red-100 flex items-center justify-center"
              style={{ borderRadius: 'var(--radius)' }}
            >
              <Building2 className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Error Message */}
      {error && (
        <Card 
          className="atlas-error p-4"
          style={{ borderRadius: 'var(--radius)' }}
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <p className="atlas-text text-destructive">{error}</p>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {companies.length === 0 && !error ? (
        <Card 
          className="atlas-card p-16"
          style={{ 
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div className="text-center">
            <div 
              className="w-24 h-24 bg-muted flex items-center justify-center mx-auto mb-6"
              style={{ borderRadius: 'var(--radius-lg)' }}
            >
              <Building2 className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="atlas-heading text-xl font-semibold text-foreground mb-2">
              Nenhuma empresa encontrada
            </h3>
            <p className="atlas-muted mb-8 max-w-md mx-auto">
              Comece criando sua primeira empresa para organizar seus negócios e gerenciar seus agentes
            </p>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="atlas-button-primary flex items-center gap-2"
              style={{ borderRadius: 'var(--radius)' }}
            >
              <Plus className="h-4 w-4" />
              Criar Primeira Empresa
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {/* Results Info */}
          <div className="flex items-center justify-between">
            <p className="atlas-muted text-sm">
              {filteredCompanies.length === companies.length 
                ? `${companies.length} empresa${companies.length !== 1 ? 's' : ''} encontrada${companies.length !== 1 ? 's' : ''}`
                : `${filteredCompanies.length} de ${companies.length} empresa${companies.length !== 1 ? 's' : ''}`
              }
            </p>
          </div>

          {/* Companies Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCompanies.map((company) => (
              <CompanyCard
                key={company.id}
                company={company}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onCardClick={handleCardClick}
              />
            ))}
          </div>

          {/* No Results */}
          {filteredCompanies.length === 0 && companies.length > 0 && (
            <div className="text-center py-12">
              <div 
                className="w-16 h-16 bg-muted flex items-center justify-center mx-auto mb-4"
                style={{ borderRadius: 'var(--radius-lg)' }}
              >
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="atlas-heading text-lg font-medium text-foreground mb-2">
                Nenhuma empresa encontrada
              </h3>
              <p className="atlas-muted text-sm">
                Tente ajustar os filtros ou termos de busca
              </p>
            </div>
          )}
        </>
      )}

      {/* Create Company Wizard */}
      <CreateCompanyWizard
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCompanyCreated={handleCompanyCreated}
        canCreate={podeCriar}
      />

      {/* Edit Company Modal */}
      <EditCompanyModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedCompany(null);
        }}
        onCompanyUpdated={handleCompanyUpdated}
        company={selectedCompany}
      />
    </div>
  );
}