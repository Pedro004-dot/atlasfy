import { 
  WhatsAppConnectionRepository, 
  IWhatsAppConnectionRepository 
} from '@/repositories/whatsapp-connection.repository';
import { 
  WhatsAppConnection, 
  CreateWhatsAppConnectionData, 
  ApiResponse,
  EvolutionCreateInstanceRequest,
  EvolutionCreateInstanceResponse,
  EvolutionInstanceData,
  EvolutionInstanceStatus,
  EvolutionApiError,
  ConnectionStatusResponse
} from '@/types';

export interface IWhatsAppConnectionService {
  createConnection(data: CreateWhatsAppConnectionData & { user_id: string }): Promise<ApiResponse<WhatsAppConnection>>;
  initiateEvolutionInstance(instanceName: string, userId: string, agentId?: string, agentType?: string): Promise<ApiResponse<WhatsAppConnection>>;
  getConnectionStatus(instanceName: string): Promise<ApiResponse<ConnectionStatusResponse>>;
  getConnectionsByUser(userId: string): Promise<ApiResponse<WhatsAppConnection[]>>;
  deleteConnection(instanceName: string): Promise<ApiResponse<void>>;
  processWebhookEvent(instanceName: string, event: any): Promise<ApiResponse<void>>;
  checkInstanceStatus(instanceName: string): Promise<ApiResponse<EvolutionInstanceStatus>>;
  cleanupExpiredConnections(): Promise<ApiResponse<number>>;
}

export class WhatsAppConnectionService implements IWhatsAppConnectionService {
  
  constructor(
    private whatsappRepository: IWhatsAppConnectionRepository,
    private evolutionApiUrl: string = process.env.EVOLUTION_API_URL || '',
    private evolutionApiKey: string = process.env.EVOLUTION_API_KEY || ''
  ) {}

  /**
   * Maps Evolution API status to our WhatsApp connection status
   */
  private mapEvolutionStatusToConnectionStatus(evolutionStatus: string): WhatsAppConnection['status'] {
    const status = evolutionStatus.toLowerCase();
    
    switch (status) {
      case 'open':
        return 'connected';
      case 'connecting':
      case 'qrReadSuccess':
        return 'pending';
      case 'close':
      case 'destroyed':
        return 'disconnected';
      case 'timeout':
        return 'expired';
      default:
        return 'pending';
    }
  }

  async createConnection(data: CreateWhatsAppConnectionData & { user_id: string }): Promise<ApiResponse<WhatsAppConnection>> {
    try {
      // Check if instance name already exists
      const existingConnection = await this.whatsappRepository.findByInstanceName(data.instance_name);
      if (existingConnection) {
        return {
          success: false,
          message: 'Uma conexão com este nome já existe',
          error: 'INSTANCE_EXISTS'
        };
      }

      // Create database record
      const connection = await this.whatsappRepository.create(data);

      return {
        success: true,
        message: 'Conexão WhatsApp criada com sucesso',
        data: connection
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Erro ao criar conexão WhatsApp',
        error: error.message
      };
    }
  }

  async initiateEvolutionInstance(instanceName: string, userId: string, agentId?: string, agentType?: string): Promise<ApiResponse<WhatsAppConnection>> {
    try {
      console.log('=== Service: initiateEvolutionInstance ===');
      console.log('Parameters:', { instanceName, userId, agentId, agentType });
      
      // Buscar URL do webhook no banco pelo tipo de agente
      if (!agentType) {
        return {
          success: false,
          message: 'Tipo de agente não informado',
          error: 'AGENT_TYPE_REQUIRED'
        };
      }
      const supabase = require('@/lib/database').databaseService.getClient();
      const { data: webhookRows, error: webhookError } = await supabase
        .from('webhook')
        .select('url')
        .eq('tipo', agentType)
        .limit(1)
        .single();
      if (webhookError || !webhookRows || !webhookRows.url) {
        return {
          success: false,
          message: 'Webhook não encontrado para o tipo de agente informado',
          error: 'WEBHOOK_NOT_FOUND'
        };
      }
      const webhookUrl = webhookRows.url;
      console.log('Webhook URL from DB:', webhookUrl);
      
      // First create the database connection
      const connectionResult = await this.createConnection({
        instance_name: instanceName,
        user_id: userId,
        agent_id: agentId || undefined, // Garante que seja undefined se não fornecido
        webhook_url: webhookUrl
      });

      console.log('Database connection result:', connectionResult);

      if (!connectionResult.success) {
        console.error('Database connection failed:', connectionResult);
        return connectionResult;
      }

      // Prepare Evolution API request
      const evolutionRequest: EvolutionCreateInstanceRequest = {
        instanceName: instanceName, // vindo do frontend
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
        groupsIgnore: true,
        webhook: {
          url: webhookUrl, 
          base64: true,
          headers: {
            "Content-Type": "application/json"
          },
          events: [
            'QRCODE_UPDATED',
            'CONNECTION_UPDATE',
            'MESSAGES_UPSERT'
          ]
        }
      };

      console.log('Evolution API request:', evolutionRequest);
      console.log('Evolution API URL:', this.evolutionApiUrl);
      console.log('Evolution API Key length:', this.evolutionApiKey.length);

      // Call Evolution API to create instance
      console.log('Calling Evolution API...');
      const response = await fetch(`${this.evolutionApiUrl}/instance/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.evolutionApiKey
        },
        body: JSON.stringify(evolutionRequest)
      });

      console.log('Evolution API response status:', response.status);

      if (!response.ok) {
        console.log('Evolution API failed, reading error...');
        const errorText = await response.text();
        console.log('Evolution API error response:', errorText);
        
        let errorData: EvolutionApiError;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = {
            error: 'UNKNOWN_ERROR',
            message: errorText || 'Unknown error from Evolution API',
            statusCode: response.status
          };
        }
        
        // Clean up database connection if Evolution API fails
        console.log('Cleaning up database connection...');
        await this.whatsappRepository.deleteByInstanceName(instanceName);
        
        return {
          success: false,
          message: `Erro na Evolution API: ${errorData.message}`,
          error: errorData.error
        };
      }

      console.log('Evolution API success, parsing response...');
      const evolutionResponse: EvolutionCreateInstanceResponse = await response.json();
      console.log('Evolution API response:', evolutionResponse);

      // Map Evolution API status to our status enum
      const mappedStatus = this.mapEvolutionStatusToConnectionStatus(evolutionResponse.instance.status);

      // Store the complete evolution response for reference
      const evolutionData: EvolutionInstanceData = {
        instanceName: evolutionResponse.instance.instanceName,
        owner: '', // Will be populated when instance is connected
        status: evolutionResponse.instance.status,
        apikey: evolutionResponse.hash // hash is a string, not an object
      };
      await this.whatsappRepository.updateEvolutionData(instanceName, evolutionData);

      // Update status separately if needed
      if (mappedStatus !== 'pending') {
        await this.whatsappRepository.updateStatus(instanceName, mappedStatus);
      }

      // Try to get QR code after a small delay
      let qrCodeObtained = false;
      if (evolutionResponse.qrcode?.base64) {
        await this.whatsappRepository.updateQrCode(instanceName, evolutionResponse.qrcode.base64);
        qrCodeObtained = true;
      } else {
        // Wait and try to fetch QR code from Evolution API
        console.log('QR Code não disponível na resposta inicial. Aguardando e tentando buscar...');
        
        // Try immediately to fetch QR code (it might be available now)
        try {
          const qrResponse = await fetch(`${this.evolutionApiUrl}/instance/connect/${instanceName}`, {
            method: 'GET',
            headers: {
              'apikey': this.evolutionApiKey,
            }
          });

          if (qrResponse.ok) {
            const qrData = await qrResponse.json();
            console.log('QR Code buscado imediatamente da Evolution API:', {
              hasBase64: !!qrData.base64,
              base64Length: qrData.base64?.length || 0
            });
            
            if (qrData.base64) {
              await this.whatsappRepository.updateQrCode(instanceName, qrData.base64);
              console.log('QR Code atualizado no banco de dados imediatamente');
              qrCodeObtained = true;
            }
          }
        } catch (error) {
          console.log('QR Code não disponível ainda. Será buscado via polling.');
        }
      }

      // Get updated connection
      const updatedConnection = await this.whatsappRepository.findByInstanceName(instanceName);

      return {
        success: true,
        message: 'Instância Evolution API criada com sucesso',
        data: updatedConnection!
      };

    } catch (error: any) {
      // Clean up database connection if something fails
      try {
        await this.whatsappRepository.deleteByInstanceName(instanceName);
      } catch (cleanupError) {
        console.error('Erro ao limpar conexão após falha:', cleanupError);
      }

      return {
        success: false,
        message: 'Erro ao iniciar instância Evolution API',
        error: error.message
      };
    }
  }

  async getConnectionStatus(instanceName: string): Promise<ApiResponse<ConnectionStatusResponse>> {
    try {
      const connection = await this.whatsappRepository.findByInstanceName(instanceName);
      
      if (!connection) {
        return {
          success: false,
          message: 'Conexão não encontrada',
          error: 'CONNECTION_NOT_FOUND'
        };
      }

      const now = new Date();
      const expiresAt = new Date(connection.expires_at);
      const createdAt = new Date(connection.created_at);
      const connectionDuration = now.getTime() - createdAt.getTime();
      const maxAttempts = 5;

      // Check if expired
      if (now > expiresAt && connection.status === 'pending') {
        await this.whatsappRepository.updateStatus(instanceName, 'expired');
        connection.status = 'expired';
      }

      const statusResponse: ConnectionStatusResponse = {
        qrCode: connection.qr_code || null,
        status: connection.status as 'error' | 'pending' | 'connected' | 'expired',
        lastUpdated: connection.last_updated,
        connectionDuration,
        phoneNumber: connection.phone_number,
        profileName: connection.evolution_instance_data?.profileName,
        expiresAt: connection.expires_at,
        attemptsRemaining: Math.max(0, maxAttempts - connection.connection_attempts)
      };

      return {
        success: true,
        message: 'Status da conexão recuperado',
        data: statusResponse
      };

    } catch (error: any) {
      return {
        success: false,
        message: 'Erro ao buscar status da conexão',
        error: error.message
      };
    }
  }

  async getConnectionsByUser(userId: string): Promise<ApiResponse<WhatsAppConnection[]>> {
    try {
      const connections = await this.whatsappRepository.findByUserId(userId);

      return {
        success: true,
        message: 'Conexões do usuário recuperadas',
        data: connections
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Erro ao buscar conexões do usuário',
        error: error.message
      };
    }
  }

  async deleteConnection(instanceName: string): Promise<ApiResponse<void>> {
    try {
      const connection = await this.whatsappRepository.findByInstanceName(instanceName);
      
      if (!connection) {
        return {
          success: false,
          message: 'Conexão não encontrada',
          error: 'CONNECTION_NOT_FOUND'
        };
      }

      // Try to delete from Evolution API
      try {
        await fetch(`${this.evolutionApiUrl}/instance/delete/${instanceName}`, {
          method: 'DELETE',
          headers: {
            'apikey': this.evolutionApiKey
          }
        });
      } catch (evolutionError) {
        console.warn('Erro ao deletar instância da Evolution API:', evolutionError);
        // Continue with database deletion even if Evolution API fails
      }

      // Update agent if connected
      if (connection.agent_id && connection.status === 'connected') {
        // This would need to be done through the agent service/repository
        // For now, we'll update directly (not ideal but functional)
        const supabase = require('@/lib/database').databaseService.getClient();
        await supabase
          .from('agente')
          .update({
            whatsapp_conectado: false,
            whatsapp_numero: null
          })
          .eq('id', connection.agent_id);
      }

      // Delete from database
      await this.whatsappRepository.deleteByInstanceName(instanceName);

      return {
        success: true,
        message: 'Conexão deletada com sucesso'
      };

    } catch (error: any) {
      return {
        success: false,
        message: 'Erro ao deletar conexão',
        error: error.message
      };
    }
  }

  async processWebhookEvent(instanceName: string, event: any): Promise<ApiResponse<void>> {
    try {
      const connection = await this.whatsappRepository.findByInstanceName(instanceName);
      
      if (!connection) {
        return {
          success: false,
          message: 'Conexão não encontrada para o webhook',
          error: 'CONNECTION_NOT_FOUND'
        };
      }

      console.log(`Processing webhook event: ${event.event} for instance: ${instanceName}`);

      switch (event.event) {
        case 'QRCODE_UPDATED':
          if (event.data?.qrcode?.base64) {
            await this.whatsappRepository.updateQrCode(instanceName, event.data.qrcode.base64);
            console.log(`QR Code updated for instance: ${instanceName}`);
          }
          break;

        case 'CONNECTION_UPDATE':
          if (event.data?.state) {
            const state = event.data.state.toLowerCase();
            const mappedStatus = this.mapEvolutionStatusToConnectionStatus(state);
            
            // If connected and we have phone info, update phone connection
            if (mappedStatus === 'connected' && event.data?.phone?.number) {
              await this.whatsappRepository.updatePhoneConnection(
                instanceName,
                event.data.phone.number,
                event.data.phone.pushName
              );
              console.log(`WhatsApp connected for instance: ${instanceName}, phone: ${event.data.phone.number}`);
            } else {
              await this.whatsappRepository.updateStatus(instanceName, mappedStatus);
              console.log(`Connection state changed for instance: ${instanceName}, state: ${state}, mapped: ${mappedStatus}`);
            }
          }
          break;

        case 'MESSAGES_UPSERT':
          // Handle incoming messages if needed for chat functionality
          console.log(`Message received for instance: ${instanceName}`);
          break;

        default:
          console.log(`Unhandled webhook event: ${event.event} for instance: ${instanceName}`);
      }

      return {
        success: true,
        message: 'Evento do webhook processado com sucesso'
      };

    } catch (error: any) {
      console.error('Erro ao processar evento do webhook:', error);
      return {
        success: false,
        message: 'Erro ao processar evento do webhook',
        error: error.message
      };
    }
  }

  async checkInstanceStatus(instanceName: string): Promise<ApiResponse<EvolutionInstanceStatus>> {
    try {
      const response = await fetch(`${this.evolutionApiUrl}/instance/fetchInstances/${instanceName}`, {
        method: 'GET',
        headers: {
          'apikey': this.evolutionApiKey
        }
      });

      if (!response.ok) {
        const errorData: EvolutionApiError = await response.json();
        return {
          success: false,
          message: `Erro na Evolution API: ${errorData.message}`,
          error: errorData.error
        };
      }

      const status: EvolutionInstanceStatus = await response.json();

      return {
        success: true,
        message: 'Status da instância recuperado',
        data: status
      };

    } catch (error: any) {
      return {
        success: false,
        message: 'Erro ao verificar status da instância',
        error: error.message
      };
    }
  }

  async cleanupExpiredConnections(): Promise<ApiResponse<number>> {
    try {
      const cleanedCount = await this.whatsappRepository.cleanupExpired();

      return {
        success: true,
        message: `${cleanedCount} conexões expiradas removidas`,
        data: cleanedCount
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Erro ao limpar conexões expiradas',
        error: error.message
      };
    }
  }
}

// Factory function
export function createWhatsAppConnectionService(): IWhatsAppConnectionService {
  const whatsappRepository = new WhatsAppConnectionRepository();
  return new WhatsAppConnectionService(whatsappRepository);
}