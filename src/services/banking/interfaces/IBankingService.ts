import { BankingAccountData } from '@/types';

export interface IBankingService {
  createAccount(data: BankingAccountData, userId?: string): Promise<BankingAccountResult>;
  getAccount(accountId: string): Promise<BankingAccountResult>;
  updateAccount(accountId: string, data: Partial<BankingAccountData>): Promise<BankingAccountResult>;
  deleteAccount(accountId: string): Promise<void>;
  generatePaymentLink(accountId: string, paymentData: PaymentLinkData): Promise<PaymentLinkResult>;
  validateAccountData(data: BankingAccountData): Promise<ValidationResult>;
}

export interface BankingAccountResult {
  id: string;
  name: string;
  email: string;
  phone: string;
  cpfCnpj: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  createdAt: string;
  updatedAt: string;
  accountType: 'CHECKING' | 'SAVINGS';
  bankingProvider: 'ASAAS' | 'PAGAR_ME' | 'MERCADO_PAGO';
}

export interface PaymentLinkData {
  amount: number;
  description: string;
  dueDate?: string;
  installmentCount?: number;
  installmentValue?: number;
  paymentTypes: PaymentType[];
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
}
export interface PaymentLinkResult {
  id: string;
  url: string;
  qrCode?: string;
  barCode?: string;
  expiresAt: string;
  status: 'PENDING' | 'CONFIRMED' | 'EXPIRED' | 'CANCELLED';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export type PaymentType = 'BOLETO' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'PIX' | 'BANK_TRANSFER';

export interface BankingServiceConfig {
  apiKey: string;
  environment: 'sandbox' | 'production';
  webhookUrl?: string;
}

export class BankingServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public provider: string = 'UNKNOWN'
  ) {
    super(message);
    this.name = 'BankingServiceError';
  }
}