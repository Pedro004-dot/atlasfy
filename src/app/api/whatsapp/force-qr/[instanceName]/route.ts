import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth';

interface RouteParams {
  params: {
    instanceName: string;
  };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
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
    const { instanceName } = params;

    console.log(`Forçando busca de QR Code para instância: ${instanceName}`);

    const evolutionApiUrl = process.env.EVOLUTION_API_URL;
    const evolutionApiKey = process.env.EVOLUTION_API_KEY;

    if (!evolutionApiUrl || !evolutionApiKey) {
      return NextResponse.json(
        { error: 'Evolution API não configurada' },
        { status: 500 }
      );
    }

    // Buscar QR Code diretamente da Evolution API
    const qrResponse = await fetch(`${evolutionApiUrl}/instance/connect/${instanceName}`, {
      method: 'GET',
      headers: {
        'apikey': evolutionApiKey,
        'Content-Type': 'application/json',
      },
    });

    console.log('Evolution API QR Status:', qrResponse.status);

    if (!qrResponse.ok) {
      const errorText = await qrResponse.text();
      console.log('Evolution API QR Error:', errorText);
      return NextResponse.json(
        { error: 'Erro ao buscar QR Code da Evolution API', details: errorText },
        { status: 500 }
      );
    }

    const qrData = await qrResponse.json();
    console.log('QR Code forçado da Evolution API:', {
      hasBase64: !!qrData.base64,
      base64Length: qrData.base64?.length || 0,
      hasPairingCode: !!qrData.pairingCode,
      hasCode: !!qrData.code
    });

    if (!qrData.base64) {
      return NextResponse.json({
        success: false,
        error: 'QR Code não disponível ainda na Evolution API',
        data: {
          pairingCode: qrData.pairingCode,
          code: qrData.code,
          count: qrData.count
        }
      }, { status: 404 });
    }

    // Conectar ao Supabase para atualizar o QR Code
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Buscar e atualizar conexão
    const { data: connection, error: findError } = await supabase
      .from('whatsapp_connections')
      .select('*')
      .eq('instance_name', instanceName)
      .eq('user_id', userId)
      .single();

    if (findError || !connection) {
      return NextResponse.json(
        { error: 'Conexão não encontrada' },
        { status: 404 }
      );
    }

    // Atualizar QR Code no banco
    const { error: updateError } = await supabase
      .from('whatsapp_connections')
      .update({ 
        qr_code: qrData.base64,
        last_updated: new Date().toISOString() 
      })
      .eq('id', connection.id);

    if (updateError) {
      console.error('Erro ao atualizar QR Code:', updateError);
      return NextResponse.json(
        { error: 'Erro ao atualizar QR Code no banco' },
        { status: 500 }
      );
    }

    console.log('QR Code atualizado com sucesso no banco');

    return NextResponse.json({
      success: true,
      message: 'QR Code obtido e atualizado com sucesso',
      data: {
        qrCode: qrData.base64,
        status: connection.status,
        phoneNumber: connection.phone_number,
        profileName: null,
        attemptsRemaining: connection.connection_attempts || 0
      }
    });

  } catch (error: any) {
    console.error('Error forcing QR code fetch:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error.message },
      { status: 500 }
    );
  }
}