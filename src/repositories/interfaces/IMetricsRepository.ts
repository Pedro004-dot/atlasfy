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
  MetricsQuery 
} from '@/types/metrics.types';

/**
 * Repository interface for Business Intelligence metrics data access
 * Following Interface Segregation Principle - each method has a specific purpose
 */
export interface IMetricsRepository {
  /**
   * Get conversion funnel data showing the customer journey stages
   */
  getConversionFunnelData(query: MetricsQuery): Promise<ConversionFunnelData[]>;

  /**
   * Calculate growth metrics (Month over Month, Week over Week)
   */
  getGrowthMetrics(query: MetricsQuery): Promise<GrowthMetrics>;

  /**
   * Analyze lost leads with reasons and recovery potential
   */
  getLostLeadsAnalysis(query: MetricsQuery): Promise<LostLeadsAnalysis>;

  /**
   * Get product efficiency metrics and performance
   */
  getProductEfficiency(query: MetricsQuery): Promise<ProductEfficiency[]>;

  /**
   * Get sentiment analysis and satisfaction metrics
   */
  getSentimentMetrics(query: MetricsQuery): Promise<SentimentMetrics>;

  /**
   * Get conversation duration and response time metrics
   */
  getConversationMetrics(query: MetricsQuery): Promise<ConversationMetrics>;

  /**
   * Get trending and top-performing products
   */
  getTopProducts(query: MetricsQuery): Promise<TopProduct[]>;

  /**
   * Identify purchase barriers and blockers
   */
  getPurchaseBarriers(query: MetricsQuery): Promise<PurchaseBarrier[]>;

  /**
   * Calculate customer lifetime value metrics
   */
  getCustomerLTV(query: MetricsQuery): Promise<CustomerLifetimeValue>;

  /**
   * Get raw conversation data for custom calculations
   */
  getConversationData(query: MetricsQuery): Promise<any[]>;

  /**
   * Health check - verify repository connection
   */
  healthCheck(): Promise<boolean>;
}

/**
 * Cache repository interface for performance optimization
 */
export interface ICacheRepository {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  clear(pattern?: string): Promise<void>;
}

/**
 * Export repository interface for generating reports
 */
export interface IExportRepository {
  generatePdfReport(data: any, template: string): Promise<Buffer>;
  generateExcelReport(data: any, worksheets: string[]): Promise<Buffer>;
  saveReport(filename: string, data: Buffer): Promise<string>;
}