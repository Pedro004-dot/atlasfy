import { NextRequest, NextResponse } from 'next/server';
import { databaseService } from '@/lib/database';

interface TrackingData {
  id: string;
  utm_source: string;
  utm_campaign: string;
  utm_content: string;
  utm_medium?: string;
  utm_term?: string;
  detection_method: string;
  confidence_score: number;
  matched_patterns?: string[];
  created_at: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { phone: string } }
) {
  try {
    const phone = params.phone;
    
    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    // Buscar o tracking mais recente para este telefone
    const tracking = await databaseService.queryOne<TrackingData>(`
      SELECT 
        id,
        utm_source,
        utm_campaign,
        utm_content,
        utm_medium,
        utm_term,
        detection_method,
        confidence_score,
        matched_patterns,
        created_at
      FROM lead_tracking
      WHERE cliente_telefone = $1
      ORDER BY created_at DESC
      LIMIT 1
    `, [phone]);
    
    if (!tracking) {
      return NextResponse.json({ 
        success: false, 
        message: 'No tracking data found for this phone number',
        tracking: null 
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      tracking: {
        ...tracking,
        // Formatear dados para exibição
        source_display: getSourceDisplay(tracking.utm_source),
        campaign_display: formatCampaignName(tracking.utm_campaign),
        confidence_level: getConfidenceLevel(tracking.confidence_score)
      }
    });
    
  } catch (error) {
    console.error('Error fetching lead tracking:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
}

// Helper functions para formatação
function getSourceDisplay(source: string): string {
  const sourceMap: Record<string, string> = {
    'facebook': 'Facebook',
    'instagram': 'Instagram', 
    'google': 'Google Ads',
    'youtube': 'YouTube',
    'linkedin': 'LinkedIn',
    'tiktok': 'TikTok'
  };
  
  return sourceMap[source?.toLowerCase()] || source || 'Desconhecido';
}

function formatCampaignName(campaign: string): string {
  if (!campaign) return 'Sem campanha';
  
  // Converter snake_case para formato legível
  return campaign
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

function getConfidenceLevel(score: number): { level: string; color: string } {
  if (score >= 80) {
    return { level: 'Alta', color: 'green' };
  } else if (score >= 60) {
    return { level: 'Média', color: 'yellow' };
  } else if (score >= 40) {
    return { level: 'Baixa', color: 'orange' };
  } else {
    return { level: 'Muito Baixa', color: 'red' };
  }
}