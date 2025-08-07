# 📱 Configuração WhatsApp - Atlas

## Visão Geral

O sistema Atlas suporta dois tipos de conexão WhatsApp:

1. **Evolution API** - Configuração automática via geração de credenciais
2. **WhatsApp Business API Oficial** - Configuração via variáveis de ambiente

## 🔧 Evolution API

### Como Funciona
- O sistema gera automaticamente **Instance ID** e **Instance Token** únicos
- Não requer configuração manual de credenciais
- QR Code é gerado automaticamente
- Webhook é configurado automaticamente

### Variáveis de Ambiente Necessárias
```bash
# Evolution API Server URL
EVOLUTION_API_URL=https://evolution-api.example.com

# Evolution API Global Token (se necessário)
EVOLUTION_API_GLOBAL_TOKEN=your_global_token_here
```

### Exemplo de Geração Automática
```typescript
// ID da Instância: atlas_12345678_empresa_uuid_1703456789
// Token: atlas_token_1703456789_abc123def456
```

## 🏢 WhatsApp Business API Oficial

### Como Funciona
- Utiliza credenciais configuradas no ambiente do sistema
- Conecta diretamente com a API oficial do WhatsApp (Meta)
- Webhook é configurado automaticamente
- Suporta todos os recursos avançados da API oficial

### Variáveis de Ambiente Necessárias
```bash
# WhatsApp Business API Credentials
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id  
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_APP_SECRET=your_app_secret

# Webhook Configuration
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Encryption Key for sensitive data
ENCRYPTION_KEY=your_encryption_key_here
```

### Como Obter as Credenciais

#### 1. Phone Number ID
1. Acesse [Meta for Developers](https://developers.facebook.com/)
2. Vá para seu App > WhatsApp > API Setup
3. Copie o **Phone Number ID**

#### 2. Business Account ID
1. No mesmo painel, encontre o **WhatsApp Business Account ID**
2. Ou acesse [Meta Business Manager](https://business.facebook.com/)

#### 3. Access Token
1. Gere um token permanente em Meta for Developers
2. **IMPORTANTE**: Use um token de longa duração (60 dias+)
3. Renovação deve ser feita antes da expiração

#### 4. App Secret
1. Em Meta for Developers > App Settings > Basic
2. Copie o **App Secret**
3. **IMPORTANTE**: Mantenha em segredo absoluto

## 🔒 Segurança

### Encryption Key
```bash
# Gere uma chave de 32 caracteres aleatórios
ENCRYPTION_KEY=your_32_character_encryption_key_123

# Exemplo de geração:
openssl rand -hex 32
```

### Proteção de Credenciais
- Todas as credenciais sensíveis são criptografadas no banco de dados
- Tokens de acesso nunca são logados
- Comunicação sempre via HTTPS
- Validação de webhook signatures

## 🚀 Configuração de Produção

### Docker Environment
```bash
# .env.production
EVOLUTION_API_URL=https://evolution-api.prod.example.com
WHATSAPP_PHONE_NUMBER_ID=1234567890123456
WHATSAPP_BUSINESS_ACCOUNT_ID=1234567890123456
WHATSAPP_ACCESS_TOKEN=EAAG...
WHATSAPP_APP_SECRET=abc123def456...
NEXT_PUBLIC_APP_URL=https://atlas.prod.example.com
ENCRYPTION_KEY=your_production_encryption_key
```

### Verificação de Configuração
```bash
# Teste se todas as variáveis estão configuradas
curl -X GET "https://yourdomain.com/api/business-rules/validate-connection"
```

## 📊 Monitoramento

### Health Checks
O sistema monitora automaticamente:
- Status das conexões WhatsApp
- Expiração de tokens
- Health dos webhooks
- Qualidade das mensagens

### Logs Importantes
```javascript
// Success logs
"WhatsApp Business API connection created successfully"
"Evolution API instance created: atlas_12345678_..."

// Error logs  
"WhatsApp Business API system configuration is incomplete"
"Evolution API error: {error details}"
"Token expired - manual refresh required"
```

## 🔄 Rotação de Tokens

### WhatsApp Business API
```bash
# 1. Gere novo token no Meta for Developers
# 2. Atualize variável de ambiente
export WHATSAPP_ACCESS_TOKEN=new_token_here

# 3. Reinicie aplicação ou aplique hot-reload
# 4. Verifique logs para confirmação
```

### Evolution API
- Tokens são gerados automaticamente
- Rotação acontece automaticamente na reconexão
- Não requer intervenção manual

## 🛠️ Troubleshooting

### Problemas Comuns

#### Evolution API
```bash
# Erro: "Evolution API URL not configured"
# Solução: Configure EVOLUTION_API_URL

# Erro: "Failed to connect to Evolution API"
# Solução: Verifique se o servidor Evolution API está rodando
```

#### WhatsApp Business API
```bash
# Erro: "SYSTEM_CONFIG_INCOMPLETE"
# Solução: Configure todas as variáveis WHATSAPP_*

# Erro: "Token inválido ou expirado"
# Solução: Renove o access token no Meta for Developers

# Erro: "Webhook setup failed"
# Solução: Verifique se NEXT_PUBLIC_APP_URL está correto
```

### Debug Mode
```bash
# Ative logs detalhados
DEBUG=whatsapp:*,evolution:*,business-rules:*
```

## 📝 Checklist de Configuração

### Evolution API ✅
- [ ] `EVOLUTION_API_URL` configurado
- [ ] Servidor Evolution API rodando
- [ ] Rede acessível entre Atlas e Evolution API

### WhatsApp Business API ✅  
- [ ] `WHATSAPP_PHONE_NUMBER_ID` configurado
- [ ] `WHATSAPP_BUSINESS_ACCOUNT_ID` configurado
- [ ] `WHATSAPP_ACCESS_TOKEN` configurado (válido)
- [ ] `WHATSAPP_APP_SECRET` configurado  
- [ ] `NEXT_PUBLIC_APP_URL` configurado
- [ ] `ENCRYPTION_KEY` configurado (32 caracteres)
- [ ] Webhook validado no Meta for Developers

### Segurança ✅
- [ ] Tokens criptografados no banco
- [ ] HTTPS configurado em produção
- [ ] Firewall protegendo APIs
- [ ] Logs não expõem credenciais

---

💡 **Dica**: Use o endpoint `/api/business-rules/validate-connection` para testar suas configurações antes de conectar no wizard de empresas.