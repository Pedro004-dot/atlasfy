# 📱 Guia Completo: Como Obter Credenciais WhatsApp Business API

## 🎯 Objetivo
Este guia te ensina como obter todas as credenciais necessárias para conectar com a WhatsApp Business API oficial do Meta.

## 📋 Credenciais Necessárias:
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_BUSINESS_ACCOUNT_ID`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_APP_SECRET`

---

## 📝 **PASSO 1: Criar Conta Meta for Developers**

1. **Acesse**: https://developers.facebook.com/
2. **Faça login** com sua conta Facebook/Meta
3. **Clique em "My Apps"** no menu superior
4. **Clique em "Create App"**

### Configurações do App:
- **App Type**: Business
- **App Name**: `Atlas WhatsApp API` (ou nome de sua escolha)
- **Contact Email**: Seu email
- **Business Account**: Selecione ou crie uma conta comercial

---

## 📱 **PASSO 2: Adicionar WhatsApp Product**

1. **No dashboard do seu app**, vá para "Add a Product"
2. **Encontre "WhatsApp"** e clique em "Set up"
3. **Configure as permissões** necessárias:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`

---

## 🔐 **PASSO 3: Obter WHATSAPP_APP_SECRET**

1. **No painel lateral**, clique em "Settings" → "Basic"
2. **Localize "App Secret"**
3. **Clique em "Show"** e insira sua senha do Facebook
4. **Copie o valor** - este é seu `WHATSAPP_APP_SECRET`

```env
WHATSAPP_APP_SECRET=abc123def456ghi789jkl012mno345
```

---

## 📞 **PASSO 4: Obter WHATSAPP_PHONE_NUMBER_ID**

1. **Vá para "WhatsApp" → "API Setup"** no menu lateral
2. **Na seção "Phone Numbers"**, você verá uma lista de números
3. **Clique no número** que deseja usar
4. **Copie o "Phone Number ID"** (não o número em si, mas o ID numérico)

```env
WHATSAPP_PHONE_NUMBER_ID=1234567890123456
```

### 💡 Importante sobre Números:
- **Número de Teste**: Meta fornece um número de teste gratuito
- **Número Próprio**: Você pode adicionar seu próprio número comercial
- **Verificação**: Números próprios precisam ser verificados

---

## 🏢 **PASSO 5: Obter WHATSAPP_BUSINESS_ACCOUNT_ID**

### Método 1 - Pela API Setup:
1. **Na mesma página "API Setup"**
2. **Procure por "WhatsApp Business Account ID"**
3. **Copie o ID numérico**

### Método 2 - Pelo Meta Business Manager:
1. **Acesse**: https://business.facebook.com/
2. **Vá para "Business Settings"**
3. **Clique em "WhatsApp Accounts"**
4. **Copie o ID da conta**

```env
WHATSAPP_BUSINESS_ACCOUNT_ID=1234567890123456
```

---

## 🎫 **PASSO 6: Obter WHATSAPP_ACCESS_TOKEN**

### ⚠️ Importante: Tipos de Token

#### **Token Temporário (Teste):**
1. **Na página "API Setup"**
2. **Procure por "Access Token"**
3. **Copie o token** (válido por 24 horas)

#### **Token Permanente (Produção):**

1. **Vá para "WhatsApp" → "Configuration"**
2. **Clique em "Generate Token"**
3. **Selecione as permissões**:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
4. **Escolha "Never Expires"** ou período longo
5. **Copie o token gerado**

```env
WHATSAPP_ACCESS_TOKEN=EAABsbCS1234...very_long_token...XYZ789
```

### 🔄 Renovação de Token:
- Tokens têm prazo de expiração
- Configure alertas para renovação
- Use refresh tokens quando disponíveis

---

## ✅ **PASSO 7: Configurar Webhook**

### URL do Webhook:
```
https://seudominio.com/api/whatsapp/official/webhook
```

### Configuração no Meta:
1. **Vá para "WhatsApp" → "Configuration"**
2. **Na seção "Webhook"**:
   - **Callback URL**: `https://seudominio.com/api/whatsapp/official/webhook`
   - **Verify Token**: Use o mesmo valor de `WHATSAPP_APP_SECRET`
3. **Subscribe to Fields**:
   - `messages`
   - `message_deliveries`
   - `message_reads`
   - `message_reactions`

---

## 🔒 **PASSO 8: Gerar Encryption Key**

```bash
# Gerar chave de 32 caracteres
openssl rand -hex 32

# Resultado exemplo:
# a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
```

```env
ENCRYPTION_KEY=a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
```

---

## 📋 **PASSO 9: Arquivo .env Final**

```env
# WhatsApp Business API Oficial Configuration
WHATSAPP_PHONE_NUMBER_ID=1234567890123456
WHATSAPP_BUSINESS_ACCOUNT_ID=9876543210987654
WHATSAPP_ACCESS_TOKEN=EAABsbCS1234XYZ789VeryLongTokenHere
WHATSAPP_APP_SECRET=abc123def456ghi789jkl012mno345

# Encryption Key (32 characters)
ENCRYPTION_KEY=a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456

# App URL para webhook
NEXT_PUBLIC_APP_URL=https://seudominio.com
```

---

## 🧪 **PASSO 10: Testar Configuração**

### Teste via Terminal:
```bash
curl -X POST "https://localhost:3001/api/business-rules/validate-connection" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "connection_type": "official",
    "phone_number": "test",
    "agent_type": "vendas"
  }'
```

### Teste via Interface:
1. **Reinicie o servidor**: `npm run dev`
2. **Acesse o wizard de criação de empresa**
3. **Teste a conexão WhatsApp Business API**

---

## ⚠️ **Limitações e Considerações**

### **Ambiente de Desenvolvimento:**
- Use número de teste fornecido pelo Meta
- Mensagens só funcionam para números pré-aprovados
- Limite de 1000 mensagens por dia

### **Ambiente de Produção:**
- Precisa de aprovação do Meta para números reais
- Processo de verificação comercial
- Limites baseados no plano contratado

### **Custos:**
- **Conversas iniciadas pelo negócio**: Cobrança por conversa
- **Conversas iniciadas pelo usuário**: Gratuitas por 24h
- **Verificação de número**: Taxa única

---

## 🆘 **Problemas Comuns**

### **"Invalid Access Token"**
- Verifique se o token não expirou
- Confirme as permissões do token
- Regenere se necessário

### **"Phone Number ID not found"**
- Confirme o ID do número (não o número em si)
- Verifique se o número está ativo na conta

### **"Webhook verification failed"**
- Confirme se a URL está acessível
- Verifique se o verify_token está correto
- Teste a URL manualmente

### **"App Secret invalid"**
- Verifique se copiou corretamente
- Não confunda com outros secrets da conta

---

## 📞 **Suporte**

### Documentação Oficial:
- https://developers.facebook.com/docs/whatsapp/
- https://developers.facebook.com/docs/whatsapp/getting-started/

### Community Support:
- Stack Overflow: `whatsapp-business-api`
- Meta Developer Community

---

## ✨ **Resumo Rápido**

1. ✅ Criar app no Meta for Developers
2. ✅ Adicionar WhatsApp product
3. ✅ Copiar App Secret
4. ✅ Copiar Phone Number ID  
5. ✅ Copiar Business Account ID
6. ✅ Gerar Access Token permanente
7. ✅ Configurar webhook
8. ✅ Gerar encryption key
9. ✅ Testar configuração

**Tempo estimado**: 30-45 minutos

---

💡 **Dica**: Salve todas as credenciais em um local seguro e faça backup das configurações!