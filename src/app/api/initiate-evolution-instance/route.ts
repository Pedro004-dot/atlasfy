import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth';
import { createWhatsAppConnectionService } from '@/services/whatsapp-connection.service';
import { z } from 'zod';

const initiateInstanceSchema = z.object({
  instanceName: z.string()
    .min(3, 'Nome da instância deve ter pelo menos 3 caracteres')
    .max(50, 'Nome da instância deve ter no máximo 50 caracteres')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Nome da instância deve conter apenas letras, números, hífens e underscores'),
  agentId: z.string().uuid().optional()
});

export async function POST(request: NextRequest) {
  try {
    console.log('=== WhatsApp Instance Creation Request ===');
    
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('Missing authorization header');
      return NextResponse.json(
        { error: 'Token de autenticação não fornecido' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const payload = verifyJWT(token);
    
    if (!payload?.userId) {
      console.log('Invalid JWT token');
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      );
    }

    console.log('User ID:', payload.userId);

    // Validate request body
    const body = await request.json();
    console.log('Request body:', body);
    
    const validation = initiateInstanceSchema.safeParse(body);
    
    if (!validation.success) {
      console.log('Validation errors:', validation.error.errors);
      return NextResponse.json(
        { 
          error: 'Dados inválidos',
          details: validation.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      );
    }

    const { instanceName, agentId } = validation.data;
    console.log('Validated data:', { instanceName, agentId });

    // Check environment variables
    const hasEvolutionUrl = !!process.env.EVOLUTION_API_URL;
    const hasEvolutionKey = !!process.env.EVOLUTION_API_KEY;
    console.log('Evolution API config:', { 
      hasUrl: hasEvolutionUrl, 
      hasKey: hasEvolutionKey,
      url: process.env.EVOLUTION_API_URL 
    });

    if (!hasEvolutionUrl || !hasEvolutionKey) {
      console.error('Evolution API configuration missing');
      return NextResponse.json(
        { 
          error: 'Configuração da API Evolution não encontrada',
          details: {
            hasUrl: hasEvolutionUrl,
            hasKey: hasEvolutionKey
          }
        },
        { status: 500 }
      );
    }

    // Create service and initiate instance
    console.log('Creating WhatsApp service...');
    const whatsappService = createWhatsAppConnectionService();
    
    console.log('Initiating Evolution instance...');
    const result = await whatsappService.initiateEvolutionInstance(
      instanceName,
      payload.userId,
      agentId
    );

    console.log('Service result:', result);

    if (!result.success) {
      console.error('Service failed:', result);
      return NextResponse.json(
        { 
          error: result.error,
          message: result.message 
        },
        { status: 400 }
      );
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: result.message,
      data: {
        instanceName: result.data!.instance_name,
        status: result.data!.status,
        qrCode: result.data!.qr_code,
        expiresAt: result.data!.expires_at,
        connectionId: result.data!.id
      }
    });

  } catch (error: any) {
    console.error('Erro ao iniciar instância Evolution:', error);
    
    return NextResponse.json(
      { 
        error: 'INTERNAL_ERROR',
        message: 'Erro interno do servidor' 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token de autenticação não fornecido' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const payload = verifyJWT(token);
    
    if (!payload?.userId) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      );
    }

    // Get user's WhatsApp connections
    const whatsappService = createWhatsAppConnectionService();
    const result = await whatsappService.getConnectionsByUser(payload.userId);

    if (!result.success) {
      return NextResponse.json(
        { 
          error: result.error,
          message: result.message 
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      data: result.data
    });

  } catch (error: any) {
    console.error('Erro ao buscar conexões WhatsApp:', error);
    
    return NextResponse.json(
      { 
        error: 'INTERNAL_ERROR',
        message: 'Erro interno do servidor' 
      },
      { status: 500 }
    );
  }
}