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
  email?: string;
  website?: string;
  setor?: string;
  descricao?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgenteConfig {
  id?: string;
  empresa_id: string;
  nome_agente: string;
  genero: 'Masculino' | 'Feminino' | 'Neutro';
  tom_voz: 'Profissional' | 'Amigável' | 'Persuasivo' | 'Casual' | 'Consultivo';
  publico_alvo: string;
  proposta_valor: string;
  script_abertura: string;
  created_at?: string;
  updated_at?: string;
}

export interface Objecao {
  id?: string;
  empresa_id: string;
  tipo: string;
  mensagem_resposta: string;
  quando_usar: string;
  tags: string[];
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface GatilhoEscalacao {
  id?: string;
  empresa_id: string;
  solicitacao_humano: boolean;
  apos_objecoes_limite: number;
  valor_venda_limite?: number;
  alta_irritacao: boolean;
  duvidas_tecnicas: boolean;
  mensagem_transferencia: string;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface FollowUp {
  id?: string;
  empresa_id: string;
  timing_dias: number;
  condicao: string;
  mensagem: string;
  ativo: boolean;
  ordem: number;
  created_at?: string;
  updated_at?: string;
}

export interface PerguntaQualificacao {
  id?: string;
  empresa_id: string;
  quando_perguntar: string;
  pergunta: string;
  respostas_qualificam: string[];
  score: 'Alto' | 'Médio' | 'Baixo';
  ativo: boolean;
  ordem: number;
  created_at?: string;
  updated_at?: string;
}

export interface EtapaFunil {
  id?: string;
  empresa_id: string;
  nome: string;
  percentual: number;
  criterios_avancar: string[];
  acoes_automaticas: string[];
  ordem: number;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Produto {
  id?: string;
  empresa_id?: string;
  nome: string;
  descricao: string;
  preco?: number;
  estoque?: number;
  imagens?: string[];
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateEmpresaData {
  // Agent Type Selection
  agent_type?: 'sentinela' | 'vendas';
  
  // Step 1: Basic Information
  nome?: string;
  cnpj?: string;
  setor?: string;
  descricao?: string;
  
  // Step 2: Contact Information
  telefone?: string;
  email?: string;
  website?: string;
  endereco?: string;
  
  // Step 3: Agent Configuration
  agente_config?: Omit<AgenteConfig, 'id' | 'empresa_id' | 'created_at' | 'updated_at'>;
  
  // Step 4: Objections
  objecoes?: Omit<Objecao, 'id' | 'empresa_id' | 'created_at' | 'updated_at'>[];
  
  // Step 5: Products
  produtos?: Omit<Produto, 'id' | 'empresa_id' | 'created_at' | 'updated_at'>[];
  
  // Step 6: WhatsApp Connection
  whatsapp_connection?: {
    connected: boolean;
    phoneNumber?: string;
    profileName?: string | null;
    instanceName?: string;
  };
  
  // Step 7: Advanced Configurations
  gatilhos_escalacao?: Omit<GatilhoEscalacao, 'id' | 'empresa_id' | 'created_at' | 'updated_at'>;
  follow_ups?: Omit<FollowUp, 'id' | 'empresa_id' | 'created_at' | 'updated_at'>[];
  perguntas_qualificacao?: Omit<PerguntaQualificacao, 'id' | 'empresa_id' | 'created_at' | 'updated_at'>[];
  etapas_funil?: Omit<EtapaFunil, 'id' | 'empresa_id' | 'created_at' | 'updated_at'>[];
}

export const SETORES_OPCOES = [
 'Joialheiria',
 'Produtos Eletronicos'
] as const;

export const GENEROS_OPCOES = ['Masculino', 'Feminino'] as const;

export const TONS_VOZ_OPCOES = ['Profissional', 'Amigável', 'Persuasivo', 'Casual', 'Consultivo'] as const;

export const SCORES_OPCOES = ['Alto', 'Médio', 'Baixo'] as const;