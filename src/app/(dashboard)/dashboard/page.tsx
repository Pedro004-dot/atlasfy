"use client";

import React, { useState, useEffect } from 'react';
import { useUser } from "@/contexts/UserContext";
import { useEmpresa } from "@/contexts/EmpresaContext";
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Users, 
  BarChart3, 
  Plus, 
  MessageSquare, 
  TrendingUp,
  ArrowRight,
  Loader2
} from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  totalEmpresas: number;
  totalClientes: number;
  isLoading: boolean;
}

export default function DashboardPage() {
  const user = useUser();
  const { empresaSelecionada } = useEmpresa();
  const [stats, setStats] = useState<DashboardStats>({
    totalEmpresas: 0,
    totalClientes: 0,
    isLoading: true
  });

  // Buscar estatísticas
  const fetchStats = async () => {
    try {
      setStats(prev => ({ ...prev, isLoading: true }));
      const token = localStorage.getItem('auth-token');
      
      if (!token) {
        throw new Error('Token não encontrado');
      }

      // Buscar empresas
      const empresasResponse = await fetch('/api/empresas', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      let totalEmpresas = 0;
      if (empresasResponse.ok) {
        const empresasData = await empresasResponse.json();
        totalEmpresas = empresasData.data?.length || 0;
      }

      // Buscar clientes (usando primeira empresa se disponível)
      let totalClientes = 0;
      if (empresaSelecionada) {
        const clientesResponse = await fetch(`/api/clientes?empresa_id=${empresaSelecionada}&limit=1`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (clientesResponse.ok) {
          const clientesData = await clientesResponse.json();
          totalClientes = clientesData.data?.total || 0;
        }
      }

      setStats({
        totalEmpresas,
        totalClientes,
        isLoading: false
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      setStats(prev => ({ ...prev, isLoading: false }));
    }
  };

  useEffect(() => {
    fetchStats();
  }, [empresaSelecionada]);

  const actionCards = [
    {
      title: "Criar Empresa",
      description: "Crie um agente para sua empresa para organizar seus negócios.",
      icon: Building2,
      href: "/dashboard/empresa",
      tag: "Automação",
      tagIcon: Plus,
      color: "from-red-500 to-orange-500",
      bgColor: "bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30"
    },
    {
      title: "Visualizar Clientes",
      description: "Gerencie todos os seus clientes.",
      icon: Users,
      href: "/dashboard/clientes",
      tag: "Comunicação",
      tagIcon: MessageSquare,
      color: "from-blue-500 to-purple-500",
      bgColor: "bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30"
    },
    {
      title: "Analisar Métricas",
      description: "Acompanhe métricas de desempenho, leads gerados e eficácia dos seus agentes de IA.",
      icon: BarChart3,
      href: "/dashboard/analise",
      tag: "Análise",
      tagIcon: TrendingUp,
      color: "from-green-500 to-emerald-500",
      bgColor: "bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30"
    }
  ];

  return (
    <div 
      className="min-h-screen bg-background p-6"
      style={{ 
        fontFamily: 'var(--font-sans)', 
        letterSpacing: 'var(--tracking-normal)' 
      }}
    >
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header com saudação */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h1 
              className="text-4xl font-bold leading-tight"
              style={{
                fontFamily: 'Montserrat, Inter, sans-serif',
                background: 'linear-gradient(135deg, hsl(0 100% 60%) 0%, hsl(var(--foreground)) 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundSize: '200% 200%',
                animation: 'gradient-shift 3s ease-in-out infinite'
              }}
            >
              Olá, {user?.nome || 'Usuário'}!
            </h1>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span>
                  {stats.isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin inline" />
                  ) : (
                    `${stats.totalEmpresas} empresa${stats.totalEmpresas !== 1 ? 's' : ''} criada${stats.totalEmpresas !== 1 ? 's' : ''}`
                  )}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>
                  {stats.isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin inline" />
                  ) : (
                    `${stats.totalClientes} cliente${stats.totalClientes !== 1 ? 's' : ''}`
                  )}
                </span>
              </div>
              
              <Link 
                href="/dashboard/analise"
                className="text-primary hover:text-primary/80 transition-colors font-medium"
              >
                Ver Insights
              </Link>
            </div>
          </div>
        </div>

        {/* Seção "O que você deseja fazer hoje?" */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-foreground">
            O que você deseja fazer hoje?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {actionCards.map((card, index) => {
              const Icon = card.icon;
              const TagIcon = card.tagIcon;
              
              return (
                <Card 
                  key={index}
                  className={`group hover:shadow-lg transition-all duration-300 cursor-pointer border-0 overflow-hidden ${card.bgColor}`}
                  style={{ 
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <Link href={card.href} className="block p-6 h-full">
                    <div className="space-y-4">
                      {/* Header do Card */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className={`w-12 h-12 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center`}
                            style={{ borderRadius: 'var(--radius)' }}
                          >
                            <Icon className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-bold text-foreground text-lg">
                              {card.title}
                            </h3>
                            <Badge 
                              variant="secondary" 
                              className="text-xs font-medium mt-1"
                              style={{ borderRadius: 'var(--radius-sm)' }}
                            >
                              <TagIcon className="h-3 w-3 mr-1" />
                              {card.tag}
                            </Badge>
                          </div>
                        </div>
                        
                        <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </div>
                      
                      {/* Descrição */}
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {card.description}
                      </p>
                    </div>
                  </Link>
                </Card>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}