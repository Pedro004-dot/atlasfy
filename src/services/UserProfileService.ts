import { 
  User, 
  UserProfileData, 
  UpdateUserProfileData, 
  BankingAccountData 
} from '@/types';
import { userRepository } from '@/repositories/user.repository';
import { bankingService } from './banking/BankingServiceFactory';
import { validateUserProfile } from '@/lib/validations';

export class UserProfileService {
  async completeUserProfile(userId: string, profileData: UserProfileData): Promise<User> {
    // 1. Validar dados do perfil
    const validation = validateUserProfile(profileData);
    if (!validation.success) {
      throw new Error(`Dados inválidos: ${validation.error?.errors.map(e => e.message).join(', ')}`);
    }

    // 2. Buscar usuário atual
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // 3. Mapear dados do perfil para dados bancários
    const bankingData: BankingAccountData = {
      name: user.nome,
      email: profileData.email || user.email,
      phone: profileData.telefone || user.telefone || '',
      cpfCnpj: profileData.cpf_cnpj.replace(/\D/g, ''),
      address: profileData.endereco,
      addressNumber: '1', // Pode ser extraído do endereço ou solicitado separadamente
      province: profileData.bairro,
      city: 'São Paulo', // Pode ser obtido via API de CEP
      postalCode: profileData.cep.replace(/\D/g, ''),
      personType: profileData.tipo_pessoa,
      companyType: profileData.tipo_pessoa === 'JURIDICA' ? 'MEI' : 'INDIVIDUAL', // Map to Asaas companyType
      state: 'SP', // Pode ser obtido via API de CEP
      country: 'BR',
      monthlyIncome: profileData.faturamento_mensal,
      birthDate: '1990-05-16', // Data padrão, pode ser solicitada do usuário futuramente
    };

    // 4. Validar dados bancários
    const bankingValidation = await bankingService.validateAccountData(bankingData);
    if (!bankingValidation.isValid) {
      throw new Error(`Dados bancários inválidos: ${bankingValidation.errors.map(e => e.message).join(', ')}`);
    }

    try {
      // 5. Criar conta no sistema bancário
      const bankingAccount = await bankingService.createAccount(bankingData, userId);

      // 6. Completar perfil no banco de dados
      const updatedUser = await userRepository.completeProfile(userId, {
        ...profileData,
        conta_bancaria_id: bankingAccount.id,
        perfil_completo: true
      } as any);

      return updatedUser;
    } catch (error) {
      throw new Error(`Erro ao completar perfil: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  async updateUserProfile(userId: string, profileData: UpdateUserProfileData): Promise<User> {
    // 1. Validar dados se fornecidos
    if (Object.keys(profileData).length > 0) {
      const validation = await this.validatePartialProfileData(profileData);
      if (!validation.isValid) {
        throw new Error(`Dados inválidos: ${validation.errors.join(', ')}`);
      }
    }

    // 2. Atualizar perfil
    const updatedUser = await userRepository.updateProfile(userId, profileData);

    // 3. Se alterou dados bancários relevantes, atualizar conta bancária
    if (this.hasBankingRelevantChanges(profileData) && updatedUser.conta_bancaria_id) {
      await this.updateBankingAccount(updatedUser);
    }

    return updatedUser;
  }

  async checkProfileCompleteness(userId: string): Promise<{
    isComplete: boolean;
    missingFields: string[];
  }> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    const missingFields: string[] = [];
    const requiredFields = [
      'cpf_cnpj',
      'faturamento_mensal',
      'endereco',
      'bairro',
      'cep',
      'tipo_pessoa',
    ];

    for (const field of requiredFields) {
      if (!user[field as keyof User]) {
        missingFields.push(field);
      }
    }

    return {
      isComplete: user.perfil_completo && missingFields.length === 0,
      missingFields,
    };
  }

  async getUserBankingAccount(userId: string): Promise<any> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    if (!user.conta_bancaria_id) {
      throw new Error('Usuário não possui conta bancária');
    }

    return await bankingService.getAccount(user.conta_bancaria_id);
  }

  private async validatePartialProfileData(data: UpdateUserProfileData): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    // Validar CPF/CNPJ se fornecido
    if (data.cpf_cnpj) {
      const cleaned = data.cpf_cnpj.replace(/\D/g, '');
      if (cleaned.length !== 11 && cleaned.length !== 14) {
        errors.push('CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos');
      }
    }

    // Validar faturamento se fornecido
    if (data.faturamento_mensal !== undefined && data.faturamento_mensal < 0) {
      errors.push('Faturamento mensal deve ser maior ou igual a zero');
    }

    // Validar CEP se fornecido
    if (data.cep) {
      const cepRegex = /^\d{5}-?\d{3}$/;
      if (!cepRegex.test(data.cep)) {
        errors.push('CEP deve estar no formato XXXXX-XXX');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private hasBankingRelevantChanges(data: UpdateUserProfileData): boolean {
    const bankingFields = [
      'cpf_cnpj',
      'endereco',
      'bairro',
      'cep',
      'tipo_pessoa',
      'faturamento_mensal',
    ];

    return bankingFields.some(field => data[field as keyof UpdateUserProfileData] !== undefined);
  }

  private async updateBankingAccount(user: User): Promise<void> {
    if (!user.conta_bancaria_id) {
      return;
    }

    const bankingData: Partial<BankingAccountData> = {
      name: user.nome,
      email: user.email,
      phone: user.telefone || '',
      cpfCnpj: user.cpf_cnpj?.replace(/\D/g, ''),
      address: user.endereco,
      province: user.bairro,
      postalCode: user.cep?.replace(/\D/g, ''),
      personType: user.tipo_pessoa,
      companyType: user.tipo_pessoa === 'JURIDICA' ? 'MEI' : 'INDIVIDUAL', // Map to Asaas companyType
      monthlyIncome: user.faturamento_mensal,
      birthDate: '1990-05-16', // Data padrão
    };

    await bankingService.updateAccount(user.conta_bancaria_id, bankingData);
  }
}

export const userProfileService = new UserProfileService();