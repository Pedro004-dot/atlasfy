
// src/types/dashboard.ts

// Estrutura principal dos dados do dashboard retornada pela API
export interface DashboardData {
  conversionFunnel: ConversionFunnelData[];
  growthMetrics: GrowthMetrics;
  lostLeads: LostLeadsData;
  productEfficiency: ProductEfficiencyData[];
  sentimentAnalysis: SentimentAnalysisData;
  conversationMetrics: ConversationMetrics;
  topProducts: TopProductData[];
  purchaseBarriers: PurchaseBarrierData[];
  customerLTV: CustomerLTVData;
  lastUpdated: string;
}

// Tipos para cada métrica específica

export interface ConversionFunnelData {
  stage: string;
  count: number;
  percentage: number;
  dropoffRate: number;
}

export interface GrowthMetrics {
  wow: {
    current: number;
    previous: number;
    percentageChange: number;
    trend: string;
  };
  mom: {
    current: number;
    previous: number;
    percentageChange: number;
    trend: string;
  };
  period: string;
}

export interface LostLeadsData {
  totalLost: number;
  lostByReason: {
    reason: string;
    count: number;
    percentage: number;
    avgTicketValue: number;
  }[];
  lostByStage: {
    stage: string;
    count: number;
    recoveryPotential: string;
  }[];
  recoveryOpportunities: number;
}

export interface ProductEfficiencyData {
  productName: string;
  conversionRate: number;
  totalSales: number;
}

export interface SentimentAnalysisData {
  overallScore: number;
  distribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  satisfactionTrend: {
    current: number;
    previous: number;
    percentageChange: number;
    trend: string;
  };
  criticalAlerts: number;
}

export interface ConversationMetrics {
  avgDuration: number; // em segundos
  avgResponseTime: number; // em segundos
  totalConversations: number;
  activeConversations: number;
}

export interface TopProductData {
  productName: string;
  totalSold: number;
}

export interface PurchaseBarrierData {
  barrier: string;
  frequency: number;
  impact: string;
  affectedRevenue: number;
}

export interface CustomerLTVData {
  avgLTV: number;
  ltv_distribution: {
    low: number;
    high: number;
    medium: number;
  };
  topCustomers: {
    customerId: string;
    customerName: string;
    ltv: number;
    lastPurchase: string;
  }[];
}

// Tipo para a resposta da API do hook SWR
export interface UltimaVenda {
  id: string;
  cliente_nome: string;
  valor_total: number;
  created_at: string;
  status: string;
}

export interface DashboardAPIResponse {
  success: boolean;
  data: DashboardData;
  meta: {
    processingTime: number;
    cachedResponse: boolean;
  };
}
