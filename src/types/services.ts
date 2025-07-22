import { User, AuthToken, CreateUserData, LoginData, AuthResult, TokenValidationResult, EmailVerificationData, PasswordResetData } from './index';

export interface IUserRepository {
  create(data: CreateUserData): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  update(id: string, data: Partial<User>): Promise<User>;
  updatePassword(id: string, senha_hash: string): Promise<void>;
  verifyEmail(id: string): Promise<void>;
  updateLastAccess(id: string): Promise<void>;
  setTrialPeriod(id: string): Promise<void>;
}

export interface ITokenRepository {
  create(usuario_id: string, tipo: 'email_verification' | 'password_reset'): Promise<AuthToken>;
  findByToken(token: string, tipo: 'email_verification' | 'password_reset'): Promise<AuthToken | null>;
  markAsUsed(id: string): Promise<void>;
  deleteExpiredTokens(): Promise<void>;
}

export interface IEmailService {
  sendVerificationEmail(email: string, token: string, nome: string): Promise<void>;
  sendPasswordResetEmail(email: string, token: string, nome: string): Promise<void>;
  sendWelcomeEmail(email: string, nome: string): Promise<void>;
  sendBankingAccountCreatedEmail(email: string, nome: string): Promise<void>;
}

export interface IAuthService {
  register(data: CreateUserData): Promise<AuthResult>;
  login(data: LoginData): Promise<AuthResult>;
  verifyEmail(data: EmailVerificationData): Promise<AuthResult>;
  requestPasswordReset(email: string): Promise<{ success: boolean; message: string }>;
  resetPassword(data: PasswordResetData): Promise<AuthResult>;
  generateJWT(userId: string, email: string): Promise<string>;
  verifyJWT(token: string): Promise<{ valid: boolean; payload?: any }>;
  hashPassword(password: string): Promise<string>;
  comparePassword(password: string, hash: string): Promise<boolean>;
}

export interface IDatabaseService {
  query<T>(text: string, params?: any[]): Promise<T[]>;
  queryOne<T>(text: string, params?: any[]): Promise<T | null>;
  transaction<T>(callback: (client: any) => Promise<T>): Promise<T>;
}