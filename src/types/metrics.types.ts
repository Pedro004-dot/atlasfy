// BI Dashboard Types and Interfaces
export interface MetricValue {
  current: number;
  previous: number;
  percentageChange: number;
  trend: 'up' | 'down' | 'stable';
}

export interface ConversionFunnelData {
  stage: string;
  count: number;
  percentage: number;
  dropoffRate?: number;
}

export interface GrowthMetrics {
  mom: MetricValue; // Month over Month
  wow: MetricValue; // Week over Week
  period: string;
}

export interface LostLeadsAnalysis {
  totalLost: number;
  lostByReason: Array<{
    reason: string;
    count: number;
    percentage: number;
    avgTicketValue: number;
  }>;
  lostByStage: Array<{
    stage: string;
    count: number;
    recoveryPotential: 'high' | 'medium' | 'low';
  }>;
  recoveryOpportunities: number;
}

export interface ProductEfficiency {
  productId: string;
  productName: string;
  conversionRate: number;
  avgTicketValue: number;
  totalRevenue: number;
  leadCount: number;
  efficiency: number; // score 0-100
}

export interface SentimentMetrics {
  overallScore: number;
  distribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  satisfactionTrend: MetricValue;
  criticalAlerts: number;
}

export interface ConversationMetrics {
  avgDuration: number;
  avgResponseTime: number;
  totalConversations: number;
  activeConversations: number;
}

export interface TopProduct {
  productId: string;
  productName: string;
  mentions: number;
  conversionRate: number;
  revenue: number;
  trend: 'rising' | 'falling' | 'stable';
}

export interface PurchaseBarrier {
  barrier: string;
  frequency: number;
  impact: 'high' | 'medium' | 'low';
  affectedRevenue: number;
}

export interface CustomerLifetimeValue {
  avgLTV: number;
  ltv_distribution: Array<{
    range: string;
    count: number;
    percentage: number;
  }>;
  topCustomers: Array<{
    customerId: string;
    customerName: string;
    ltv: number;
    lastPurchase: Date;
  }>;
}

// Main Dashboard Data Interface
export interface DashboardMetrics {
  conversionFunnel: ConversionFunnelData[];
  growthMetrics: GrowthMetrics;
  lostLeads: LostLeadsAnalysis;
  productEfficiency: ProductEfficiency[];
  sentimentAnalysis: SentimentMetrics;
  conversationMetrics: ConversationMetrics;
  topProducts: TopProduct[];
  purchaseBarriers: PurchaseBarrier[];
  customerLTV: CustomerLifetimeValue;
  lastUpdated: Date;
}

// Simple metrics interface for basic dashboard metrics
export interface SimpleDashboardMetrics {
  vendasHoje: number;
  leadsHoje: number;
  taxaConversao: number;
  carrinhoAbandonado: number;
}

// Filter and Query Types
export interface DateRangeFilter {
  startDate: Date;
  endDate: Date;
  period: '6h' | '24h' | '7d' | '30d' | '90d' | 'all';
}

export interface MetricsQuery {
  empresaId: string;
  dateRange: DateRangeFilter;
  filters?: {
    productIds?: string[];
    customerSegments?: string[];
    conversationStages?: string[];
  };
}

// Cache Configuration
export interface CacheConfig {
  ttl: number; // seconds
  strategy: 'memory' | 'redis' | 'database';
  key: string;
}

// Export and Report Types
export interface ExportRequest {
  metrics: string[];
  format: 'pdf' | 'excel' | 'json';
  dateRange: DateRangeFilter;
  empresaId: string;
}

export interface ReportData {
  title: string;
  generatedAt: Date;
  period: string;
  metrics: DashboardMetrics;
  insights: string[];
  recommendations: string[];
}