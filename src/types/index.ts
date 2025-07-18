export interface User {
  id: string;
  nome: string;
  email: string;
  senha_hash: string;
  telefone?: string;
  email_verificado: boolean;
  ativo: boolean;
  plano_id?: string;
  data_inicio_plano?: string;
  data_fim_plano?: string;
  ultimo_acesso?: string;
  created_at: string;
  updated_at: string;
  // Campos do perfil bancário
  cpf_cnpj?: string;
  faturamento_mensal?: number;
  endereco?: string;
  bairro?: string;
  cep?: string;
  perfil_completo: boolean;
  conta_bancaria_id?: string;
  tipo_pessoa?: 'FISICA' | 'JURIDICA';
}

export interface AuthToken {
  id: string;
  usuario_id: string;
  token: string;
  tipo: 'email_verification' | 'password_reset';
  expires_at: string;
  usado: boolean;
  created_at: string;
}

export interface CreateUserData {
  nome: string;
  email: string;
  senha: string;
}

export interface LoginData {
  email: string;
  senha: string;
}

export interface RegisterData {
  nome: string;
  email: string;
  senha: string;
}

export interface UserProfileData {
  cpf_cnpj: string;
  faturamento_mensal: number;
  endereco: string;
  bairro: string;
  cep: string;
  tipo_pessoa: 'FISICA' | 'JURIDICA';
  telefone?: string;
  email?: string;
}

export interface UpdateUserProfileData extends Partial<UserProfileData> {
  perfil_completo?: boolean;
  conta_bancaria_id?: string;
}

export interface BankingAccountData {
  name: string;
  email: string;
  phone: string;
  cpfCnpj: string;
  address: string;
  addressNumber: string;
  complement?: string;
  province: string;
  city: string;
  postalCode: string;
  mobilePhone?: string;
  personType: 'FISICA' | 'JURIDICA';
  companyType?: 'MEI' | 'LIMITED' | 'INDIVIDUAL' | 'ASSOCIATION';
  state?: string;
  country?: string;
  monthlyIncome?: number;
  birthDate?: string;
}

export interface AuthResult {
  success: boolean;
  message: string;
  user?: Omit<User, 'senha_hash'>;
  token?: string;
}

export interface TokenValidationResult {
  success: boolean;
  message: string;
  token?: AuthToken;
}

export interface EmailVerificationData {
  email: string;
  token: string;
}

export interface PasswordResetData {
  email: string;
  token: string;
  nova_senha: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

export interface DatabaseError {
  code: string;
  message: string;
  details?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface Empresa {
  id: string;
  nome: string;
  cnpj?: string;
  telefone?: string;
  endereco?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  link_google_maps?: string;
  formas_pagamento?: string[];
  nome_atendente?: string;
  genero_atendente?: string;
  horario_funcionamento?: any;
  descricao?: string;
  mensagemBoasVindas?: string;
  numeroSuporte?: string;
  email?: string;
  website?: string;
  setor?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  _count?: {
    usuarios: number;
    agentes: number;
  };
}

export interface Agente {
  id: string;
  nome: string;
  genero?: 'masculino' | 'feminino';
  personalidade?: 'vendedor' | 'suporte' | 'consultor' | 'amigavel';
  empresa_id: string;
  ativo: boolean;
  whatsapp_conectado: boolean;
  whatsapp_numero?: string;
  fluxo_conversa?: string;
  created_at: string;
  updated_at: string;
  empresa?: Empresa;
}

export interface ProdutoAgente {
  id: string;
  agente_id: string;
  nome: string;
  descricao?: string;
  preco?: number;
  link_checkout?: string;
  imagens?: string[];
  videos?: string[];
  prova_social?: string[];
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAgenteData {
  nome: string;
  genero?: 'masculino' | 'feminino';
  personalidade?: 'vendedor' | 'suporte' | 'consultor' | 'amigavel';
  empresa_id: string;
  whatsapp_numero?: string;
  fluxo_conversa?: string;
}

export interface CreateEmpresaData {
  nome: string;
  cnpj?: string;
  telefone?: string;
  endereco?: string;
  link_google_maps?: string;
  nome_atendente?: string;
  genero_atendente?: string;
  numeroSuporte?: string;
  descricao?: string;
  email?: string;
  website?: string;
  setor?: string;
}

export interface CreateProdutoAgenteData {
  nome: string;
  descricao?: string;
  preco?: number;
  link_checkout?: string;
  imagens?: string[];
  videos?: string[];
  prova_social?: string[];
}

// AgenteFormData moved to src/lib/validations.ts to use Zod inference

// WhatsApp Connection Types
export interface WhatsAppConnection {
  id: string;
  user_id: string;
  instance_name: string;
  qr_code?: string;
  status: 'pending' | 'connected' | 'disconnected' | 'expired' | 'error';
  phone_number?: string;
  agent_id?: string;
  last_updated: string;
  created_at: string;
  expires_at: string;
  webhook_url?: string;
  evolution_instance_data?: EvolutionInstanceData;
  connection_attempts: number;
  last_error?: string;
  agente?: Agente;
}

export interface CreateWhatsAppConnectionData {
  instance_name: string;
  agent_id?: string;
  webhook_url?: string;
}

// Evolution API Types
export interface EvolutionInstanceData {
  instanceName: string;
  owner: string;
  profileName?: string;
  profilePictureUrl?: string;
  status: string;
  serverUrl?: string;
  apikey?: string;
}

export interface EvolutionWebhookConfig {
  url: string;
  byEvents?: boolean;
  base64?: boolean;
  headers?: Record<string, string>;
  events?: string[];
}

export interface EvolutionCreateInstanceRequest {
  instanceName: string;
  qrcode: boolean;
  integration?: string;
  webhook?: EvolutionWebhookConfig;
}

export interface EvolutionCreateInstanceResponse {
  instance: {
    instanceName: string;
    status: string;
  };
  hash: {
    apikey: string;
  };
  webhook?: string;
  events?: string[];
  qrcode?: {
    code: string;
    base64: string;
  };
}

export interface EvolutionWebhookEvent {
  event: 'QRCODE_UPDATED' | 'APPLICATION_STARTUP' | 'CONNECTION_STATE_CHANGE' | 'INSTANCE_DELETE' | 'INSTANCE_RESTART';
  instance: string;
  data: {
    qrcode?: {
      code: string;
      base64: string;
    };
    state?: string;
    statusReason?: string;
    phone?: {
      number: string;
      pushName: string;
    };
    profilePictureUrl?: string;
  };
  date_time: string;
  sender: string;
  server_url: string;
}

export interface EvolutionInstanceStatus {
  instance: {
    instanceName: string;
    owner: string;
    profileName?: string;
    profilePictureUrl?: string;
    status: string;
    serverUrl: string;
    apikey: string;
  };
  qrcode?: {
    code: string;
    base64: string;
  };
}

export interface ConnectionStatusResponse {
  qrCode: string | null;
  status: 'pending' | 'connected' | 'expired' | 'error';
  lastUpdated: string;
  connectionDuration: number;
  phoneNumber?: string;
  profileName?: string;
  expiresAt: string;
  attemptsRemaining: number;
}

// Evolution API Error Types
export interface EvolutionApiError {
  error: string;
  message: string;
  statusCode: number;
}

// Cliente Types
export interface Cliente {
  id: string;
  nome?: string;
  telefone?: string;
  created_at: string;
  updated_at: string;
  asaas_customer_id?: string;
}

export interface ClienteEmpresa {
  id: string;
  cliente_id: string;
  empresa_id: string;
  status: string;
  primeiro_contato: string;
  ultimo_contato?: string;
  total_mensagens: number;
  observacoes?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
  cliente?: Cliente;
}

export interface ClienteWithEmpresa extends Cliente {
  cliente_empresa: ClienteEmpresa;
}

export interface ClienteFilters {
  nome?: string;
  orderBy?: 'recent' | 'name' | 'date';
  page?: number;
  limit?: number;
}

export interface ClienteListResponse {
  clientes: ClienteWithEmpresa[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}