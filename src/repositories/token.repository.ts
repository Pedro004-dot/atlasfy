import { AuthToken } from '@/types';
import { ITokenRepository } from '@/types/services';
import { databaseService } from '@/lib/database';

export class TokenRepository implements ITokenRepository {
  async create(usuario_id: string, tipo: 'email_verification' | 'password_reset'): Promise<AuthToken> {
    const supabase = databaseService.getClient();
    
    const token = this.generateToken();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    const { data: authToken, error } = await supabase
      .from('auth_tokens')
      .insert([{
        usuario_id,
        token,
        tipo,
        expires_at: expiresAt.toISOString(),
        usado: false
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar token: ${error.message}`);
    }

    return authToken;
  }

  async findByToken(token: string, tipo: 'email_verification' | 'password_reset'): Promise<AuthToken | null> {
    const supabase = databaseService.getClient();
    
    const { data: authToken, error } = await supabase
      .from('auth_tokens')
      .select('*')
      .eq('token', token)
      .eq('tipo', tipo)
      .eq('usado', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Erro ao buscar token: ${error.message}`);
    }

    return authToken || null;
  }

  async markAsUsed(id: string): Promise<void> {
    const supabase = databaseService.getClient();
    
    const { error } = await supabase
      .from('auth_tokens')
      .update({ usado: true })
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao marcar token como usado: ${error.message}`);
    }
  }

  async deleteExpiredTokens(): Promise<void> {
    const supabase = databaseService.getClient();
    
    const { error } = await supabase
      .from('auth_tokens')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (error) {
      throw new Error(`Erro ao deletar tokens expirados: ${error.message}`);
    }
  }

  private generateToken(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}

export const tokenRepository = new TokenRepository();