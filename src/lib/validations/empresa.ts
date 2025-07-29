import { z } from 'zod';
import { SETORES_OPCOES, GENEROS_OPCOES, TONS_VOZ_OPCOES, SCORES_OPCOES } from '@/types/empresa';

// Step 1: Basic Information Schema
export const empresaBasicSchema = z.object({
  nome: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  cnpj: z.string()
    .regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, 'CNPJ deve estar no formato XX.XXX.XXX/XXXX-XX')
    .optional()
    .or(z.literal('')),
  setor: z.enum(SETORES_OPCOES).optional(),
  descricao: z.string()
    .max(500, 'Descrição deve ter no máximo 500 caracteres')
    .optional(),
});

// Step 1: Basic Information Schema for Sentinela (requires phone)
export const empresaBasicSentinelaSchema = z.object({
  nome: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  telefone: z.string()
    .regex(/^55\d{10}$/, 'Telefone deve ter 12 dígitos no formato 553196997292 (sem o 9 adicional)')
    .refine((value) => value.startsWith('55'), 'Telefone deve começar com código do país 55')
    .refine((value) => value.length === 12, 'Telefone deve ter exatamente 12 dígitos'),
  setor: z.enum(SETORES_OPCOES).optional(),
  descricao: z.string()
    .max(500, 'Descrição deve ter no máximo 500 caracteres')
    .optional(),
});

// Step 2: Contact Information Schema
export const empresaContactSchema = z.object({
  telefone: z.string()
    .refine((value) => {
      if (!value) return true; // Opcional
      // Só aceita 12 dígitos numéricos (sem o 9 adicional)
      return /^\d{12}$/.test(value);
    }, 'Digite o telefone com código do país, DDD e número, apenas números, ex: 553196997292 (sem o 9 adicional)')
    .optional(),
  email: z.string()
    .email('Email inválido')
    .optional()
    .or(z.literal('')),
  website: z.string()
    .url('Website deve ser uma URL válida')
    .optional()
    .or(z.literal('')),
  endereco: z.string()
    .min(5, 'Endereço deve ter pelo menos 5 caracteres')
    .max(255, 'Endereço deve ter no máximo 255 caracteres')
    .optional(),
});

// Step 3: Agent Configuration Schema
export const agenteConfigSchema = z.object({
  nome_agente: z.string()
    .min(2, 'Nome do agente deve ter pelo menos 2 caracteres')
    .max(50, 'Nome do agente deve ter no máximo 50 caracteres'),
  genero: z.enum(GENEROS_OPCOES),
  tom_voz: z.enum(TONS_VOZ_OPCOES),
  publico_alvo: z.string()
    .min(10, 'Público-alvo deve ter pelo menos 10 caracteres')
    .max(200, 'Público-alvo deve ter no máximo 200 caracteres'),
  proposta_valor: z.string()
    .min(10, 'Proposta de valor deve ter pelo menos 10 caracteres')
    .max(300, 'Proposta de valor deve ter no máximo 300 caracteres'),
  script_abertura: z.string()
    .min(20, 'Script de abertura deve ter pelo menos 20 caracteres')
    .max(500, 'Script de abertura deve ter no máximo 500 caracteres'),
});

// Step 4: Objections Schema
export const objecaoSchema = z.object({
  tipo: z.string()
    .min(5, 'Tipo de objeção deve ter pelo menos 5 caracteres')
    .max(100, 'Tipo de objeção deve ter no máximo 100 caracteres'),
  mensagem_resposta: z.string()
    .min(10, 'Mensagem de resposta deve ter pelo menos 10 caracteres')
    .max(500, 'Mensagem de resposta deve ter no máximo 500 caracteres'),
  quando_usar: z.string()
    .min(10, 'Descrição de quando usar deve ter pelo menos 10 caracteres')
    .max(200, 'Descrição de quando usar deve ter no máximo 200 caracteres'),
  tags: z.array(z.string()).default([]),
  ativo: z.boolean().default(true),
});

// Step 5: Advanced Configurations Schemas
export const gatilhoEscalacaoSchema = z.object({
  solicitacao_humano: z.boolean().default(false),
  apos_objecoes_limite: z.number().min(1).max(10).default(3),
  valor_venda_limite: z.number().min(0).optional(),
  alta_irritacao: z.boolean().default(false),
  duvidas_tecnicas: z.boolean().default(false),
  mensagem_transferencia: z.string()
    .min(10, 'Mensagem de transferência deve ter pelo menos 10 caracteres')
    .max(300, 'Mensagem de transferência deve ter no máximo 300 caracteres'),
  ativo: z.boolean().default(true),
});

export const followUpSchema = z.object({
  timing_dias: z.number().min(1).max(30),
  condicao: z.string()
    .min(5, 'Condição deve ter pelo menos 5 caracteres')
    .max(100, 'Condição deve ter no máximo 100 caracteres'),
  mensagem: z.string()
    .min(10, 'Mensagem deve ter pelo menos 10 caracteres')
    .max(500, 'Mensagem deve ter no máximo 500 caracteres'),
  ativo: z.boolean().default(true),
  ordem: z.number().min(1).default(1),
});

export const perguntaQualificacaoSchema = z.object({
  quando_perguntar: z.string()
    .min(5, 'Quando perguntar deve ter pelo menos 5 caracteres')
    .max(100, 'Quando perguntar deve ter no máximo 100 caracteres'),
  pergunta: z.string()
    .min(10, 'Pergunta deve ter pelo menos 10 caracteres')
    .max(200, 'Pergunta deve ter no máximo 200 caracteres'),
  respostas_qualificam: z.array(z.string()).min(1, 'Deve ter pelo menos uma resposta que qualifica'),
  score: z.enum(SCORES_OPCOES).default('Médio'),
  ativo: z.boolean().default(true),
  ordem: z.number().min(1).default(1),
});

export const etapaFunilSchema = z.object({
  nome: z.string()
    .min(3, 'Nome da etapa deve ter pelo menos 3 caracteres')
    .max(50, 'Nome da etapa deve ter no máximo 50 caracteres'),
  percentual: z.number().min(0).max(100),
  criterios_avancar: z.array(z.string()).min(1, 'Deve ter pelo menos um critério para avançar'),
  acoes_automaticas: z.array(z.string()).default([]),
  ordem: z.number().min(1),
  ativo: z.boolean().default(true),
});

// Products Schema
export const produtoSchema = z.object({
  nome: z.string()
    .min(2, 'Nome do produto deve ter pelo menos 2 caracteres')
    .max(100, 'Nome do produto deve ter no máximo 100 caracteres'),
  descricao: z.string()
    .min(10, 'Descrição deve ter pelo menos 10 caracteres')
    .max(500, 'Descrição deve ter no máximo 500 caracteres'),
  preco: z.number().min(0).optional(),
  estoque: z.number().min(0, 'Estoque deve ser maior ou igual a 0').optional(),
  imagens: z.array(z.string()).default([]).optional(),
  ativo: z.boolean().default(true),
});

// WhatsApp Connection Schema
export const whatsappConnectionSchema = z.object({
  connected: z.boolean().default(false),
  phoneNumber: z.string().optional(),
  profileName: z.string().optional().nullable(),
  instanceName: z.string().optional(),
});

// Blocked Numbers Schema
export const blockedNumbersSchema = z.object({
  blocked_numbers: z.array(z.string()
    .regex(/^55\d{10}$/, 'Número deve ter 12 dígitos no formato 553196997292 (código país 55 + DDD + número sem o 9 adicional)')
    .refine((value) => value.startsWith('55'), 'Número deve começar com código do país 55')
    .refine((value) => value.length === 12, 'Número deve ter exatamente 12 dígitos')
  ).default([])
});

// Complete Company Creation Schema
export const createEmpresaSchema = z.object({
  // Agent Type Selection
  agent_type: z.enum(['sentinela', 'vendas']).optional(),
  
  // Step 1
  ...empresaBasicSchema.shape,
  
  // Step 2
  ...empresaContactSchema.shape,
  
  // Step 3 - Agent Configuration (optional)
  agente_config: agenteConfigSchema.optional(),
  
  // Step 4 - Objections (optional)
  objecoes: z.array(objecaoSchema.transform(obj => ({
    ...obj,
    tags: obj.tags || [],
    ativo: obj.ativo !== undefined ? obj.ativo : true
  }))).optional(),
  
  // Step 5 - Products (optional)
  produtos: z.array(produtoSchema).optional(),
  
  // Step 6 - WhatsApp Connection (optional)
  whatsapp_connection: whatsappConnectionSchema.optional(),
  
  // Step 7 - Blocked Numbers (optional)  
  blocked_numbers: z.array(z.string()).optional(),
  
  // Step 8 - Advanced Configurations (optional)
  gatilhos_escalacao: gatilhoEscalacaoSchema.optional(),
  follow_ups: z.array(followUpSchema).optional(),
  perguntas_qualificacao: z.array(perguntaQualificacaoSchema).optional(),
  etapas_funil: z.array(etapaFunilSchema).optional(),
});

export type CreateEmpresaFormData = z.infer<typeof createEmpresaSchema>;
export type EmpresaBasicFormData = z.infer<typeof empresaBasicSchema>;
export type EmpresaBasicSentinelaFormData = z.infer<typeof empresaBasicSentinelaSchema>;
export type EmpresaContactFormData = z.infer<typeof empresaContactSchema>;
export type AgenteConfigFormData = z.infer<typeof agenteConfigSchema>;
export type ObjecaoFormData = z.infer<typeof objecaoSchema>;
export type ProdutoFormData = z.infer<typeof produtoSchema>;
export type WhatsAppConnectionFormData = z.infer<typeof whatsappConnectionSchema>;
export type BlockedNumbersFormData = z.infer<typeof blockedNumbersSchema>;
export type GatilhoEscalacaoFormData = z.infer<typeof gatilhoEscalacaoSchema>;
export type FollowUpFormData = z.infer<typeof followUpSchema>;
export type PerguntaQualificacaoFormData = z.infer<typeof perguntaQualificacaoSchema>;
export type EtapaFunilFormData = z.infer<typeof etapaFunilSchema>;