import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth';

interface RouteParams {
  params: {
    instanceName: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
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

    // Conectar ao Supabase
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Buscar conexão do usuário
    const { data: connection, error } = await supabase
      .from('whatsapp_connections')
      .select('*')
      .eq('instance_name', instanceName)
      .eq('user_id', userId)
      .single();

    if (error || !connection) {
      return NextResponse.json(
        { error: 'Conexão não encontrada' },
        { status: 404 }
      );
    }

    // Verificar se a conexão expirou
    const now = new Date();
    const expiresAt = new Date(connection.expires_at);
    
    if (now > expiresAt && connection.status !== 'connected') {
      // Atualizar status para expirado
      await supabase
        .from('whatsapp_connections')
        .update({ 
          status: 'expired',
          last_updated: now.toISOString() 
        })
        .eq('id', connection.id);

      return NextResponse.json({
        success: true,
        data: {
          qrCode: null,
          status: 'expired',
          phoneNumber: connection.phone_number,
          profileName: null,
          attemptsRemaining: connection.connection_attempts || 0
        }
      });
    }

    // Se pendente, verificar status na Evolution API e buscar QR Code se necessário
    if (connection.status === 'pending') {
      try {
        const evolutionApiUrl = process.env.EVOLUTION_API_URL;
        const evolutionApiKey = process.env.EVOLUTION_API_KEY;

        if (evolutionApiUrl && evolutionApiKey) {
          // Verificar status da conexão
          const evolutionResponse = await fetch(
            `${evolutionApiUrl}/instance/connectionState/${instanceName}`,
            {
              headers: {
                'apikey': evolutionApiKey,
              }
            }
          );

          if (evolutionResponse.ok) {
            const evolutionData = await evolutionResponse.json();
            
            // Se conectado na Evolution API, atualizar no banco
            if (evolutionData.instance?.state === 'open') {
              await supabase
                .from('whatsapp_connections')
                .update({ 
                  status: 'connected',
                  phone_number: evolutionData.instance?.phoneNumber || connection.phone_number,
                  last_updated: now.toISOString() 
                })
                .eq('id', connection.id);

              return NextResponse.json({
                success: true,
                data: {
                  qrCode: null,
                  status: 'connected',
                  phoneNumber: evolutionData.instance?.phoneNumber || connection.phone_number,
                  profileName: evolutionData.instance?.profileName || null,
                  attemptsRemaining: connection.connection_attempts || 0
                }
              });
            }
          }

          // Se não há QR Code no banco, tentar buscar na Evolution API
          if (!connection.qr_code) {
            // Verificar se a conexão foi criada há pelo menos 1 segundo
            const connectionAge = now.getTime() - new Date(connection.created_at).getTime();
            
            if (connectionAge >= 1000) { // 1 segundo
              try {
                console.log(`Tentando buscar QR Code para instância ${instanceName} (idade: ${Math.round(connectionAge/1000)}s)`);
                
                const qrResponse = await fetch(`${evolutionApiUrl}/instance/connect/${instanceName}`, {
                  method: 'GET',
                  headers: {
                    'apikey': evolutionApiKey,
                    'Content-Type': 'application/json',
                  },
                });

                if (qrResponse.ok) {
                  const qrData = await qrResponse.json();
                  console.log('Buscando QR Code na Evolution API:', {
                    hasBase64: !!qrData.base64,
                    base64Length: qrData.base64?.length || 0,
                    instanceAge: Math.round(connectionAge/1000) + 's'
                  });
                  
                  if (qrData.base64) {
                    // Atualizar QR Code no banco
                    await supabase
                      .from('whatsapp_connections')
                      .update({ 
                        qr_code: qrData.base64,
                        last_updated: now.toISOString() 
                      })
                      .eq('id', connection.id);

                    return NextResponse.json({
                      success: true,
                      data: {
                        qrCode: qrData.base64,
                        status: connection.status,
                        phoneNumber: connection.phone_number,
                        profileName: null,
                        attemptsRemaining: connection.connection_attempts || 0
                      }
                    });
                  }
                }
              } catch (qrError) {
                console.warn('Erro ao buscar QR Code na Evolution API:', qrError);
              }
            } else {
              console.log(`Aguardando mais ${Math.round((1000 - connectionAge)/1000)}s antes de buscar QR Code`);
            }
          }
        }
      } catch (evolutionError) {
        console.error('Error checking Evolution API status:', evolutionError);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        qrCode: connection.qr_code,
        status: connection.status,
        phoneNumber: connection.phone_number,
        profileName: null,
        attemptsRemaining: connection.connection_attempts || 0
      }
    });

  } catch (error: any) {
    console.error('Error fetching connection status:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // Conectar ao Supabase   
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Buscar e deletar conexão
    const { error } = await supabase
      .from('whatsapp_connections')
      .delete()
      .eq('instance_name', instanceName)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting connection:', error);
      return NextResponse.json(
        { error: 'Erro ao deletar conexão' },
        { status: 500 }
      );
    }

    // Tentar deletar instância na Evolution API
    try {
      const evolutionApiUrl = process.env.EVOLUTION_API_URL;
      const evolutionApiKey = process.env.EVOLUTION_API_KEY;

      if (evolutionApiUrl && evolutionApiKey) {
        await fetch(`${evolutionApiUrl}/instance/delete/${instanceName}`, {
          method: 'DELETE',
          headers: {
            'apikey': evolutionApiKey,
          }
        });
      }
    } catch (evolutionError) {
      console.error('Error deleting Evolution API instance:', evolutionError);
      // Não retornar erro aqui pois a conexão já foi deletada do banco
    }

    return NextResponse.json({
      success: true,
      message: 'Conexão deletada com sucesso'
    });

  } catch (error: any) {
    console.error('Error deleting connection:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}