import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { CreateUserData, LoginData, AuthResult, EmailVerificationData, PasswordResetData, User } from '@/types';
import { IAuthService } from '@/types/services';
import { userRepository } from '@/repositories/user.repository';
import { tokenRepository } from '@/repositories/token.repository';
import { emailService } from './email.service';

export class AuthService implements IAuthService {
  private jwtSecret = process.env.JWT_SECRET!;

  async register(data: CreateUserData): Promise<AuthResult> {
    try {
      const existingUser = await userRepository.findByEmail(data.email);
      
      if (existingUser) {
        return {
          success: false,
          message: 'Email já está em uso'
        };
      }

      const senha_hash = await this.hashPassword(data.senha);
      
      const user = await userRepository.create({
        ...data,
        senha_hash
      });

      await userRepository.setTrialPeriod(user.id);

      const verificationToken = await tokenRepository.create(user.id, 'email_verification');
      
      await emailService.sendVerificationEmail(user.email, verificationToken.token, user.nome);

      return {
        success: true,
        message: 'Cadastro realizado com sucesso! Verifique seu email para ativar sua conta.',
        user: {
          id: user.id,
          nome: user.nome,
          email: user.email,
          telefone: user.telefone,
          email_verificado: user.email_verificado,
          ativo: user.ativo,
          plano_id: user.plano_id,
          data_inicio_plano: user.data_inicio_plano,
          data_fim_plano: user.data_fim_plano,
          ultimo_acesso: user.ultimo_acesso,
          created_at: user.created_at,
          updated_at: user.updated_at,
          perfil_completo: user.perfil_completo 
        }
      };
    } catch (error) {
      console.error('Erro no registro:', error);
      return {
        success: false,
        message: 'Erro interno do servidor'
      };
    }
  }

  async login(data: LoginData): Promise<AuthResult> {
    try {
      const user = await userRepository.findByEmail(data.email);
      
      if (!user) {
        return {
          success: false,
          message: 'Email ou senha incorretos'
        };
      }

      if (!user.email_verificado) {
        return {
          success: false,
          message: 'Email não verificado. Verifique sua caixa de entrada.'
        };
      }

      if (!user.ativo) {
        return {
          success: false,
          message: 'Conta desativada. Entre em contato com o suporte.'
        };
      }

      const isValidPassword = await this.comparePassword(data.senha, user.senha_hash);
      
      if (!isValidPassword) {
        return {
          success: false,
          message: 'Email ou senha incorretos'
        };
      }

      await userRepository.updateLastAccess(user.id);

      const token = await this.generateJWT(user.id, user.email, user.plano_id || '');

      return {
        success: true,
        message: 'Login realizado com sucesso',
        user: {
          id: user.id,
          nome: user.nome,
          email: user.email,
          telefone: user.telefone,
          email_verificado: user.email_verificado,
          ativo: user.ativo,
          plano_id: user.plano_id,
          data_inicio_plano: user.data_inicio_plano,
          data_fim_plano: user.data_fim_plano,
          ultimo_acesso: user.ultimo_acesso,
          created_at: user.created_at,
          updated_at: user.updated_at,
          perfil_completo: user.perfil_completo 
        },
        token
      };
    } catch (error) {
      console.error('Erro no login:', error);
      return {
        success: false,
        message: 'Erro interno do servidor'
      };
    }
  }

  async verifyEmail(data: EmailVerificationData): Promise<AuthResult> {
    try {
      const tokenData = await tokenRepository.findByToken(data.token, 'email_verification');
      
      if (!tokenData) {
        return {
          success: false,
          message: 'Token inválido ou expirado'
        };
      }

      const user = await userRepository.findById(tokenData.usuario_id);
      
      if (!user) {
        return {
          success: false,
          message: 'Usuário não encontrado'
        };
      }

      if (user.email !== data.email) {
        return {
          success: false,
          message: 'Email não corresponde ao token'
        };
      }

      await userRepository.verifyEmail(user.id);
      await tokenRepository.markAsUsed(tokenData.id);

      const token = await this.generateJWT(user.id, user.email, user.plano_id || '');

      await emailService.sendWelcomeEmail(user.email, user.nome);

      return {
        success: true,
        message: 'Email verificado com sucesso! Bem-vindo!',
        user: {
          id: user.id,
          nome: user.nome,
          email: user.email,
          telefone: user.telefone,
          email_verificado: true,
          ativo: user.ativo,
          plano_id: user.plano_id,
          data_inicio_plano: user.data_inicio_plano,
          data_fim_plano: user.data_fim_plano,
          ultimo_acesso: user.ultimo_acesso,
          created_at: user.created_at,
          updated_at: user.updated_at,
          perfil_completo: user.perfil_completo 
        },
        token
      };
    } catch (error) {
      console.error('Erro na verificação de email:', error);
      return {
        success: false,
        message: 'Erro interno do servidor'
      };
    }
  }

  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const user = await userRepository.findByEmail(email);
      
      if (!user) {
        return {
          success: true,
          message: 'Se o email existir, você receberá instruções para redefinir sua senha'
        };
      }

      const resetToken = await tokenRepository.create(user.id, 'password_reset');
      
      await emailService.sendPasswordResetEmail(user.email, resetToken.token, user.nome);

      return {
        success: true,
        message: 'Instruções para redefinir senha enviadas para seu email'
      };
    } catch (error) {
      console.error('Erro na solicitação de reset de senha:', error);
      return {
        success: false,
        message: 'Erro interno do servidor'
      };
    }
  }

  async resetPassword(data: PasswordResetData): Promise<AuthResult> {
    try {
      const tokenData = await tokenRepository.findByToken(data.token, 'password_reset');
      
      if (!tokenData) {
        return {
          success: false,
          message: 'Token inválido ou expirado'
        };
      }

      const user = await userRepository.findById(tokenData.usuario_id);
      
      if (!user) {
        return {
          success: false,
          message: 'Usuário não encontrado'
        };
      }

      if (user.email !== data.email) {
        return {
          success: false,
          message: 'Email não corresponde ao token'
        };
      }

      const senha_hash = await this.hashPassword(data.nova_senha);
      
      await userRepository.updatePassword(user.id, senha_hash);
      await tokenRepository.markAsUsed(tokenData.id);

      const token = await this.generateJWT(user.id, user.email, user.plano_id || '');

      return {
        success: true,
        message: 'Senha redefinida com sucesso!',
        user: {
          id: user.id,
          nome: user.nome,
          email: user.email,
          telefone: user.telefone,
          email_verificado: user.email_verificado,
          ativo: user.ativo,
          plano_id: user.plano_id,
          data_inicio_plano: user.data_inicio_plano,
          data_fim_plano: user.data_fim_plano,
          ultimo_acesso: user.ultimo_acesso,
          created_at: user.created_at,
          updated_at: user.updated_at,
          perfil_completo: user.perfil_completo 
        },
        token
      };
    } catch (error) {
      console.error('Erro no reset de senha:', error);
      return {
        success: false,
        message: 'Erro interno do servidor'
      };
    }
  }

  async generateJWT(userId: string, email: string, plano_id: string | null = null): Promise<string> {
    const payload = {
      userId,
      email,
      plano_id,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 horas
    };

    return jwt.sign(payload, this.jwtSecret);
  }

  async verifyJWT(token: string): Promise<{ valid: boolean; payload?: any }> {
    try {
      const payload = jwt.verify(token, this.jwtSecret);
      return { valid: true, payload };
    } catch (error) {
      return { valid: false };
    }
  }

  async getCurrentUser(request: any): Promise<User | null> {
    try {
      const token = request.cookies.get('auth-token')?.value;
      
      if (!token) {
        return null;
      }

      const verification = await this.verifyJWT(token);
      
      if (!verification.valid || !verification.payload) {
        return null;
      }

      const user = await userRepository.findById(verification.payload.userId);
      
      if (!user || !user.ativo) {
        return null;
      }

      return user;
    } catch (error) {
      console.error('Erro ao obter usuário atual:', error);
      return null;
    }
  }

  async getCurrentUserByToken(token: string): Promise<User | null> {
    try {
      const verification = await this.verifyJWT(token);
      
      if (!verification.valid || !verification.payload) {
        return null;
      }

      const user = await userRepository.findById(verification.payload.userId);
      
      if (!user || !user.ativo) {
        return null;
      }

      return user;
    } catch (error) {
      console.error('Erro ao obter usuário por token:', error);
      return null;
    }
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}

export const authService = new AuthService();