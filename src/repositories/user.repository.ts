import { User, CreateUserData, UserProfileData, UpdateUserProfileData } from '@/types';
import { IUserRepository } from '@/types/services';
import { databaseService } from '@/lib/database';

export class UserRepository implements IUserRepository {
  async create(data: CreateUserData & { senha_hash: string }): Promise<User> {
    const supabase = databaseService.getClient();
    
    const { data: user, error } = await supabase
      .from('usuario')
      .insert([{
        nome: data.nome,
        email: data.email,
        senha_hash: data.senha_hash,
        email_verificado: false,
        ativo: true,
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar usuário: ${error.message}`);
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    const supabase = databaseService.getClient();
    
    const { data: user, error } = await supabase
      .from('usuario')
      .select('*')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Erro ao buscar usuário: ${error.message}`);
    }

    return user || null;
  }

  async findById(id: string): Promise<User | null> {
    const supabase = databaseService.getClient();
    
    const { data: user, error } = await supabase
      .from('usuario')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Erro ao buscar usuário: ${error.message}`);
    }

    return user || null;
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const supabase = databaseService.getClient();
    
    const { data: user, error } = await supabase
      .from('usuario')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar usuário: ${error.message}`);
    }

    return user;
  }

  async updatePassword(id: string, senha_hash: string): Promise<void> {
    const supabase = databaseService.getClient();
    
    const { error } = await supabase
      .from('usuario')
      .update({
        senha_hash,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao atualizar senha: ${error.message}`);
    }
  }

  async verifyEmail(id: string): Promise<void> {
    const supabase = databaseService.getClient();
    
    const { error } = await supabase
      .from('usuario')
      .update({
        email_verificado: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao verificar email: ${error.message}`);
    }
  }

  async updateLastAccess(id: string): Promise<void> {
    const supabase = databaseService.getClient();
    
    const { error } = await supabase
      .from('usuario')
      .update({
        ultimo_acesso: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao atualizar último acesso: ${error.message}`);
    }
  }

  async setTrialPeriod(id: string): Promise<void> {
    const supabase = databaseService.getClient();
    const dataInicio = new Date();
    const dataFim = new Date();
    dataFim.setDate(dataFim.getDate() + 7);
    
    const { error } = await supabase
      .from('usuario')
      .update({
        data_inicio_plano: dataInicio.toISOString(),
        data_fim_plano: dataFim.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao definir período de trial: ${error.message}`);
    }
  }

  async updateProfile(id: string, data: UpdateUserProfileData): Promise<User> {
    const supabase = databaseService.getClient();
    
    const { data: user, error } = await supabase
      .from('usuario')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar perfil: ${error.message}`);
    }

    return user;
  }

  async completeProfile(id: string, profileData: UserProfileData): Promise<User> {
    const supabase = databaseService.getClient();
    
    const { data: user, error } = await supabase
      .from('usuario')
      .update({
        ...profileData,
        perfil_completo: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao completar perfil: ${error.message}`);
    }

    return user;
  }

  async checkProfileComplete(id: string): Promise<boolean> {
    const supabase = databaseService.getClient();
    
    const { data: user, error } = await supabase
      .from('usuario')
      .select('perfil_completo')
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Erro ao verificar perfil: ${error.message}`);
    }

    return user?.perfil_completo || false;
  }

  async setBankingAccountId(id: string, bankingAccountId: string): Promise<void> {
    const supabase = databaseService.getClient();
    
    const { error } = await supabase
      .from('usuario')
      .update({
        conta_bancaria_id: bankingAccountId,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao definir conta bancária: ${error.message}`);
    }
  }

  async saveAsaasBankingData(id: string, asaasData: {
    walletId?: string;
    accountNumber?: string;
    agency?: string;
    accountDigit?: string;
    apiKey?: string;
    subcontaId?: string;
    status?: string;
    ambiente?: string;
    createdAt?: string;
  }): Promise<void> {
    const supabase = databaseService.getClient();
    
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (asaasData.walletId) updateData.asaas_wallet_id = asaasData.walletId;
    if (asaasData.accountNumber) updateData.asaas_account_number = asaasData.accountNumber;
    if (asaasData.agency) updateData.asaas_account_agency = asaasData.agency;
    if (asaasData.accountDigit) updateData.asaas_account_digit = asaasData.accountDigit;
    if (asaasData.apiKey) updateData.asaas_api_key = asaasData.apiKey;
    if (asaasData.subcontaId) updateData.asaas_subconta_id = asaasData.subcontaId;
    if (asaasData.status) updateData.asaas_status = asaasData.status;
    if (asaasData.ambiente) updateData.asaas_ambiente = asaasData.ambiente;
    if (asaasData.createdAt) updateData.asaas_created_at = asaasData.createdAt;

    const { error } = await supabase
      .from('usuario')
      .update(updateData)
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao salvar dados bancários do Asaas: ${error.message}`);
    }
  }

  async getAsaasBankingData(id: string): Promise<{
    walletId?: string;
    accountNumber?: string;
    agency?: string;
    accountDigit?: string;
    apiKey?: string;
    subcontaId?: string;
    status?: string;
    ambiente?: string;
    createdAt?: string;
  } | null> {
    const supabase = databaseService.getClient();
    
    const { data: user, error } = await supabase
      .from('usuario')
      .select('asaas_wallet_id, asaas_account_number, asaas_account_agency, asaas_account_digit, asaas_api_key, asaas_subconta_id, asaas_status, asaas_ambiente, asaas_created_at')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Erro ao buscar dados bancários do Asaas: ${error.message}`);
    }

    if (!user) return null;

    return {
      walletId: user.asaas_wallet_id,
      accountNumber: user.asaas_account_number,
      agency: user.asaas_account_agency,
      accountDigit: user.asaas_account_digit,
      apiKey: user.asaas_api_key,
      subcontaId: user.asaas_subconta_id,
      status: user.asaas_status,
      ambiente: user.asaas_ambiente,
      createdAt: user.asaas_created_at
    };
  }
}

export const userRepository = new UserRepository();