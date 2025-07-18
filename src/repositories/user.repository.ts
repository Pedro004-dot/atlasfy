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
}

export const userRepository = new UserRepository();