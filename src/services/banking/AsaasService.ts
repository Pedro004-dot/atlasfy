import { 
  IBankingService, 
  BankingAccountResult, 
  PaymentLinkData, 
  PaymentLinkResult, 
  ValidationResult,
  BankingServiceConfig,
  BankingServiceError
} from './interfaces/IBankingService';
import { BankingAccountData } from '@/types';
import { userRepository } from '@/repositories/user.repository';
import { emailService } from '@/services/email.service';

export class AsaasService implements IBankingService {
  private apiKey: string;
  private environment: 'sandbox' | 'production';
  private baseUrl: string;

  constructor(config: BankingServiceConfig) {
    this.apiKey = config.apiKey;
    this.environment = config.environment;
    this.baseUrl = config.environment === 'sandbox' 
      ? 'https://api-sandbox.asaas.com/v3'
      : 'https://api-sandbox.asaas.com/v3';
  }

  async createAccount(data: BankingAccountData, userId?: string): Promise<BankingAccountResult> {
    try {
      const asaasData = this.mapToAsaasFormat(data);
      
      
      const response = await fetch(`${this.baseUrl}/accounts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': '$aact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjM4YzU1MWFhLWFiOGYtNGU2Mi05ZTIwLWRhZWQ3ODRjZmNjYjo6JGFhY2hfNjkwNGEwN2ItNmE4OS00M2Y4LWExYTYtY2NmZWIxYjdhYzAx',
          'User-Agent': 'SeuApp/1.0'
        },
        body: JSON.stringify(asaasData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new BankingServiceError(
          `Erro ao criar conta no Asaas: ${errorData.errors?.[0]?.description || 'Erro desconhecido'}`,
          'ASAAS_CREATE_ACCOUNT_ERROR',
          response.status,
          'ASAAS'
        );
      }

      const result = await response.json();
      
      // Salvar dados bancários do Asaas no banco de dados do usuário
      if (userId && result) {
        await this.saveAsaasBankingData(userId, result);
        
        // Enviar email de notificação sobre a criação da conta
        try {
          await emailService.sendBankingAccountCreatedEmail(data.email, data.name);
        } catch (emailError) {
          console.error('Erro ao enviar email de notificação:', emailError);
          // Não queremos falhar a criação da conta se o email não for enviado
        }
      }
      
      return this.mapFromAsaasFormat(result);
    } catch (error) {
      if (error instanceof BankingServiceError) {
        throw error;
      }
      throw new BankingServiceError(
        `Erro interno ao criar conta: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        'INTERNAL_ERROR',
        500,
        'ASAAS'
      );
    }
  }

  async getAccount(accountId: string): Promise<BankingAccountResult> {
    try {
      const response = await fetch(`${this.baseUrl}/customers/${accountId}`, {
        method: 'GET',
        headers: {
          'access_token': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new BankingServiceError(
          'Conta não encontrada',
          'ACCOUNT_NOT_FOUND',
          404,
          'ASAAS'
        );
      }

      const result = await response.json();
      return this.mapFromAsaasFormat(result);
    } catch (error) {
      if (error instanceof BankingServiceError) {
        throw error;
      }
      throw new BankingServiceError(
        `Erro ao buscar conta: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        'INTERNAL_ERROR',
        500,
        'ASAAS'
      );
    }
  }

  async updateAccount(accountId: string, data: Partial<BankingAccountData>): Promise<BankingAccountResult> {
    try {
      const asaasData = this.mapToAsaasFormat(data);
      
      const response = await fetch(`${this.baseUrl}/customers/${accountId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'access_token': this.apiKey,
        },
        body: JSON.stringify(asaasData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new BankingServiceError(
          `Erro ao atualizar conta: ${errorData.errors?.[0]?.description || 'Erro desconhecido'}`,
          'ASAAS_UPDATE_ACCOUNT_ERROR',
          response.status,
          'ASAAS'
        );
      }

      const result = await response.json();
      return this.mapFromAsaasFormat(result);
    } catch (error) {
      if (error instanceof BankingServiceError) {
        throw error;
      }
      throw new BankingServiceError(
        `Erro interno ao atualizar conta: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        'INTERNAL_ERROR',
        500,
        'ASAAS'
      );
    }
  }

  async deleteAccount(accountId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/customers/${accountId}`, {
        method: 'DELETE',
        headers: {
          'access_token': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new BankingServiceError(
          'Erro ao deletar conta',
          'ASAAS_DELETE_ACCOUNT_ERROR',
          response.status,
          'ASAAS'
        );
      }
    } catch (error) {
      if (error instanceof BankingServiceError) {
        throw error;
      }
      throw new BankingServiceError(
        `Erro interno ao deletar conta: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        'INTERNAL_ERROR',
        500,
        'ASAAS'
      );
    }
  }

  async generatePaymentLink(accountId: string, paymentData: PaymentLinkData): Promise<PaymentLinkResult> {
    try {
      const asaasPaymentData = {
        customer: accountId,
        billingType: this.getBillingType(paymentData.paymentTypes),
        value: paymentData.amount,
        description: paymentData.description,
        dueDate: paymentData.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        installmentCount: paymentData.installmentCount || 1,
        installmentValue: paymentData.installmentValue || paymentData.amount,
      };

      const response = await fetch(`${this.baseUrl}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': 'aact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjM4YzU1MWFhLWFiOGYtNGU2Mi05ZTIwLWRhZWQ3ODRjZmNjYjo6JGFhY2hfNjkwNGEwN2ItNmE4OS00M2Y4LWExYTYtY2NmZWIxYjdhYzAx',
        },
        body: JSON.stringify(asaasPaymentData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new BankingServiceError(
          `Erro ao gerar link de pagamento: ${errorData.errors?.[0]?.description || 'Erro desconhecido'}`,
          'ASAAS_PAYMENT_LINK_ERROR',
          response.status,
          'ASAAS'
        );
      }

      const result = await response.json();
      return {
        id: result.id,
        url: result.bankSlipUrl || result.invoiceUrl,
        qrCode: result.qrCode?.encodedImage,
        barCode: result.barCode,
        expiresAt: result.dueDate,
        status: this.mapPaymentStatus(result.status),
      };
    } catch (error) {
      if (error instanceof BankingServiceError) {
        throw error;
      }
      throw new BankingServiceError(
        `Erro interno ao gerar link de pagamento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        'INTERNAL_ERROR',
        500,
        'ASAAS'
      );
    }
  }

  async validateAccountData(data: BankingAccountData): Promise<ValidationResult> {
    const errors: any[] = [];

    // Validação de CPF/CNPJ
    if (!this.isValidCpfCnpj(data.cpfCnpj)) {
      errors.push({
        field: 'cpfCnpj',
        message: 'CPF/CNPJ inválido',
        code: 'INVALID_CPF_CNPJ'
      });
    }

    // Validação de email
    if (!this.isValidEmail(data.email)) {
      errors.push({
        field: 'email',
        message: 'Email inválido',
        code: 'INVALID_EMAIL'
      });
    }

    // Validação de telefone
    if (!this.isValidPhone(data.phone)) {
      errors.push({
        field: 'phone',
        message: 'Telefone inválido',
        code: 'INVALID_PHONE'
      });
    }

    // Validação de CEP
    if (!this.isValidCep(data.postalCode)) {
      errors.push({
        field: 'postalCode',
        message: 'CEP inválido',
        code: 'INVALID_CEP'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private mapToAsaasFormat(data: Partial<BankingAccountData>): any {
    // Map personType to companyType as expected by Asaas API
    let companyType = data.companyType;
    if (!companyType && data.personType) {
      // Default mapping: JURIDICA -> MEI, FISICA -> INDIVIDUAL
      companyType = data.personType === 'JURIDICA' ? 'MEI' : 'INDIVIDUAL';
    }

    return {
      name: data.name,
      email: data.email,
      cpfCnpj: data.cpfCnpj?.replace(/\D/g, ''),
      birthDate: data.birthDate,
      companyType: companyType,
      phone: data.phone?.replace(/\D/g, ''),
      mobilePhone: data.phone?.replace(/\D/g, ''),
      address: data.address,
      addressNumber: data.addressNumber || '123',
      complement: "centro",
      province: "Centro",
      postalCode: data.postalCode?.replace(/\D/g, ''),
      incomeValue: data.monthlyIncome,
    };
  }
  // {
  //   "name": "iStore Brasil",
  //   "email": "pedro.roc3ha@alsunod.lsb.com.br",
  //   "cpfCnpj": "52054564000100",
  //   "birthDate": "1990-05-16",
  //   "companyType": "MEI",
  //   "phone": "11 42230636",
  //   "mobilePhone": "11 948241135",
  //   "address": "Av. Teste",
  //   "addressNumber": "123",
  //   "complement": "Sala 1",
  //   "province": "Centro",
  //   "postalCode": "01310-100",
  //   "incomeValue": 5000.00
  // }

  private mapFromAsaasFormat(asaasData: any): BankingAccountResult {
    return {
      id: asaasData.id,
      name: asaasData.name,
      email: asaasData.email,
      phone: asaasData.phone,
      cpfCnpj: asaasData.cpfCnpj,
      status: asaasData.deleted ? 'INACTIVE' : 'ACTIVE',
      createdAt: asaasData.dateCreated,
      updatedAt: asaasData.dateCreated,
      accountType: 'CHECKING',
      bankingProvider: 'ASAAS',
    };
  }

  private getBillingType(paymentTypes: any[]): string {
    if (paymentTypes.includes('PIX')) return 'PIX';
    if (paymentTypes.includes('CREDIT_CARD')) return 'CREDIT_CARD';
    if (paymentTypes.includes('BOLETO')) return 'BOLETO';
    return 'UNDEFINED';
  }

  private mapPaymentStatus(asaasStatus: string): 'PENDING' | 'CONFIRMED' | 'EXPIRED' | 'CANCELLED' {
    switch (asaasStatus) {
      case 'PENDING':
        return 'PENDING';
      case 'RECEIVED':
      case 'CONFIRMED':
        return 'CONFIRMED';
      case 'OVERDUE':
        return 'EXPIRED';
      case 'REFUNDED':
      case 'CANCELLED':
        return 'CANCELLED';
      default:
        return 'PENDING';
    }
  }

  private isValidCpfCnpj(cpfCnpj: string): boolean {
    const cleaned = cpfCnpj.replace(/\D/g, '');
    return cleaned.length === 11 || cleaned.length === 14;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPhone(phone: string): boolean {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 11;
  }

  private isValidCep(cep: string): boolean {
    const cleaned = cep.replace(/\D/g, '');
    return cleaned.length === 8;
  }

  private async saveAsaasBankingData(userId: string, asaasResponse: any): Promise<void> {
    try {
      console.log('=== SALVANDO DADOS BANCÁRIOS DO ASAAS ===');
      console.log('User ID:', userId);
      console.log('Asaas Response:', asaasResponse);
      
      const bankingData = {
        walletId: asaasResponse.walletId,
        accountNumber: asaasResponse.accountNumber?.account,
        agency: asaasResponse.accountNumber?.agency,
        accountDigit: asaasResponse.accountNumber?.accountDigit,
        apiKey: asaasResponse.apiKey,
        subcontaId: asaasResponse.id,
        status: 'ACTIVE', // Status padrão para conta criada
        ambiente: this.environment,
        createdAt: new Date().toISOString()
      };

      console.log('Banking data to save:', bankingData);
      
      await userRepository.saveAsaasBankingData(userId, bankingData);
      
      console.log('Dados bancários salvos com sucesso!');
      console.log('==========================================');
    } catch (error) {
      console.error('Erro ao salvar dados bancários:', error);
      throw new BankingServiceError(
        `Erro ao salvar dados bancários: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        'SAVE_BANKING_DATA_ERROR',
        500,
        'ASAAS'
      );
    }
  }
}