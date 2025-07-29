import { z } from 'zod';

export const registerSchema = z.object({
  nome: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Nome deve conter apenas letras e espaços'),
  
  email: z.string()
    .email('Email inválido')
    .min(5, 'Email deve ter pelo menos 5 caracteres')
    .max(255, 'Email deve ter no máximo 255 caracteres')
    .toLowerCase(),
  
  senha: z.string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .max(100, 'Senha deve ter no máximo 100 caracteres')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
      'Senha deve conter pelo menos: 1 letra minúscula, 1 maiúscula, 1 número e 1 caractere especial'),
});

export const loginSchema = z.object({
  email: z.string()
    .email('Email inválido')
    .min(5, 'Email deve ter pelo menos 5 caracteres')
    .max(255, 'Email deve ter no máximo 255 caracteres')
    .toLowerCase(),
  
  senha: z.string()
    .min(1, 'Senha é obrigatória')
    .max(100, 'Senha deve ter no máximo 100 caracteres'),
});

export const emailVerificationSchema = z.object({
  email: z.string()
    .email('Email inválido')
    .min(5, 'Email deve ter pelo menos 5 caracteres')
    .max(255, 'Email deve ter no máximo 255 caracteres')
    .toLowerCase(),
  
  token: z.string()
    .length(6, 'Token deve ter 6 dígitos')
    .regex(/^\d{6}$/, 'Token deve conter apenas números'),
});

export const passwordResetRequestSchema = z.object({
  email: z.string()
    .email('Email inválido')
    .min(5, 'Email deve ter pelo menos 5 caracteres')
    .max(255, 'Email deve ter no máximo 255 caracteres')
    .toLowerCase(),
});

export const passwordResetSchema = z.object({
  email: z.string()
    .email('Email inválido')
    .min(5, 'Email deve ter pelo menos 5 caracteres')
    .max(255, 'Email deve ter no máximo 255 caracteres')
    .toLowerCase(),
  
  token: z.string()
    .length(6, 'Token deve ter 6 dígitos')
    .regex(/^\d{6}$/, 'Token deve conter apenas números'),
  
  nova_senha: z.string()
    .min(8, 'Nova senha deve ter pelo menos 8 caracteres')
    .max(100, 'Nova senha deve ter no máximo 100 caracteres')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
      'Nova senha deve conter pelo menos: 1 letra minúscula, 1 maiúscula, 1 número e 1 caractere especial'),
  
  confirmar_senha: z.string()
    .min(1, 'Confirmação de senha é obrigatória'),
}).refine(
  (data) => data.nova_senha === data.confirmar_senha,
  {
    message: 'Senhas não coincidem',
    path: ['confirmar_senha'],
  }
);

export const tokenSchema = z.object({
  token: z.string()
    .length(6, 'Token deve ter 6 dígitos')
    .regex(/^\d{6}$/, 'Token deve conter apenas números'),
});

export type RegisterFormData = z.infer<typeof registerSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type EmailVerificationFormData = z.infer<typeof emailVerificationSchema>;
export type PasswordResetRequestFormData = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetFormData = z.infer<typeof passwordResetSchema>;
export type TokenFormData = z.infer<typeof tokenSchema>;

export function validateRegister(data: unknown) {
  return registerSchema.safeParse(data);
}

export function validateLogin(data: unknown) {
  return loginSchema.safeParse(data);
}

export function validateEmailVerification(data: unknown) {
  return emailVerificationSchema.safeParse(data);
}

export function validatePasswordResetRequest(data: unknown) {
  return passwordResetRequestSchema.safeParse(data);
}

export function validatePasswordReset(data: unknown) {
  return passwordResetSchema.safeParse(data);
}

export function validateToken(data: unknown) {
  return tokenSchema.safeParse(data);
}

export function formatValidationErrors(errors: z.ZodError) {
  return errors.errors.map(error => ({
    field: error.path.join('.'),
    message: error.message
  }));
}

// Company validation schemas
export const empresaFormSchema = z.object({
  nome: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  cnpj: z.string()
    .regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, 'CNPJ deve estar no formato XX.XXX.XXX/XXXX-XX')
    .optional()
    .or(z.literal('')),
  telefone: z.string()
    .regex(/^\d{10,12}$/, 'Telefone deve conter apenas números e ter 10 ou 12 dígitos (formato: 553196997292 - sem o 9 adicional)')
    .optional()
    .or(z.literal('')),
  endereco: z.string().max(500, 'Endereço deve ter no máximo 500 caracteres').optional().or(z.literal('')),
  link_google_maps: z.string().url('Link deve ser uma URL válida').optional().or(z.literal('')),
  nome_atendente: z.string().max(100, 'Nome do atendente deve ter no máximo 100 caracteres').optional().or(z.literal('')),
  genero_atendente: z.enum(['masculino', 'feminino']).optional(),
  numeroSuporte: z.string()
    .regex(/^\d{10,12}$/, 'Número de suporte deve conter apenas números e ter 10 ou 12 dígitos (formato: 553196997292 - sem o 9 adicional)')
    .optional()
    .or(z.literal('')),
  descricao: z.string().max(1000, 'Descrição deve ter no máximo 1000 caracteres').optional().or(z.literal('')),
  email: z.string()
    .email('Email inválido')
    .max(255, 'Email deve ter no máximo 255 caracteres')
    .optional()
    .or(z.literal('')),
  website: z.string().url('Website deve ser uma URL válida').optional().or(z.literal('')),
  setor: z.string().max(100, 'Setor deve ter no máximo 100 caracteres').optional().or(z.literal('')),
});

export type EmpresaFormData = z.infer<typeof empresaFormSchema>;

export function validateEmpresaForm(data: unknown) {
  return empresaFormSchema.safeParse(data);
}

// User profile validation schemas
export const userProfileSchema = z.object({
  cpf_cnpj: z.string()
    .min(11, 'CPF/CNPJ deve ter pelo menos 11 caracteres')
    .max(18, 'CPF/CNPJ deve ter no máximo 18 caracteres')
    .regex(/^[\d./-]+$/, 'CPF/CNPJ deve conter apenas números, pontos, traços e barras')
    .refine((value) => {
      const cleanValue = value.replace(/[^\d]/g, '');
      return cleanValue.length === 11 || cleanValue.length === 14;
    }, 'CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos'),
  
  faturamento_mensal: z.number()
    .min(0, 'Faturamento mensal deve ser maior ou igual a 0')
    .max(999999999, 'Faturamento mensal deve ser menor que 1 bilhão'),
  
  endereco: z.string()
    .min(10, 'Endereço deve ter pelo menos 10 caracteres')
    .max(500, 'Endereço deve ter no máximo 500 caracteres'),
  
  bairro: z.string()
    .min(2, 'Bairro deve ter pelo menos 2 caracteres')
    .max(100, 'Bairro deve ter no máximo 100 caracteres'),
  
  cep: z.string()
    .regex(/^\d{5}-?\d{3}$/, 'CEP deve estar no formato XXXXX-XXX')
    .transform((value) => value.replace('-', '')),
  
  tipo_pessoa: z.enum(['FISICA', 'JURIDICA'], {
    errorMap: () => ({ message: 'Tipo de pessoa deve ser FÍSICA ou JURÍDICA' })
  }),
  
  telefone: z.string()
    .regex(/^\d{10,12}$/, 'Telefone deve conter apenas números e ter 10 ou 12 dígitos (formato: 553196997292 - sem o 9 adicional)')
    .optional()
    .or(z.literal('')),
  
  email: z.string()
    .email('Email inválido')
    .min(5, 'Email deve ter pelo menos 5 caracteres')
    .max(255, 'Email deve ter no máximo 255 caracteres')
    .toLowerCase()
    .optional()
    .or(z.literal('')),
});

export const updateUserProfileSchema = userProfileSchema.partial().extend({
  perfil_completo: z.boolean().optional(),
  conta_bancaria_id: z.string().optional(),
});

export type UserProfileFormData = z.infer<typeof userProfileSchema>;
export type UpdateUserProfileFormData = z.infer<typeof updateUserProfileSchema>;

export function validateUserProfile(data: unknown) {
  return userProfileSchema.safeParse(data);
}

export function validateUpdateUserProfile(data: unknown) {
  return updateUserProfileSchema.safeParse(data);
}

// Banking account validation schema
export const bankingAccountSchema = z.object({
  name: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  
  email: z.string()
    .email('Email inválido')
    .max(255, 'Email deve ter no máximo 255 caracteres'),
  
  phone: z.string()
    .regex(/^\d{10,12}$/, 'Telefone deve ter 10 ou 12 dígitos (formato: 553196997292 - sem o 9 adicional)'),
  
  cpfCnpj: z.string()
    .regex(/^\d{11}$|^\d{14}$/, 'CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos'),
  
  address: z.string()
    .min(10, 'Endereço deve ter pelo menos 10 caracteres')
    .max(500, 'Endereço deve ter no máximo 500 caracteres'),
  
  addressNumber: z.string()
    .min(1, 'Número do endereço é obrigatório')
    .max(10, 'Número do endereço deve ter no máximo 10 caracteres'),
  
  complement: z.string()
    .max(100, 'Complemento deve ter no máximo 100 caracteres')
    .optional(),
  
  province: z.string()
    .min(2, 'Bairro deve ter pelo menos 2 caracteres')
    .max(100, 'Bairro deve ter no máximo 100 caracteres'),
  
  city: z.string()
    .min(2, 'Cidade deve ter pelo menos 2 caracteres')
    .max(100, 'Cidade deve ter no máximo 100 caracteres'),
  
  postalCode: z.string()
    .regex(/^\d{8}$/, 'CEP deve ter 8 dígitos'),
  
  mobilePhone: z.string()
    .regex(/^\d{10,12}$/, 'Celular deve ter 10 ou 12 dígitos (formato: 553196997292 - sem o 9 adicional)')
    .optional(),
  
  personType: z.enum(['FISICA', 'JURIDICA']),
  
  companyType: z.enum(['MEI', 'LIMITED', 'INDIVIDUAL', 'ASSOCIATION'])
    .optional(),
  
  state: z.string()
    .length(2, 'Estado deve ter 2 caracteres')
    .optional(),
  
  country: z.string()
    .length(2, 'País deve ter 2 caracteres')
    .default('BR')
    .optional(),
  
  monthlyIncome: z.number()
    .min(0, 'Renda mensal deve ser maior ou igual a 0')
    .optional(),
});

export type BankingAccountFormData = z.infer<typeof bankingAccountSchema>;

export function validateBankingAccount(data: unknown) {
  return bankingAccountSchema.safeParse(data);
}