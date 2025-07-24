'use client';

import React from 'react';
import { Modal, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  X, 
  MessageSquare, 
  Phone, 
  User, 
  Clock, 
  TrendingUp, 
  DollarSign, 
  Target, 
  AlertTriangle,
  Calendar,
  Zap
} from 'lucide-react';

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

interface ClienteAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: ConversationAnalysis | null;
}

export function ClienteAnalysisModal({ isOpen, onClose, conversation }: ClienteAnalysisModalProps) {
  if (!conversation) return null;

  const formatCurrency = (value: string | number) => {
    if (!value || value === 'N/A' || value === 'não_aplicável' || 
        value === 'Não especificado na conversa' || value === '[Não especificado na conversa]' || 
        value === 'INDEFINIDO' || value === 'Não informado' || value === 'indefinido' || 
        value === 'Inválido') return 'N/A';
    
    if (typeof value === 'string') {
      const cleanValue = value.replace(/[^0-9.,]/g, '').replace(',', '.');
      const num = parseFloat(cleanValue);
      return isNaN(num) ? 'N/A' : new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(num);
    }
    
    return isNaN(Number(value)) ? 'N/A' : new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Number(value));
  };

  const formatPhone = (phone: string) => {
    const clean = phone.replace(/\D/g, '');
    return `*${clean.slice(2)}`;
  };

  const openWhatsapp = (phone: string) => {
    const clean = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${clean}`, '_blank');
  };

  const formatTimeAgo = (hoursAgo: number | null) => {
    if (!hoursAgo) return 'N/A';
    if (hoursAgo < 1) return `${Math.round(hoursAgo * 60)}m`;
    if (hoursAgo < 24) return `${Math.round(hoursAgo)}h`;
    return `${Math.round(hoursAgo / 24)}d`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getUrgencyColor = (level?: string) => {
    switch (level?.toLowerCase()) {
      case 'alta': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
      case 'média': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
      case 'baixa': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'crítico': case 'critical': 
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200';
      case 'alto': case 'high': case 'alta':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200';
      case 'médio': case 'medium': case 'média':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200';
      default:
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200';
    }
  };

  const analysis = conversation.analysis_data;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalBody>
        <div className="space-y-6" style={{ fontFamily: 'var(--font-sans)', letterSpacing: 'var(--tracking-normal)' }}>
          {/* Header */}
          <div className="bg-muted p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-primary" />
                <span className="font-semibold text-lg">{conversation.cliente_nome}</span>
                <Badge variant="outline" className="text-xs">
                  {formatPhone(conversation.cliente_telefone)}
                </Badge>
                <Badge variant="default" className="text-xs">
                  {analysis.lead_status?.stage || 'N/A'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  ⏰ {formatTimeAgo(analysis.conversation_metrics?.last_interaction_hours_ago)}
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>💬 {analysis.conversation_metrics?.total_messages || 0} msgs</span>
                <span>🤖 {typeof analysis.sales_prediction?.conversion_probability === 'number' 
                  ? `${Math.round(analysis.sales_prediction.conversion_probability * 100)}%` 
                  : analysis.sales_prediction?.conversion_probability || 'N/A'} conversão</span>
                <span>💰 {formatCurrency(analysis.sales_prediction?.estimated_ticket_value)}</span>
              </div>
              
              {analysis.alerts && analysis.alerts.length > 0 && (
                <Badge variant="destructive" className="text-xs">
                  🚨 {analysis.alerts[0].message?.substring(0, 30)}...
                </Badge>
              )}
            </div>
          </div>

          {/* Situação e Produto */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Situação */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  SITUAÇÃO
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">📊 Status:</span>
                  <span className="text-sm font-medium">{analysis.lead_status?.stage || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">🎯 Urgência:</span>
                  <Badge className={`text-xs ${getUrgencyColor(analysis.urgency_level?.level)}`}>
                    {analysis.urgency_level?.level || 'N/A'} ({Math.round((analysis.urgency_level?.score || 0) * 100)}%)
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">😊 Satisfação:</span>
                  <span className="text-sm font-medium">
                    {typeof analysis.sentiment_analysis?.satisfaction_score === 'number'
                      ? `${Math.round(analysis.sentiment_analysis.satisfaction_score * 100)}%`
                      : analysis.sentiment_analysis?.satisfaction_score || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">⚡ Intenção:</span>
                  <span className="text-sm font-medium">
                    {typeof analysis.purchase_intent?.score === 'number'
                      ? `${Math.round(analysis.purchase_intent.score * 100)}%`
                      : 'N/A'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Produto */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  PRODUTO
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {analysis.products_mentioned && analysis.products_mentioned[0] ? (
                  <>
                    <div>
                      <span className="text-sm">📦 {analysis.products_mentioned[0].product}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">🔥 Interesse:</span>
                      <span className="text-sm font-medium">{analysis.products_mentioned[0].interest_level}</span>
                    </div>
                    {analysis.products_mentioned[0].variant && (
                      <div>
                        <span className="text-sm">💎 {analysis.products_mentioned[0].variant}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-sm">💸 Valor:</span>
                      <span className="text-sm font-medium">{formatCurrency(analysis.sales_prediction?.estimated_ticket_value)}</span>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">Nenhum produto identificado</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Resumo da Conversa */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                RESUMO DA CONVERSA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {analysis.lead_status?.reasoning || 'Nenhum resumo disponível'}
              </p>
            </CardContent>
          </Card>

          {/* Próximas Ações */}
          {analysis.next_actions && analysis.next_actions.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  PRÓXIMAS AÇÕES ({analysis.next_actions[0]?.priority?.toUpperCase() || 'NORMAL'})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {analysis.next_actions.map((action, index) => (
                  <div key={index} className="border-l-2 border-primary pl-3">
                    <div className="font-medium text-sm">{index + 1}️⃣ {action.action}</div>
                    <div className="text-sm text-muted-foreground mt-1">{action.description}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Métricas */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                MÉTRICAS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">💬 Total</div>
                  <div className="font-medium">{analysis.conversation_metrics?.total_messages || 0} msgs</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">🏢 Empresa</div>
                  <div className="font-medium">{analysis.conversation_metrics?.company_messages || 0} msgs</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">👤 Cliente</div>
                  <div className="font-medium">{analysis.conversation_metrics?.customer_messages || 0} msgs</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">⏱️ Resp.Med</div>
                  <div className="font-medium">{Math.round(analysis.conversation_metrics?.response_time_avg_minutes || 0)} min</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">💭 Sentiment</div>
                  <div className="font-medium text-xs">{analysis.sentiment_analysis?.customer_sentiment || 'N/A'}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fatores de Urgência */}
          {analysis.urgency_level?.factors && analysis.urgency_level.factors.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  FATORES DE URGÊNCIA
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {analysis.urgency_level.factors.map((factor, index) => (
                    <li key={index} className="text-sm text-muted-foreground">• {factor}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Barreiras e Indicadores */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Barreiras */}
            {analysis.purchase_intent?.barriers && analysis.purchase_intent.barriers.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    BARREIRAS IDENTIFICADAS
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {analysis.purchase_intent.barriers.map((barrier, index) => (
                      <li key={index} className="text-sm text-muted-foreground">• {barrier}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Indicadores Emocionais */}
            {analysis.sentiment_analysis?.emotional_indicators && analysis.sentiment_analysis.emotional_indicators.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    INDICADORES EMOCIONAIS
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {analysis.sentiment_analysis.emotional_indicators.map((indicator, index) => (
                      <li key={index} className="text-sm text-muted-foreground">• {indicator}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Fatores de Risco */}
          {analysis.sales_prediction?.risk_factors && analysis.sales_prediction.risk_factors.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  FATORES DE RISCO
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {analysis.sales_prediction.risk_factors.map((risk, index) => (
                    <li key={index} className="text-sm text-muted-foreground">• {risk}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Histórico */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                HISTÓRICO
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Criado: {formatDate(conversation.created_at)} • 
                Última msg: {formatDate(conversation.last_message_at)} • 
                {formatTimeAgo(analysis.conversation_metrics?.last_interaction_hours_ago)} inativo
              </div>
            </CardContent>
          </Card>
        </div>
      </ModalBody>

      <ModalFooter>
        <div className="flex justify-between items-center w-full">
          <Button
            variant="outline"
            onClick={() => openWhatsapp(conversation.cliente_telefone)}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700"
          >
            <MessageSquare className="h-4 w-4" />
            WhatsApp
          </Button>
          
          <div className="flex gap-2">
            {/* <Button
              variant="outline"
              onClick={() => window.open(`tel:${conversation.cliente_telefone}`, '_blank')}
              className="flex items-center gap-2"
            >
              <Phone className="h-4 w-4" />
              Ligar
            </Button> */}
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Fechar
            </Button>
          </div>
        </div>
      </ModalFooter>
    </Modal>
  );
}