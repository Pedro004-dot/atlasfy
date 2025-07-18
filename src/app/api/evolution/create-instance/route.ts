import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth';
import { createWhatsAppConnectionService } from '@/services/whatsapp-connection.service';

interface CreateInstanceRequest {
  instanceName: string;
  agentId?: string;
  agentType?: string; // adicionar agentType
}

interface EvolutionAPIResponse {
  instance: {
    instanceName: string;
    instanceId?: string;
    integration?: string;
    webhookWaBusiness?: string | null;
    accessTokenWaBusiness?: string;
    status: string;
  };
  hash: string;
  webhook?: Record<string, any>;
  websocket?: Record<string, any>;
  rabbitmq?: Record<string, any>;
  sqs?: Record<string, any>;
  settings?: {
    rejectCall?: boolean;
    msgCall?: string;
    groupsIgnore?: boolean;
    alwaysOnline?: boolean;
    readMessages?: boolean;
    readStatus?: boolean;
    syncFullHistory?: boolean;
    wavoipToken?: string;
  };
  qrcode?: {
    pairingCode?: string | null;
    code?: string;
    base64?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const authorization = request.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token não fornecido' },
        { status: 401 }
      );
    }

    const token = authorization.split(' ')[1];
    const { userId } = await verifyJWT(token);

    // Parse do body
    const body: CreateInstanceRequest = await request.json();
    const { instanceName, agentId, agentType } = body;

    if (!instanceName) {
      return NextResponse.json(
        { error: 'Nome da instância é obrigatório' },
        { status: 400 }
      );
    }
    if (!agentType) {
      return NextResponse.json(
        { error: 'Tipo de agente é obrigatório' },
        { status: 400 }
      );
    }

    // Log para debug
    console.log('Request body parsed:', { instanceName, agentId, agentType });
    console.log('User ID from token:', userId);

    // Verificar se as variáveis de ambiente estão configuradas
    const evolutionApiUrl = process.env.EVOLUTION_API_URL;
    const evolutionApiKey = process.env.EVOLUTION_API_KEY;

    if (!evolutionApiUrl || !evolutionApiKey) {
      return NextResponse.json(
        { error: 'Configuração da Evolution API não encontrada' },
        { status: 500 }
      );
    }

    // Chamar o service para criar a instância Evolution (ajustar para usar agentType)
    console.log('Creating WhatsApp connection service...');
    const service = createWhatsAppConnectionService();
    
    console.log('Calling initiateEvolutionInstance with:', { instanceName, userId, agentId, agentType });
    const result = await service.initiateEvolutionInstance(instanceName, userId, agentId, agentType);
    if (!result.success) {
      return NextResponse.json({ 
        success: false,
        error: result.error,
        message: result.message 
      }, { status: 400 });
    }

    console.log('Service Result:', result.success ? 'SUCCESS' : 'FAILED');
    if (result.success) {
      console.log('QR Code generated:', !!result.data?.qr_code);
    }

    // Retornar os dados diretamente do service
    const responseData = {
      connectionId: result.data?.id,
      instanceName: result.data?.instance_name,
      instanceId: result.data?.evolution_instance_data?.instanceName,
      hash: result.data?.evolution_instance_data?.apikey,
      status: result.data?.status,
      qrCode: result.data?.qr_code,
      expiresAt: result.data?.expires_at,
      evolutionApiResponse: result.data?.evolution_instance_data
    };

    return NextResponse.json({
      success: true,
      data: responseData
    });

  } catch (error: any) {
    console.error('Error creating Evolution API instance:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 