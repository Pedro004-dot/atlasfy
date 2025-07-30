'use client';

import React, { useEffect, useState } from 'react';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { EmpresaSelector } from '@/components/EmpresaSelector';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ClienteAnalysisModal } from '@/components/cliente-analysis-modal';
import { AlertTriangle, TrendingUp, MessageSquare, Clock, DollarSign, Users, Target, AlertCircle, Info, CheckCircle2, XCircle, UserX, PhoneCall } from 'lucide-react';

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
  LEAD_PERDIDO: {
    title: 'Leads Perdidos',
    icon: UserX,
    color: 'bg-red-50 dark:bg-red-950/30',
    borderColor: 'border-red-200 dark:border-red-700'
  },
  FOLLOW_UP: {
    title: 'Follow-up',
    icon: PhoneCall,
    color: 'bg-purple-50 dark:bg-purple-950/30',
    borderColor: 'border-purple-200 dark:border-purple-700'
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
    conversion_analysis?: {
      status: string;
      lost_reason?: string;
      lost_category?: string;
      lost_description?: string;
      lost_stage?: string;
      lost_date?: string;
      recovery_potential?: string;
    };
    follow_up_analysis?: {
      needs_follow_up: boolean;
      follow_up_priority?: string;
      last_interaction_type?: string;
      follow_up_approach?: string;
      interest_signals?: string[];
      optimal_follow_up_message?: string;
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

  // Função para normalizar dados do backend (ADAPTER PATTERN)
  const normalizeConversation = (conv: any): ConversationAnalysis => {
    return {
      ...conv,
      analysis_data: {
        ...conv.analysis_data,
        conversation_metrics: {
          total_messages: conv.analysis_data?.conversation_metrics?.total_messages || 0,
          company_messages: conv.analysis_data?.conversation_metrics?.company_messages || 0,
          customer_messages: conv.analysis_data?.conversation_metrics?.customer_messages || 0,
          response_time_avg_minutes: conv.analysis_data?.conversation_metrics?.response_time_avg_minutes || 0,
          last_interaction_hours_ago: conv.analysis_data?.conversation_metrics?.last_interaction_hours_ago || null,
        },
        alerts: conv.analysis_data?.alerts || [],
        lead_status: conv.analysis_data?.lead_status || { stage: 'OUTROS', reasoning: '', confidence: 0 },
        purchase_intent: conv.analysis_data?.purchase_intent || { score: 0, barriers: [], indicators: [] },
        sales_prediction: conv.analysis_data?.sales_prediction || { 
          conversion_probability: 0, 
          estimated_ticket_value: 0, 
          estimated_close_time_hours: 0 
        },
        products_mentioned: conv.analysis_data?.products_mentioned || [],
        sentiment_analysis: conv.analysis_data?.sentiment_analysis || { 
          customer_sentiment: 'neutro', 
          satisfaction_score: 0 
        }
      }
    };
  };

  // Função para determinar estágio (STRATEGY PATTERN)
  const getConversationStage = (conv: ConversationAnalysis): string => {
    const normalizedConv = normalizeConversation(conv);
    const stage = normalizedConv.analysis_data?.lead_status?.stage;
    
    // Verificar se é lead perdido baseado em conversion_analysis
    if (normalizedConv.analysis_data?.conversion_analysis?.status === 'lost') {
      return 'LEAD_PERDIDO';
    }
    
    // Verificar se é follow-up baseado em follow_up_analysis
    if (normalizedConv.analysis_data?.follow_up_analysis?.needs_follow_up) {
      return 'FOLLOW_UP';
    }
    
    // Usar stage padrão ou OUTROS
    return (stage && stageConfig[stage as keyof typeof stageConfig]) ? stage : 'OUTROS';
  };

  // Organizar conversas por estágio (REFATORADO)
  const conversationsByStage = React.useMemo(() => {
    const stages: Record<string, ConversationAnalysis[]> = {};
    
    // Inicializar todos os estágios com arrays vazios
    Object.keys(stageConfig).forEach(stage => {
      stages[stage] = [];
    });
    
    // Distribuir as conversas pelos estágios usando strategy
    conversations.forEach(conv => {
      const normalizedConv = normalizeConversation(conv);
      const stage = getConversationStage(normalizedConv);
      
      console.log(`[AnalisePage] Conversa ${conv.conversation_id} -> Estágio: ${stage}`);
      
      if (stages[stage]) {
        stages[stage].push(normalizedConv);
      } else {
        console.warn(`[AnalisePage] Estágio não reconhecido: ${stage}`);
        stages['OUTROS'].push(normalizedConv);
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

  const parseChurnDescription = (description: string) => {
    if (!description) return { title: 'Motivo não especificado', details: '' };
    
    const parts = description.split(': ');
    if (parts.length >= 2) {
      return {
        title: parts[0],
        details: parts.slice(1).join(': ')
      };
    }
    
    return {
      title: description.length > 30 ? description.substring(0, 30) + '...' : description,
      details: description
    };
  };

  // FACTORY PATTERN: Renderizadores de Card por Tipo
  const renderCardContent = (conv: ConversationAnalysis) => {
    const stage = conv.analysis_data?.lead_status?.stage;
    
    // LEAD_PERDIDO Card
    if (stage === 'LEAD_PERDIDO' && conv.analysis_data?.conversion_analysis?.lost_description) {
      return (
        <>
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md p-3">
            <div className="text-xs font-medium text-red-700 dark:text-red-300 mb-1">Motivo da Desistência:</div>
            <div className="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">
              {parseChurnDescription(conv.analysis_data.conversion_analysis.lost_description).title}
            </div>
            <div className="text-xs text-red-700 dark:text-red-300 line-clamp-2">
              {parseChurnDescription(conv.analysis_data.conversion_analysis.lost_description).details}
            </div>
            {conv.analysis_data?.products_mentioned?.[0] && (
              <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                Produto: {conv.analysis_data.products_mentioned[0].product}
                {conv.analysis_data.products_mentioned[0].variant && ` - ${conv.analysis_data.products_mentioned[0].variant}`}
              </div>
            )}
            {conv.analysis_data.conversion_analysis.recovery_potential && (
              <div className="mt-2">
                <Badge 
                  variant={conv.analysis_data.conversion_analysis.recovery_potential === 'high' ? 'default' : 
                          conv.analysis_data.conversion_analysis.recovery_potential === 'medium' ? 'secondary' : 'outline'}
                  className="text-xs"
                >
                  Potencial: {conv.analysis_data.conversion_analysis.recovery_potential === 'high' ? 'Alto' : 
                             conv.analysis_data.conversion_analysis.recovery_potential === 'medium' ? 'Médio' : 'Baixo'}
                </Badge>
              </div>
            )}
          </div>
        </>
      );
    }
    
    // FOLLOW_UP Card
    if (stage === 'FOLLOW_UP' && conv.analysis_data?.follow_up_analysis) {
      return (
        <>
          <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-md p-3">
            <div className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-1">Follow-up Necessário:</div>
            <div className="text-sm text-purple-800 dark:text-purple-200 mb-2">
              Última interação: {conv.analysis_data.follow_up_analysis.last_interaction_type || 'N/A'}
            </div>
            {conv.analysis_data?.products_mentioned?.[0] && (
              <div className="text-xs text-purple-600 dark:text-purple-400 mb-2">
                Produto: {conv.analysis_data.products_mentioned[0].product}
                {conv.analysis_data.products_mentioned[0].variant && ` - ${conv.analysis_data.products_mentioned[0].variant}`}
              </div>
            )}
            {conv.analysis_data.follow_up_analysis.follow_up_priority && (
              <Badge 
                variant={conv.analysis_data.follow_up_analysis.follow_up_priority === 'high' ? 'default' : 
                        conv.analysis_data.follow_up_analysis.follow_up_priority === 'medium' ? 'secondary' : 'outline'}
                className="text-xs"
              >
                Prioridade: {conv.analysis_data.follow_up_analysis.follow_up_priority === 'high' ? 'Alta' : 
                             conv.analysis_data.follow_up_analysis.follow_up_priority === 'medium' ? 'Média' : 'Baixa'}
              </Badge>
            )}
          </div>
        </>
      );
    }
    
    // DEFAULT Card (outras colunas)
    return (
      <>
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
      </>
    );
  };

  // FACTORY PATTERN: Métricas por Tipo
  const renderCardMetrics = (conv: ConversationAnalysis) => {
    const stage = conv.analysis_data?.lead_status?.stage;
    
    // Métricas para LEAD_PERDIDO
    if (stage === 'LEAD_PERDIDO') {
      return (
        <div className="grid grid-cols-2 gap-2">
          <div className="text-center bg-red-50 dark:bg-red-950/30 rounded-md p-2">
            <div className="text-xs text-muted-foreground mb-1">Valor Perdido</div>
            <div className="text-sm font-bold text-red-600 dark:text-red-400">
              {formatCurrency(conv.analysis_data?.sales_prediction?.estimated_ticket_value)}
            </div>
          </div>
          <div className="text-center bg-orange-50 dark:bg-orange-950/30 rounded-md p-2">
            <div className="text-xs text-muted-foreground mb-1">Estágio Perdido</div>
            <div className="text-sm font-bold text-orange-600 dark:text-orange-400">
              {conv.analysis_data?.conversion_analysis?.lost_stage === 'interesse' ? 'Interesse' :
               conv.analysis_data?.conversion_analysis?.lost_stage === 'negociacao' ? 'Negociação' :
               conv.analysis_data?.conversion_analysis?.lost_stage === 'pagamento' ? 'Pagamento' : 'N/A'}
            </div>
          </div>
        </div>
      );
    }
    
    // Métricas padrão para outras colunas
    return (
      <div className="grid grid-cols-2 gap-2">
        <div className="text-center bg-primary/5 rounded-md p-2">
          <div className="text-xs text-muted-foreground mb-1">Valor Est.</div>
          <div className="text-sm font-bold text-primary">
            {formatCurrency(conv.analysis_data?.sales_prediction?.estimated_ticket_value)}
          </div>
        </div>
        <div className="text-center bg-green-50 dark:bg-green-950/30 rounded-md p-2">
          <div className="text-xs text-muted-foreground mb-1">
            {stage === 'FOLLOW_UP' ? 'Follow-up' : 'Conversão'}
          </div>
          <div className="text-sm font-bold text-green-600 dark:text-green-400">
            {stage === 'FOLLOW_UP' 
              ? (conv.analysis_data?.follow_up_analysis?.follow_up_priority === 'high' ? 'Alta' : 
                 conv.analysis_data?.follow_up_analysis?.follow_up_priority === 'medium' ? 'Média' : 'Baixa')
              : (typeof conv.analysis_data?.purchase_intent?.score === 'number' 
                 ? `${Math.round(conv.analysis_data.purchase_intent.score * 100)}%`
                 : '--')
            }
          </div>
        </div>
      </div>
    );
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
                              className={`p-4 hover:shadow-lg transition-all duration-200 cursor-pointer border ${
                                conv.analysis_data?.lead_status?.stage === 'LEAD_PERDIDO' 
                                  ? 'border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700'
                                  : conv.analysis_data?.lead_status?.stage === 'FOLLOW_UP'
                                  ? 'border-purple-200 dark:border-purple-800 hover:border-purple-300 dark:hover:border-purple-700'
                                  : 'border-border hover:border-primary/20'
                              }`}
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

                                {/* FACTORY PATTERN: Conteúdo por tipo de card */}
                                {renderCardContent(conv)}

                                {/* FACTORY PATTERN: Métricas por tipo de card */}
                                {renderCardMetrics(conv)}

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