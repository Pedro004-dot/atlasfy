# Configuração da Evolution API - WhatsApp Integration

## Visão Geral

Este documento explica como configurar a Evolution API para integrar WhatsApp com nossos agentes.

## Pré-requisitos

1. **Evolution API Server** rodando (v1.x+)
2. **Variáveis de ambiente** configuradas
3. **Webhook URL** acessível

## Variáveis de Ambiente Necessárias

Adicione ao seu arquivo `.env`:

```env
# Evolution API Configuration
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=your_evolution_api_key

# Supabase (já configurado)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# JWT Secret
JWT_SECRET=your_jwt_secret
```

## Fluxo de Integração

### 1. Criar Instância WhatsApp

**Endpoint:** `POST /api/evolution/create-instance`

**Body:**
```json
{
  "instanceName": "agent_123_1234567890_abc123",
  "agentId": "optional-agent-id"
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "connectionId": "uuid",
    "instanceName": "agent_123_1234567890_abc123",
    "instanceId": "evolution-uuid", 
    "hash": "hash-string",
    "status": "connecting",
    "qrCode": "data:image/png;base64,iVBORw0KGgo...",
    "qrCodeText": "2@ZXGy8C+sCO...",
    "expiresAt": "2024-01-01T12:34:56.789Z"
  }
}
```

### 2. Monitorar Status da Conexão

**Endpoint:** `GET /api/user-connection-status/{instanceName}`

**Resposta:**
```json
{
  "success": true,
  "data": {
    "qrCode": "data:image/png;base64,..." | null,
    "status": "connecting" | "connected" | "expired" | "error",
    "phoneNumber": "+5511999999999" | null,
    "profileName": "Nome do Usuário" | null,
    "attemptsRemaining": 5
  }
}
```

### 3. Listar Conexões do Usuário

**Endpoint:** `GET /api/evolution/connections`

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "instance_name": "agent_123_1234567890_abc123",
      "evolution_instance_id": "evolution-uuid",
      "status": "connected",
      "phone_number": "+5511999999999",
      "created_at": "2024-01-01T12:34:56.789Z",
      "agent_id": "agent-uuid"
    }
  ]
}
```

## Estrutura do Banco de Dados

A tabela `whatsapp_connections` foi atualizada com os campos:

```sql
-- Campos Evolution API específicos
evolution_instance_id VARCHAR(255)     -- ID da instância na Evolution API
evolution_hash VARCHAR(255)           -- Hash de segurança
evolution_integration VARCHAR(100)    -- Tipo de integração (WHATSAPP-BAILEYS)
evolution_instance_data JSONB        -- Dados completos da resposta Evolution API

-- Campos existentes
id UUID PRIMARY KEY
user_id UUID
agent_id UUID
instance_name VARCHAR NOT NULL
qr_code TEXT
status VARCHAR
phone_number VARCHAR
created_at TIMESTAMPTZ
last_updated TIMESTAMPTZ
expires_at TIMESTAMPTZ
```

## Estados de Conexão

- **`idle`**: Estado inicial, aguardando início da conexão
- **`pending/connecting`**: QR Code gerado, aguardando escaneamento
- **`connected`**: WhatsApp conectado com sucesso
- **`expired`**: QR Code expirou (2 minutos)
- **`error`**: Erro na conexão

## Componente Frontend

O componente `ConnectWhatsApp` gerencia todo o fluxo:

1. **Gerar QR Code**: Chama `/api/evolution/create-instance`
2. **Polling**: Verifica status a cada 4 segundos
3. **Timeout**: 2 minutos para conexão
4. **Callback**: Notifica sucesso/erro

### Uso do Componente

```tsx
<ConnectWhatsApp
  agentId="agent-uuid"
  onConnectionSuccess={(phoneNumber, profileName) => {
    console.log('Conectado:', phoneNumber);
  }}
  onConnectionError={(error) => {
    console.error('Erro:', error);
  }}
/>
```

## API Evolution Externa

### Endpoints Utilizados

1. **Criar Instância**
   - `POST {EVOLUTION_API_URL}/instance/create`
   - Headers: `apikey: {EVOLUTION_API_KEY}`

2. **Verificar Status**
   - `GET {EVOLUTION_API_URL}/instance/connectionState/{instanceName}`
   - Headers: `apikey: {EVOLUTION_API_KEY}`

3. **Deletar Instância**
   - `DELETE {EVOLUTION_API_URL}/instance/delete/{instanceName}`
   - Headers: `apikey: {EVOLUTION_API_KEY}`

## Tratamento de Erros

### Códigos de Erro Comuns

- **401**: Token de autenticação inválido
- **400**: Instância já existe ou dados inválidos
- **404**: Instância não encontrada
- **500**: Erro interno (Evolution API indisponível)

### Recovery

- **QR Code Expirado**: Gerar nova instância
- **Evolution API Offline**: Retry com backoff exponencial
- **Conexão Perdida**: Reconectar automaticamente

## Segurança

1. **Authentication**: JWT token obrigatório
2. **User Isolation**: Cada usuário acessa apenas suas conexões
3. **API Key**: Evolution API protegida por chave
4. **Timeout**: Conexões expiram automaticamente

## Monitoramento

### Logs Importantes

```typescript
// Sucesso na criação
console.log('Evolution instance created:', { instanceName, instanceId, hash });

// Erro na Evolution API
console.error('Evolution API Error:', evolutionResponse.statusText);

// Timeout de conexão
console.warn('Connection timeout:', { instanceName, duration });
```

### Métricas

- Taxa de sucesso de conexões
- Tempo médio para conectar
- Erros por tipo
- Instâncias ativas

## Troubleshooting

### Problema: QR Code não aparece
- Verificar `EVOLUTION_API_URL` e `EVOLUTION_API_KEY`
- Confirmar que Evolution API está rodando
- Verificar logs do servidor Evolution API

### Problema: Conexão não acontece
- QR Code pode ter expirado (2 minutos)
- Verificar se WhatsApp está funcionando
- Tentar recriar instância

### Problema: "Instância já existe"
- Deletar instância antiga: `DELETE /api/user-connection-status/{instanceName}`
- Aguardar alguns segundos e tentar novamente

## Exemplo de Implementação Completa

```typescript
// 1. Iniciar conexão
const response = await fetch('/api/evolution/create-instance', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    instanceName: 'my_instance_123',
    agentId: 'agent-uuid'
  })
});

// 2. Polling do status
const pollStatus = async (instanceName: string) => {
  const response = await fetch(`/api/user-connection-status/${instanceName}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const result = await response.json();
  
  if (result.data.status === 'connected') {
    console.log('Conectado!', result.data.phoneNumber);
  } else if (result.data.status === 'expired') {
    console.log('QR Code expirou, gerar novo');
  }
};

// 3. Polling interval
const interval = setInterval(() => pollStatus('my_instance_123'), 4000);
```

## Próximos Passos

1. **Webhooks**: Implementar webhook para updates em tempo real
2. **Reconnection**: Auto-reconexão em caso de perda de conexão
3. **Multi-device**: Suporte para múltiplos dispositivos
4. **Message Handling**: Processar mensagens recebidas
5. **Analytics**: Dashboard de métricas de conexão 