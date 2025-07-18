'use client';

import React, { useState, useEffect } from 'react';
import { Search, Filter, MessageCircle, Calendar, User, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClienteWithEmpresa, ClienteFilters, ClienteListResponse } from '@/types';
import { useAuth } from '@/hooks/useAuth';

interface ClienteListProps {
}

export function ClienteList({}: ClienteListProps) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [clientes, setClientes] = useState<ClienteWithEmpresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ClienteFilters>({
    nome: '',
    orderBy: 'recent',
    page: 1,
    limit: 10,
  });
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });
  const [searchTerm, setSearchTerm] = useState('');

  const loadClientes = async (currentFilters: ClienteFilters) => {
    try {
      setLoading(true);
      setError(null);
      
      // Get auth token from localStorage
      const token = localStorage.getItem('auth-token');
      console.log('Token found:', !!token);
      if (!token) {
        throw new Error('Usuário não autenticado');
      }

      // Build query params
      const queryParams = new URLSearchParams();
      if (currentFilters.nome) queryParams.append('nome', currentFilters.nome);
      if (currentFilters.orderBy) queryParams.append('orderBy', currentFilters.orderBy);
      if (currentFilters.page) queryParams.append('page', currentFilters.page.toString());
      if (currentFilters.limit) queryParams.append('limit', currentFilters.limit.toString());

      console.log('Making request to:', `/api/clientes?${queryParams.toString()}`);
      
      const response = await fetch(`/api/clientes?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        const errorData = await response.json();
        console.log('Error data:', errorData);
        throw new Error(errorData.message || 'Erro ao carregar clientes');
      }

      const data = await response.json();
      console.log('Success data:', data);
      const clientesResponse: ClienteListResponse = data.data;
      
      setClientes(clientesResponse.clientes);
      setPagination({
        total: clientesResponse.total,
        page: clientesResponse.page,
        limit: clientesResponse.limit,
        totalPages: clientesResponse.totalPages,
      });
    } catch (err) {
      console.error('Error loading clientes:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  // Load initial data
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      loadClientes(filters);
    }
  }, [isAuthenticated, authLoading]);

  // Handle search
  const handleSearch = () => {
    const newFilters = { ...filters, nome: searchTerm, page: 1 };
    setFilters(newFilters);
    loadClientes(newFilters);
  };

  // Handle filter change
  const handleFilterChange = (orderBy: string) => {
    const newFilters = { ...filters, orderBy: orderBy as 'recent' | 'name' | 'date', page: 1 };
    setFilters(newFilters);
    loadClientes(newFilters);
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    const newFilters = { ...filters, page: newPage };
    setFilters(newFilters);
    loadClientes(newFilters);
  };

  // Handle WhatsApp message
  const handleWhatsAppMessage = (telefone: string, nome: string) => {
    try {
      if (!telefone) {
        alert('Telefone não disponível');
        return;
      }

      // Format phone number for WhatsApp
      const cleanPhone = telefone.replace(/\D/g, '');
      let formattedPhone = cleanPhone;
      
      // Add Brazil country code if not present
      if (!formattedPhone.startsWith('55')) {
        formattedPhone = `55${formattedPhone}`;
      }

      const mensagem = `Olá ${nome || 'cliente'}, como posso ajudar você hoje?`;
      const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(mensagem)}`;
      
      window.open(whatsappUrl, '_blank');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao enviar mensagem');
    }
  };

  // Handle Enter key in search
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Show loading while authenticating
  if (authLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Verificando autenticação...</span>
      </div>
    );
  }

  // Show error if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <h3 className="text-lg font-medium text-foreground mb-2">
            Acesso negado
          </h3>
          <p className="text-sm text-muted-foreground">
            Você precisa estar logado para acessar esta página
          </p>
        </div>
      </div>
    );
  }

  if (loading && clientes.length === 0) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Carregando clientes...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie seus clientes e relacionamentos
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-lg shadow-sm border border-border p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pl-10"
              />
            </div>
          </div>

          {/* Filter */}
          <div className="w-full md:w-48">
            <Select
              value={filters.orderBy}
              onValueChange={(value) => handleFilterChange(value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Mais recentes</SelectItem>
                <SelectItem value="name">Nome (A-Z)</SelectItem>
                <SelectItem value="date">Data de criação</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Search Button */}
          <Button onClick={handleSearch} className="w-full md:w-auto">
            <Search className="h-4 w-4 mr-2" />
            Pesquisar
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-destructive/10 border border-destructive rounded-md p-4">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/30">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    Nome
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 mr-2" />
                    Telefone
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    Primeira Interação
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {clientes.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="text-muted-foreground mb-4">
                      <User className="mx-auto h-12 w-12" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      Nenhum cliente encontrado
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {searchTerm ? 'Tente ajustar sua pesquisa' : 'Seus clientes aparecerão aqui'}
                    </p>
                  </td>
                </tr>
              ) : (
                clientes.map((cliente) => (
                  <tr key={cliente.id} className="hover:bg-muted/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                            <User className="h-5 w-5 text-muted-foreground" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-foreground">
                            {cliente.nome || 'Nome não informado'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {cliente.cliente_empresa.total_mensagens} mensagens
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-foreground">
                        {cliente.telefone || 'Não informado'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-foreground">
                        {cliente.cliente_empresa.primeiro_contato}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleWhatsAppMessage(
                          cliente.telefone || '',
                          cliente.nome || 'cliente'
                        )}
                        disabled={!cliente.telefone}
                        className="flex items-center space-x-2"
                      >
                        <MessageCircle className="h-4 w-4 text-green-500" />
                        <span>WhatsApp</span>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="bg-card rounded-lg shadow-sm border border-border p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Mostrando {((pagination.page - 1) * pagination.limit) + 1} a{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} de{' '}
              {pagination.total} resultados
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {pagination.page} de {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
              >
                Próxima
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {loading && clientes.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 shadow-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Carregando...</p>
          </div>
        </div>
      )}
    </div>
  );
}