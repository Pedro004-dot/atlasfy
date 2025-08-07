# 🎯 BUSINESS RULES API - Documentação

## 📋 Visão Geral

O sistema de regras de negócio foi integrado às APIs existentes para garantir consistência e validação automática de todas as operações.

## 🔗 Endpoints Disponíveis

### 1. **Inicialização do Sistema**
```bash
# Inicializar sistema de regras
POST /api/business-rules/init
Authorization: Bearer <token>

# Verificar status de inicialização
GET /api/business-rules/init
Authorization: Bearer <token>
```

**Resposta de Inicialização:**
```json
{
  "success": true,
  "message": "Business rules initialized successfully",
  "data": {
    "status": "initialized",
    "timestamp": "2025-01-31T10:00:00.000Z",
    "userId": "user-uuid"
  }
}
```

### 2. **Logs de Execução**
```bash
# Logs gerais (últimas execuções)
GET /api/business-rules/logs
Authorization: Bearer <token>

# Logs de uma regra específica
GET /api/business-rules/logs?rule_name=UniquePhoneNumberRule
Authorization: Bearer <token>

# Logs de uma conexão específica
GET /api/business-rules/logs?connection_id=conn-uuid
Authorization: Bearer <token>

# Logs por categoria
GET /api/business-rules/logs?category=connection
Authorization: Bearer <token>

# Limitar número de resultados
GET /api/business-rules/logs?limit=100
Authorization: Bearer <token>
```

**Resposta de Logs:**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "log-uuid",
        "rule_name": "UniquePhoneNumberRule",
        "rule_category": "connection",
        "success": true,
        "allowed": true,
        "message": "Phone number validation passed",
        "executed_at": "2025-01-31T10:00:00.000Z",
        "duration_ms": 45,
        "user_id": "user-uuid",
        "connection_id": "conn-uuid"
      }
    ],
    "statistics": {
      "total": 50,
      "successful": 48,
      "failed": 2,
      "allowed": 45,
      "denied": 5,
      "average_duration": 67.5
    }
  }
}
```

## 🔄 Integração nas APIs Existentes

### **WhatsApp Connections API**

#### **GET /api/whatsapp/official/connections/[id]**
- ✅ **Regras aplicadas**: `CONNECTION`
- ✅ **Validações**: 
  - Verificação de propriedade da conexão
  - Validação de saúde da conexão
  - Verificação de tokens expirados

#### **POST /api/whatsapp/official/connections**
- ✅ **Regras aplicadas**: `CONNECTION`
- ✅ **Validações**:
  - Unicidade do número de telefone
  - Exclusividade do agente
  - Limite de conexões por empresa
  - Validação de dados da conexão

#### **PUT /api/whatsapp/official/connections/[id]**
- ✅ **Regras aplicadas**: `CONNECTION`
- ✅ **Validações**:
  - Verificação de propriedade
  - Validação de dados atualizados
  - Verificação de conflitos

### **Webhook API**

#### **POST /api/whatsapp/official/webhooks/messages**
- ✅ **Regras aplicadas**: `WEBHOOK`
- ✅ **Validações**:
  - Validação de assinatura
  - Verificação de timestamp
  - Prevenção de duplicatas
  - Rate limiting
  - Monitoramento de saúde

## 🚨 Códigos de Erro

### **Erros de Regras de Negócio**
```json
{
  "success": false,
  "error": "Business rules validation failed",
  "errorCode": "BUSINESS_RULES_VIOLATION",
  "details": [
    "Phone number already exists in another connection",
    "Agent is already assigned to another connection",
    "Company has reached maximum connection limit"
  ]
}
```

### **Códigos Específicos**
- `CONNECTION_BUSINESS_RULES_VIOLATION` - Violação nas regras de conexão
- `WEBHOOK_BUSINESS_RULES_VIOLATION` - Violação nas regras de webhook
- `MESSAGE_BUSINESS_RULES_VIOLATION` - Violação nas regras de mensagem
- `AUTHENTICATION_BUSINESS_RULES_VIOLATION` - Violação nas regras de autenticação

## 📊 Monitoramento

### **Métricas Disponíveis**
- **Taxa de Sucesso**: % de regras executadas com sucesso
- **Tempo Médio**: Duração média de execução das regras
- **Regras Mais Executadas**: Ranking das regras mais utilizadas
- **Violações por Categoria**: Distribuição de violações por tipo

### **Alertas Automáticos**
- Conexões com múltiplas violações consecutivas
- Regras com alta taxa de falha
- Performance degradada do engine

## 🔧 Configuração

### **Variáveis de Ambiente**
```bash
# Habilitar sistema de regras
BUSINESS_RULES_ENABLED=true

# Nível de log
BUSINESS_RULES_LOG_LEVEL=info

# Habilitar auditoria
BUSINESS_RULES_AUDIT_ENABLED=true

# Retenção de logs (dias)
BUSINESS_RULES_LOG_RETENTION_DAYS=30
```

### **Inicialização Automática**
```typescript
// No arquivo de inicialização da aplicação
import { initializeBusinessRules } from '@/lib/business-rules/init';

// Inicializar na startup
await initializeBusinessRules();
```

## 🎯 Próximos Passos

### **Implementações Futuras**
1. **Dashboard de Regras**: Interface visual para gerenciar regras
2. **Regras Dinâmicas**: Modificação de regras em tempo real
3. **A/B Testing**: Teste de diferentes configurações de regras
4. **Machine Learning**: Otimização automática baseada em dados
5. **Integração com Planos**: Regras específicas por plano de assinatura

### **Melhorias de Performance**
1. **Cache de Regras**: Cache de resultados de validação
2. **Execução Paralela**: Validações em paralelo quando possível
3. **Lazy Loading**: Carregamento sob demanda de regras
4. **Compressão de Logs**: Otimização do armazenamento de logs

## 📝 Exemplos de Uso

### **Teste de Inicialização**
```bash
curl -X POST http://localhost:3000/api/business-rules/init \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### **Verificar Logs**
```bash
curl -X GET "http://localhost:3000/api/business-rules/logs?limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### **Criar Conexão com Validação**
```bash
curl -X POST http://localhost:3000/api/whatsapp/official/connections \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumberId": "phone-id",
    "phoneNumber": "+5511999999999",
    "instanceName": "Test Connection"
  }'
```

## 🔍 Troubleshooting

### **Problemas Comuns**

1. **Sistema não inicializado**
   ```bash
   POST /api/business-rules/init
   ```

2. **Regras não sendo aplicadas**
   - Verificar se `BUSINESS_RULES_ENABLED=true`
   - Verificar logs de inicialização

3. **Performance lenta**
   - Verificar logs de duração das regras
   - Considerar otimização de regras específicas

4. **Falsos positivos**
   - Revisar configuração das regras
   - Verificar contexto passado para validação 