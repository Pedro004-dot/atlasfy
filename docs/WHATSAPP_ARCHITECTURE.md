# 🏗️ Arquitetura WhatsApp Multi-Tenant - Atlas

## 🎯 **Visão Geral**

O sistema Atlas agora implementa uma arquitetura **SaaS multi-tenant** onde cada empresa conecta suas próprias contas WhatsApp, garantindo isolamento e segurança dos dados.

## 📋 **Problemas Resolvidos**

### ❌ **Arquitetura Anterior (Incorreta)**
- Uma única conta WhatsApp para toda a plataforma
- Todas as empresas compartilhavam as mesmas credenciais
- Violação de isolamento de dados
- Limitações de escala e compliance

### ✅ **Nova Arquitetura (Correta)**
- Cada empresa tem suas próprias conexões WhatsApp
- Isolamento completo entre empresas
- Credenciais criptografadas individualmente
- Escalabilidade e compliance adequados

---

## 🔧 **Implementação Técnica**

### **1. Evolution API**
```typescript
// Cada empresa gera sua própria instância
const instanceId = `atlas_${userId}_${empresaId}_${timestamp}`;
const instanceToken = `atlas_token_${timestamp}_${randomId}`;
```

**Características:**
- ✅ Auto-geração de credenciais únicas
- ✅ QR Code individual por empresa
- ✅ Sem necessidade de configuração manual
- ✅ Ideal para empresas pequenas/médias

### **2. WhatsApp Business API Oficial**
```typescript
// Cada empresa fornece suas credenciais
interface OfficialCredentials {
  phoneNumberId: string;      // Fornecido pela empresa
  businessAccountId: string;  // Fornecido pela empresa
  accessToken: string;        // Fornecido pela empresa
  appSecret: string;         // Fornecido pela empresa
}
```

**Características:**
- ✅ Credenciais fornecidas pela empresa
- ✅ Criptografia individual por empresa
- ✅ Webhook dedicado por conexão
- ✅ Ideal para empresas grandes/corporativas

---

## 🔐 **Segurança e Isolamento**

### **Criptografia de Dados**
```env
# Chave única para toda a plataforma
WHATSAPP_ENCRYPTION_KEY=64_character_hex_key
```

### **Isolamento por Empresa**
- Cada conexão é associada a `empresa_id`
- Tokens criptografados individualmente
- Webhooks dedicados por empresa
- Logs isolados por conexão

### **Estrutura do Banco**
```sql
CREATE TABLE whatsapp_connections (
  id UUID PRIMARY KEY,
  empresa_id UUID NOT NULL,
  user_id UUID NOT NULL,
  connection_type VARCHAR(20), -- 'evolution' | 'official'
  -- Evolution API fields
  instance_id VARCHAR(255),
  instance_token TEXT,
  -- Official API fields (criptografados)
  phone_number_id_encrypted TEXT,
  access_token_encrypted TEXT,
  app_secret_encrypted TEXT,
  -- Common fields
  status VARCHAR(20),
  created_at TIMESTAMP
);
```

---

## 🚀 **Fluxo de Conexão**

### **Para Evolution API:**

1. **Empresa acessa wizard**
2. **Seleciona "Evolution API"**
3. **Sistema auto-gera:**
   - Instance ID único
   - Instance Token único
   - Webhook URL dedicado
4. **QR Code é apresentado**
5. **Empresa escaneia com WhatsApp**
6. **Conexão estabelecida e salva**

### **Para WhatsApp Business API:**

1. **Empresa acessa wizard**
2. **Seleciona "WhatsApp Business API"**
3. **Empresa insere credenciais:**
   - Phone Number ID
   - Business Account ID
   - Access Token
   - App Secret
4. **Sistema valida credenciais**
5. **Dados são criptografados e salvos**
6. **Webhook é configurado automaticamente**

---

## 📊 **Vantagens da Nova Arquitetura**

### **Para as Empresas:**
- 🔒 **Segurança**: Dados isolados e criptografados
- 📈 **Escalabilidade**: Sem limitações compartilhadas
- ⚡ **Performance**: Recursos dedicados
- 📱 **Controle**: Gerenciam suas próprias conexões

### **Para a Plataforma:**
- 🏢 **Compliance**: Atende regulamentações de dados
- 💰 **Monetização**: Planos diferenciados por tipo de API
- 🔧 **Manutenção**: Falhas isoladas por empresa
- 📊 **Analytics**: Métricas detalhadas por cliente

---

## ⚙️ **Configuração do Sistema**

### **Variáveis de Ambiente Necessárias:**
```env
# Evolution API
EVOLUTION_API_URL=https://your-evolution-server.com
EVOLUTION_API_KEY=your_evolution_key

# Encryption
WHATSAPP_ENCRYPTION_KEY=64_char_hex_key

# App
NEXT_PUBLIC_APP_URL=https://yourplatform.com
```

### **Variáveis NÃO Necessárias:**
```env
# ❌ Removidas - cada empresa fornece as suas
WHATSAPP_PHONE_NUMBER_ID=removed
WHATSAPP_BUSINESS_ACCOUNT_ID=removed  
WHATSAPP_ACCESS_TOKEN=removed
WHATSAPP_APP_SECRET=removed
```

---

## 🔄 **Migração de Dados**

### **Para Empresas Existentes:**
1. Backup das conexões atuais
2. Migração para modelo por empresa
3. Re-configuração de webhooks
4. Validação de funcionamento

### **Script de Migração:**
```sql
-- Associar conexões existentes às empresas
UPDATE whatsapp_connections 
SET empresa_id = (
  SELECT empresa_id FROM usuarios 
  WHERE usuarios.id = whatsapp_connections.user_id
);
```

---

## 📋 **Checklist de Implementação**

### ✅ **Completado:**
- [x] Arquitetura multi-tenant implementada
- [x] Evolution API com auto-geração
- [x] WhatsApp Business API com entrada manual
- [x] Criptografia de dados sensíveis
- [x] Isolamento por empresa
- [x] Webhooks dedicados
- [x] Interface de usuário atualizada
- [x] Documentação completa

### 🔄 **Próximos Passos:**
- [ ] Testes de integração completos
- [ ] Migração de dados existentes
- [ ] Monitoramento de performance
- [ ] Implementação de alertas
- [ ] Dashboard de métricas por empresa

---

## 🆘 **Suporte e Troubleshooting**

### **Problemas Comuns:**

#### **"WHATSAPP_ENCRYPTION_KEY must be 64-character hex"**
```bash
# Gerar nova chave
openssl rand -hex 32
# Resultado: 64 caracteres hexadecimais
```

#### **"System configuration is disabled"**
- Comportamento esperado para WhatsApp Business API
- Cada empresa deve fornecer suas credenciais

#### **"Evolution API connection failed"**
- Verificar `EVOLUTION_API_URL`
- Confirmar `EVOLUTION_API_KEY`
- Testar conectividade com servidor Evolution

---

## 📈 **Métricas e Monitoramento**

### **Por Empresa:**
- Número de mensagens enviadas/recebidas
- Status de health das conexões
- Uptime das APIs
- Erros por tipo

### **Globais:**
- Total de empresas conectadas
- Distribuição Evolution vs Official API
- Performance do sistema
- Custos por conexão

---

## 🌟 **Benefícios para o Negócio**

### **Conformidade:**
- ✅ GDPR compliance
- ✅ LGPD compliance  
- ✅ Isolamento de dados
- ✅ Auditoria por empresa

### **Escalabilidade:**
- ✅ Crescimento ilimitado de empresas
- ✅ Performance isolada
- ✅ Recursos dedicados
- ✅ Falhas não propagam

### **Monetização:**
- 💰 Planos diferenciados (Evolution vs Official)
- 💰 Cobrança por volume de mensagens
- 💰 Features premium por tipo de API
- 💰 SLA diferenciado

---

**Resumo**: A nova arquitetura transforma o Atlas em uma plataforma SaaS verdadeiramente multi-tenant, onde cada empresa tem controle total sobre suas conexões WhatsApp, garantindo segurança, escalabilidade e conformidade regulatória.