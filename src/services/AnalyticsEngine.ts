import { MetricsQuery, ConversionFunnelData, ProductEfficiency } from '@/types/metrics.types';

/**
 * Analytics Engine for complex business intelligence calculations
 * Following Strategy pattern for different calculation methods
 */
export class AnalyticsEngine {
  
  /**
   * Calculate conversion funnel with advanced metrics
   */
  static calculateAdvancedFunnel(rawData: any[]): ConversionFunnelData[] {
    const stages = [
      'DEMONSTRANDO_INTERESSE',
      'EM_NEGOCIACAO', 
      'AGUARDANDO_PAGAMENTO',
      'VENDA_FINALIZADA'
    ];

    const stageCounts = stages.map(stage => ({
      stage,
      count: rawData.filter(item => 
        item.analysis_data?.lead_status?.stage === stage
      ).length
    }));

    const totalLeads = stageCounts[0]?.count || 1;

    return stageCounts.map((stageData, index) => {
      const percentage = (stageData.count / totalLeads) * 100;
      const dropoffRate = index > 0 ? 
        ((stageCounts[index - 1].count - stageData.count) / stageCounts[index - 1].count) * 100 : 0;

      return {
        stage: this.getStageDisplayName(stageData.stage),
        count: stageData.count,
        percentage,
        dropoffRate: Math.max(0, dropoffRate) // Ensure no negative dropoff
      };
    });
  }

  /**
   * Advanced product efficiency calculation with multiple factors
   */
  static calculateProductEfficiency(conversationData: any[]): ProductEfficiency[] {
    const productMetrics = new Map<string, {
      name: string;
      mentions: number;
      conversions: number;
      totalValue: number;
      leadCount: number;
      avgResponseTime: number;
      sentimentScores: number[];
    }>();

    // Process conversation data
    conversationData.forEach(conv => {
      const analysis = conv.analysis_data;
      if (!analysis?.products_mentioned?.length) return;

      analysis.products_mentioned.forEach((product: any) => {
        const productKey = product.product || 'unknown';
        
        if (!productMetrics.has(productKey)) {
          productMetrics.set(productKey, {
            name: product.product || 'Produto não identificado',
            mentions: 0,
            conversions: 0,
            totalValue: 0,
            leadCount: 0,
            avgResponseTime: 0,
            sentimentScores: []
          });
        }

        const metrics = productMetrics.get(productKey)!;
        metrics.mentions++;
        metrics.leadCount++;

        // Check for conversion
        if (analysis.lead_status?.stage === 'VENDA_FINALIZADA') {
          metrics.conversions++;
        }

        // Add ticket value
        const ticketValue = this.parseTicketValue(analysis.sales_prediction?.estimated_ticket_value);
        if (ticketValue > 0) {
          metrics.totalValue += ticketValue;
        }

        // Add sentiment score
        const sentimentScore = this.parseSentimentScore(analysis.sentiment_analysis?.satisfaction_score);
        if (sentimentScore > 0) {
          metrics.sentimentScores.push(sentimentScore);
        }

        // Add response time
        const responseTime = analysis.conversation_metrics?.response_time_avg_minutes;
        if (responseTime) {
          metrics.avgResponseTime += responseTime;
        }
      });
    });

    // Convert to ProductEfficiency array
    return Array.from(productMetrics.entries()).map(([productId, metrics]) => {
      const conversionRate = metrics.leadCount > 0 ? (metrics.conversions / metrics.leadCount) * 100 : 0;
      const avgTicketValue = metrics.conversions > 0 ? metrics.totalValue / metrics.conversions : 0;
      const avgSentiment = metrics.sentimentScores.length > 0 ? 
        metrics.sentimentScores.reduce((sum, score) => sum + score, 0) / metrics.sentimentScores.length : 0;
      const avgResponseTime = metrics.leadCount > 0 ? metrics.avgResponseTime / metrics.leadCount : 0;

      return {
        productId,
        productName: metrics.name,
        conversionRate,
        avgTicketValue,
        totalRevenue: metrics.totalValue,
        leadCount: metrics.leadCount,
        efficiency: this.calculateEfficiencyScore({
          conversionRate,
          avgTicketValue,
          leadCount: metrics.leadCount,
          avgSentiment,
          avgResponseTime
        })
      };
    }).sort((a, b) => b.efficiency - a.efficiency);
  }

  /**
   * Calculate lost leads with advanced categorization
   */
  static analyzeLostLeads(conversationData: any[]) {
    const lostLeads = conversationData.filter(conv => 
      conv.analysis_data?.lead_status?.stage === 'LEAD_PERDIDO' ||
      conv.analysis_data?.conversion_analysis?.status === 'lost'
    );

    const reasonCounts = new Map<string, {
      count: number;
      totalValue: number;
      stages: Set<string>;
      recoveryPotential: number[];
    }>();

    lostLeads.forEach(conv => {
      const analysis = conv.analysis_data;
      const reason = analysis.conversion_analysis?.lost_reason || 
                    analysis.conversion_analysis?.lost_category || 
                    'Motivo não especificado';

      if (!reasonCounts.has(reason)) {
        reasonCounts.set(reason, {
          count: 0,
          totalValue: 0,
          stages: new Set(),
          recoveryPotential: []
        });
      }

      const reasonData = reasonCounts.get(reason)!;
      reasonData.count++;

      // Add lost value
      const ticketValue = this.parseTicketValue(analysis.sales_prediction?.estimated_ticket_value);
      if (ticketValue > 0) {
        reasonData.totalValue += ticketValue;
      }

      // Add stage where lost
      if (analysis.conversion_analysis?.lost_stage) {
        reasonData.stages.add(analysis.conversion_analysis.lost_stage);
      }

      // Add recovery potential
      const recoveryScore = this.parseRecoveryPotential(analysis.conversion_analysis?.recovery_potential);
      if (recoveryScore > 0) {
        reasonData.recoveryPotential.push(recoveryScore);
      }
    });

    return {
      totalLost: lostLeads.length,
      lostByReason: Array.from(reasonCounts.entries()).map(([reason, data]) => ({
        reason,
        count: data.count,
        percentage: (data.count / lostLeads.length) * 100,
        avgTicketValue: data.count > 0 ? data.totalValue / data.count : 0,
        avgRecoveryPotential: data.recoveryPotential.length > 0 ? 
          data.recoveryPotential.reduce((sum, score) => sum + score, 0) / data.recoveryPotential.length : 0
      })).sort((a, b) => b.count - a.count),
      recoveryOpportunities: Array.from(reasonCounts.values())
        .filter(data => data.recoveryPotential.some(score => score > 0.7))
        .reduce((sum, data) => sum + data.count, 0)
    };
  }

  /**
   * Calculate purchase barriers from conversation analysis
   */
  static analyzePurchaseBarriers(conversationData: any[]) {
    const barrierCounts = new Map<string, {
      frequency: number;
      affectedRevenue: number;
      conversionImpact: number[];
    }>();

    conversationData.forEach(conv => {
      const analysis = conv.analysis_data;
      const barriers = analysis.purchase_intent?.barriers || [];

      barriers.forEach((barrier: string) => {
        if (!barrierCounts.has(barrier)) {
          barrierCounts.set(barrier, {
            frequency: 0,
            affectedRevenue: 0,
            conversionImpact: []
          });
        }

        const barrierData = barrierCounts.get(barrier)!;
        barrierData.frequency++;

        // Calculate affected revenue
        const ticketValue = this.parseTicketValue(analysis.sales_prediction?.estimated_ticket_value);
        const conversionProbability = this.parseConversionProbability(analysis.sales_prediction?.conversion_probability);
        
        if (ticketValue > 0 && conversionProbability > 0) {
          barrierData.affectedRevenue += ticketValue * conversionProbability;
          barrierData.conversionImpact.push(conversionProbability);
        }
      });
    });

    return Array.from(barrierCounts.entries()).map(([barrier, data]) => ({
      barrier,
      frequency: data.frequency,
      impact: this.categorizeImpact(data.conversionImpact),
      affectedRevenue: data.affectedRevenue
    })).sort((a, b) => b.frequency - a.frequency);
  }

  // Helper methods
  private static getStageDisplayName(stage: string): string {
    const stageNames: Record<string, string> = {
      'DEMONSTRANDO_INTERESSE': 'Interesse',
      'EM_NEGOCIACAO': 'Negociação',
      'AGUARDANDO_PAGAMENTO': 'Pagamento',
      'VENDA_FINALIZADA': 'Finalizada'
    };
    return stageNames[stage] || stage;
  }

  private static parseTicketValue(value: any): number {
    if (!value || value === 'N/A' || value === 'não_aplicável') return 0;
    
    if (typeof value === 'string') {
      const matches = value.match(/\d+/g);
      if (matches && matches.length > 0) {
        const numericValue = parseFloat(matches.join(''));
        return isNaN(numericValue) || numericValue > 500000 ? 0 : numericValue;
      }
    }
    
    if (typeof value === 'number') {
      return isNaN(value) || value > 500000 ? 0 : value;
    }
    
    return 0;
  }

  private static parseSentimentScore(score: any): number {
    if (typeof score === 'number') return score;
    if (typeof score === 'string') {
      const numScore = parseFloat(score);
      return isNaN(numScore) ? 0 : numScore;
    }
    return 0;
  }

  private static parseConversionProbability(probability: any): number {
    if (typeof probability === 'number') return probability;
    if (typeof probability === 'string') {
      const numProb = parseFloat(probability.replace('%', '')) / 100;
      return isNaN(numProb) ? 0 : numProb;
    }
    return 0;
  }

  private static parseRecoveryPotential(potential: any): number {
    if (typeof potential === 'number') return potential;
    if (typeof potential === 'string') {
      const lowerPotential = potential.toLowerCase();
      if (lowerPotential.includes('alto') || lowerPotential.includes('high')) return 0.8;
      if (lowerPotential.includes('médio') || lowerPotential.includes('medium')) return 0.5;
      if (lowerPotential.includes('baixo') || lowerPotential.includes('low')) return 0.2;
    }
    return 0;
  }

  private static calculateEfficiencyScore(factors: {
    conversionRate: number;
    avgTicketValue: number;
    leadCount: number;
    avgSentiment: number;
    avgResponseTime: number;
  }): number {
    const weights = {
      conversion: 0.4,
      ticket: 0.25,
      volume: 0.15,
      sentiment: 0.1,
      response: 0.1
    };

    const normalizedConversion = Math.min(factors.conversionRate, 100);
    const normalizedTicket = Math.min((factors.avgTicketValue / 1000) * 10, 100);
    const normalizedVolume = Math.min((factors.leadCount / 50) * 10, 100);
    const normalizedSentiment = factors.avgSentiment * 100;
    const normalizedResponse = Math.max(0, 100 - (factors.avgResponseTime / 60) * 10);

    return Math.round(
      (normalizedConversion * weights.conversion) +
      (normalizedTicket * weights.ticket) +
      (normalizedVolume * weights.volume) +
      (normalizedSentiment * weights.sentiment) +
      (normalizedResponse * weights.response)
    );
  }

  private static categorizeImpact(conversionImpacts: number[]): 'high' | 'medium' | 'low' {
    if (conversionImpacts.length === 0) return 'low';
    
    const avgImpact = conversionImpacts.reduce((sum, impact) => sum + impact, 0) / conversionImpacts.length;
    
    if (avgImpact >= 0.7) return 'high';
    if (avgImpact >= 0.4) return 'medium';
    return 'low';
  }
}