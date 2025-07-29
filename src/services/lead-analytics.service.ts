import { databaseService } from '@/lib/database';

interface LeadAnalyticsService {
  recordLeadSource(phone: string, message: string, empresaId: string): Promise<void>;
  getAnalytics(empresaId: string, month?: string): Promise<AnalyticsData>;
}

interface AnalyticsData {
  total_leads: number;
  origem: {
    ads: number;
    ads_percent: number;
    organico: number;
    organico_percent: number;
  };
  detalhamento_ads: Record<string, {
    total: number;
    campanhas: Record<string, number>;
  }>;
}

class LeadAnalyticsServiceImpl implements LeadAnalyticsService {
  
  async recordLeadSource(phone: string, message: string, empresaId: string): Promise<void> {
    try {
      // 1. Tentar match por webhook (últimos 15 minutos)
      const adsMatch = await this.findRecentClick(phone);
      
      if (adsMatch) {
        // Lead veio de ads
        await this.incrementCounter(
          empresaId, 
          'ads', 
          adsMatch.utm_source, 
          adsMatch.utm_campaign
        );
        
        // Marcar clique como usado
        await this.markClickAsMatched(adsMatch.session_id, phone);
        
      } else {
        // 2. Fallback: orgânico/direto
        await this.incrementCounter(
          empresaId, 
          'organico', 
          'direct', 
          'organic'
        );
      }
      
    } catch (error) {
      console.error('Error recording lead source:', error);
      // Não quebra o fluxo principal - registra como orgânico
      await this.incrementCounter(empresaId, 'organico', 'unknown', 'error');
    }
  }
  
  private async findRecentClick(phone: string): Promise<{
    session_id: string;
    utm_source: string;
    utm_campaign: string;
  } | null> {
    
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    
    const result = await databaseService.queryOne<any>(`
      SELECT 
        session_id,
        utm_source,
        utm_campaign
      FROM click_tracking
      WHERE matched_phone IS NULL
        AND timestamp >= $1
        AND utm_source IS NOT NULL
        AND utm_campaign IS NOT NULL
      ORDER BY timestamp DESC
      LIMIT 1
    `, [fifteenMinutesAgo.toISOString()]);
    
    return result;
  }
  
  private async markClickAsMatched(sessionId: string, phone: string): Promise<void> {
    await databaseService.query(`
      UPDATE click_tracking 
      SET matched_phone = $1, matched_at = NOW()
      WHERE session_id = $2
    `, [phone, sessionId]);
  }
  
  private async incrementCounter(
    empresaId: string, 
    sourceType: string, 
    utmSource: string, 
    utmCampaign: string
  ): Promise<void> {
    
    await databaseService.query(`
      SELECT increment_lead_counter($1, $2, $3, $4)
    `, [empresaId, sourceType, utmSource, utmCampaign]);
  }
  
  async getAnalytics(empresaId: string, month?: string): Promise<AnalyticsData> {
    const currentMonth = month || new Date().toISOString().slice(0, 7); // YYYY-MM
    
    const results = await databaseService.query<{
      source_type: string;
      utm_source: string;
      utm_campaign: string;
      total_leads: number;
    }>(`
      SELECT 
        source_type,
        utm_source,
        utm_campaign,
        SUM(lead_count) as total_leads
      FROM lead_analytics
      WHERE empresa_id = $1 
        AND month_year = $2
      GROUP BY source_type, utm_source, utm_campaign
      ORDER BY total_leads DESC
    `, [empresaId, currentMonth]);
    
    return this.processAnalyticsData(results);
  }
  
  private processAnalyticsData(results: any[]): AnalyticsData {
    const totalLeads = results.reduce((sum, r) => sum + r.total_leads, 0);
    
    if (totalLeads === 0) {
      return {
        total_leads: 0,
        origem: { ads: 0, ads_percent: 0, organico: 0, organico_percent: 0 },
        detalhamento_ads: {}
      };
    }
    
    const adsLeads = results
      .filter(r => r.source_type === 'ads')
      .reduce((sum, r) => sum + r.total_leads, 0);
      
    const organicLeads = results
      .filter(r => r.source_type === 'organico')
      .reduce((sum, r) => sum + r.total_leads, 0);
    
    // Agrupar ads por plataforma
    const platforms: Record<string, { total: number; campanhas: Record<string, number> }> = {};
    
    results
      .filter(r => r.source_type === 'ads')
      .forEach(r => {
        if (!platforms[r.utm_source]) {
          platforms[r.utm_source] = { total: 0, campanhas: {} };
        }
        platforms[r.utm_source].total += r.total_leads;
        platforms[r.utm_source].campanhas[r.utm_campaign] = r.total_leads;
      });
    
    return {
      total_leads: totalLeads,
      origem: {
        ads: adsLeads,
        ads_percent: Math.round((adsLeads / totalLeads) * 100),
        organico: organicLeads,
        organico_percent: Math.round((organicLeads / totalLeads) * 100)
      },
      detalhamento_ads: platforms
    };
  }
}

export const leadAnalyticsService = new LeadAnalyticsServiceImpl();