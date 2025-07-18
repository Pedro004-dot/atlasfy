import { NextRequest, NextResponse } from 'next/server';
import { createWhatsAppConnectionService } from '@/services/whatsapp-connection.service';

// This endpoint can be called by a cron job to cleanup expired connections
export async function POST(request: NextRequest) {
  try {
    // Optional: Add authentication for cron jobs
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const providedSecret = request.headers.get('x-cron-secret');
      if (providedSecret !== cronSecret) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    const whatsappService = createWhatsAppConnectionService();
    const result = await whatsappService.cleanupExpiredConnections();

    if (!result.success) {
      return NextResponse.json(
        { 
          error: result.error,
          message: result.message 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      cleanedCount: result.data
    });

  } catch (error: any) {
    console.error('Error cleaning up expired connections:', error);
    
    return NextResponse.json(
      { 
        error: 'INTERNAL_ERROR',
        message: 'Erro interno do servidor' 
      },
      { status: 500 }
    );
  }
}

// Allow GET for health check
export async function GET() {
  return NextResponse.json({
    message: 'WhatsApp Connection Cleanup Endpoint',
    timestamp: new Date().toISOString()
  });
}