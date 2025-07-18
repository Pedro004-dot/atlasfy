# Sistema de Perfil Bancário - Atlas

## 📋 Visão Geral

O Sistema de Perfil Bancário foi implementado para garantir que usuários completem suas informações pessoais antes de criar empresas. Isso é necessário para integração com sistemas bancários (como Asaas) e geração de links de pagamento.

## 🎯 Objetivos

1. **Validação de Perfil**: Impedir criação de empresas sem perfil completo
2. **Integração Bancária**: Criar contas bancárias automaticamente
3. **Abstração de Serviços**: Permitir múltiplos provedores bancários
4. **Experiência do Usuário**: Fluxo claro e intuitivo

## 🏗️ Arquitetura

### Camadas Implementadas

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│  │ Completar Perfil│  │ Criar Empresa   │  │ Dashboard   │  │
│  │     Page        │  │    Component    │  │   Status    │  │
│  └─────────────────┘  └─────────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                      API Routes                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│  │ /api/auth/      │  │ /api/empresas/  │  │ /api/auth/  │  │
│  │ completar-perfil│  │     route       │  │   perfil    │  │
│  └─────────────────┘  └─────────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│  │ UserProfile     │  │ Banking         │  │ Validation  │  │
│  │    Service      │  │  Service        │  │   Service   │  │
│  └─────────────────┘  └─────────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                   Repository Layer                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│  │ User            │  │ Banking         │  │ Empresa     │  │
│  │ Repository      │  │ Repository      │  │ Repository  │  │
│  └─────────────────┘  └─────────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                      Database                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│  │ usuario         │  │ empresa         │  │ External    │  │
│  │ (perfil_completo│  │ (verificação)   │  │ Banking API │  │
│  │  + dados)       │  │                 │  │ (Asaas)     │  │
│  └─────────────────┘  └─────────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 🗄️ Estrutura do Banco de Dados

### Tabela `usuario` (Campos Adicionados)

```sql
-- Novos campos adicionados
ALTER TABLE usuario 
ADD COLUMN cpf_cnpj VARCHAR(18),
ADD COLUMN faturamento_mensal DECIMAL(10,2),
ADD COLUMN endereco TEXT,
ADD COLUMN bairro VARCHAR(100),
ADD COLUMN cep VARCHAR(10),
ADD COLUMN perfil_completo BOOLEAN DEFAULT FALSE,
ADD COLUMN conta_bancaria_id VARCHAR(100),
ADD COLUMN tipo_pessoa VARCHAR(10) CHECK (tipo_pessoa IN ('FISICA', 'JURIDICA'));
```

### Campos Obrigatórios para Perfil Completo

- `cpf_cnpj`: CPF (11 dígitos) ou CNPJ (14 dígitos)
- `faturamento_mensal`: Renda mensal em reais
- `endereco`: Endereço completo
- `bairro`: Bairro
- `cep`: CEP no formato 00000-000
- `tipo_pessoa`: 'FISICA' ou 'JURIDICA'
- `telefone`: Telefone para contato

## 🔧 Componentes Implementados

### 1. Service Layer

#### `UserProfileService`
- `completeUserProfile()`: Completa perfil e cria conta bancária
- `updateUserProfile()`: Atualiza dados do perfil
- `checkProfileCompleteness()`: Verifica se perfil está completo
- `getUserBankingAccount()`: Obtém dados da conta bancária

#### `BankingServiceFactory`
- Factory pattern para criar serviços bancários
- Suporte a múltiplos provedores (Asaas, Pagar.me, etc.)
- Configuração por ambiente

#### `AsaasService`
- Implementação específica para Asaas
- Métodos: `createAccount()`, `updateAccount()`, `generatePaymentLink()`
- Mapeamento de dados entre formatos

### 2. Repository Layer

#### `UserRepository` (Métodos Adicionados)
- `updateProfile()`: Atualiza dados do perfil
- `completeProfile()`: Marca perfil como completo
- `checkProfileComplete()`: Verifica status do perfil
- `setBankingAccountId()`: Define ID da conta bancária

### 3. Validation Layer

#### Schemas Zod
- `userProfileSchema`: Validação de perfil completo
- `updateUserProfileSchema`: Validação de atualizações
- `bankingAccountSchema`: Validação para conta bancária

### 4. API Routes

#### `/api/auth/completar-perfil`
- `POST`: Completa perfil e cria conta bancária
- `GET`: Verifica status do perfil

#### `/api/auth/perfil`
- `GET`: Obtém dados do perfil
- `PUT`: Atualiza dados do perfil

#### `/api/empresas` (Atualizado)
- Adicionada verificação de perfil completo antes de criar empresa

### 5. Frontend Components

#### `/completar-perfil`
- Formulário para completar perfil
- Validação em tempo real
- Formatação de CPF/CNPJ, CEP, telefone
- Integração com API

#### `CreateEmpresaButton`
- Botão inteligente que verifica perfil antes de criar empresa
- Redirecionamento automático para completar perfil
- Hook `useProfileStatus` para verificações

## 🔄 Fluxo de Funcionamento

### 1. Cadastro Inicial
```
Usuário → Cadastro (nome, email, senha) → Login → Dashboard
```

### 2. Tentativa de Criar Empresa
```
Dashboard → Criar Empresa → Verificação de Perfil → Redirecionamento
```

### 3. Completar Perfil
```
Completar Perfil → Validação → Criar Conta Bancária → Perfil Completo
```

### 4. Criar Empresa (Após Perfil Completo)
```
Dashboard → Criar Empresa → Verificação OK → Criação Permitida
```

## 🛡️ Segurança e Validação

### Validações Implementadas

1. **CPF/CNPJ**: Formato e quantidade de dígitos
2. **CEP**: Formato 00000-000
3. **Telefone**: Formato (XX) XXXXX-XXXX
4. **Email**: Formato válido
5. **Faturamento**: Valor positivo
6. **Endereço**: Mínimo 10 caracteres

### Tratamento de Erros

```typescript
// Exemplo de tratamento de erro
try {
  await userProfileService.completeUserProfile(userId, profileData);
} catch (error) {
  if (error instanceof BankingServiceError) {
    // Erro específico do serviço bancário
  } else if (error instanceof ValidationError) {
    // Erro de validação
  }
}
```

## 🌐 Integração com Sistemas Bancários

### Abstração de Serviços

```typescript
interface IBankingService {
  createAccount(data: BankingAccountData): Promise<BankingAccountResult>;
  generatePaymentLink(data: PaymentLinkData): Promise<PaymentLinkResult>;
  validateAccountData(data: BankingAccountData): Promise<ValidationResult>;
}
```

### Implementação Asaas

```typescript
class AsaasService implements IBankingService {
  // Implementação específica para Asaas
  async createAccount(data: BankingAccountData) {
    // Mapear dados para formato Asaas
    // Fazer chamada para API
    // Retornar resultado padronizado
  }
}
```

### Configuração por Ambiente

```typescript
// .env
ASAAS_API_KEY=your_api_key
ASAAS_WEBHOOK_URL=https://yourapp.com/webhook
DEFAULT_BANKING_PROVIDER=ASAAS
```

## 📱 Experiência do Usuário

### 1. Fluxo Otimizado
- Redirecionamento automático quando perfil incompleto
- Preservação da URL de destino após completar perfil
- Feedback visual em tempo real

### 2. Validação Progressiva
- Validação conforme o usuário digita
- Mensagens de erro claras
- Formatação automática de campos

### 3. Status do Perfil
- Indicador visual do status do perfil
- Lista de campos faltantes
- Progresso de completude

## 🔍 Monitoramento e Logs

### Logs Implementados

```typescript
// Exemplo de log
console.log('Perfil completo criado:', {
  userId,
  bankingAccountId,
  provider: 'ASAAS',
  timestamp: new Date().toISOString()
});
```

### Métricas Sugeridas

1. **Taxa de Conversão**: Usuários que completam perfil
2. **Tempo de Completude**: Tempo médio para completar perfil
3. **Erros Bancários**: Falhas na criação de contas
4. **Abandono**: Usuários que abandonam o processo

## 🚀 Próximos Passos

### Melhorias Futuras

1. **Múltiplos Provedores**: Implementar Pagar.me, Mercado Pago
2. **Validação Avançada**: Consulta de CEP automática
3. **Onboarding**: Tour guiado para novos usuários
4. **Dashboard**: Painel de status do perfil
5. **Notificações**: Lembretes para completar perfil

### Integrações Pendentes

1. **API de CEP**: Preenchimento automático de cidade/estado
2. **Validação de CPF/CNPJ**: Verificação na Receita Federal
3. **Webhook Bancário**: Notificações de status de conta
4. **Backup de Dados**: Sincronização com sistemas externos

## 📞 Uso da Funcionalidade

### Para Desenvolvedores

```typescript
// Verificar status do perfil
const profileStatus = await userProfileService.checkProfileCompleteness(userId);
if (!profileStatus.isComplete) {
  return redirect('/completar-perfil');
}

// Criar conta bancária
const bankingAccount = await userProfileService.completeUserProfile(userId, profileData);

// Gerar link de pagamento
const paymentLink = await bankingService.generatePaymentLink(accountId, {
  amount: 100,
  description: 'Produto X',
  paymentTypes: ['PIX', 'CREDIT_CARD']
});
```

### Para Usuários

1. **Primeiro Acesso**: Cadastrar com email e senha
2. **Completar Perfil**: Preencher dados pessoais e financeiros
3. **Criar Empresas**: Agora pode criar empresas livremente
4. **Gerar Pagamentos**: Links de pagamento disponíveis

## 🎉 Resultado Final

O sistema agora possui:

✅ **Perfil Completo Obrigatório**: Não é possível criar empresas sem perfil completo
✅ **Integração Bancária**: Conta criada automaticamente no Asaas
✅ **Abstração de Serviços**: Fácil adição de novos provedores bancários
✅ **Validação Robusta**: Dados validados em múltiplas camadas
✅ **UX Otimizada**: Fluxo claro e intuitivo
✅ **Arquitetura Escalável**: Código organizado e manutenível

O sistema está pronto para produção e pode ser facilmente estendido para suportar novos provedores bancários e funcionalidades adicionais.