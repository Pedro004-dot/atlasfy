import { databaseService } from '@/lib/database';
import { 
  IMetricsRepository,
  ICacheRepository 
} from './interfaces/IMetricsRepository';
import {
  ConversionFunnelData,
  GrowthMetrics,
  LostLeadsAnalysis,
  ProductEfficiency,
  SentimentMetrics,
  ConversationMetrics,
  TopProduct,
  PurchaseBarrier,
  CustomerLifetimeValue,
  MetricsQuery,
  MetricValue
} from '@/types/metrics.types';

/**
 * Concrete implementation of IMetricsRepository
 * Following Single Responsibility Principle - handles only data access operations
 */
export class MetricsRepository implements IMetricsRepository {
  private supabase = databaseService.getClient();

  async getConversionFunnelData(query: MetricsQuery): Promise<ConversionFunnelData[]> {
    try {
      const { data, error } = await this.supabase.rpc('get_conversion_funnel_data', {
        p_empresa_id: query.empresaId,
        p_start_date: query.dateRange.startDate.toISOString(),
        p_end_date: query.dateRange.endDate.toISOString()
      });

      if (error) throw error;

      // Calcular percentagens e dropoff rates
      const totalLeads = data[0]?.count || 1;
      
      return data.map((stage: any, index: number) => ({
        stage: stage.stage_name,
        count: stage.count,
        percentage: (stage.count / totalLeads) * 100,
        dropoffRate: index > 0 ? 
          ((data[index - 1].count - stage.count) / data[index - 1].count) * 100 : 0
      }));
    } catch (error) {
      console.error('Error fetching conversion funnel data:', error);
      return [];
    }
  }

  async getGrowthMetrics(query: MetricsQuery): Promise<GrowthMetrics> {
    try {
      const { data: currentData, error: currentError } = await this.supabase.rpc('get_period_metrics', {
        p_empresa_id: query.empresaId,
        p_start_date: query.dateRange.startDate.toISOString(),
        p_end_date: query.dateRange.endDate.toISOString()
      });

      if (currentError) throw currentError;

      // Calcular período anterior para comparação
      const periodDiff = query.dateRange.endDate.getTime() - query.dateRange.startDate.getTime();
      const previousStart = new Date(query.dateRange.startDate.getTime() - periodDiff);
      const previousEnd = new Date(query.dateRange.endDate.getTime() - periodDiff);

      const { data: previousData, error: previousError } = await this.supabase.rpc('get_period_metrics', {
        p_empresa_id: query.empresaId,
        p_start_date: previousStart.toISOString(),
        p_end_date: previousEnd.toISOString()
      });

      if (previousError) throw previousError;

      const current = currentData?.[0] || { conversations: 0, revenue: 0, conversions: 0 };
      const previous = previousData?.[0] || { conversations: 0, revenue: 0, conversions: 0 };

      const calculateMetricValue = (currentVal: number, previousVal: number): MetricValue => {
        const change = previousVal === 0 ? 0 : ((currentVal - previousVal) / previousVal) * 100;
        return {
          current: currentVal,
          previous: previousVal,
          percentageChange: change,
          trend: change > 5 ? 'up' : change < -5 ? 'down' : 'stable'
        };
      };

      // Determinar se é MoM ou WoW baseado no período
      const isWeekly = periodDiff <= 7 * 24 * 60 * 60 * 1000; // 7 dias em ms

      return {
        mom: isWeekly ? 
          { current: 0, previous: 0, percentageChange: 0, trend: 'stable' } :
          calculateMetricValue(current.conversations, previous.conversations),
        wow: isWeekly ?
          calculateMetricValue(current.conversations, previous.conversations) :
          { current: 0, previous: 0, percentageChange: 0, trend: 'stable' },
        period: query.dateRange.period
      };
    } catch (error) {
      console.error('Error fetching growth metrics:', error);
      return {
        mom: { current: 0, previous: 0, percentageChange: 0, trend: 'stable' },
        wow: { current: 0, previous: 0, percentageChange: 0, trend: 'stable' },
        period: query.dateRange.period
      };
    }
  }

  async getLostLeadsAnalysis(query: MetricsQuery): Promise<LostLeadsAnalysis> {
    try {
      const { data, error } = await this.supabase.rpc('get_lost_leads_analysis', {
        p_empresa_id: query.empresaId,
        p_start_date: query.dateRange.startDate.toISOString(),
        p_end_date: query.dateRange.endDate.toISOString()
      });

      if (error) throw error;

      const totalLost = data.reduce((sum: number, item: any) => sum + item.count, 0);

      return {
        totalLost,
        lostByReason: data.map((item: any) => ({
          reason: item.lost_reason || 'Não especificado',
          count: item.count,
          percentage: totalLost > 0 ? (item.count / totalLost) * 100 : 0,
          avgTicketValue: item.avg_ticket_value || 0
        })),
        lostByStage: data.map((item: any) => ({
          stage: item.lost_stage || 'Não especificado',
          count: item.stage_count || 0,
          recoveryPotential: this.calculateRecoveryPotential(item.recovery_score)
        })),
        recoveryOpportunities: data.filter((item: any) => 
          item.recovery_potential === 'high').length
      };
    } catch (error) {
      console.error('Error fetching lost leads analysis:', error);
      return {
        totalLost: 0,
        lostByReason: [],
        lostByStage: [],
        recoveryOpportunities: 0
      };
    }
  }

  async getProductEfficiency(query: MetricsQuery): Promise<ProductEfficiency[]> {
    try {
      const { data, error } = await this.supabase.rpc('get_product_efficiency', {
        p_empresa_id: query.empresaId,
        p_start_date: query.dateRange.startDate.toISOString(),
        p_end_date: query.dateRange.endDate.toISOString()
      });

      if (error) throw error;

      return data.map((product: any) => ({
        productId: product.product_id || 'unknown',
        productName: product.product_name || 'Produto não identificado',
        conversionRate: product.conversion_rate || 0,
        avgTicketValue: product.avg_ticket_value || 0,
        totalRevenue: product.total_revenue || 0,
        leadCount: product.lead_count || 0,
        efficiency: this.calculateEfficiencyScore(
          product.conversion_rate,
          product.avg_ticket_value,
          product.lead_count
        )
      }));
    } catch (error) {
      console.error('Error fetching product efficiency:', error);
      return [];
    }
  }

  async getSentimentMetrics(query: MetricsQuery): Promise<SentimentMetrics> {
    try {
      const { data, error } = await this.supabase.rpc('get_sentiment_metrics', {
        p_empresa_id: query.empresaId,
        p_start_date: query.dateRange.startDate.toISOString(),
        p_end_date: query.dateRange.endDate.toISOString()
      });

      if (error) throw error;

      const metrics = data[0] || {};
      
      return {
        overallScore: metrics.overall_score || 0,
        distribution: {
          positive: metrics.positive_count || 0,
          neutral: metrics.neutral_count || 0,
          negative: metrics.negative_count || 0
        },
        satisfactionTrend: {
          current: metrics.current_satisfaction || 0,
          previous: metrics.previous_satisfaction || 0,
          percentageChange: metrics.satisfaction_change || 0,
          trend: metrics.satisfaction_change > 0 ? 'up' : 
                 metrics.satisfaction_change < 0 ? 'down' : 'stable'
        },
        criticalAlerts: metrics.critical_alerts || 0
      };
    } catch (error) {
      console.error('Error fetching sentiment metrics:', error);
      return {
        overallScore: 0,
        distribution: { positive: 0, neutral: 0, negative: 0 },
        satisfactionTrend: { current: 0, previous: 0, percentageChange: 0, trend: 'stable' },
        criticalAlerts: 0
      };
    }
  }

  async getConversationMetrics(query: MetricsQuery): Promise<ConversationMetrics> {
    try {
      const { data, error } = await this.supabase.rpc('get_conversation_metrics', {
        p_empresa_id: query.empresaId,
        p_start_date: query.dateRange.startDate.toISOString(),
        p_end_date: query.dateRange.endDate.toISOString()
      });

      if (error) throw error;

      const metrics = data[0] || {};
      
      return {
        avgDuration: metrics.avg_duration_minutes || 0,
        avgResponseTime: metrics.avg_response_time_minutes || 0,
        totalConversations: metrics.total_conversations || 0,
        activeConversations: metrics.active_conversations || 0
      };
    } catch (error) {
      console.error('Error fetching conversation metrics:', error);
      return {
        avgDuration: 0,
        avgResponseTime: 0,
        totalConversations: 0,
        activeConversations: 0
      };
    }
  }

  async getTopProducts(query: MetricsQuery): Promise<TopProduct[]> {
    try {
      const { data, error } = await this.supabase.rpc('get_top_products', {
        p_empresa_id: query.empresaId,
        p_start_date: query.dateRange.startDate.toISOString(),
        p_end_date: query.dateRange.endDate.toISOString(),
        p_limit: 10
      });

      if (error) throw error;

      return data.map((product: any) => ({
        productId: product.product_id || 'unknown',
        productName: product.product_name || 'Produto não identificado',
        mentions: product.mention_count || 0,
        conversionRate: product.conversion_rate || 0,
        revenue: product.total_revenue || 0,
        trend: this.calculateTrend(product.trend_score)
      }));
    } catch (error) {
      console.error('Error fetching top products:', error);
      return [];
    }
  }

  async getPurchaseBarriers(query: MetricsQuery): Promise<PurchaseBarrier[]> {
    try {
      const { data, error } = await this.supabase.rpc('get_purchase_barriers', {
        p_empresa_id: query.empresaId,
        p_start_date: query.dateRange.startDate.toISOString(),
        p_end_date: query.dateRange.endDate.toISOString()
      });

      if (error) throw error;

      return data.map((barrier: any) => ({
        barrier: barrier.barrier_text || 'Barreira não especificada',
        frequency: barrier.frequency || 0,
        impact: this.categorizeImpact(barrier.impact_score),
        affectedRevenue: barrier.affected_revenue || 0
      }));
    } catch (error) {
      console.error('Error fetching purchase barriers:', error);
      return [];
    }
  }

  async getCustomerLTV(query: MetricsQuery): Promise<CustomerLifetimeValue> {
    try {
      const { data, error } = await this.supabase.rpc('get_customer_ltv', {
        p_empresa_id: query.empresaId,
        p_start_date: query.dateRange.startDate.toISOString(),
        p_end_date: query.dateRange.endDate.toISOString()
      });

      if (error) throw error;

      const ltvData = data[0] || {};
      
      return {
        avgLTV: ltvData.avg_ltv || 0,
        ltv_distribution: ltvData.distribution || [],
        topCustomers: (ltvData.top_customers || []).map((customer: any) => ({
          customerId: customer.customer_id,
          customerName: customer.customer_name || 'Nome não informado',
          ltv: customer.ltv || 0,
          lastPurchase: new Date(customer.last_purchase || Date.now())
        }))
      };
    } catch (error) {
      console.error('Error fetching customer LTV:', error);
      return {
        avgLTV: 0,
        ltv_distribution: [],
        topCustomers: []
      };
    }
  }

  async getConversationData(query: MetricsQuery): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('conversation_analysis')
        .select(`
          conversation_id,
          analysis_data,
          conversations!inner (
            id,
            cliente_telefone,
            status,
            created_at,
            last_message_at,
            message_count,
            empresa_id
          )
        `)
        .eq('conversations.empresa_id', query.empresaId)
        .gte('conversations.created_at', query.dateRange.startDate.toISOString())
        .lte('conversations.created_at', query.dateRange.endDate.toISOString())
        .not('analysis_data', 'is', null);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching conversation data:', error);
      return [];
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('conversation_analysis')
        .select('id')
        .limit(1);
      
      return !error;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  // Helper methods
  private calculateRecoveryPotential(score: number): 'high' | 'medium' | 'low' {
    if (score >= 0.7) return 'high';
    if (score >= 0.4) return 'medium';
    return 'low';
  }

  private calculateEfficiencyScore(conversionRate: number, avgTicket: number, leadCount: number): number {
    // Normalize and weight the metrics
    const normalizedConversion = Math.min(conversionRate * 100, 100);
    const normalizedTicket = Math.min((avgTicket / 1000) * 10, 100);
    const normalizedLeads = Math.min((leadCount / 100) * 10, 100);
    
    return Math.round((normalizedConversion * 0.5) + (normalizedTicket * 0.3) + (normalizedLeads * 0.2));
  }

  private calculateTrend(trendScore: number): 'rising' | 'falling' | 'stable' {
    if (trendScore > 0.1) return 'rising';
    if (trendScore < -0.1) return 'falling';
    return 'stable';
  }

  private categorizeImpact(impactScore: number): 'high' | 'medium' | 'low' {
    if (impactScore >= 0.7) return 'high';
    if (impactScore >= 0.4) return 'medium';
    return 'low';
  }
}