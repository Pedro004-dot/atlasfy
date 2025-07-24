'use client';

import React, { useEffect, useState } from 'react';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { EmpresaSelector } from '@/components/EmpresaSelector';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ClienteAnalysisModal } from '@/components/cliente-analysis-modal';
import { AlertTriangle, TrendingUp, MessageSquare, Clock, DollarSign, Users, Target, AlertCircle, Info, CheckCircle2, XCircle } from 'lucide-react';

const timeFilters = [
  { label: '6h', value: '6h' },
  { label: 'Hoje', value: '24h' },
  { label: '7 dias', value: '7d' },
  { label: '30 dias', value: '30d' },
  { label: 'Todos', value: 'all' },
];

const severityConfig = {
  critical: { 
    icon: AlertTriangle, 
    color: 'destructive',
    bgColor: 'bg-destructive/10',
    borderColor: 'border-destructive/20',
    textColor: 'text-destructive'
  },
  high: { 
    icon: AlertCircle, 
    color: 'destructive',
    bgColor: 'bg-destructive/10',
    borderColor: 'border-destructive/20',
    textColor: 'text-destructive'
  },
  medium: { 
    icon: Info, 
    color: 'default',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    textColor: 'text-yellow-700 dark:text-yellow-300'
  },
  low: { 
    icon: Info, 
    color: 'secondary',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
    textColor: 'text-blue-700 dark:text-blue-300'
  }
};

const stageConfig = {
  DEMONSTRANDO_INTERESSE: { 
    title: 'Demonstrando Interesse', 
    icon: Target, 
    color: 'bg-blue-50 dark:bg-blue-900/30',
    borderColor: 'border-blue-200 dark:border-blue-700'
  },
  EM_NEGOCIACAO: { 
    title: 'Em Negociação', 
    icon: MessageSquare, 
    color: 'bg-orange-50 dark:bg-orange-900/30',
    borderColor: 'border-orange-200 dark:border-orange-700'
  },
  AGUARDANDO_PAGAMENTO: { 
    title: 'Aguardando Pagamento', 
    icon: DollarSign, 
    color: 'bg-green-50 dark:bg-green-900/30',
    borderColor: 'border-green-200 dark:border-green-700'
  },
  VENDA_FINALIZADA: { 
    title: 'Venda Finalizada', 
    icon: CheckCircle2, 
    color: 'bg-emerald-50 dark:bg-emerald-900/30',
    borderColor: 'border-emerald-200 dark:border-emerald-700'
  },
  erro_processamento: { 
    title: 'Erro Processamento', 
    icon: XCircle, 
    color: 'bg-red-50 dark:bg-red-900/30',
    borderColor: 'border-red-200 dark:border-red-700'
  },
  OUTROS: { 
    title: 'Outros', 
    icon: Users, 
    color: 'bg-slate-50 dark:bg-slate-900/50',
    borderColor: 'border-slate-200 dark:border-slate-700'
  }
};

interface ConversationAnalysis {
  conversation_id: string;
  cliente_telefone: string;
  cliente_nome: string;
  status: string;
  created_at: string;
  last_message_at: string;
  message_count: number;
  analysis_data: {
    alerts: Array<{
      type: string;
      message: string;
      severity: string;
      action_required: string;
    }>;
    lead_status: {
      stage: string;
      reasoning: string;
      confidence: number;
    };
    next_actions?: Array<{
      action: string;
      priority: string;
      description: string;
      estimated_conversion_impact: string;
    }>;
    urgency_level?: {
      level: string;
      score: number;
      factors: string[];
    };
    purchase_intent: {
      score: number;
      barriers: string[];
      indicators: string[];
    };
    sales_prediction: {
      conversion_probability: string | number;
      estimated_ticket_value: string | number;
      estimated_close_time_hours: string | number;
      risk_factors?: string[];
    };
    products_mentioned: Array<{
      product: string;
      variant?: string;
      interest_level: string;
    }>;
    sentiment_analysis: {
      customer_sentiment: string;
      satisfaction_score: string | number;
      emotional_indicators?: string[];
    };
    conversation_metrics: {
      total_messages: number;
      company_messages: number;
      customer_messages: number;
      response_time_avg_minutes: number;
      last_interaction_hours_ago: number | null;
    };
  };
}

interface AnalysisMetrics {
  totalConversations: number;
  avgConversionRate: number;
  totalRevenue: number;
  avgTicket: number;
  avgResponseTime: number;
  alertsByPriority: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export default function AnalisePage() {
  const [period, setPeriod] = useState('all');
  const { empresaSelecionada } = useEmpresa();
  const [conversations, setConversations] = useState<ConversationAnalysis[]>([]);
  const [metrics, setMetrics] = useState<AnalysisMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<ConversationAnalysis | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchAnalysisData = async () => {
    if (!empresaSelecionada) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) throw new Error('Token não encontrado');
      
      const params = new URLSearchParams({
        empresa_id: empresaSelecionada,
        period
      });
      
      const response = await fetch(`/api/analysis/conversations?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Erro ao carregar dados');
      }
      console.log('[AnalisePage] data:', data);
      setConversations(data.conversations || []);
      setMetrics(data.metrics || null);
    } catch (err: any) {
      console.error('Erro ao carregar análise:', err);
      setError(err.message || 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (empresaSelecionada) {
      fetchAnalysisData();
    }
  }, [empresaSelecionada, period]);

  // Organizar conversas por estágio
  const conversationsByStage = React.useMemo(() => {
    const stages: Record<string, ConversationAnalysis[]> = {};
    
    // Inicializar todos os estágios com arrays vazios
    Object.keys(stageConfig).forEach(stage => {
      stages[stage] = [];
    });
    
    // Distribuir as conversas pelos estágios
    conversations.forEach(conv => {
      console.log('[AnalisePage] conv:', conv);
      const stage = conv.analysis_data?.lead_status?.stage;
      
      if (stage && stages[stage]) {
        stages[stage].push(conv);
      } else {
        // Se não tem stage ou stage não reconhecido, vai para OUTROS
        stages['OUTROS'].push(conv);
      }
    });
    
    return stages;
  }, [conversations]);

  // Calcular alertas por prioridade
  const alertsByPriority = React.useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    
    conversations.forEach(conv => {
      conv.analysis_data?.alerts?.forEach(alert => {
        const severity = alert.severity?.toLowerCase();
        
        if (severity === 'crítico' || severity === 'critical') {
          counts.critical++;
        } else if (severity === 'alto' || severity === 'high' || severity === 'alta') {
          counts.high++;
        } else if (severity === 'médio' || severity === 'medium' || severity === 'media' || 
                   severity === 'moderado' || severity === 'moderate' || severity === 'moderada') {
          counts.medium++;
        } else if (severity === 'baixo' || severity === 'low' || severity === 'menor' || 
                   severity === 'normal' || severity === 'baixa') {
          counts.low++;
        } else {
          // Alertas sem severidade definida ou outros
          counts.low++;
        }
      });
    });
    
    return counts;
  }, [conversations]);

  const formatCurrency = (value: string | number) => {
    
    if (!value || value === 'N/A' || value === 'não_aplicável' || value === 'Não especificado na conversa' || value === '[Não especificado na conversa]' || value === 'INDEFINIDO' || value === 'Não informado' || value === 'indefinido' || value === 'Inválido') return 'N/A';
    
    // Se é string, usar parsing melhorado
    if (typeof value === 'string') {
      // Parsing simples e eficaz: extrair todos os números e pegar o maior
      const matches = value.match(/\d+/g);
      if (matches && matches.length > 0) {
        const valores = matches.map(match => parseFloat(match)).filter(v => !isNaN(v) && v > 0);
        const num = valores.length > 0 ? Math.max(...valores) : 0;
        return num > 0 ? new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(num) : 'N/A';
      } else {
        return 'N/A';
      }
    }
    
    // Se é número
    return isNaN(value) ? 'N/A' : new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPhone = (phone: string) => {
    const clean = phone.replace(/\D/g, '');
    return `*${clean.slice(2)}`;
  };
  const openWhatsapp = (phone: string) => {
    const clean = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${clean}`, '_blank');
  };

  const handleCardClick = (conv: ConversationAnalysis) => {
    setSelectedConversation(conv);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedConversation(null);
  };

  const getUrgencyColor = (hoursAgo: number | null) => {
    if (!hoursAgo) return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400';
    if (hoursAgo < 0.5) return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
    if (hoursAgo < 2) return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
    return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
  };

  const formatTimeAgo = (hoursAgo: number | null) => {
    if (!hoursAgo) return 'N/A';
    if (hoursAgo < 1) return `${Math.round(hoursAgo * 60)}m`;
    if (hoursAgo < 24) return `${Math.round(hoursAgo)}h`;
    return `${Math.round(hoursAgo / 24)}d`;
  };

  return (
    <>
      <style jsx>{`
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: hsl(var(--muted-foreground)) transparent;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: hsl(var(--muted-foreground));
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: hsl(var(--foreground));
        }
      `}</style>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border bg-background px-4 py-6 rounded-t-lg">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Análise de Vendas Inteligente</h1>
          <p className="text-muted-foreground mt-1">Dashboard completo com insights de conversas e oportunidades</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <EmpresaSelector className="min-w-[200px]" />
          
          <div className="flex gap-2">
            {timeFilters.map(f => (
              <Button
                key={f.value}
                variant={period === f.value ? "default" : "outline"}
                size="sm"
                onClick={() => setPeriod(f.value)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {!empresaSelecionada && (
        <div className="text-center text-muted-foreground py-8">
          Selecione uma empresa para visualizar os dados
        </div>
      )}

      {empresaSelecionada && loading && (
        <div className="text-center text-muted-foreground py-8">Carregando análise...</div>
      )}

      {empresaSelecionada && error && (
        <div className="text-center text-destructive py-8">{error}</div>
      )}

      {empresaSelecionada && !loading && !error && (
        <>
          {/* Métricas Executivas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">Taxa de Conversão</span>
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div className="text-2xl font-bold text-foreground">
                {metrics ? `${Math.round(metrics.avgConversionRate)}%` : '--'}
              </div>
              <p className="text-xs text-muted-foreground">Média do período</p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">Receita Estimada</span>
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
              <div className="text-2xl font-bold text-foreground">
                {metrics ? formatCurrency(metrics.totalRevenue) : '--'}
              </div>
              <p className="text-xs text-muted-foreground">Potencial identificado</p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">Ticket Médio</span>
                <Target className="h-4 w-4 text-primary" />
              </div>
              <div className="text-2xl font-bold text-foreground">
                {metrics ? formatCurrency(metrics.avgTicket) : '--'}
              </div>
              <p className="text-xs text-muted-foreground">Valor por conversão</p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">Tempo de Resposta</span>
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <div className="text-2xl font-bold text-foreground">
                {metrics ? `${Math.round(metrics.avgResponseTime)}min` : '--'}
              </div>
              <p className="text-xs text-muted-foreground">Média de resposta</p>
            </Card>
          </div>

          {/* Alertas por Prioridade
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {Object.entries(alertsByPriority).map(([priority, count]) => {
              const config = severityConfig[priority as keyof typeof severityConfig];
              const Icon = config.icon;
              
              return (
                <Card key={priority} className={`p-4 ${config.bgColor} ${config.borderColor} border`}>
                  <div className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 ${config.textColor}`} />
                    <div>
                      <div className="text-2xl font-bold">{count}</div>
                      <div className="text-sm capitalize text-muted-foreground">
                        {priority === 'critical' ? 'Crítico' : 
                         priority === 'high' ? 'Alto' :
                         priority === 'medium' ? 'Médio' : 'Baixo'}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div> */}

          {/* Kanban Board */}
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Pipeline de Vendas</h3>
              <div className="text-sm text-muted-foreground">
                {conversations.length} conversas • Filtro: {timeFilters.find(f => f.value === period)?.label}
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <div className="flex gap-4 min-w-max pb-4">
                {Object.entries(stageConfig).map(([stageKey, stageInfo]) => {
                  const stageConversations = conversationsByStage[stageKey] || [];
                  const StageIcon = stageInfo.icon;
                  
                  return (
                    <div key={stageKey} className="flex flex-col w-80 flex-shrink-0">
                      <div className={`${stageInfo.color} ${stageInfo.borderColor} border rounded-lg p-4 mb-4`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <StageIcon className="h-5 w-5" />
                            <span className="font-semibold text-sm">{stageInfo.title}</span>
                          </div>
                          <Badge variant="secondary" className="text-xs font-medium">
                            {stageConversations.length}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="space-y-3 flex-1 min-h-[400px] max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                        {stageConversations.length === 0 ? (
                          <div className="text-center text-muted-foreground py-8">
                            <div className="text-xs">Nenhuma conversa</div>
                          </div>
                        ) : (
                          stageConversations.map((conv) => (
                            <Card 
                              key={conv.conversation_id}
                              className="p-4 hover:shadow-lg transition-all duration-200 cursor-pointer border border-border hover:border-primary/20"
                              onClick={() => handleCardClick(conv)}
                              style={{ cursor: 'pointer' }}
                            >
                              <div className="space-y-3">
                                {/* Header - Cliente e Alertas */}
                                <div className="flex items-center justify-between pb-2 border-b border-border">
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-sm text-foreground">
                                      {conv.cliente_nome}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {formatPhone(conv.cliente_telefone)}
                                    </span>
                                  </div>
                                  {conv.analysis_data?.alerts?.length > 0 && (
                                    <Badge variant="destructive" className="text-xs h-5 px-2 font-medium">
                                      {conv.analysis_data.alerts.length} 🚨
                                    </Badge>
                                  )}
                                </div>

                                {/* Produto Principal */}
                                {conv.analysis_data?.products_mentioned?.[0] && (
                                  <div className="bg-muted/30 rounded-md p-2">
                                    <div className="text-xs font-medium text-muted-foreground mb-1">Produto:</div>
                                    <div className="text-sm font-medium text-foreground line-clamp-2">
                                      {conv.analysis_data.products_mentioned[0].product}
                                      {conv.analysis_data.products_mentioned[0].variant && 
                                        ` - ${conv.analysis_data.products_mentioned[0].variant}`
                                      }
                                    </div>
                                  </div>
                                )}

                                {/* Métricas - Valor e Probabilidade */}
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="text-center bg-primary/5 rounded-md p-2">
                                    <div className="text-xs text-muted-foreground mb-1">Valor Est.</div>
                                    <div className="text-sm font-bold text-primary">
                                      {formatCurrency(conv.analysis_data?.sales_prediction?.estimated_ticket_value)}
                                    </div>
                                  </div>
                                  <div className="text-center bg-green-50 dark:bg-green-950/30 rounded-md p-2">
                                    <div className="text-xs text-muted-foreground mb-1">Conversão</div>
                                    <div className="text-sm font-bold text-green-600 dark:text-green-400">
                                      {typeof conv.analysis_data?.purchase_intent?.score === 'number' 
                                        ? `${Math.round(conv.analysis_data.purchase_intent.score * 100)}%`
                                        : '--'
                                      }
                                    </div>
                                  </div>
                                </div>

                                {/* Footer - Tempo e Mensagens */}
                                <div className="flex justify-between items-center pt-2 border-t border-border">
                                  <Badge 
                                    variant="outline"
                                    className={`text-xs px-2 py-1 ${getUrgencyColor(
                                      conv.analysis_data?.conversation_metrics?.last_interaction_hours_ago
                                    )}`}
                                  >
                                    ⏰ {formatTimeAgo(conv.analysis_data?.conversation_metrics?.last_interaction_hours_ago)}
                                  </Badge>
                                  
                                  <Badge variant="secondary" className="text-xs px-2 py-1">
                                    💬 {conv.analysis_data?.conversation_metrics?.total_messages || 0}
                                  </Badge>
                                </div>
                              </div>
                            </Card>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </>
      )}
      
      {/* Modal de Detalhes do Cliente */}
      <ClienteAnalysisModal
      
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        conversation={selectedConversation || null}
      />
      </div>
    </>
  );
}