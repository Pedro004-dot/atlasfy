import { IBankingService, BankingServiceConfig } from './interfaces/IBankingService';
import { AsaasService } from './AsaasService';

export type BankingProvider = 'ASAAS' | 'PAGAR_ME' | 'MERCADO_PAGO';

export class BankingServiceFactory {
  private static instances: Map<string, IBankingService> = new Map();

  static createService(provider: BankingProvider, config: BankingServiceConfig): IBankingService {
    const key = `${provider}-${config.environment}`;
    
    if (this.instances.has(key)) {
      return this.instances.get(key)!;
    }

    let service: IBankingService;

    switch (provider) {
      case 'ASAAS':
        service = new AsaasService(config);
        break;
      case 'PAGAR_ME':
        throw new Error('Pagar.me integration not implemented yet');
      case 'MERCADO_PAGO':
        throw new Error('Mercado Pago integration not implemented yet');
      default:
        throw new Error(`Unsupported banking provider: ${provider}`);
    }

    this.instances.set(key, service);
    return service;
  }

  static getDefaultService(): IBankingService {
    const provider = (process.env.DEFAULT_BANKING_PROVIDER as BankingProvider) || 'ASAAS';
    
    
    const apiKey = process.env.ASAAS_API_KEY;
    
    if (!apiKey) {
      console.error('❌ ASAAS_API_KEY não encontrada! Verifique o arquivo .env');
      throw new Error('ASAAS_API_KEY é obrigatória para usar o serviço Asaas');
    }
    
    const config: BankingServiceConfig = {
      apiKey: apiKey,
      environment: (process.env.NODE_ENV === 'production' ? 'production' : 'sandbox') as 'sandbox' | 'production',
      webhookUrl: process.env.ASAAS_WEBHOOK_URL,
    };


    return this.createService(provider, config);
  }

  static clearInstances(): void {
    this.instances.clear();
  }
}

export const bankingService = BankingServiceFactory.getDefaultService();