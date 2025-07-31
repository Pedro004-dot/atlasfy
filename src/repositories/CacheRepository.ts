import { ICacheRepository } from './interfaces/IMetricsRepository';

/**
 * Memory-based cache implementation for Next.js environment
 * Since we're not using Redis, this provides in-memory caching
 */
export class MemoryCacheRepository implements ICacheRepository {
  private cache: Map<string, { value: any; expiry: number }> = new Map();
  private readonly DEFAULT_TTL = 300; // 5 minutes in seconds

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.value as T;
  }

  async set<T>(key: string, value: T, ttl: number = this.DEFAULT_TTL): Promise<void> {
    const expiry = Date.now() + (ttl * 1000);
    this.cache.set(key, { value, expiry });
    
    // Clean up expired entries periodically
    this.cleanupExpired();
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    const item = this.cache.get(key);
    
    if (!item) {
      return false;
    }

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  async clear(pattern?: string): Promise<void> {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    const regex = new RegExp(pattern);
    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  private cleanupExpired(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    for (const [key, item] of entries) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }

  // Utility methods for cache management
  getCacheSize(): number {
    return this.cache.size;
  }

  getCacheKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  getCacheStats(): { size: number; keys: string[]; memory: number } {
    return {
      size: this.cache.size,
      keys: this.getCacheKeys(),
      memory: JSON.stringify(Object.fromEntries(this.cache)).length
    };
  }
}

/**
 * Cache key generator utility
 */
export class CacheKeyGenerator {
  static generateMetricsKey(empresaId: string, metricType: string, dateRange: string): string {
    return `metrics:${empresaId}:${metricType}:${dateRange}`;
  }

  static generateDashboardKey(empresaId: string, period: string): string {
    return `dashboard:${empresaId}:${period}`;
  }

  static generateQueryKey(empresaId: string, queryHash: string): string {
    return `query:${empresaId}:${queryHash}`;
  }

  static hashQuery(query: any): string {
    return Buffer.from(JSON.stringify(query)).toString('base64');
  }
}

// Export singleton instance
export const cacheRepository = new MemoryCacheRepository();