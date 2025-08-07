import { 
  BaseBusinessRule, 
  BusinessRuleContext, 
  BusinessRuleResult, 
  BusinessRuleCategory,
  IConnectionValidator 
} from '../interfaces/IBusinessRule';
import { getWhatsAppOfficialRepository } from '@/repositories/whatsapp-official.repository';
import { databaseService } from '@/lib/database';

/**
 * Implementação do validador de conexões
 */
export class ConnectionValidator implements IConnectionValidator {
  private repository = getWhatsAppOfficialRepository();

  async validateUniquePhoneNumber(phoneNumberId: string, excludeConnectionId?: string): Promise<boolean> {
    try {
      const existingConnection = await this.repository.findByPhoneNumberId(phoneNumberId);
      
      if (!existingConnection) {
        return true; // Número disponível
      }

      // Se é para excluir uma conexão específica (update), verificar se é a mesma
      if (excludeConnectionId && existingConnection.id === excludeConnectionId) {
        return true;
      }

      return false; // Número já em uso
    } catch (error) {
      console.error('Error validating unique phone number:', error);
      return false; // Em caso de erro, negar por segurança
    }
  }

  async validateAgentExclusivity(agentId: string, excludeConnectionId?: string): Promise<boolean> {
    try {
      const existingConnection = await this.repository.findByAgentId(agentId);
      
      if (!existingConnection) {
        return true; // Agente disponível
      }

      // Se é para excluir uma conexão específica, verificar se é a mesma
      if (excludeConnectionId && existingConnection.id === excludeConnectionId) {
        return true;
      }

      return false; // Agente já conectado
    } catch (error) {
      console.error('Error validating agent exclusivity:', error);
      return false;
    }
  }

  async validateMaxConnectionsPerCompany(companyId: string): Promise<boolean> {
    try {
      const supabase = databaseService.getClient();
      
      const { data: connections, error } = await supabase
        .from('whatsapp_official_connections')
        .select('id')
        .eq('empresa_id', companyId)
        .eq('status', 'active');

      if (error) {
        console.error('Error validating max connections:', error);
        return false;
      }

      // Por enquanto sem limite, mas estrutura pronta para implementar
      const maxConnections = 50; // Configurável no futuro
      return (connections?.length || 0) < maxConnections;
    } catch (error) {
      console.error('Error validating max connections per company:', error);
      return false;
    }
  }
}

/**
 * Regra: 1 Número WhatsApp = 1 Conexão no sistema
 */
export class UniquePhoneNumberRule extends BaseBusinessRule {
  private validator = new ConnectionValidator();

  constructor() {
    super('unique_phone_number', 100, BusinessRuleCategory.CONNECTION);
  }

  async evaluate(context: BusinessRuleContext): Promise<BusinessRuleResult> {
    const { connection_data, metadata } = context;
    
    if (!connection_data?.phone_number_id) {
      return {
        success: false,
        allowed: false,
        message: 'Phone number ID is required',
        errorCode: 'MISSING_PHONE_NUMBER_ID'
      };
    }

    const isUnique = await this.validator.validateUniquePhoneNumber(
      connection_data.phone_number_id,
      metadata?.excludeConnectionId
    );

    if (!isUnique) {
      return {
        success: true,
        allowed: false,
        message: 'Phone number is already connected to another instance',
        errorCode: 'PHONE_NUMBER_ALREADY_CONNECTED',
        actions: [{
          type: 'log_event',
          target: 'business_rule_violations',
          params: {
            rule: this.name,
            phone_number_id: connection_data.phone_number_id,
            violation_type: 'duplicate_phone_number'
          }
        }]
      };
    }

    return {
      success: true,
      allowed: true,
      message: 'Phone number is available for connection'
    };
  }
}

/**
 * Regra: 1 Agente = 1 WhatsApp (exclusividade)
 */
export class AgentExclusivityRule extends BaseBusinessRule {
  private validator = new ConnectionValidator();

  constructor() {
    super('agent_exclusivity', 90, BusinessRuleCategory.CONNECTION);
  }

  async canExecute(context: BusinessRuleContext): Promise<boolean> {
    // Só executar se há um agente na conexão
    return !!context.connection_data?.agent_id;
  }

  async evaluate(context: BusinessRuleContext): Promise<BusinessRuleResult> {
    const { connection_data, metadata } = context;
    
    if (!connection_data?.agent_id) {
      return {
        success: true,
        allowed: true,
        message: 'No agent assigned, rule skipped'
      };
    }

    const isExclusive = await this.validator.validateAgentExclusivity(
      connection_data.agent_id,
      metadata?.excludeConnectionId
    );

    if (!isExclusive) {
      return {
        success: true,
        allowed: false,
        message: 'Agent is already connected to another WhatsApp number',
        errorCode: 'AGENT_ALREADY_CONNECTED',
        actions: [{
          type: 'log_event',
          target: 'business_rule_violations',
          params: {
            rule: this.name,
            agent_id: connection_data.agent_id,
            violation_type: 'agent_multiple_connections'
          }
        }]
      };
    }

    return {
      success: true,
      allowed: true,
      message: 'Agent is available for connection'
    };
  }
}

/**
 * Regra: Empresa pode ter múltiplas conexões WhatsApp (com limite)
 */
export class MaxConnectionsPerCompanyRule extends BaseBusinessRule {
  private validator = new ConnectionValidator();

  constructor() {
    super('max_connections_per_company', 80, BusinessRuleCategory.CONNECTION);
  }

  async canExecute(context: BusinessRuleContext): Promise<boolean> {
    return !!context.connection_data?.company_id;
  }

  async evaluate(context: BusinessRuleContext): Promise<BusinessRuleResult> {
    const { connection_data } = context;
    
    if (!connection_data?.company_id) {
      return {
        success: true,
        allowed: true,
        message: 'No company assigned, rule skipped'
      };
    }

    const withinLimit = await this.validator.validateMaxConnectionsPerCompany(
      connection_data.company_id
    );

    if (!withinLimit) {
      return {
        success: true,
        allowed: false,
        message: 'Company has reached maximum number of WhatsApp connections',
        errorCode: 'MAX_CONNECTIONS_EXCEEDED',
        actions: [{
          type: 'send_notification',
          target: 'company_admin',
          params: {
            type: 'connection_limit_reached',
            company_id: connection_data.company_id,
            message: 'Your company has reached the maximum number of WhatsApp connections allowed.'
          }
        }]
      };
    }

    return {
      success: true,
      allowed: true,
      message: 'Company can create additional connections'
    };
  }
}

/**
 * Regra: Validação de dados obrigatórios da conexão
 */
export class ConnectionDataValidationRule extends BaseBusinessRule {
  constructor() {
    super('connection_data_validation', 110, BusinessRuleCategory.CONNECTION);
  }

  async evaluate(context: BusinessRuleContext): Promise<BusinessRuleResult> {
    const { connection_data } = context;
    
    const requiredFields = ['phone_number_id', 'phone_number', 'business_account_id', 'app_id'];
    const missingFields: string[] = [];

    for (const field of requiredFields) {
      if (!connection_data?.[field]) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      return {
        success: true,
        allowed: false,
        message: `Missing required connection data: ${missingFields.join(', ')}`,
        errorCode: 'MISSING_CONNECTION_DATA',
        data: { missingFields }
      };
    }

    // Validar formato do número de telefone
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(connection_data.phone_number)) {
      return {
        success: true,
        allowed: false,
        message: 'Invalid phone number format',
        errorCode: 'INVALID_PHONE_FORMAT'
      };
    }

    return {
      success: true,
      allowed: true,
      message: 'Connection data is valid'
    };
  }
}

/**
 * Regra: Prevenção de conexões duplicadas por usuário
 */
export class PreventDuplicateConnectionsRule extends BaseBusinessRule {
  constructor() {
    super('prevent_duplicate_connections', 95, BusinessRuleCategory.CONNECTION);
  }

  async evaluate(context: BusinessRuleContext): Promise<BusinessRuleResult> {
    const { user_id, connection_data } = context;
    
    if (!user_id || !connection_data?.phone_number) {
      return {
        success: true,
        allowed: true,
        message: 'Insufficient data for duplicate check'
      };
    }

    try {
      const repository = getWhatsAppOfficialRepository();
      const userConnections = await repository.findByUserId(user_id);
      
      // Verificar se usuário já tem uma conexão com este número
      const duplicateConnection = userConnections.find(conn => 
        conn.phone_number === connection_data.phone_number && 
        conn.status !== 'deleted'
      );

      if (duplicateConnection) {
        return {
          success: true,
          allowed: false,
          message: 'User already has a connection with this phone number',
          errorCode: 'USER_DUPLICATE_CONNECTION',
          data: { 
            existing_connection_id: duplicateConnection.id,
            existing_status: duplicateConnection.status
          }
        };
      }

      return {
        success: true,
        allowed: true,
        message: 'No duplicate connections found for user'
      };

    } catch (error) {
      console.error('Error checking duplicate connections:', error);
      return {
        success: false,
        allowed: false,
        message: 'Failed to validate duplicate connections',
        errorCode: 'DUPLICATE_CHECK_ERROR'
      };
    }
  }
}