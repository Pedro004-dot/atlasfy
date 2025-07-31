import { IMetricsRepository, ICacheRepository } from '@/repositories/interfaces/IMetricsRepository';
import { MetricsRepository } from '@/repositories/MetricsRepository';
import { cacheRepository, CacheKeyGenerator } from '@/repositories/CacheRepository';
import { 
  DashboardMetrics, 
  MetricsQuery, 
  DateRangeFilter 
} from '@/types/metrics.types';

/**
 * Business Logic Layer for Metrics
 * Following Single Responsibility Principle and Dependency Inversion
 */
export class MetricsService {
  private metricsRepository: IMetricsRepository;
  private cacheRepository: ICacheRepository;

  constructor() {
    this.metricsRepository = new MetricsRepository();
    this.cacheRepository = cacheRepository;
  }

  /**
   * Main orchestrator method - gets all dashboard metrics
   * Uses Strategy pattern for different caching strategies
   */
  async getDashboardMetrics(query: MetricsQuery): Promise<DashboardMetrics> {
    const cacheKey = CacheKeyGenerator.generateDashboardKey(
      query.empresaId, 
      `${query.dateRange.period}_${query.dateRange.startDate.getTime()}`
    );

    console.log('[MetricsService] Getting dashboard metrics with cache key:', cacheKey);

    // Try cache first
    const cachedData = await this.cacheRepository.get<DashboardMetrics>(cacheKey);
    if (cachedData) {
      console.log(`[MetricsService] Cache hit for key: ${cacheKey}`);
      return cachedData;
    }

    console.log(`[MetricsService] Cache miss for key: ${cacheKey}, fetching fresh data`);
    console.log('[MetricsService] Query details:', {
      empresaId: query.empresaId,
      period: query.dateRange.period,
      startDate: query.dateRange.startDate,
      endDate: query.dateRange.endDate
    });

    try {
      // Fetch all metrics in parallel for better performance
      const [
        conversionFunnel,
        growthMetrics,
        lostLeads,
        productEfficiency,
        sentimentAnalysis,
        conversationMetrics,
        topProducts,
        purchaseBarriers,
        customerLTV
      ] = await Promise.all([
        this.metricsRepository.getConversionFunnelData(query),
        this.metricsRepository.getGrowthMetrics(query),
        this.metricsRepository.getLostLeadsAnalysis(query),
        this.metricsRepository.getProductEfficiency(query),
        this.metricsRepository.getSentimentMetrics(query),
        this.metricsRepository.getConversationMetrics(query),
        this.metricsRepository.getTopProducts(query),
        this.metricsRepository.getPurchaseBarriers(query),
        this.metricsRepository.getCustomerLTV(query)
      ]);

      const dashboardData: DashboardMetrics = {
        conversionFunnel,
        growthMetrics,
        lostLeads,
        productEfficiency,
        sentimentAnalysis,
        conversationMetrics,
        topProducts,
        purchaseBarriers,
        customerLTV,
        lastUpdated: new Date()
      };

      // Cache with appropriate TTL based on data freshness needs
      const ttl = this.calculateCacheTTL(query.dateRange.period);
      await this.cacheRepository.set(cacheKey, dashboardData, ttl);

      return dashboardData;
    } catch (error) {
      console.error('[MetricsService] Error fetching dashboard metrics:', error);
      throw new Error('Falha ao buscar métricas do dashboard');
    }
  }

  /**
   * Get specific metric with individual caching
   */
  async getSpecificMetric<T>(
    metricType: string,
    query: MetricsQuery,
    fetcher: () => Promise<T>
  ): Promise<T> {
    const cacheKey = CacheKeyGenerator.generateMetricsKey(
      query.empresaId,
      metricType,
      query.dateRange.period
    );

    const cachedData = await this.cacheRepository.get<T>(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    const data = await fetcher();
    const ttl = this.calculateCacheTTL(query.dateRange.period);
    await this.cacheRepository.set(cacheKey, data, ttl);

    return data;
  }

  /**
   * Invalidate cache for specific company
   */
  async invalidateCache(empresaId: string): Promise<void> {
    await this.cacheRepository.clear(`*:${empresaId}:*`);
    console.log(`[MetricsService] Cache invalidated for empresa: ${empresaId}`);
  }

  /**
   * Health check for all dependencies
   */
  async healthCheck(): Promise<{ repository: boolean; cache: boolean }> {
    const [repositoryHealth, cacheHealth] = await Promise.all([
      this.metricsRepository.healthCheck(),
      this.cacheRepository.exists('health_check').then(() => true).catch(() => false)
    ]);

    return {
      repository: repositoryHealth,
      cache: cacheHealth
    };
  }

  /**
   * Get cache statistics for monitoring
   */
  async getCacheStats() {
    if ('getCacheStats' in this.cacheRepository) {
      return (this.cacheRepository as any).getCacheStats();
    }
    return { message: 'Cache stats not available for this implementation' };
  }

  /**
   * Calculate appropriate cache TTL based on data period
   * More recent data has shorter cache time
   */
  private calculateCacheTTL(period: string): number {
    switch (period) {
      case '6h':
        return 300; // 5 minutes
      case '24h':
        return 600; // 10 minutes
      case '7d':
        return 1800; // 30 minutes
      case '30d':
        return 3600; // 1 hour
      case '90d':
      case 'all':
        return 7200; // 2 hours
      default:
        return 600; // 10 minutes default
    }
  }

  /**
   * Create optimized query with date range calculation
   */
  createMetricsQuery(
    empresaId: string, 
    period: string,
    customFilters?: any
  ): MetricsQuery {
    return {
      empresaId,
      dateRange: this.calculateDateRange(period),
      filters: customFilters
    };
  }

  /**
   * Calculate date range based on period
   */
  private calculateDateRange(period: string): DateRangeFilter {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case '6h':
        startDate = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        break;
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
        startDate = new Date('2024-01-01'); // Project start date
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        period = '24h';
    }

    return {
      startDate,
      endDate: now,
      period: period as any
    };
  }
}

// Export singleton instance
export const metricsService = new MetricsService();