# Atlas Auth - Sistema de Autenticação Completo

Sistema de autenticação completo para SaaS construído com Next.js 14, TypeScript, Supabase e Tailwind CSS.

## 🚀 Funcionalidades

- ✅ **Cadastro de usuários** com validação robusta
- ✅ **Login seguro** com verificação de email
- ✅ **Verificação de email** com tokens de 6 dígitos
- ✅ **Reset de senha** via email
- ✅ **Período de teste gratuito** de 7 dias
- ✅ **Dashboard completo** com informações do usuário
- ✅ **Middleware de proteção** de rotas
- ✅ **Validação de dados** com Zod
- ✅ **Hash de senhas** com bcrypt
- ✅ **JWT para sessões** com cookies httpOnly
- ✅ **Templates de email** responsivos
- ✅ **Interface moderna** com Tailwind CSS

## 🛠️ Stack Técnica

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes, Node.js
- **Database:** Supabase (PostgreSQL)
- **Autenticação:** JWT, bcrypt
- **Email:** Nodemailer (Gmail SMTP)
- **Validação:** Zod
- **Styling:** Tailwind CSS

## 📋 Pré-requisitos

- Node.js 18+
- Conta no Supabase
- Conta Gmail com App Password (para envio de emails)

## ⚙️ Configuração

### 1. Clone o repositório

```bash
git clone <repo-url>
cd atlas-auth
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

Renomeie `.env.local` e configure as seguintes variáveis:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT Configuration
JWT_SECRET=your-jwt-secret-key-here

# Email Configuration (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

### 4. Configure o banco de dados

Execute os seguintes SQLs no Supabase:

```sql
-- Tabela de usuários
CREATE TABLE usuario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR NOT NULL,
    email VARCHAR UNIQUE NOT NULL,
    senha_hash VARCHAR NOT NULL,
    telefone VARCHAR,
    email_verificado BOOLEAN DEFAULT false,
    ativo BOOLEAN DEFAULT true,
    plano_id UUID,
    data_inicio_plano TIMESTAMP,
    data_fim_plano TIMESTAMP,
    ultimo_acesso TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de tokens de autenticação
CREATE TABLE auth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES usuario(id),
    token VARCHAR(6) NOT NULL,
    tipo VARCHAR(20) NOT NULL, -- 'email_verification' ou 'password_reset'
    expires_at TIMESTAMP NOT NULL,
    usado BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_usuario_email ON usuario(email);
CREATE INDEX idx_auth_tokens_token ON auth_tokens(token);
CREATE INDEX idx_auth_tokens_expires ON auth_tokens(expires_at);
```

### 5. Execute o projeto

```bash
npm run dev
```

O projeto estará disponível em `http://localhost:3000`.

## 📁 Estrutura do Projeto

```
src/
├── app/                    # App Router (Next.js 14)
│   ├── api/auth/          # API routes de autenticação
│   ├── cadastro/          # Página de cadastro
│   ├── login/             # Página de login
│   ├── confirmar-email/   # Página de confirmação de email
│   ├── esqueci-senha/     # Página de reset de senha
│   ├── home/              # Dashboard (rota protegida)
│   └── layout.tsx         # Layout principal
├── components/            # Componentes reutilizáveis
│   ├── ui/               # Componentes base (Button, Input, etc.)
│   └── forms/            # Componentes de formulário
├── lib/                  # Utilitários e configurações
│   ├── auth.ts           # Funções de autenticação
│   ├── database.ts       # Configuração do Supabase
│   ├── utils.ts          # Funções utilitárias
│   └── validations.ts    # Schemas de validação (Zod)
├── repositories/         # Camada de acesso a dados
├── services/            # Lógica de negócio
├── types/               # Definições de tipos TypeScript
└── middleware.ts        # Middleware de proteção de rotas
```

## 🔐 Fluxos de Autenticação

### Cadastro
1. Usuário preenche formulário
2. Dados são validados com Zod
3. Senha é hasheada com bcrypt
4. Usuário é criado no banco
5. Período de 7 dias gratuitos é definido
6. Token de verificação é gerado
7. Email de confirmação é enviado
8. Usuário é redirecionado para página de confirmação

### Login
1. Usuário insere email e senha
2. Credenciais são validadas
3. Verifica se email foi confirmado
4. Verifica se conta está ativa
5. Compara senha com hash
6. Gera JWT e define cookie
7. Atualiza último acesso
8. Redireciona para dashboard

### Verificação de Email
1. Usuário insere email e token
2. Token é validado (não usado, não expirado)
3. Email é confirmado no banco
4. Token é marcado como usado
5. JWT é gerado para auto-login
6. Email de boas-vindas é enviado
7. Redireciona para dashboard

### Reset de Senha
1. Usuário solicita reset com email
2. Token é gerado e enviado por email
3. Usuário insere token e nova senha
4. Token é validado
5. Nova senha é hasheada e salva
6. Token é marcado como usado
7. JWT é gerado para auto-login
8. Redireciona para dashboard

## 🧪 Scripts Disponíveis

```bash
npm run dev          # Inicia servidor de desenvolvimento
npm run build        # Gera build de produção
npm run start        # Inicia servidor de produção
npm run lint         # Executa ESLint
npm run type-check   # Verifica tipos TypeScript
```

## 🛡️ Segurança

- Senhas hasheadas com bcrypt (salt rounds: 12)
- JWT com expiração de 24 horas
- Cookies httpOnly, secure e sameSite
- Tokens de verificação com expiração de 15 minutos
- Validação robusta de entrada com Zod
- Middleware de proteção de rotas
- Rate limiting natural (tokens têm expiração)

## 📧 Configuração de Email

Para usar o Gmail SMTP:

1. Ative a verificação em duas etapas
2. Gere uma senha de aplicativo
3. Use a senha de aplicativo no `.env.local`

## 🎨 Customização

### Cores (Tailwind)
Edite `tailwind.config.js` para alterar as cores primárias.

### Templates de Email
Modifique os templates em `src/services/email.service.ts`.

### Validações
Ajuste os schemas em `src/lib/validations.ts`.

## 📱 Responsividade

A aplicação é totalmente responsiva e funciona em:
- Desktop (1024px+)
- Tablet (768px - 1023px)
- Mobile (320px - 767px)

## 🚀 Deploy

### Vercel (Recomendado)

1. Conecte seu repositório
2. Configure as variáveis de ambiente
3. Deploy automático

### Outras plataformas

O projeto pode ser implantado em qualquer plataforma que suporte Next.js.

## 📄 Licença

MIT License

## 🤝 Contribuição

Contribuições são bem-vindas! Abra issues ou pull requests.

## 📞 Suporte

Para dúvidas ou suporte, entre em contato através do email configurado no sistema.