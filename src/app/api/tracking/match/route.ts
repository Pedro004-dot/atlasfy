import { NextRequest, NextResponse } from 'next/server';
import { databaseService } from '@/lib/database';

interface MatchRequest {
  cliente_telefone: string;
  message_text: string;
  timestamp: string;
  empresa_id: string;
}

interface WebhookMatch {
  session_id: string;
  utm_data: {
    utm_source: string;
    utm_campaign: string;
    utm_content: string;
    utm_medium?: string;
    utm_term?: string;
  };
  confidence: number;
}

interface PatternMatch {
  utm_data: {
    utm_source: string;
    utm_campaign: string;
    utm_content: string;
    utm_medium?: string;
  };
  confidence: number;
  matched_patterns: string[];
  campaign_name: string;
}

export async function POST(request: NextRequest) {
  try {
    const { cliente_telefone, message_text, timestamp, empresa_id }: MatchRequest = await request.json();
    
    if (!cliente_telefone || !message_text) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const messageTime = new Date(timestamp);
    
    // 1. Tentar matching por webhook (método primário)
    const webhookMatch = await matchByWebhook(cliente_telefone, messageTime);
    
    if (webhookMatch && webhookMatch.confidence > 70) {
      const trackingId = await saveLeadTracking({
        cliente_telefone,
        empresa_id,
        ...webhookMatch.utm_data,
        detection_method: 'webhook_match',
        confidence_score: webhookMatch.confidence,
        click_session_id: webhookMatch.session_id,
        message_timestamp: messageTime
      });
      
      return NextResponse.json({ 
        success: true, 
        method: 'webhook', 
        confidence: webhookMatch.confidence,
        tracking_id: trackingId,
        utm_data: webhookMatch.utm_data
      });
    }
    
    // 2. Fallback: Pattern matching
    const patternMatch = await matchByPattern(message_text);
    
    if (patternMatch && patternMatch.confidence > 50) {
      const trackingId = await saveLeadTracking({
        cliente_telefone,
        empresa_id,
        ...patternMatch.utm_data,
        detection_method: 'pattern_match',
        confidence_score: patternMatch.confidence,
        matched_message: message_text,
        matched_patterns: patternMatch.matched_patterns,
        message_timestamp: messageTime
      });
      
      return NextResponse.json({ 
        success: true, 
        method: 'pattern', 
        confidence: patternMatch.confidence,
        tracking_id: trackingId,
        utm_data: patternMatch.utm_data,
        matched_patterns: patternMatch.matched_patterns
      });
    }
    
    // 3. Nenhum match encontrado
    return NextResponse.json({ 
      success: false, 
      method: 'unknown',
      message: 'No matching campaign found'
    });
    
  } catch (error) {
    console.error('Matching error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
}

// Função de matching por webhook (15min window)
async function matchByWebhook(phone: string, messageTime: Date): Promise<WebhookMatch | null> {
  const windowStart = new Date(messageTime.getTime() - 15 * 60 * 1000); // 15min antes
  const windowEnd = new Date(messageTime.getTime() + 2 * 60 * 1000);   // 2min depois
  
  try {
    const result = await databaseService.queryOne<any>(`
      SELECT 
        session_id,
        utm_source,
        utm_campaign,
        utm_content,
        utm_medium,
        utm_term,
        timestamp
      FROM click_tracking
      WHERE matched_phone IS NULL
        AND timestamp BETWEEN $1 AND $2
        AND utm_source IS NOT NULL
      ORDER BY timestamp DESC
      LIMIT 1
    `, [windowStart.toISOString(), windowEnd.toISOString()]);
    
    if (result) {
      // Marcar como matched
      await databaseService.query(`
        UPDATE click_tracking 
        SET matched_phone = $1, matched_at = NOW()
        WHERE session_id = $2
      `, [phone, result.session_id]);
      
      return {
        session_id: result.session_id,
        utm_data: {
          utm_source: result.utm_source,
          utm_campaign: result.utm_campaign,
          utm_content: result.utm_content,
          utm_medium: result.utm_medium,
          utm_term: result.utm_term
        },
        confidence: 85 // Alta confiança para webhook match
      };
    }
    
    return null;
  } catch (error) {
    console.error('Webhook matching error:', error);
    return null;
  }
}

// Pattern matching usando a função SQL
async function matchByPattern(message: string): Promise<PatternMatch | null> {
  try {
    const results = await databaseService.query<any>(`
      SELECT * FROM find_campaign_patterns($1)
      WHERE match_score > 0.5
      LIMIT 1
    `, [message.toLowerCase()]);
    
    if (results && results.length > 0) {
      const result = results[0];
      
      return {
        utm_data: {
          utm_source: result.utm_source,
          utm_campaign: result.utm_campaign,
          utm_content: result.utm_content
        },
        confidence: Math.round(result.match_score * 100),
        matched_patterns: result.matched_patterns || [],
        campaign_name: result.campaign_name
      };
    }
    
    return null;
  } catch (error) {
    console.error('Pattern matching error:', error);
    return null;
  }
}

// Salvar resultado do tracking
async function saveLeadTracking(data: {
  cliente_telefone: string;
  empresa_id: string;
  utm_source: string;
  utm_campaign: string;
  utm_content: string;
  utm_medium?: string;
  utm_term?: string;
  detection_method: string;
  confidence_score: number;
  click_session_id?: string;
  matched_message?: string;
  matched_patterns?: string[];
  message_timestamp: Date;
}): Promise<string> {
  
  const result = await databaseService.queryOne<{ id: string }>(`
    INSERT INTO lead_tracking (
      cliente_telefone,
      empresa_id,
      utm_source,
      utm_campaign, 
      utm_content,
      utm_medium,
      utm_term,
      detection_method,
      confidence_score,
      click_session_id,
      matched_message,
      matched_patterns,
      message_timestamp
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING id
  `, [
    data.cliente_telefone,
    data.empresa_id,
    data.utm_source,
    data.utm_campaign,
    data.utm_content,
    data.utm_medium || null,
    data.utm_term || null,
    data.detection_method,
    data.confidence_score,
    data.click_session_id || null,
    data.matched_message || null,
    data.matched_patterns || null,
    data.message_timestamp.toISOString()
  ]);
  
  return result?.id || '';
}